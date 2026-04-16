"""
Local Whisper transcription server using faster-whisper.
Exposes a POST /transcribe endpoint compatible with the frontend.

Usage:
    cd whisper_server
    pip install -r requirements.txt
    python server.py

The server will download the model on first run (~150 MB for 'base').
"""

import io
import time
import tempfile
import os

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# ── Configuration ──────────────────────────────────────────────
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "large-v3")  # tiny, base, small, medium, large-v3
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")       # cpu or cuda
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE", "int8") # int8 for CPU, float16 for CUDA
HOST = os.environ.get("WHISPER_HOST", "127.0.0.1")
PORT = int(os.environ.get("WHISPER_PORT", "8787"))

# ── Load model at startup ─────────────────────────────────────
print(f"[Whisper] Loading model '{MODEL_SIZE}' on {DEVICE} ({COMPUTE_TYPE})...")
start = time.time()

from faster_whisper import WhisperModel

model = WhisperModel(
    MODEL_SIZE,
    device=DEVICE,
    compute_type=COMPUTE_TYPE,
)

print(f"[Whisper] Model loaded in {time.time() - start:.1f}s")

# ── FastAPI app ────────────────────────────────────────────────
app = FastAPI(title="Local Whisper Transcription Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """
    Accepts an audio file (webm, wav, mp3, etc.) and returns transcription.
    Response format matches what the frontend expects.
    """
    start_time = time.time()

    # Read the uploaded file into memory
    audio_bytes = await file.read()

    if len(audio_bytes) < 1000:
        return JSONResponse(content={
            "text": "",
            "duration": 0,
            "segments": []
        })

    # Write to a temp file because faster-whisper needs a file path
    suffix = ".webm"
    if file.filename:
        _, ext = os.path.splitext(file.filename)
        if ext:
            suffix = ext

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(audio_bytes)
        tmp.flush()
        tmp.close()

        # Transcribe
        segments_iter, info = model.transcribe(
            tmp.name,
            language="en",
            beam_size=3,
            best_of=3,
            temperature=0.0,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=300,
                speech_pad_ms=200,
            ),
        )

        # Collect segments
        segments_list = []
        full_text_parts = []

        for seg in segments_iter:
            segments_list.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
            })
            full_text_parts.append(seg.text.strip())

        full_text = " ".join(full_text_parts).strip()
        elapsed = time.time() - start_time

        print(f"[Whisper] Transcribed {len(audio_bytes)} bytes in {elapsed:.2f}s: \"{full_text[:80]}...\"")

        return JSONResponse(content={
            "text": full_text,
            "duration": round(info.duration, 2),
            "segments": segments_list,
        })

    finally:
        # Clean up temp file
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


if __name__ == "__main__":
    print(f"[Whisper] Starting server on http://{HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
