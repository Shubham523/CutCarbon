import { useState, useRef } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { processAndMergeActivities } from "../utils/activityParser";

// ── Activity code → human-readable label ─────────────────────────────────────
const ACTIVITY_TYPES = {
  0: "In Vehicle",
  1: "Biking",
  2: "On Foot",
  3: "Still",
  4: "Unknown",
  7: "Walking",
  8: "Running",
  9: "Aerobics",
  16: "Road Biking",
  17: "Spinning",
  58: "Treadmill",
  72: "Sleeping",
  89: "Walking (Treadmill)",
};

// ── Activity code → Python backend string ─────────────────────────────────────
const BACKEND_MAP = {
  1: "cycling",
  2: "walking",
  7: "walking",
  8: "running",
  9: "running",
  10: "hiking",
  15: "swimming",
  16: "cycling",
  17: "strength_training",
  58: "running",
  72: "sleep",
  89: "walking",
};

// ── Emission constants ────────────────────────────────────────────────────────
const TRANSIT_EMISSIONS = {
  solo_car: 0.192,
  bus: 0.082,
  train: 0.041,
  metro: 0.041,
  carpool_2: 0.096,
  carpool_3: 0.064,
};

const AVG_SPEED_KMH = 40;

const ACTIVE_SPEEDS_KMH = {
  1: 15,
  2: 5,
  7: 5,
  8: 10,
  16: 20,
};

/**
 * Calculates estimated CO2 emissions for a given duration.
 *
 * @param {number} activityCode - Google Fit activity code.
 * @param {number} durationMs - Duration in milliseconds.
 * @returns {number} - CO2 emissions in kg.
 */
const getEstimatedCO2 = (activityCode, durationMs) => {
  if (activityCode === 0) {
    const hours = durationMs / (1000 * 60 * 60);
    const distanceKm = hours * AVG_SPEED_KMH;
    return parseFloat((distanceKm * TRANSIT_EMISSIONS.solo_car).toFixed(2));
  }
  return 0.0;
};

/**
 * Calculates prevented CO2 emissions for active transportation.
 *
 * @param {number} activityCode - Google Fit activity code.
 * @param {number} durationMs - Duration in milliseconds.
 * @returns {number} - Prevented CO2 in kg.
 */
const getPreventedCO2 = (activityCode, durationMs) => {
  const speed = ACTIVE_SPEEDS_KMH[activityCode];
  if (!speed) return 0.0;
  const hours = durationMs / (1000 * 60 * 60);
  const distanceKm = hours * speed;
  return parseFloat((distanceKm * TRANSIT_EMISSIONS.solo_car).toFixed(2));
};

/**
 * Custom hook encapsulating the sync, upload, and batch save actions for StickyActions.
 *
 * @param {Object} props - The hook properties.
 * @param {Function} props.onAction - Toast message callback.
 * @param {Object} props.user - The current authenticated user.
 * @returns {Object} - React ref, status states, and action handlers.
 */
