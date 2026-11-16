import { useEffect, useRef, useState } from "react";

// idle -> ready (file chosen) -> processing -> done | error
export default function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef(null);

  // Free the blob when it is replaced or the component unmounts
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  function pickFile(f) {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|flac|ogg|m4a)$/i.test(f.name)) {
      setError("Please choose an audio file.");
      setStatus("error");
      return;
    }
    setFile(f);
    setResultUrl(null);
    setError("");
    setStatus("ready");
  }

  async function process() {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("processing");
    setError("");
    setResultUrl(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/separate/instrumental", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Server responded with ${res.status}`);
      }
      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
      setStatus("done");
    } catch (e) {
      if (e.name === "AbortError") {
        setStatus("ready");
        return;
      }
      setError(e.message || "Something went wrong.");
      setStatus("error");
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "track";
  const processing = status === "processing";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Karaoke Anything</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Upload a song and get the instrumental version.
          </p>
        </header>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!processing) pickFile(e.dataTransfer.files[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            processing ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${
            dragging
              ? "border-fuchsia-400 bg-fuchsia-500/10"
              : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            disabled={processing}
            onChange={(e) => pickFile(e.target.files[0])}
          />
          {file ? (
            <>
              <span className="font-medium break-all">{file.name}</span>
              <span className="text-xs text-zinc-500">
                {(file.size / 1024 / 1024).toFixed(1)} MB - click to change
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">Drop an audio file here</span>
              <span className="text-xs text-zinc-500">or click to browse</span>
            </>
          )}
        </label>

        {processing ? (
          <div className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-fuchsia-500" />
            </div>
            <p className="text-center text-sm text-zinc-400">
              Separating vocals - this can take a few minutes...
            </p>
            <button
              onClick={cancel}
              className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={process}
            disabled={!file}
            className="w-full rounded-lg bg-fuchsia-600 px-4 py-2.5 font-medium transition-colors hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            Make instrumental
          </button>
        )}

        {status === "error" && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300 break-words">
            {error}
          </p>
        )}

        {status === "done" && resultUrl && (
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <audio controls src={resultUrl} className="w-full" />
            <a
              href={resultUrl}
              download={`${baseName} - instrumental.mp3`}
              className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center font-medium hover:bg-emerald-500"
            >
              Download instrumental
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
