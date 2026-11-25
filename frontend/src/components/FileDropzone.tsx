import { useState } from "react";

interface FileDropzoneProps {
  file: File | null;
  disabled: boolean;
  onFileSelected: (file: File) => void;
  onInvalidFile: (message: string) => void;
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a)$/i.test(file.name);
}

export function FileDropzone({ file, disabled, onFileSelected, onInvalidFile }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  function pick(f: File | undefined) {
    if (!f || disabled) return;
    if (isAudioFile(f)) onFileSelected(f);
    else onInvalidFile("Please choose an audio file.");
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files[0]);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${
        dragging ? "border-fuchsia-400 bg-fuchsia-500/10" : "border-zinc-700 hover:border-zinc-500"
      }`}
    >
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => pick(e.target.files?.[0])}
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
  );
}
