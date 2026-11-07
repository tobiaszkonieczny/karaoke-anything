FROM python:3.11-slim

# ffmpeg is needed for MP3 decoding/encoding, libsndfile for WAV output
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Spleeter downloads models into MODEL_PATH on first use
ENV MODEL_PATH=/models
COPY app.py .

EXPOSE 8000
# One worker only: the model is loaded once and requests are serialized with a lock
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
