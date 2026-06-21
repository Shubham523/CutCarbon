# 🌍 CutCarbon — PromptWars Challenge 3

### 🔗 Quick Links
* **GitHub Repository:** [github.com/Shubham523/CFootprints](https://github.com/Shubham523/CFootprints)
* **Live Deployment:** [cutcarbon.web.app](https://cutcarbon.web.app)
* **LinkedIn Post:** [LinkedIn Showcase Post](https://www.linkedin.com/posts/shubham-523_promptwars-challenge-cutcarbon)

---

## Problem Statement
Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

---

## Solution Overview
CutCarbon is an AI-powered environmental analytics dashboard designed to empower users to **track** their daily activity footprints, **reduce** their environmental impact through minor lifestyle adjustments, and actively shrink their global **carbon footprint**. 

By feeding raw fitness data, transit modes, and scanned grocery receipt items into an intelligent pipeline, CutCarbon generates **personalized insights** and actionable target recommendations (e.g. comparing daily emissions against the global 1.5°C threshold of 7 kg CO₂/day).

---

## Key Features
* 🏃‍♂️ **Automated Fitness Sync**: Integrates with Google Fit data to calculate carbon offsets achieved by walking, running, or cycling compared to driving solo.
* 🛒 **AI Grocery Scanner**: Leverages Gemini Vision API to analyze food items or receipt uploads and instantly calculates their embodied carbon footprint.
* 🚗 **Interactive Transit Log**: Tracks motorized transport emissions and dynamically logs savings achieved when carpooling or using public transit.
* 📊 **Dynamic Daily Analytics**: Real-time interactive progress bars and historical charts visualize targets versus actual emissions.
* 🔒 **Security Hardened**: Protected via RFC 9116 compliant `security.txt`, search-engine safe `robots.txt`, secure client-side Firestore Rules, and automatic production console log stripping.

---

## Tech Stack
* **Frontend**: React (v19), Vite (v6), Tailwind CSS
* **Backend**: FastAPI (Python), Google GenAI SDK (Gemini 2.5 Flash)
* **Database & Auth**: Cloud Firestore, Firebase Authentication
* **Hosting**: Firebase Hosting (Frontend), Render (Backend)

---

## Getting Started Locally

### 1. Frontend Setup
```bash
# Clone the repository
git clone https://github.com/Shubham523/CFootprints.git
cd CFootprints

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows

# Install packages
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env

# Run FastAPI server
uvicorn main:app --reload
```
