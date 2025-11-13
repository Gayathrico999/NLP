import os
import pathlib
import httpx
from dotenv import load_dotenv

load_dotenv()

user_home_env = os.getenv("USER_HOME")
if not user_home_env:
    raise RuntimeError("USER_HOME not set in .env")

pathlib.Path.home = lambda: pathlib.Path(user_home_env)

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, List, Optional
from datetime import datetime
from pathlib import Path
import json
from bson import ObjectId

# Gemini & Local generation imports
from gemini_generate import generate_questions_with_gemini
from generate_local import generate_questions_with_local_llm

# MongoDB setup
from pymongo import MongoClient
mongo_client = MongoClient("mongodb://localhost:27017/")
mongo_collection = mongo_client["pollgen"]["pollquestions"]
manual_collection = mongo_client["pollgen"]["manualquestions"]

BACKEND_API_URL = os.getenv("BACKEND_API_URL") or "http://localhost:3000"
LETTER_TO_INDEX = {chr(65 + i): i for i in range(26)}

# FastAPI app setup
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health/root endpoint
@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "pollgen-llm",
        "endpoints": ["/settings", "/save_manual_poll", "/ws/llm", "/docs"]
    }

# === Temporary fallback settings ===
current_settings = {
    "source": "gemini",
    "quantity": 1,
    "types": ["mcq"],
    "contextRange": "latest",
    "customRange": None,
    "frequency": 1
}

# === Models ===
class Settings(BaseModel):
    source: Literal["gemini", "ollama"]
    frequency: Optional[int] = None
    quantity: int
    types: Optional[List[Literal["mcq", "truefalse", "opinionpoll"]]] = None
    contextRange: Optional[str] = None
    customRange: Optional[str] = None

class Option(BaseModel):
    id: str
    text: str

class PollData(BaseModel):
    title: str
    types: str
    options: List[Option]
    timerEnabled: bool
    timerDuration: int
    timerUnit: str
    shortAnswerPlaceholder: Optional[str] = ""

def sanitize_room_code(value):
    if not value:
        return ""
    return "".join(ch for ch in value if str(ch).isalnum()).upper()


def strip_option_text(option):
    if not isinstance(option, str):
        return ""
    cleaned = option.strip()
    if len(cleaned) >= 2 and cleaned[1] in (")", ".") and cleaned[0].isalpha():
        return cleaned[2:].strip()
    return cleaned


def prepare_backend_questions(raw_questions):
    prepared = []
    for item in raw_questions or []:
        if not isinstance(item, dict):
            continue
        question_text = item.get("question")
        if not isinstance(question_text, str) or not question_text.strip():
            continue
        options_raw = item.get("options") or []
        options = []
        for opt in options_raw:
            text = strip_option_text(opt)
            if text:
                options.append(text)
        if not options:
            continue
        correct_value = item.get("correct_answer")
        correct_index = None
        if isinstance(correct_value, str) and correct_value.strip():
            letter = correct_value.strip().upper()[0]
            correct_index = LETTER_TO_INDEX.get(letter)
        if correct_index is not None and (correct_index < 0 or correct_index >= len(options)):
            correct_index = None
        difficulty_value = item.get("difficulty")
        difficulty = "Medium"
        if isinstance(difficulty_value, str) and difficulty_value.strip():
            difficulty = difficulty_value.strip().capitalize()
        metadata = {}
        concept_value = item.get("concept")
        explanation_value = item.get("explanation")
        if isinstance(concept_value, str) and concept_value.strip():
            metadata["concept"] = concept_value.strip()
            metadata["tags"] = [concept_value.strip()]
        if isinstance(explanation_value, str) and explanation_value.strip():
            metadata["explanation"] = explanation_value.strip()
        payload = {
            "question": question_text.strip(),
            "options": options,
            "difficulty": difficulty,
            "status": "approved",  # Auto-approve questions
            "timeLimit": 30,
            "source": "ai",
            "confidence": 90  # High confidence to trigger auto-approval
        }
        if correct_index is not None:
            payload["correctAnswerIndex"] = correct_index
        if metadata:
            payload["metadata"] = metadata
        prepared.append(payload)
    return prepared


