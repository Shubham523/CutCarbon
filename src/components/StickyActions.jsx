import { useState, useRef } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { processAndMergeActivities } from '../utils/activityParser';

// ── Activity code → human-readable label ─────────────────────────────────────
const ACTIVITY_TYPES = {
  0: 'In Vehicle',
  1: 'Biking',
  2: 'On Foot',
  3: 'Still',
  4: 'Unknown',
  7: 'Walking',
  8: 'Running',
  9: 'Aerobics',
  16: 'Road Biking',
  17: 'Spinning',
  58: 'Treadmill',
  72: 'Sleeping',
  89: 'Walking (Treadmill)',
};

// ── Activity code → Python backend string ─────────────────────────────────────
const BACKEND_MAP = {
  1: 'cycling',
  2: 'walking',           // On Foot
  7: 'walking',
  8: 'running',
  9: 'running',           // Aerobics
  10: 'hiking',
  15: 'swimming',
  16: 'cycling',           // Road Biking
  17: 'strength_training', // Spinning
  58: 'running',           // Treadmill
  72: 'sleep',
  89: 'walking',           // Walking (Treadmill)
};

// ── Emission constants ────────────────────────────────────────────────────────

/**
 * CO₂ emission factors (kg per km) per transport mode.
 * solo_car is the baseline used to calculate how much a transit/carpool trip "saves".
 */
const TRANSIT_EMISSIONS = {
  solo_car: 0.192, // Baseline — average petrol car, solo occupancy
  bus: 0.082, // Average city bus per passenger-km
  train: 0.041, // Intercity / commuter train per passenger-km
  metro: 0.041, // Urban metro / subway per passenger-km
  carpool_2: 0.096, // Solo car shared between 2 people (192 / 2)
  carpool_3: 0.064, // Solo car shared between 3 people (192 / 3)
};

// Average travel speed (km/h) used to convert trip duration into distance.
// Used for both motorised estimates (code 0) and transit calculations.
const AVG_SPEED_KMH = 40;

// Average speeds (km/h) for active transport modes, used to estimate the
// equivalent car distance that was replaced by active travel.
const ACTIVE_SPEEDS_KMH = {
  1: 15, // Biking
  2: 5, // On Foot
  7: 5, // Walking
  8: 10, // Running
  16: 20, // Road Biking
};

/**
 * CO₂ emitted (kg) by a motorised (solo car) trip of this duration.
 * Only Google Fit activity code 0 (In Vehicle) produces a non-zero value.
 * Uses the solo_car factor from TRANSIT_EMISSIONS as the single source of truth.
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
 * CO₂ prevented (kg) by choosing active transport instead of driving solo.
 * Assumes the equivalent distance would have been covered by car at AVG_SPEED_KMH.
 * Returns 0 for activity codes not in ACTIVE_SPEEDS_KMH (e.g. gym workouts).
 */
const getPreventedCO2 = (activityCode, durationMs) => {
  const speed = ACTIVE_SPEEDS_KMH[activityCode];
  if (!speed) return 0.0;
  const hours = durationMs / (1000 * 60 * 60);
  const distanceKm = hours * speed;
  return parseFloat((distanceKm * TRANSIT_EMISSIONS.solo_car).toFixed(2));
};

/**
 * CO₂ actually emitted (kg) by a public transit or carpool trip.
 *
 * @param {'bus'|'train'|'metro'|'carpool_2'|'carpool_3'|'solo_car'} mode
 * @param {number} durationMs  — trip duration in milliseconds
 */
const getTransitCO2 = (mode, durationMs) => {
  const factor = TRANSIT_EMISSIONS[mode] ?? TRANSIT_EMISSIONS.solo_car;
  const hours = durationMs / (1000 * 60 * 60);
  const distanceKm = hours * AVG_SPEED_KMH;
  return parseFloat((distanceKm * factor).toFixed(2));
};

/**
 * CO₂ prevented (kg) by choosing a transit/carpool mode instead of driving solo.
 * Calculated as: (solo_car_factor − transit_factor) × distance_km.
 * Returns 0 if the mode is already solo_car (no saving).
 *
 * @param {'bus'|'train'|'metro'|'carpool_2'|'carpool_3'} mode
 * @param {number} durationMs  — trip duration in milliseconds
 */
const getTransitPreventedCO2 = (mode, durationMs) => {
  const factor = TRANSIT_EMISSIONS[mode] ?? TRANSIT_EMISSIONS.solo_car;
  const saving = TRANSIT_EMISSIONS.solo_car - factor;
  if (saving <= 0) return 0.0;
  const hours = durationMs / (1000 * 60 * 60);
  const distanceKm = hours * AVG_SPEED_KMH;
  return parseFloat((distanceKm * saving).toFixed(2));
};


