/**
 * src/utils/activityParser.js
 *
 * Shared pure utility functions for processing Google Fit / Firestore activity logs.
 * Imported by both ActivityFeed (display) and StickyActions (sync pipeline).
 */

// ── Transit emission constants ─────────────────────────────────────────────────

/**
 * CO₂ emission factors (kg per passenger-km).
 * solo_car is the baseline — all "prevented" calculations measure savings against it.
 */
export const TRANSIT_EMISSIONS = {
  solo_car:  0.192, // Baseline — average petrol car, solo occupancy
  bus:       0.082, // Average city bus per passenger-km
  train:     0.041, // Intercity / commuter train per passenger-km
  metro:     0.041, // Urban metro / subway per passenger-km
};

/** Average travel speed (km/h) for duration → distance conversion. */
export const AVG_SPEED_KMH = 40;

/**
 * Unified transit impact calculator.
 * Returns both actual CO₂ emitted and CO₂ prevented (vs. driving solo).
 *
 * @param {number} durationMs   — trip duration in milliseconds
 * @param {'solo_car'|'carpool'|'bus'|'train'|'metro'} mode
 * @param {number} passengers   — headcount, only used when mode === 'carpool'
 * @returns {{ emitted_kg: number, prevented_kg: number }}
 */
export function calculateTransitImpact(durationMs, mode = 'solo_car', passengers = 1) {
  const distanceKm       = (durationMs / (1000 * 60 * 60)) * AVG_SPEED_KMH;
  const baselineEmission = distanceKm * TRANSIT_EMISSIONS.solo_car;

  let actualEmission;
  if (mode === 'carpool') {
    actualEmission = baselineEmission / Math.max(1, passengers);
  } else if (TRANSIT_EMISSIONS[mode] !== undefined) {
    actualEmission = distanceKm * TRANSIT_EMISSIONS[mode];
  } else {
    actualEmission = baselineEmission; // unknown mode → no saving claimed
  }

  return {
    emitted_kg:   parseFloat(Math.max(0, actualEmission).toFixed(2)),
    prevented_kg: parseFloat(Math.max(0, baselineEmission - actualEmission).toFixed(2)),
  };
}

// ── Timestamp resolver ────────────────────────────────────────────────────────

/**
 * Normalises any timestamp representation into a JS Date.
 * Handles: ISO string | JS Date | Firestore { seconds, nanoseconds } | epoch ms number.
 */
export function resolveDate(ts) {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') return new Date(ts);
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'object' && 'seconds' in ts) return new Date(ts.seconds * 1000);
  return new Date(ts);
}

// ── processAndMergeActivities ─────────────────────────────────────────────────

/**
 * Takes a raw array of activity objects (from Google Fit parsing or Firestore)
 * and returns a clean, deduplicated, smart-merged array.
 *
 * A. Deduplicate — keyed by exact timestamp ms so duplicate Firestore writes
 *    (e.g. two syncs in the same session) don't inflate the feed.
 * B. Sort chronologically oldest → newest.
 * C. Smart merge — consecutive segments of the same `item_name` whose start-to-end
 *    gap is ≤60 000 ms are folded into one block. The merged block's duration
 *    absorbs the gap; CO₂ fields accumulate; the original chunks are stored in
 *    `sub_blocks` so the accordion can show the individual sessions.
 *
 * @param {Array} rawActivities
 * @returns {Array}
 */
export function processAndMergeActivities(rawActivities) {
  if (!rawActivities?.length) return [];

  // A. Deduplicate by exact timestamp (ms)
  const uniqueMap = new Map();
  rawActivities.forEach((act) => {
    const key = resolveDate(act.timestamp).getTime();
    uniqueMap.set(key, act);
  });
  const unique = Array.from(uniqueMap.values());

  // B. Sort oldest → newest
  unique.sort((a, b) => resolveDate(a.timestamp) - resolveDate(b.timestamp));

  // C. Smart merge
  const merged = [];
  for (const act of unique) {
    if (merged.length === 0) {
      merged.push({ ...act, sub_blocks: [act] });
      continue;
    }

    const last      = merged[merged.length - 1];
    const lastEndMs = resolveDate(last.timestamp).getTime() + (last.duration_ms ?? 0);
    const timeGap   = resolveDate(act.timestamp).getTime() - lastEndMs;

    // Require same item_name AND same calendar day — never merge across day boundaries.
    if (
      last.item_name   === act.item_name   &&
      last.date_string === act.date_string &&
      Math.abs(timeGap) <= 60_000
    ) {
      // Merge: extend duration to cover the gap + the new segment
      last.duration_ms      += (act.duration_ms ?? 0) + Math.max(0, timeGap);
      last.co2_score_kg      = parseFloat(((last.co2_score_kg ?? 0)     + (act.co2_score_kg ?? 0)).toFixed(3));
      last.co2_prevented_kg  = parseFloat(((last.co2_prevented_kg ?? 0) + (act.co2_prevented_kg ?? 0)).toFixed(3));
      last.sub_blocks.push(act);
    } else {
      merged.push({ ...act, sub_blocks: [act] });
    }
  }

  return merged;
}

// ── groupActivities ───────────────────────────────────────────────────────────

/**
 * Groups an array of (optionally merged) activity objects by "date_string — item_name".
 * Only `fitness` and `transport` log types are grouped; everything else is ignored
 * so callers can render a separate flat list for groceries etc.
 *
 * Each group object:
 * {
 *   key, date_string, item_name, type, icon,
 *   total_duration_ms, total_prevented, total_emitted,
 *   entries: [...activity objects with sub_blocks]
 * }
 *
 * @param {Array} logs
 * @returns {Object}  keyed by groupKey
 */
export function groupActivities(logs) {
  if (!logs?.length) return {};

  return logs.reduce((acc, log) => {
    if (log.type !== 'fitness' && log.type !== 'transport') return acc;

    const dateLabel = log.date_string
      ?? resolveDate(log.timestamp).toLocaleDateString('en-US', {
           weekday: 'long', month: 'short', day: 'numeric',
         });
    // Use item_name ONLY as the grouping key — never fall through to description,
    // which may contain human-readable strings like "Walking · 30 min" from the backend.
    const actLabel  = log.item_name ?? 'Activity';
    const groupKey  = `${dateLabel} — ${actLabel}`;

    if (!acc[groupKey]) {
      acc[groupKey] = {
        key:               groupKey,
        date_string:       dateLabel,
        item_name:         actLabel,
        type:              log.type,
        icon:              log.icon ?? (log.type === 'transport' ? '🚗' : '🏃'),
        total_duration_ms: 0,
        total_prevented:   0,
        total_emitted:     0,
        entries:           [],
      };
    }

    const g = acc[groupKey];
    g.total_duration_ms += (log.duration_ms ?? 0);

    // STRICT routing by type — fitness saves emissions, transport emits them.
    // Never add co2_score_kg to a fitness group or co2_prevented_kg to transport.
    if (log.type === 'transport') {
      g.total_emitted   += (log.co2_score_kg    ?? 0);
    } else if (log.type === 'fitness') {
      g.total_prevented += (log.co2_prevented_kg ?? 0);
    }

    g.entries.push(log);
    return acc;
  }, {});
}