async def push_questions_to_backend(room_code, raw_questions):
    if not room_code:
        print("⚠️ No room code provided, skipping question push")
        return
    prepared = prepare_backend_questions(raw_questions)
    if not prepared:
        print("⚠️ No valid questions to push")
        return
    
    url = f"{BACKEND_API_URL.rstrip('/')}/api/rooms/{room_code}/questions/ai"
    print(f"🚀 Pushing {len(prepared)} questions to {url}")
    print("📝 First question preview:", json.dumps(prepared[0], indent=2))
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json={"questions": prepared})
            print(f"📡 Backend response status: {response.status_code}")
            if response.status_code >= 300:
                print("❌ Failed to push AI questions:", response.status_code)
                print("Response text:", response.text)
            else:
                print("✅ Successfully pushed questions to backend")
                response_data = response.json()
                print("Backend response:", json.dumps(response_data, indent=2))
    except Exception as exc:
        print("💥 Error pushing AI questions to backend:", str(exc))

# === API Endpoints ===
@app.post("/settings")
def save_settings(settings: Settings):
    global current_settings
    current_settings = settings.dict()
    print("Settings saved:", current_settings)
    return {"message": "Settings saved"}

@app.get("/settings")
def get_settings():
    return current_settings or {"message": "No settings found"}

@app.post("/save_manual_poll")
async def save_poll(data: PollData):
    result = manual_collection.insert_one(data.dict())
    return {"message": "Poll saved", "id": str(result.inserted_id)}

# === WebSocket LLM Handler ===
@app.websocket("/ws/llm")
async def ws_llm(websocket: WebSocket):
    await websocket.accept()
    print("LLM WebSocket connected")

    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                data = json.loads(raw_message)

                meeting_id = data.get("meetingId")
                room_code = sanitize_room_code(meeting_id)

                if not isinstance(data.get("transcripts"), list):
                    print("Invalid or missing 'transcripts' array.")
                    continue

                transcript_text = " ".join(seg.get("text", "") for seg in data["transcripts"] if seg.get("text"))

                if not transcript_text:
                    print("No 'text' field in incoming transcript")
                    continue

                print("Transcript received:\n", transcript_text[:1000])

                generator = {
                    "gemini": generate_questions_with_gemini,
                    "ollama": generate_questions_with_local_llm
                }.get(current_settings.get("source"))

                if not generator:
                    print("No valid generator found in settings:", current_settings)
                    continue

                questions = generator(transcript_text, current_settings)
                if not questions:
                    print("Generation failed or returned empty list")
                    continue

                await push_questions_to_backend(room_code, questions)

                print("Generated Questions:\n", json.dumps(questions, indent=2))

                now = datetime.utcnow()
                enriched = []
                for q in questions:
                    if not isinstance(q, dict):
                        continue
                    question_text = q.get("question")
                    if not isinstance(question_text, str) or not question_text.strip():
                        continue
                    option_values = q.get("options") or []
                    options_clean = []
                    for option in option_values:
                        text = strip_option_text(option)
                        if text:
                            options_clean.append(text)
                    if not options_clean:
                        continue
                    correct_value = q.get("correct_answer")
                    correct_index = None
                    if isinstance(correct_value, str) and correct_value.strip():
                        letter = correct_value.strip().upper()[0]
                        correct_index = LETTER_TO_INDEX.get(letter)
                        if correct_index is not None and correct_index >= len(options_clean):
                            correct_index = None
                    explanation_value = q.get("explanation")
                    concept_value = q.get("concept")
                    metadata = {}
                    if isinstance(concept_value, str) and concept_value.strip():
                        metadata["concept"] = concept_value.strip()
                    if isinstance(explanation_value, str) and explanation_value.strip():
                        metadata["explanation"] = explanation_value.strip()
                    record = {
                        "question": question_text.strip(),
                        "options": options_clean,
                        "correct_answer": correct_value,
                        "correct_answer_index": correct_index,
                        "explanation": explanation_value,
                        "difficulty": q.get("difficulty"),
                        "concept": concept_value,
                        "meeting_id": meeting_id,
                        "room_code": room_code,
                        "created_at": now,
                        "is_active": True,
                        "is_approved": False
                    }
                    if metadata:
                        record["metadata"] = metadata
                    enriched.append(record)

                if enriched:
                    mongo_collection.insert_many(enriched)
                    print(f"Saved {len(enriched)} questions to MongoDB")

            except Exception as e:
                print("Error processing transcript:", e)

    except Exception:
        print("LLM WebSocket disconnected")

# === Helper ===
def convert_object_ids(data):
    if isinstance(data, list):
        return [convert_object_ids(i) for i in data]
    elif isinstance(data, dict):
        return {k: convert_object_ids(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    return data
