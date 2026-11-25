export type SourceMode = "file" | "youtube";

export type SeparationStatus = "idle" | "processing" | "done" | "error";

export interface SeparatedTrack {
  blob: Blob;
  filename: string;
}

export interface SeparationResult {
  url: string;
  filename: string;
}
