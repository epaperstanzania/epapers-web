'use client';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">This page could not be loaded</h1><p role="alert">Please retry. If the problem continues, contact EPapers support.</p><button className="mt-4 rounded bg-blue-800 p-3 text-white" onClick={reset}>Try again</button></main>;}