/**
 * Unified transit impact calculator.
 *
 * Returns both the actual CO₂ emitted and the CO₂ prevented (vs. driving solo)
 * for a single trip, handling three distinct modes:
 *   - "solo_car"  → baseline; prevented = 0
 *   - "carpool"   → solo-car emission divided by number of passengers
 *   - any key in TRANSIT_EMISSIONS (bus, train, metro …) → uses per-passenger factor
 *
 * @param {number} durationMs  — trip duration in milliseconds
 * @param {'solo_car'|'carpool'|'bus'|'train'|'metro'} mode  — travel mode
 * @param {number} passengers  — relevant only for mode === 'carpool' (min 1)
 * @returns {{ emitted_kg: number, prevented_kg: number }}
 */
const calculateTransitImpact = (durationMs, mode = 'solo_car', passengers = 1) => {
  const distanceKm = (durationMs / (1000 * 60 * 60)) * AVG_SPEED_KMH;
  const baselineEmission = distanceKm * TRANSIT_EMISSIONS.solo_car;

  let actualEmission;

  if (mode === 'carpool') {
    // Divide the full car emission by headcount — works for any party size
    actualEmission = baselineEmission / Math.max(1, passengers);
  } else if (TRANSIT_EMISSIONS[mode] !== undefined) {
    // Public transit — use per-passenger-km factor from the map
    actualEmission = distanceKm * TRANSIT_EMISSIONS[mode];
  } else {
    // Unknown mode — conservatively default to solo car (no saving claimed)
    actualEmission = baselineEmission;
  }

  const preventedEmission = Math.max(0, baselineEmission - actualEmission);

  return {
    emitted_kg: parseFloat(actualEmission.toFixed(2)),
    prevented_kg: parseFloat(preventedEmission.toFixed(2)),
  };
};


// processAndMergeActivities is imported from src/utils/activityParser.js


