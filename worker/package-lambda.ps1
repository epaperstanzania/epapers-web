$ErrorActionPreference = 'Stop'

$workerDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = Split-Path -Parent $workerDirectory
$packageDirectory = Join-Path $workerDirectory 'dist\lambda-package'
$archivePath = Join-Path $workerDirectory 'dist\epapers-background-worker.zip'

Push-Location $repositoryRoot
try {
    pnpm --filter @epapers/database generate
    if ($LASTEXITCODE -ne 0) {
        throw 'Prisma client generation failed.'
    }

    if (Test-Path -LiteralPath $packageDirectory) {
        Remove-Item -LiteralPath $packageDirectory -Recurse -Force
    }
    New-Item -ItemType Directory -Path $packageDirectory -Force | Out-Null
    pnpm --filter @epapers/worker exec esbuild `
        lambda.mjs `
        --bundle `
        --platform=node `
        --target=node24 `
        --format=cjs `
        --external:@prisma/client `
        --alias:server-only=./lambda-empty.mjs `
        --outfile=dist/lambda-package/lambda.js
    if ($LASTEXITCODE -ne 0) {
        throw 'Bundling the Lambda handler failed.'
    }
    Copy-Item `
        -LiteralPath (Join-Path $workerDirectory 'lambda-package.json') `
        -Destination (Join-Path $packageDirectory 'package.json')

    $generatedPrismaDirectory = Get-ChildItem `
        -Path (Join-Path $repositoryRoot 'node_modules\.pnpm') `
        -Directory `
        -Filter '.prisma' `
        -Recurse |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'client') } |
        Select-Object -First 1
    if (-not $generatedPrismaDirectory) {
        throw 'Generated Prisma client was not found after generation.'
    }

    $packageNodeModules = Join-Path $packageDirectory 'node_modules'
    $packagePrismaDirectory = Join-Path $packageNodeModules '.prisma'
    $packageClientDirectory = Join-Path $packageNodeModules '@prisma'
    New-Item -ItemType Directory -Path $packageClientDirectory -Force | Out-Null
    $generatedClientPackage = Join-Path `
        (Split-Path -Parent $generatedPrismaDirectory.FullName) `
        '@prisma\client'
    Copy-Item `
        -LiteralPath $generatedClientPackage `
        -Destination (Join-Path $packageClientDirectory 'client') `
        -Recurse `
        -Force
    New-Item -ItemType Directory -Path $packagePrismaDirectory -Force | Out-Null
    Copy-Item `
        -LiteralPath (Join-Path $generatedPrismaDirectory.FullName 'client') `
        -Destination (Join-Path $packagePrismaDirectory 'client') `
        -Recurse `
        -Force
    Remove-Item `
        -LiteralPath (Join-Path $packagePrismaDirectory 'client\query_engine-windows.dll.node') `
        -Force `
        -ErrorAction SilentlyContinue

    $distributionDirectory = Split-Path -Parent $archivePath
    New-Item -ItemType Directory -Path $distributionDirectory -Force | Out-Null
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::Open(
        $archivePath,
        [System.IO.Compression.ZipArchiveMode]::Create
    )
    try {
        Get-ChildItem -LiteralPath $packageDirectory -File -Recurse -Force | ForEach-Object {
            $relativePath = $_.FullName.Substring($packageDirectory.Length).TrimStart('\', '/').Replace('\', '/')
            $entry = $archive.CreateEntry($relativePath, [System.IO.Compression.CompressionLevel]::Optimal)
            $source = [System.IO.File]::OpenRead($_.FullName)
            try {
                $destination = $entry.Open()
                try {
                    $source.CopyTo($destination)
                }
                finally {
                    $destination.Dispose()
                }
            }
            finally {
                $source.Dispose()
            }
        }
    }
    finally {
        $archive.Dispose()
    }

    Remove-Item -LiteralPath $packageDirectory -Recurse -Force
    Write-Output "Lambda deployment package created: $archivePath"
}
finally {
    Pop-Location
}
