from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from fastapi import Request
import asyncio
import tempfile
from fastapi import Query
import requests
import json
from datetime import datetime
import os
from fastapi import UploadFile, File
import shutil

# Assistant modules
from rag_engine import load_rag_index, retrieve_context
from whisper_transcript import whisper_transcript
from chat import initialize_llm, get_gemma_response
from caption import init_blip, caption_image
from parse_weather import get_latest_weather_file, summarize_weather

# --- Config ---
DISTANCE_THRESHOLD = 1.2

# --- FastAPI setup ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Models ---
llm = None
blip_processor = None
blip_model = None
rag_index = None
rag_docs = None
session_histories = {}


# --- Startup Initialization ---
@app.on_event("startup")
async def startup_models():
    global llm, blip_processor, blip_model, rag_index, rag_docs
    print("🚀 Loading models...")
    llm, (blip_processor, blip_model), (rag_index, rag_docs) = await asyncio.gather(
        asyncio.to_thread(initialize_llm),
        asyncio.to_thread(init_blip),
        load_rag_index()
    )
    print("✅ All models initialized!")

@app.get("/health")
def health():
    return {"status": "Assistant is live and ready 🤖"}


@app.post("/text-chat")
async def text_chat(user_input: str = Form(...), session_id: str = Form("default")):
    try:
        context, distances = retrieve_context(user_input, rag_index, rag_docs)
        context_text = "\n- ".join(context) if distances[0] < DISTANCE_THRESHOLD else None

        # Get or create chat history
        chat_history = session_histories.get(session_id, [])

        # Get streaming generator with context and history
        stream = get_gemma_response(llm, chat_history, user_input, context_text)

        # Save updated history
        session_histories[session_id] = chat_history

        return StreamingResponse(stream(), media_type="text/plain")

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/voice-chat")
async def voice_chat(audio: UploadFile = File(...), session_id: str = Form("default")):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(await audio.read())
            audio_path = tmp.name

        user_text = whisper_transcript(audio_path)
        os.remove(audio_path)

        context, distances = retrieve_context(user_text, rag_index, rag_docs)
        context_text = "\n- ".join(context) if distances[0] < DISTANCE_THRESHOLD else None

        chat_history = session_histories.get(session_id, [])
        stream = get_gemma_response(llm, chat_history, user_text, context_text)
        session_histories[session_id] = chat_history

        headers = {"x-user-transcript": user_text}
        return StreamingResponse(stream(), media_type="text/plain", headers=headers)

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/image-chat")
async def image_chat(image: UploadFile = File(...), user_input: str = Form(...), session_id: str = Form("default")):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_img:
            tmp_img.write(await image.read())
            img_path = tmp_img.name

        caption = caption_image(blip_processor, blip_model, img_path)
        os.remove(img_path)

        combined_input = f"The user said: {user_input}\nThe image appears to show: {caption}"
        context, distances = retrieve_context(combined_input, rag_index, rag_docs)
        context_text = "\n- ".join(context) if distances[0] < DISTANCE_THRESHOLD else None

        chat_history = session_histories.get(session_id, [])
        stream = get_gemma_response(llm, chat_history, combined_input, context_text)
        session_histories[session_id] = chat_history

        headers = {"x-image-caption": caption}
        return StreamingResponse(stream(), media_type="text/plain", headers=headers)

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.get("/marine-weather")
def get_marine_weather(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location")
):
    url = (
        f"https://marine-api.open-meteo.com/v1/marine"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=wave_height,wind_wave_height,sea_surface_temperature"
    )

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

    except requests.exceptions.RequestException as e:
        return {"error": f"Network error: {e}"}

    except json.JSONDecodeError:
        return {"error": "Invalid JSON received from marine API."}

    if "error" in data:
        return {"error": data.get("reason", "Unknown API error.")}

    LOG_DIRECTORY = "weather_logs"
    os.makedirs(LOG_DIRECTORY, exist_ok=True)

    # 🧹 Clean up old files
    for filename in os.listdir(LOG_DIRECTORY):
        if filename.endswith(".json"):
            os.remove(os.path.join(LOG_DIRECTORY, filename))

    # 📝 Save latest file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(LOG_DIRECTORY, f"weather_{timestamp}.json")

    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"✅ Weather data logged: {file_path}")
    return data

@app.get("/marine-summary")
def get_marine_summary():
    try:
        path = get_latest_weather_file()
        summary = summarize_weather(path)
        return {"summary": summary}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/upload-doc")
async def upload_document(file: UploadFile = File(...)):
    try:
        os.makedirs("rag_folder", exist_ok=True)
        save_path = os.path.join("rag_folder", file.filename)
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"📥 Uploaded to: {save_path}")
        return {"message": f"File {file.filename} uploaded successfully."}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/reset-session")
def reset_session():
    global chat_history
    chat_history = []  # Clear it!
    print("🔄 Chat history reset due to frontend reload")
    return {"status": "reset"}