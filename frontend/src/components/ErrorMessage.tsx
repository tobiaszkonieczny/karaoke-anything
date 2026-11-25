interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300 break-words">
      {message}
    </p>
  );
}
