import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from spleeter.separator import Separator

app = FastAPI()

# Load the 2-stem model once at startup (vocals + accompaniment)
separator = Separator("spleeter:2stems")

# running several TensorFlow jobs at once on a CPU
# just makes each of them slower
inference_lock = threading.Lock()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/separate/instrumental")
def separate_instrumental(file: UploadFile = File(...)):
    workdir = Path(tempfile.mkdtemp(prefix="sep-"))
    try:
        suffix = Path(file.filename or "").suffix or ".mp3"
        src = workdir / f"input{suffix}"
        with src.open("wb") as out_file:
            shutil.copyfileobj(file.file, out_file)

        out_dir = workdir / "out"
        with inference_lock:
            separator.separate_to_file(str(src), str(out_dir))

        # Spleeter writes out/<input name>/accompaniment.wav
        wav = out_dir / "input" / "accompaniment.wav"
        if not wav.exists():
            raise HTTPException(status_code=500, detail="Separation produced no output")

        # Convert to MP3 to keep the response small
        mp3 = workdir / "instrumental.mp3"
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-q:a", "2", str(mp3)],
            check=True,
            capture_output=True,
        )
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        raise

    # Remove the temp directory after the response has been sent
    return FileResponse(
        mp3,
        media_type="audio/mpeg",
        filename="instrumental.mp3",
        background=BackgroundTask(shutil.rmtree, workdir, True),
    )
