interface ProcessingPanelProps {
  message: string;
  onCancel: () => void;
}

export function ProcessingPanel({ message, onCancel }: ProcessingPanelProps) {
  return (
    <div className="space-y-3">
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-fuchsia-500" />
      </div>
      <p className="text-center text-sm text-zinc-400">{message}</p>
      <button
        onClick={onCancel}
        className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
      >
        Cancel
      </button>
    </div>
  );
}