export default function useStickyActions({ onAction, user }) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const groceryInputRef = useRef(null);

  const handleGroceryAnalysis = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const formData = new FormData();
    formData.append("file", file);

    setAnalyzing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/process-grocery?user_id=${user.uid}`,
        {
          method: "POST",
          body: formData,
        },
      );
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      const data = await response.json();

      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        alert("Analysis completed, but no items were detected.");
        return;
      }

      const batch = writeBatch(db);
      items.forEach((item) => {
        const logRef = doc(collection(db, `users/${user.uid}/logs`));
        batch.set(logRef, {
          user_id: user.uid,
          timestamp: serverTimestamp(),
          type: "scanned_product",
          category: "Groceries",
          icon: "🛒",
          item_name: item.detected_name || "Scanned Item",
          description: item.detected_name || "Scanned Item",
          co2_score_kg:
            typeof item.co2_score_kg === "number" ? item.co2_score_kg : 0,
        });
      });
      await batch.commit();

      alert(`${items.length} items analyzed and added!`);
      onAction(`🛒 ${items.length} items analyzed and added!`);
    } catch (error) {
      alert("Failed to analyze image. Please try again.");
    } finally {
      setAnalyzing(false);
      e.target.value = "";
    }
  };

  const handleSync = async () => {
    if (!user) {
      alert("Frontend Blocked: User object is null or undefined!");
      return;
    }

    const token = localStorage.getItem("google_fit_token");
    if (!token) {
      // Gracefully continue, token might not be needed if offline sync isn't set up
    }

    setSyncing(true);
    try {
      const endTimeMs = new Date().getTime();
      const startTimeMs = endTimeMs - 7 * 24 * 60 * 60 * 1000;

      const aggregateRes = await fetch(
        "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aggregateBy: [{ dataTypeName: "com.google.activity.segment" }],
            bucketByActivitySegment: {
              minDurationMillis: 60000,
            },
            startTimeMillis: startTimeMs,
            endTimeMillis: endTimeMs,
          }),
        },
      );

      if (!aggregateRes.ok) {
        throw aggregateRes;
      }

      const aggregateData = await aggregateRes.json();

      const q = query(
        collection(db, "users", user.uid, "logs"),
        where("type", "in", ["fitness", "transport"]),
      );
      const querySnapshot = await getDocs(q);
      const existingStartTimes = new Set();
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.timestamp) {
          const ms = data.timestamp.toDate
            ? data.timestamp.toDate().getTime()
            : new Date(data.timestamp).getTime();
          existingStartTimes.add(ms);
        }
      });

      const detailedActivities = (aggregateData.bucket ?? [])
        .map((b) => {
          let activityCode = null;

          b.dataset.forEach((ds) => {
            if (
              ds.point &&
              ds.point.length > 0 &&
              ds.point[0].value.length >= 2
            ) {
              activityCode = ds.point[0].value[0].intVal;
            }
          });

          if (
            activityCode === null ||
            activityCode === 3 ||
            activityCode === 4 ||
            activityCode === 72
          ) {
            return null;
          }

          const start = new Date(parseInt(b.startTimeMillis));
          const durationMs =
            parseInt(b.endTimeMillis) - parseInt(b.startTimeMillis);

          if (durationMs < 60000) return null;

          return {
            type: activityCode === 0 ? "transport" : "fitness",
            item_name:
              ACTIVITY_TYPES[activityCode] ?? `Activity Code ${activityCode}`,
            co2_score_kg: getEstimatedCO2(activityCode, durationMs),
            co2_prevented_kg: getPreventedCO2(activityCode, durationMs),
            duration_ms: durationMs,
            timestamp: start,
            date_string: start.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            }),
            activityCode,
          };
        })
        .filter(Boolean);

      const filteredActivities = [];
      for (const act of detailedActivities) {
        const startMs = act.timestamp.getTime();
        if (existingStartTimes.has(startMs)) {
          continue;
        }
        filteredActivities.push(act);
      }

      const mergedActivities = processAndMergeActivities(filteredActivities);

      if (mergedActivities.length === 0) {
        alert("No new activity segments to sync.");
        setSyncing(false);
        return;
      }

      const transportSegments = mergedActivities.filter(
        (a) => a.type === "transport",
      );
      const fitnessSegments = mergedActivities.filter(
        (a) => a.type === "fitness",
      );

      const toFirestoreDoc = (a) => ({
        user_id: user.uid,
        type: a.type,
        category: a.type === "transport" ? "Transport" : "Fitness",
        icon: a.type === "transport" ? "🚗" : "🏃",
        description: a.item_name,
        item_name: a.item_name,
        co2_score_kg: a.co2_score_kg,
        co2_prevented_kg: a.co2_prevented_kg,
        duration_ms: a.duration_ms,
        date_string: a.date_string,
        timestamp: Timestamp.fromDate(a.timestamp),
      });

      if (transportSegments.length > 0) {
        const transportWrites = transportSegments.map((a) =>
          addDoc(
            collection(db, "users", user.uid, "logs"),
            toFirestoreDoc(a),
          ).then((ref) => a.co2_score_kg),
        );

        const co2Values = await Promise.all(transportWrites);
        const totalTransportCO2 = co2Values
          .reduce((s, v) => s + v, 0)
          .toFixed(2);
        onAction(
          `🚗 ${transportSegments.length} car trip${transportSegments.length > 1 ? "s" : ""} logged — ${totalTransportCO2} kg CO₂`,
        );
      }

      if (fitnessSegments.length > 0) {
        const fitnessWrites = fitnessSegments.map((a) =>
          addDoc(collection(db, "users", user.uid, "logs"), toFirestoreDoc(a)),
        );
        await Promise.all(fitnessWrites);
      }

      const activityDurations = {};
      for (const a of fitnessSegments) {
        activityDurations[a.activityCode] =
          (activityDurations[a.activityCode] ?? 0) + a.duration_ms;
      }

      const dominantEntry = Object.entries(activityDurations).sort(
        ([, a], [, b]) => b - a,
      )[0];

      if (!dominantEntry) {
        setSyncing(false);
        return;
      }

      const [dominantType, totalDurMs] = dominantEntry;
      const dominantCode = Number(dominantType);
      const mappedActivityStr = BACKEND_MAP[dominantCode] ?? "unknown";
      const activityLabel = ACTIVITY_TYPES[dominantCode] ?? "Other Activity";
      const durationMin = parseFloat((totalDurMs / 60000).toFixed(2));

      const response = await fetch(`${API_BASE_URL}/api/sync-fitness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.uid,
          duration_min: durationMin,
          activity_type: mappedActivityStr,
        }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      onAction(
        `✅ Fitness synced — ${durationMin} min ${activityLabel} · saved ${data.co2_saved_kg} kg CO₂`,
      );
    } catch (error) {
      let handled = false;
      try {
        if (error && typeof error.text === "function") {
          const errorText = await error.text();
          if (
            error.status === 400 &&
            errorText.toLowerCase().includes("unknown datasource")
          ) {
            alert(
              "No activity data found. Please ensure Google Fit is set up on your device and you have recorded at least one activity.",
            );
            handled = true;
          }
        }
      } catch (e) {
        // Suppress secondary parsing failures
      }
      if (!handled) {
        alert(
          "Could not reach Google Fit. Make sure you granted Fitness permissions at sign-in.",
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  return {
    analyzing,
    syncing,
    groceryInputRef,
    handleGroceryAnalysis,
    handleSync,
  };
}
