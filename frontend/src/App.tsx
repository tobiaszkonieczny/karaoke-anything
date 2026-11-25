import { useState } from "react";
import { separateFile, separateYoutube } from "./api";
import { ErrorMessage } from "./components/ErrorMessage";
import { FileDropzone } from "./components/FileDropzone";
import { ProcessingPanel } from "./components/ProcessingPanel";
import { ResultCard } from "./components/ResultCard";
import { SourceTabs } from "./components/SourceTabs";
import { YoutubeUrlInput } from "./components/YoutubeUrlInput";
import { useSeparation } from "./hooks/useSeparation";
import { isYoutubeUrl } from "./lib/youtube";
import type { SourceMode } from "./types";

export default function App() {
  const [mode, setMode] = useState<SourceMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const { status, error, result, run, cancel, fail, reset } = useSeparation();

  const processing = status === "processing";
  const canProcess = mode === "file" ? file !== null : isYoutubeUrl(url);

  function changeMode(next: SourceMode) {
    if (next === mode) return;
    setMode(next);
    reset();
  }

  function process() {
    if (mode === "file" && file) {
      run((signal) => separateFile(file, signal));
    } else if (mode === "youtube" && isYoutubeUrl(url)) {
      run((signal) => separateYoutube(url, signal));
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Karaoke Anything</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Upload a song or paste a YouTube link and get the instrumental version.
          </p>
        </header>

        <SourceTabs mode={mode} disabled={processing} onChange={changeMode} />

        {mode === "file" ? (
          <FileDropzone
            file={file}
            disabled={processing}
            onFileSelected={(f) => {
              setFile(f);
              reset();
            }}
            onInvalidFile={fail}
          />
        ) : (
          <YoutubeUrlInput
            value={url}
            disabled={processing}
            onChange={(value) => {
              setUrl(value);
              if (status === "error" || status === "done") reset();
            }}
            onSubmit={process}
          />
        )}

        {processing ? (
          <ProcessingPanel
            message={
              mode === "youtube"
                ? "Downloading and separating vocals - this can take a few minutes..."
                : "Separating vocals - this can take a few minutes..."
            }
            onCancel={cancel}
          />
        ) : (
          <button
            onClick={process}
            disabled={!canProcess}
            className="w-full rounded-lg bg-fuchsia-600 px-4 py-2.5 font-medium transition-colors hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            Make instrumental
          </button>
        )}

        {status === "error" && <ErrorMessage message={error} />}
        {status === "done" && result && <ResultCard result={result} />}
      </div>
    </main>
  );
}