export default function StickyActions({ onAction, user }) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [detailedActivities, setDetailedActivities] = useState([]);

  const groceryInputRef = useRef(null);

  // ── Grocery analysis handler ───────────────────────────────────────────────
  const handleGroceryAnalysis = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    console.log('Uploading grocery image:', file.name);
    const formData = new FormData();
    formData.append('file', file);

    setAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/process-grocery?user_id=${user.uid}`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      const data = await response.json();
      console.log('Grocery processing response:', data);

      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        alert('Analysis completed, but no items were detected.');
        return;
      }

      // Write each item to Firestore as a batch
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
          co2_score_kg: typeof item.co2_score_kg === 'number' ? item.co2_score_kg : 0,
        });
      });
      await batch.commit();
      console.log(`🔥 Written ${items.length} item(s) to Firestore from frontend!`);

      alert(`${items.length} items analyzed and added!`);
      onAction(`🛒 ${items.length} items analyzed and added!`);
    } catch (error) {
      console.error('Grocery upload error:', error);
      alert('Failed to analyze image. Please try again.');
    } finally {
      setAnalyzing(false);
      e.target.value = ''; // allow re-selecting the same file
    }
  };

  // ── Google Fit sync handler ────────────────────────────────────────────────
  const handleSync = async () => {
    console.log('--- Sync Button Clicked! ---');
    console.log('Current user prop value:', user);

    if (!user) {
      alert('Frontend Blocked: User object is null or undefined!');
      console.error('handleSync: no authenticated user — aborting fetch.');
      return;
    }

    const token = localStorage.getItem('google_fit_token');
    if (!token) {
      console.error('Token missing — user may not have granted Fitness permissions.');
    }

    setSyncing(true);
    try {
      // ── STEP 1: Build 7-day time window ──────────────────────────────────
      const endTimeMs = new Date().getTime();
      const startTimeMs = endTimeMs - (7 * 24 * 60 * 60 * 1000);
      console.log('👉 STEP 1: Querying Google Fit for last 7 days...', { startTimeMs, endTimeMs });

      // ── STEP 2: Fetch activity segments (one bucket = one workout) ────────
      const aggregateRes = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aggregateBy: [{ dataTypeName: 'com.google.activity.segment' }],
            bucketByActivitySegment: {
              minDurationMillis: 60000, // ignore segments shorter than 1 minute
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
      console.log('👉 STEP 2: Raw aggregate payload:', aggregateData);

      // ── STEP 2.5: Fetch existing logs from Firestore to deduplicate ────────
      const q = query(
        collection(db, 'users', user.uid, 'logs'),
        where('type', 'in', ['fitness', 'transport'])
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

      // ── STEP 3: Extract all meaningful activity segments ──────────────────
      // Reads activityCode from the nested dataset structure (more reliable than
      // bucket.activity.activityType for bucketByActivitySegment responses).
      // STRICT RULE: only drop null, Still (3), Unknown (4), and Sleeping (72).
      // In Vehicle (0), Biking (1), Walking (7), Running (8), etc. all pass through.
      const detailedActivities = (aggregateData.bucket ?? []).map((b) => {
        let activityCode = null;

        b.dataset.forEach((ds) => {
          if (ds.point && ds.point.length > 0 && ds.point[0].value.length >= 2) {
            activityCode = ds.point[0].value[0].intVal;
          }
        });

        // STRICT filter — only exclude these three passive/ambiguous codes
        if (activityCode === null || activityCode === 3 || activityCode === 4 || activityCode === 72) {
          return null;
        }

        const start = new Date(parseInt(b.startTimeMillis));
        const durationMs = parseInt(b.endTimeMillis) - parseInt(b.startTimeMillis);

        if (durationMs < 60000) return null; // ignore segments under 1 minute

        return {
          type: activityCode === 0 ? 'transport' : 'fitness',
          item_name: ACTIVITY_TYPES[activityCode] ?? `Activity Code ${activityCode}`,
          co2_score_kg: getEstimatedCO2(activityCode, durationMs),
          co2_prevented_kg: getPreventedCO2(activityCode, durationMs),
          duration_ms: durationMs,
          timestamp: start, // EXACT activity start time — not Date.now()
          date_string: start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
          activityCode, // keep raw code for downstream routing
        };
      }).filter(Boolean);

      console.log('👉 STEP 3: Raw detailed activities:', detailedActivities);

      // Deduplicate: filter out activities whose exact start time matches an existing log
      const filteredActivities = [];
      for (const act of detailedActivities) {
        const startMs = act.timestamp.getTime();
        if (existingStartTimes.has(startMs)) {
          console.log(`Skipping duplicate activity at timestamp ${startMs}: ${act.item_name}`);
          continue;
        }
        filteredActivities.push(act);
      }

      // ── STEP 3a: Deduplicate + smart-merge close segments of the same type
      const mergedActivities = processAndMergeActivities(filteredActivities);
      console.log('👉 STEP 3a: After dedup + merge:', mergedActivities);

      // Persist merged activities to React state
      setDetailedActivities(mergedActivities);

      if (mergedActivities.length === 0) {
        alert('No new activity segments to sync.');
        setSyncing(false);
        return;
      }

      // ── STEP 3.5: Route — transport → Firestore, fitness → Firestore + backend
      const transportSegments = mergedActivities.filter((a) => a.type === 'transport');
      const fitnessSegments = mergedActivities.filter((a) => a.type === 'fitness');

      /**
       * Normalises a detailedActivities entry into the exact Firestore document
       * shape that the App.jsx onSnapshot listener maps over.
       * Replaces the JS Date timestamp with serverTimestamp() for server-side ordering.
       */
      const toFirestoreDoc = (a) => ({
        user_id: user.uid,
        type: a.type,             // 'transport' | 'fitness'
        category: a.type === 'transport' ? 'Transport' : 'Fitness',
        icon: a.type === 'transport' ? '🚗' : '🏃',
        // Store BOTH description (display) and item_name (grouping key) explicitly.
        description: a.item_name,
        item_name: a.item_name,        // strict ACTIVITY_TYPES string e.g. "Walking"
        co2_score_kg: a.co2_score_kg,     // 0 for fitness, >0 for transport
        co2_prevented_kg: a.co2_prevented_kg, // >0 for active travel, 0 for transport
        duration_ms: a.duration_ms,
        date_string: a.date_string,      // e.g. 'Monday, Jun 17'
        // EXACT activity start time from Google Fit startTimeMillis.
        // Timestamp.fromDate preserves the historical date — DO NOT use serverTimestamp().
        timestamp: Timestamp.fromDate(a.timestamp),
      });


      // Write transport logs to Firestore
      if (transportSegments.length > 0) {
        const transportWrites = transportSegments.map((a) =>
          addDoc(collection(db, 'users', user.uid, 'logs'), toFirestoreDoc(a))
            .then((ref) => {
              console.log(`   🔥 Transport logged: ${a.co2_score_kg} kg CO₂ → logs/${ref.id}`);
              return a.co2_score_kg;
            }),
        );

        const co2Values = await Promise.all(transportWrites);
        const totalTransportCO2 = co2Values.reduce((s, v) => s + v, 0).toFixed(2);
        console.log(`👉 STEP 3.6: ${transportSegments.length} transport log(s) written — ${totalTransportCO2} kg CO₂`);
        onAction(`🚗 ${transportSegments.length} car trip${transportSegments.length > 1 ? 's' : ''} logged — ${totalTransportCO2} kg CO₂`);
      }

      // Write fitness logs to Firestore (before backend call so data is always persisted
      // even if the CO₂ calculation endpoint is temporarily unavailable)
      if (fitnessSegments.length > 0) {
        const fitnessWrites = fitnessSegments.map((a) =>
          addDoc(collection(db, 'users', user.uid, 'logs'), toFirestoreDoc(a))
            .then((ref) => {
              console.log(`   🔥 Fitness logged: ${a.item_name}, ${(a.duration_ms / 60000).toFixed(1)} min → logs/${ref.id}`);
            }),
        );
        await Promise.all(fitnessWrites);
        console.log(`👉 STEP 3.7: ${fitnessSegments.length} fitness segment(s) written to Firestore`);
      }

      // Accumulate fitness durations per activity type for the backend call
      const activityDurations = {};
      for (const a of fitnessSegments) {
        activityDurations[a.activityCode] = (activityDurations[a.activityCode] ?? 0) + a.duration_ms;
      }

      console.log('👉 STEP 3.7: Fitness durations (ms):', activityDurations);

      // ── STEP 4: Forward dominant fitness activity to Python backend ───────
      const dominantEntry = Object.entries(activityDurations)
        .sort(([, a], [, b]) => b - a)[0];

      if (!dominantEntry) {
        // Transport-only sync — no fitness backend call needed, already done above.
        setSyncing(false);
        return;
      }

      const [dominantType, totalDurMs] = dominantEntry;
      const dominantCode = Number(dominantType);
      const mappedActivityStr = BACKEND_MAP[dominantCode] ?? 'unknown';
      const activityLabel = ACTIVITY_TYPES[dominantCode] ?? 'Other Activity';
      const durationMin = parseFloat((totalDurMs / 60000).toFixed(2));

      console.log(`👉 STEP 4: Dominant="${activityLabel}" (code ${dominantCode}) → backend="${mappedActivityStr}", ${durationMin} min`);
      console.log('👉 STEP 4 (all segments):', Object.entries(activityDurations).map(
        ([c, ms]) => ({ name: ACTIVITY_TYPES[c] ?? c, durMin: (ms / 60000).toFixed(1) }),
      ));

      const url = `${API_BASE_URL}/api/sync-fitness?user_id=${user.uid}&duration_min=${durationMin}&activity_type=${mappedActivityStr}`;
      console.log('👉 STEP 4.5: Firing backend request...', url);
      const response = await fetch(`${API_BASE_URL}/api/sync-fitness?user_id=${user.uid}`, { method: 'POST' });
      console.log('👉 STEP 4.6: Backend response status:', response.status);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error(`Sync failed [${response.status}]:`, errBody);
        return;
      }

      const data = await response.json();
      console.log('👉 STEP 5: Received payload from Python:', data);
      onAction(`✅ Fitness synced — ${durationMin} min ${activityLabel} · saved ${data.co2_saved_kg} kg CO₂`);

    } catch (error) {
      console.error('❌ Exception in handleSync:', error);
      let handled = false;
      try {
        if (error && typeof error.text === 'function') {
          const errorText = await error.text();
          if (error.status === 400 && errorText.toLowerCase().includes('unknown datasource')) {
            alert('No activity data found. Please ensure Google Fit is set up on your device and you have recorded at least one activity.');
            handled = true;
          }
        }
      } catch (e) {
        console.error('Error reading response body in catch:', e);
      }
      if (!handled) {
        alert('Could not reach Google Fit. Make sure you granted Fitness permissions at sign-in.');
      }
    } finally {
      setSyncing(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center gap-3 px-4 py-4 bg-white border-t border-gray-100">
      {/* Hidden file input — triggered by button click via ref */}
      <input
        type="file"
        ref={groceryInputRef}
        accept="image/*"
        onChange={handleGroceryAnalysis}
        className="hidden"
      />

      <button
        id="analyze-impact-btn"
        onClick={() => groceryInputRef.current.click()}
        disabled={analyzing}
        aria-label="Analyze grocery receipt to log food emissions"
        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white text-sm font-semibold rounded-full
          hover:bg-green-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {analyzing ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">📷</span>
        )}
        {analyzing ? 'Analyzing image...' : 'Analyze Impact'}
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
