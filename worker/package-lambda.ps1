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
    pnpm --filter @epapers/worker deploy --prod $packageDirectory
    if ($LASTEXITCODE -ne 0) {
        throw 'Creating the isolated Lambda package failed.'
    }

    Copy-Item -LiteralPath (Join-Path $workerDirectory 'lambda.mjs') -Destination $packageDirectory

    $generatedClient = Join-Path $repositoryRoot 'node_modules\.pnpm\node_modules\.prisma\client'
    if (-not (Test-Path -LiteralPath $generatedClient)) {
        $generatedClient = Join-Path $repositoryRoot 'node_modules\.prisma\client'
    }
    if (-not (Test-Path -LiteralPath $generatedClient)) {
        throw 'Generated Prisma client was not found after generation.'
    }

    $packagePrismaDirectory = Join-Path $packageDirectory 'node_modules\.prisma'
    New-Item -ItemType Directory -Path $packagePrismaDirectory -Force | Out-Null
    Copy-Item -LiteralPath $generatedClient -Destination (Join-Path $packagePrismaDirectory 'client') -Recurse -Force

    $distributionDirectory = Split-Path -Parent $archivePath
    New-Item -ItemType Directory -Path $distributionDirectory -Force | Out-Null
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $packageDirectory,
        $archivePath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    Write-Output "Lambda deployment package created: $archivePath"
}
finally {
    Pop-Location
}
