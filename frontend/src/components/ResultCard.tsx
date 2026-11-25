import type { SeparationResult } from "../types";

interface ResultCardProps {
  result: SeparationResult;
}

export function ResultCard({ result }: ResultCardProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm font-medium break-words">{result.filename}</p>
      <audio controls src={result.url} className="w-full" />
      <a
        href={result.url}
        download={result.filename}
        className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center font-medium hover:bg-emerald-500"
      >
        Download instrumental
      </a>
    </div>
  );
}
