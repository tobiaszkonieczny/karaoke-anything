import { useCallback, useEffect, useRef, useState } from "react";
import type { SeparatedTrack, SeparationResult, SeparationStatus } from "../types";

type SeparationJob = (signal: AbortSignal) => Promise<SeparatedTrack>;

// Tracks one separation request: idle -> processing -> done | error
export function useSeparation() {
  const [status, setStatus] = useState<SeparationStatus>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SeparationResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Free the blob when it is replaced or the component unmounts
  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  const run = useCallback(async (job: SeparationJob) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("processing");
    setError("");
    setResult(null);

    try {
      const track = await job(controller.signal);
      setResult({ url: URL.createObjectURL(track.blob), filename: track.filename });
      setStatus("done");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(e instanceof Error && e.message ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const fail = useCallback((message: string) => {
    setError(message);
    setStatus("error");
  }, []);

  // Clear a previous result or error, e.g. after the input changed
  const reset = useCallback(() => {
    setError("");
    setResult(null);
    setStatus("idle");
  }, []);

  return { status, error, result, run, cancel, fail, reset };
}
