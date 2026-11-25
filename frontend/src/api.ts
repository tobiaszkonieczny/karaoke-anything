import type { SeparatedTrack } from "./types";

// Read the file name the server put in Content-Disposition
function filenameFromResponse(res: Response): string | null {
  const header = res.headers.get("Content-Disposition") ?? "";
  const encoded = header.match(/filename\*=utf-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // fall through to the plain filename
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : null;
}

// FastAPI errors come as {"detail": "..."}, show just the message
async function errorFromResponse(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const detail: unknown = JSON.parse(text).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg).join(", ");
  } catch {
    // not JSON
  }
  return text || `Server responded with ${res.status}`;
}

async function toTrack(res: Response, fallbackName: string): Promise<SeparatedTrack> {
  if (!res.ok) throw new Error(await errorFromResponse(res));
  const filename = filenameFromResponse(res) ?? fallbackName;
  return { blob: await res.blob(), filename };
}

export async function separateFile(file: File, signal: AbortSignal): Promise<SeparatedTrack> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/separate/instrumental", { method: "POST", body, signal });
  // The server returns a generic name for uploads, so name the result after the input file
  const track = await toTrack(res, "instrumental.mp3");
  return { ...track, filename: `${file.name.replace(/\.[^.]+$/, "")} - instrumental.mp3` };
}

export async function separateYoutube(url: string, signal: AbortSignal): Promise<SeparatedTrack> {
  const res = await fetch("/api/separate/instrumental/youtube", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url.trim() }),
    signal,
  });
  return toTrack(res, "instrumental.mp3");
}
