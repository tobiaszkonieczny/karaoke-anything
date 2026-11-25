import re
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import numpy as np
import yt_dlp
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask
from spleeter.audio.adapter import AudioAdapter
from spleeter.separator import Separator

app = FastAPI()

# Load the 2-stem model once at startup (vocals + accompaniment)
separator = Separator("spleeter:2stems")
audio_adapter = AudioAdapter.default()

# The model works at 44.1 kHz
SAMPLE_RATE = 44100
# ~1 minute per chunk keeps peak memory around 1.5-2 GB regardless of track length
CHUNK_SAMPLES = 60 * SAMPLE_RATE
OVERLAP_SAMPLES = SAMPLE_RATE

# running several TensorFlow jobs at once on a CPU
# just makes each of them slower
inference_lock = threading.Lock()

# Only YouTube links are accepted, so yt-dlp cannot be used to fetch arbitrary URLs
YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
}

VIDEO_ID_RE = re.compile(r"[A-Za-z0-9_-]{11}")

# Longer tracks would block the single worker for too long
MAX_DURATION_SECONDS = 20 * 60


class YoutubeRequest(BaseModel):
    url: str


@app.get("/health")
def health():
    return {"status": "ok"}


def separate_accompaniment(waveform: np.ndarray) -> np.ndarray:
    """Separate in fixed-size chunks so memory use does not grow with track length.

    Spleeter keeps the whole input (and its spectrograms) in memory, which needs
    several GB for a 4-5 minute song. Neighbouring chunks overlap and are
    crossfaded to avoid clicks at the boundaries.
    """
    total = len(waveform)
    result = None
    start = 0
    while True:
        end = min(start + CHUNK_SAMPLES, total)
        acc = separator.separate(waveform[start:end])["accompaniment"]
        if result is None:
            result = acc
        else:
            fade = np.linspace(0.0, 1.0, OVERLAP_SAMPLES, dtype=np.float32)[:, None]
            result[-OVERLAP_SAMPLES:] = (
                result[-OVERLAP_SAMPLES:] * (1.0 - fade) + acc[:OVERLAP_SAMPLES] * fade
            )
            result = np.concatenate([result, acc[OVERLAP_SAMPLES:]])
        if end == total:
            return result
        start = end - OVERLAP_SAMPLES


def separate_to_mp3(src: Path, workdir: Path) -> Path:
    """Run Spleeter on src and return the path of the instrumental MP3."""
    try:
        waveform, _ = audio_adapter.load(str(src), sample_rate=SAMPLE_RATE)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode the audio file")
    if len(waveform) == 0:
        raise HTTPException(status_code=400, detail="The audio file is empty")

    with inference_lock:
        accompaniment = separate_accompaniment(waveform)

    wav = workdir / "accompaniment.wav"
    audio_adapter.save(str(wav), accompaniment, SAMPLE_RATE, "wav")

    # Convert to MP3 to keep the response small
    mp3 = workdir / "instrumental.mp3"
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-q:a", "2", str(mp3)],
        check=True,
        capture_output=True,
    )
    return mp3


def mp3_response(mp3: Path, workdir: Path, filename: str) -> FileResponse:
    # Remove the temp directory after the response has been sent
    return FileResponse(
        mp3,
        media_type="audio/mpeg",
        filename=filename,
        background=BackgroundTask(shutil.rmtree, workdir, True),
    )


@app.post("/separate/instrumental")
def separate_instrumental(file: UploadFile = File(...)):
    workdir = Path(tempfile.mkdtemp(prefix="sep-"))
    try:
        suffix = Path(file.filename or "").suffix or ".mp3"
        src = workdir / f"input{suffix}"
        with src.open("wb") as out_file:
            shutil.copyfileobj(file.file, out_file)

        mp3 = separate_to_mp3(src, workdir)
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        raise

    return mp3_response(mp3, workdir, "instrumental.mp3")


def youtube_video_id(url: str) -> str:
    """Extract the video ID from any common YouTube link form."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host not in YOUTUBE_HOSTS:
        raise HTTPException(status_code=400, detail="Only YouTube links are supported")

    if host == "youtu.be":
        candidate = parsed.path.lstrip("/").split("/")[0]
    else:
        parts = parsed.path.strip("/").split("/")
        if parts[0] in ("shorts", "live", "embed") and len(parts) > 1:
            candidate = parts[1]
        else:
            candidate = (parse_qs(parsed.query).get("v") or [""])[0]

    if not VIDEO_ID_RE.fullmatch(candidate):
        raise HTTPException(status_code=400, detail="Could not find a video ID in the link")
    return candidate


def download_youtube_audio(url: str, workdir: Path) -> tuple[Path, str]:
    """Download the best audio stream of a YouTube video. Returns (path, title)."""
    # Rebuild a plain watch URL so playlist/radio parameters (list=, start_radio=)
    # do not route the link to the playlist extractor
    url = f"https://www.youtube.com/watch?v={youtube_video_id(url)}"

    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(workdir / "input.%(ext)s"),
        "noplaylist": True,
        "allowed_extractors": ["youtube"],
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            # Read metadata first so overly long videos are rejected before downloading
            info = ydl.extract_info(url, download=False)
            duration = info.get("duration") or 0
            if duration > MAX_DURATION_SECONDS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Video is too long (max {MAX_DURATION_SECONDS // 60} minutes)",
                )
            if info.get("is_live"):
                raise HTTPException(status_code=400, detail="Live streams are not supported")

            info = ydl.process_ie_result(info, download=True)
            src = Path(ydl.prepare_filename(info))
    except yt_dlp.utils.DownloadError as e:
        msg = str(e).removeprefix("ERROR: ").strip()
        raise HTTPException(status_code=400, detail=f"Could not download video: {msg}")

    if not src.exists():
        raise HTTPException(status_code=500, detail="Download produced no file")
    return src, info.get("title") or "track"


@app.post("/separate/instrumental/youtube")
def separate_instrumental_youtube(req: YoutubeRequest):
    workdir = Path(tempfile.mkdtemp(prefix="sep-"))
    try:
        src, title = download_youtube_audio(req.url.strip(), workdir)
        mp3 = separate_to_mp3(src, workdir)
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        raise

    # Strip characters that are invalid in file names on common systems
    safe_title = "".join(c for c in title if c not in '\\/:*?"<>|').strip() or "track"
    return mp3_response(mp3, workdir, f"{safe_title} - instrumental.mp3")
