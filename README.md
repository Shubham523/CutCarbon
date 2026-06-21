# 🌍 CutCarbon

* **GitHub Repository:** [github.com/Shubham523/CFootprints](https://github.com/Shubham523/CFootprints)
* **Live Deployment:** [cutcarbon.web.app](https://cutcarbon.web.app)
* **LinkedIn Post:** [LinkedIn Showcase Post](https://www.linkedin.com/posts/shubham-523_promptwars-challenge-cutcarbon)

---

## Chosen Vertical
We chose the **Carbon Footprint Awareness** platform vertical. The objective is to design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

---

## Approach and Logic
Our approach is built on a highly optimized full-stack architecture combining a modern frontend, a lightweight backend, and state-of-the-art Generative AI:
* **Vite & React**: A fast, client-side React 19 application built with Vite, utilizing dynamic environments and responsive Tailwind CSS layout cards.
* **FastAPI**: A Python backend hosting API endpoints that handles data validations via Pydantic model schemas and enables secure cross-origin resource sharing (CORS).
* **Gemini API**: Leverages the Google GenAI SDK (Gemini 2.5 Flash model) to parse unstructured data (such as grocery receipt photos or items lists) and perform automated carbon emissions calculations.
* **Firebase**: Firebase Authentication provides secure, persistence-backed user session authentication, and Cloud Firestore acts as the real-time database storage engine.

---

## How the Solution Works
1. **Upload or Capture**: The user snaps a picture or uploads an image of a grocery receipt/food items through the interface.
2. **AI Inference**: The frontend sends the image to the FastAPI server, which routes it through the Gemini 2.5 Vision pipeline.
3. **Structured Extraction**: Gemini identifies each food item, extracts its weight/quantity, and evaluates the embodied CO₂ impact.
4. **Calculations and Feedback**: The backend returns structured calculations to the client, which instantly renders the carbon footprint logs on the user's dashboard and updates their Net-Zero Balance scale in real-time.

---

## Any Assumptions Made
* **Stable Connection**: The user has a stable internet connection to communicate with the FastAPI backend and allow the Gemini AI API to return inference results.
* **Valid Receipts**: Uploaded files contain reasonably legible images of food items or receipts for the vision model to accurately parse carbon footprints.
* **Authentication Integrity**: The Firestore Security Rules and Client SDK rely on Google/Firebase Auth to validate current user sessions securely.
