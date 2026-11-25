import { isYoutubeUrl } from "../lib/youtube";

interface YoutubeUrlInputProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function YoutubeUrlInput({ value, disabled, onChange, onSubmit }: YoutubeUrlInputProps) {
  const showHint = value.trim() !== "" && !isYoutubeUrl(value);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
      className="space-y-2"
    >
      <input
        type="url"
        inputMode="url"
        placeholder="https://www.youtube.com/watch?v=..."
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:border-fuchsia-400 focus:outline-none disabled:opacity-60"
      />
      {showHint && (
        <p className="text-xs text-zinc-500">This does not look like a YouTube video link.</p>
      )}
    </form>
  );
}
