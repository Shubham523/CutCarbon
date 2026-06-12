import { useState, useRef } from 'react';

export default function StickyActions({ onAction, user }) {
  const [scanning, setScanning] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const groceryInputRef = useRef(null);

  const handleGroceryFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    console.log("Uploading grocery image:", file.name);
    const formData = new FormData();
    formData.append("file", file);

    setScanning(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/process-grocery?user_id=${user.uid}`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      console.log("Grocery processing response:", data);
      alert(`Scan successful! CO2 Score: ${data.co2_score_kg} kg`);
      onAction(`🛒 Groceries logged — ${data.co2_score_kg} kg CO₂`);
    } catch (error) {
      console.error("Grocery upload error:", error);
    } finally {
      setScanning(false);
      e.target.value = ''; // allow re-selecting the same file
    }
  };

  const handleSync = async () => {
    // --- DEBUG ---
    console.log("--- Sync Button Clicked! ---");
    console.log("Current user prop value:", user);

    // Guard: user must be authenticated
    if (!user) {
      alert("Frontend Blocked: User object is null or undefined!");
      console.error('handleSync: no authenticated user — aborting fetch.');
      return;
    }

    // Retrieve the Google OAuth token stored at sign-in
    const token = localStorage.getItem("google_fit_token");
    if (!token) {
      console.error("Token missing — falling back to manual test values.");
    }

    setSyncing(true);
    try {
      // --- STEP 1: Build today's time range in milliseconds ---
      const now = Date.now();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startMs = startOfDay.getTime();
      const endMs = now;

      console.log("👉 STEP 1: Querying Google Fit for today's data...", { startMs, endMs });

      // --- STEP 1.5: Fetch today's recorded activity sessions ---
      const startTime = startOfDay.toISOString();
      const endTime = new Date(endMs).toISOString();

      // Lifted out so they're accessible when building the backend URL
      let sessionStartMs  = null;
      let sessionEndMs    = null;
      let sessionActivity = null;

      const sessionsResponse = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${startTime}&endTime=${endTime}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        console.log("👉 STEP 1.5: Raw sessions payload:", sessionsData);

        const sessions = sessionsData.session ?? [];
        if (sessions.length > 0) {
          const latest = sessions[sessions.length - 1];
          sessionStartMs  = Number(latest.startTimeMillis);
          sessionEndMs    = Number(latest.endTimeMillis);
          sessionActivity = latest.activityType;
          console.log("👉 STEP 1.5: Latest session found:", {
            activityType:    sessionActivity,
            startTimeMillis: sessionStartMs,
            endTimeMillis:   sessionEndMs,
          });
        } else {
          setSyncing(false);
          alert("No active fitness sessions recorded today! Go log a walk or cycle in Google Fit.");
          return;
        }
      } else {
        console.error("Sessions API error:", sessionsResponse.status);
      }

      // Map Google Fit activityType integer → readable string for the backend
      const ACTIVITY_MAP = {
        1:  "cycling",
        7:  "walking",
        8:  "running",
        9:  "running",   // running (treadmill)
        10: "hiking",
        15: "swimming",
        17: "strength_training",
        72: "sleep",
      };
      const mappedActivityStr = ACTIVITY_MAP[sessionActivity] ?? "unknown";

      // Duration in minutes from the latest session (0 if no session found)
      const durationMin = sessionStartMs && sessionEndMs
        ? parseFloat(((sessionEndMs - sessionStartMs) / 60000).toFixed(2))
        : 0;

      console.log(`👉 STEP 1.6: Activity="${mappedActivityStr}", Duration=${durationMin} min`);

      // --- STEP 2: Forward session data to local Python backend ---
      const url = `http://127.0.0.1:8000/api/sync-fitness?user_id=${user.uid}&duration_min=${durationMin}&activity_type=${mappedActivityStr}`;
      console.log("👉 STEP 2: Firing backend request now...", url);
      const response = await fetch(url, { method: "POST" });
      console.log("👉 STEP 2.5: Backend response status:", response.status);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error(`Sync failed [${response.status}]:`, errBody);
        return;
      }

      const data = await response.json();
      console.log("👉 STEP 3: Received Data Payload from Python:", data);
      alert(`Successfully synced! ${mappedActivityStr} for ${durationMin} min | Saved ${data.co2_saved_kg} kg CO₂ | Doc ID: ${data.doc_id || 'N/A'}`);
      onAction(`✅ Fitness synced — ${durationMin} min ${mappedActivityStr} · saved ${data.co2_saved_kg} kg CO₂`);

    } catch (error) {
      console.error("❌ STEP 4: Exception caught in block:", error);
      console.error('Backend connection failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center gap-3 px-4 py-4 bg-white border-t border-gray-100">
      {/* Hidden file input — triggered by button click via ref */}
      <input
        type="file"
        ref={groceryInputRef}
        accept="image/*"
        onChange={handleGroceryFileChange}
        className="hidden"
      />

      <button
        id="scan-groceries-btn"
        onClick={() => groceryInputRef.current.click()}
        disabled={scanning}
        aria-label="Scan grocery receipt to log food emissions"
        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white text-sm font-semibold rounded-full
          hover:bg-green-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {scanning ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">📷</span>
        )}
        {scanning ? 'Analyzing...' : 'Scan Groceries'}
      </button>

      <button
        id="sync-fitness-btn"
        onClick={handleSync}
        disabled={syncing}
        aria-label="Sync fitness data to log activity emissions"
        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-full
          hover:bg-gray-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {syncing ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">🏃‍♂️</span>
        )}
        {syncing ? 'Syncing…' : 'Sync Fitness'}
      </button>
    </div>
  );
}
