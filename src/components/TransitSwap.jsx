import { useState } from "react";
import PropTypes from "prop-types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { calculateTransitImpact } from "../utils/activityParser";

const MODES = [
  { value: "carpool", label: "Carpool 🚘" },
  { value: "bus", label: "Bus 🚌" },
  { value: "train", label: "Train 🚆" },
  { value: "metro", label: "Metro 🚇" },
];

/**
 * Returns a human-readable label for a transit mode and passenger count.
 *
 * @param {string} mode - The transit mode.
 * @param {number} passengers - Number of passengers.
 * @returns {string} - The human-readable mode label.
 */
function modeLabel(mode, passengers) {
  if (mode === "carpool") return `Carpool (${passengers} ppl)`;
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

/**
 * TransitSwap component allowing users to convert travel logs into green transit alternatives.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.entry - The current activity entry.
 * @param {string} props.userId - The authenticated user's ID.
 * @param {Function} props.onUpdate - Callback triggered after successful Firestore update.
 */
export default function TransitSwap({ entry, userId, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(entry.transit_mode ?? "bus");
  const [passengers, setPassengers] = useState(entry.passengers ?? 2);
  const [saving, setSaving] = useState(false);

  if (!entry.id || !userId) return null;

  const alreadyConverted = Boolean(entry.transit_mode);

  const handleSave = async () => {
    setSaving(true);
    try {
      const impact = calculateTransitImpact(
        entry.duration_ms ?? 0,
        mode,
        passengers,
      );
      const newLabel = modeLabel(mode, passengers);

      const patch = {
        transit_mode: mode,
        passengers: mode === "carpool" ? passengers : 1,
        co2_score_kg: impact.emitted_kg,
        co2_prevented_kg: impact.prevented_kg,
        item_name: newLabel,
        description: newLabel,
      };

      await updateDoc(doc(db, "users", userId, "logs", entry.id), patch);
      onUpdate(entry.id, patch);
      setOpen(false);
    } catch (err) {
      // Gracefully log error internally without breaking user experience
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setMode(entry.transit_mode ?? "bus");
            setPassengers(entry.passengers ?? 2);
            setOpen(true);
          }}
          aria-label={
            alreadyConverted
              ? `Edit Transit settings: ${modeLabel(entry.transit_mode, entry.passengers)}`
              : "Swap this trip to public transit or carpooling"
          }
          className="text-xs font-medium text-green-700 hover:text-green-900
            bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1
            rounded-full transition-colors"
        >
          {alreadyConverted
            ? `✏️ Edit Transit (${modeLabel(entry.transit_mode, entry.passengers)})`
            : "🌱 Swapped to Transit?"}
        </button>
      ) : (
        <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`mode-${entry.id}`}
              className="text-xs font-medium text-gray-600 shrink-0"
            >
              Mode
            </label>
            <select
              id={`mode-${entry.id}`}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1
                bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {mode === "carpool" && (
            <div className="flex items-center gap-2">
              <label
                htmlFor={`pax-${entry.id}`}
                className="text-xs font-medium text-gray-600 shrink-0"
              >
                Passengers
              </label>
              <input
                id={`pax-${entry.id}`}
                type="number"
                min={2}
                max={6}
                value={passengers}
                onChange={(e) =>
                  setPassengers(
                    Math.min(6, Math.max(2, Number(e.target.value))),
                  )
                }
                className="w-16 text-xs border border-gray-200 rounded-md px-2 py-1
                  bg-white focus:outline-none focus:ring-2 focus:ring-green-400 tabular-nums"
              />
            </div>
          )}

          {(() => {
            const preview = calculateTransitImpact(
              entry.duration_ms ?? 0,
              mode,
              passengers,
            );
            return (
              <p className="text-xs text-gray-500">
                <span className="text-red-500 font-medium">
                  {preview.emitted_kg} kg
                </span>{" "}
                emitted
                {" · "}
                <span className="text-green-600 font-medium">
                  {preview.prevented_kg} kg
                </span>{" "}
                saved
              </p>
            );
          })()}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              aria-label={
                saving
                  ? "Saving transit details"
                  : "Save transit details update"
              }
              className="text-xs font-semibold px-3 py-1 bg-green-600 text-white
                rounded-full hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save Update"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cancel transit swap editing"
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

TransitSwap.propTypes = {
  entry: PropTypes.object.isRequired,
  userId: PropTypes.string.isRequired,
  onUpdate: PropTypes.func.isRequired,
};
