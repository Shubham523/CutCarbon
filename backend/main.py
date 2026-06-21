import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict
from google import genai
from PIL import Image
import io
import json
import os
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv()

# Initialize Firebase Admin
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize Gemini
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize FastAPI
app = FastAPI()

# Enable CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://cutcarbon.web.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "API Gateway is running!"}

class SyncFitnessRequest(BaseModel):
    user_id: str
    duration_min: float
    activity_type: str

@app.post("/api/sync-fitness")
def sync_fitness(payload: SyncFitnessRequest):
    user_id = payload.user_id
    duration_min = payload.duration_min
    activity_type = payload.activity_type
    print(f"--- BACKEND HIT! User ID: {user_id} | Activity: {activity_type} | Duration: {duration_min} min ---")

    # kg CO₂ saved per minute vs. equivalent car travel (avg car = ~0.021 kg CO₂/min at 60 km/h)
    # Rates reflect the offset: energy the body uses vs. what a car would have emitted.
    CO2_RATE = {
        "cycling":           0.019,  # ~8 MET, very efficient per km
        "running":           0.014,  # offset vs. car; runner still emits ~0.007 kg/min
        "walking":           0.008,  # slower, lower offset per minute
        "hiking":            0.010,
        "swimming":          0.012,
        "strength_training": 0.005,  # no transport offset, but metabolic benefit
        "sleep":             0.000,  # no active offset
        "unknown":           0.008,  # default to walking rate
    }
    rate = CO2_RATE.get(activity_type, CO2_RATE["unknown"])
    co2_saved = round(duration_min * rate, 3)

    log_ref = db.collection("users").document(user_id).collection("logs").document()
    log_ref.set({
        "user_id":           user_id,
        "type":              "fitness",
        "activity":          activity_type,
        "duration_min":      duration_min,
        "co2_saved_kg":      co2_saved,
        "co2_score_kg":      0.0,          # fitness never emits — only transport does
        "co2_prevented_kg":  co2_saved,    # mirrors co2_saved_kg for frontend accumulator
        "rate_used":         rate,
        "category":          "Fitness",
        "icon":              "🏃",
        # item_name is the strict grouping key — NEVER include duration here
        "item_name":         activity_type.replace('_', ' ').title(),
        # description is the human-readable display string (not used for grouping)
        "description":       f"{activity_type.replace('_', ' ').title()} · {round(duration_min, 1)} min",
        "timestamp":         firestore.SERVER_TIMESTAMP,
    })
    print(f"🔥 Written to Firestore! Path is: users/{user_id}/logs/{log_ref.id}")
    print(f"   → {activity_type} for {duration_min} min → {co2_saved} kg CO₂ saved (rate: {rate} kg/min)")

    return {
        "status":        "success",
        "activity_type": activity_type,
        "duration_min":  duration_min,
        "co2_saved_kg":  co2_saved,
        "doc_id":        log_ref.id,
    }

@app.post("/api/scan-groceries")
async def scan_groceries(user_id: str, file: UploadFile = File(...)):
    contents = await file.read()
    
    # Placeholder logic
    extracted_items = ["Apples (Local)", "Oat Milk"]
    estimated_footprint = 1.4 
    
    log_ref = db.collection("users").document(user_id).collection("logs").document()
    log_ref.set({
        "type": "grocery",
        "items": extracted_items,
        "co2_emitted_kg": estimated_footprint,
        "timestamp": firestore.SERVER_TIMESTAMP
    })
    
    return {"status": "success", "items_found": extracted_items, "co2_emitted_kg": estimated_footprint}

@app.post("/api/process-grocery")
async def process_grocery(user_id: str, file: UploadFile = File(...)):
    print(f"--- GROCERY HIT! User ID: {user_id} | File: {file.filename} ---")

    # Read and decode the uploaded image bytes
    contents = await file.read()
    print(f"   → Received {len(contents)} bytes")
    try:
        image = Image.open(io.BytesIO(contents))

        # Run Gemini vision analysis
        prompt = """
Scan the entire image and identify ALL distinct physical products, groceries, or electronics present.
For each distinct object found, calculate its embodied or farm-to-fork carbon footprint 
(the estimated CO2e in kg generated from production, manufacturing, raw materials, agriculture, and global transport). 
Do NOT return 0 simply because an object is currently inactive, unplugged, or food. If exact data is 
unavailable, provide a scientifically backed estimate based on the item's material composition, weight, and food type.

Return ONLY a raw JSON Array of objects matching this exact format with no extra text:
[
  {
    "detected_name": "CMF by Nothing Buds",
    "co2_score_kg": 25.0
  },
  {
    "detected_name": "Granny Smith Apple",
    "co2_score_kg": 0.06
  }
]
"""
        response = gemini_client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=[image, prompt],
        )
        response_text = response.text.strip()
        print(f"   → Gemini raw response: {response_text}")

        # Strip markdown fences if the model wrapped the JSON in ```json ... ```
        if response_text.startswith("```"):
            # Remove starting ```json or ``` and ending ```
            lines = response_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines).strip()

        # Parse JSON — fall back to safe defaults if the model misbehaves
        try:
            data = json.loads(response_text)
            if isinstance(data, list):
                parsed_items = []
                for item in data:
                    detected_name = item.get("detected_name", "Scanned Item")
                    co2_score_kg = float(item.get("co2_score_kg", 0.0))
                    parsed_items.append({
                        "detected_name": detected_name,
                        "co2_score_kg": co2_score_kg
                    })
            else:
                # Fallback if the AI returned a single object instead of a list
                detected_name = data.get("detected_name", "Scanned Item")
                co2_score_kg = float(data.get("co2_score_kg", 0.0))
                parsed_items = [{
                    "detected_name": detected_name,
                    "co2_score_kg": co2_score_kg
                }]
        except (json.JSONDecodeError, ValueError) as e:
            print(f"   ⚠ JSON parse failed: {e} | raw: {response_text}")
            parsed_items = [{
                "detected_name": "Scanned Item",
                "co2_score_kg": 0.0
            }]

        print(f"   → Parsed items: {parsed_items}")

        return {
            "status": "success",
            "items":  parsed_items,
        }
    except Exception as e:
        print("--- DETAILED BACKEND CRASH LOG ---")
        print(str(e))
        return {"status": "error", "message": f"Backend failed: {str(e)}"}


# ---------------------------------------------------------------------------
# Settings endpoint
# ---------------------------------------------------------------------------

class SettingsPayload(BaseModel):
    user_id: str
    settings: Dict[str, Any]


@app.post("/api/settings")
def save_settings(payload: SettingsPayload):
    """Persist user preferences under users/{user_id} using merge so existing
    fields (e.g. logs subcollection) are never overwritten."""
    print(f"--- SETTINGS HIT! User ID: {payload.user_id} | Payload: {payload.settings} ---")

    db.collection("users").document(payload.user_id).set(
        {"settings": payload.settings},
        merge=True,
    )
    print(f"🔥 Settings saved for user: {payload.user_id}")

    return {"status": "success", "saved": payload.settings}
