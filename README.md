# 🌍 CutCarbon

* **GitHub Repository:** [github.com/Shubham523/CFootprints](https://github.com/Shubham523/CFootprints)
* **Live Deployment:** [cutcarbon.web.app](https://cutcarbon.web.app)
* **LinkedIn Post:** [LinkedIn Showcase Post](https://www.linkedin.com/posts/shubham-523_promptwars-challenge-cutcarbon)

---

## Problem Statement
Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

---

## Chosen Vertical
We chose the **Carbon Footprint Awareness** platform vertical. The objective is to design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

---

## Approach and Logic
Our approach is built on a highly optimized full-stack architecture combining a modern frontend, a lightweight backend, and state-of-the-art Generative AI:
* **Vite & React**: A fast, client-side React 19 application built with Vite, utilizing dynamic environments and responsive Tailwind CSS layout cards. Code-split routes via `React.lazy` and `Suspense` minimize initial bundle size. Presentational components use `React.memo` to avoid unnecessary re-renders.
* **FastAPI**: A Python backend hosting API endpoints that handles data validations via Pydantic model schemas and enables secure cross-origin resource sharing (CORS).
* **Gemini API**: Leverages the Google GenAI SDK (Gemini 2.5 Flash model) to parse unstructured data (such as grocery receipt photos or items lists) and perform automated carbon emissions calculations.
* **Firebase**: Firebase Authentication provides secure, persistence-backed user session authentication, and Cloud Firestore acts as the real-time database storage engine with security rules enforcing user-scoped access.

---

## Tech Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite 6, Tailwind CSS 4 | Fast SPA with code splitting & responsive UI |
| **Backend** | Python 3, FastAPI, Pydantic | REST API with schema validation |
| **AI/ML** | Google GenAI SDK, Gemini 2.5 Flash | Vision-based receipt parsing & CO₂ scoring |
| **Auth** | Firebase Authentication (Google OAuth) | Secure user session management |
| **Database** | Cloud Firestore | Real-time, user-scoped document storage |
| **Hosting** | Firebase Hosting | CDN-backed global deployment |
| **Testing** | Vitest, React Testing Library | Unit & component tests |
| **Build Optimization** | vite-plugin-remove-console, manual chunks | Zero debug artifacts in production |

---

## Features
* 📷 **AI Receipt Scanner** — Upload a grocery receipt photo and Gemini Vision automatically identifies items and calculates their embodied CO₂ impact.
* 🏃 **Google Fit Sync** — Pull activity segments from Google Fit to log transport emissions and fitness carbon offsets in real-time.
* 🌱 **Transit Swap** — Convert solo car trips to public transit or carpooling alternatives to see how much CO₂ you can save.
* ⚖️ **Net-Zero Balance** — A live visual scale showing the ratio of your carbon emissions vs. carbon savings for the week.
* 📊 **Insights Dashboard** — Weekly line charts and category breakdowns with configurable daily targets.
* 🔒 **Secure by Default** — Environment-variable-based secrets, Firestore security rules, and `strict-origin-when-cross-origin` referrer policy.

---

## How the Solution Works
1. **Upload or Capture**: The user snaps a picture or uploads an image of a grocery receipt/food items through the interface.
2. **AI Inference**: The frontend sends the image to the FastAPI server, which routes it through the Gemini 2.5 Vision pipeline.
3. **Structured Extraction**: Gemini identifies each food item, extracts its weight/quantity, and evaluates the embodied CO₂ impact.
4. **Calculations and Feedback**: The backend returns structured calculations to the client, which instantly renders the carbon footprint logs on the user's dashboard and updates their Net-Zero Balance scale in real-time.
5. **Fitness Sync**: Activity segments from Google Fit are deduplicated, smart-merged (consecutive same-activity sessions within 60s gaps are folded), and persisted to Firestore with both emitted and prevented CO₂ values.
6. **Transit Conversion**: Users can retroactively mark car trips as transit/carpool, recalculating emissions and visualizing savings.

---

## Any Assumptions Made
* **Stable Connection**: The user has a stable internet connection to communicate with the FastAPI backend and allow the Gemini AI API to return inference results.
* **Valid Receipts**: Uploaded files contain reasonably legible images of food items or receipts for the vision model to accurately parse carbon footprints.
* **Authentication Integrity**: The Firestore Security Rules and Client SDK rely on Google/Firebase Auth to validate current user sessions securely.
* **Emission Factors**: CO₂ emission constants (0.192 kg/km for solo car, 0.082 for bus, 0.041 for train/metro) are based on published average values and may vary by region.

---

## Security Considerations
* All API keys and Firebase configuration values are loaded from environment variables (`VITE_*`), never hardcoded in source.
* `.env`, `.env.local`, and `serviceAccountKey.json` are gitignored.
* Firestore Security Rules restrict all reads/writes to authenticated users accessing their own documents.
* The `referrer` meta tag is set to `strict-origin-when-cross-origin` to prevent leaking URLs to third-party origins.
* Production builds strip all `console.*` statements and `debugger` keywords via Vite plugins.
