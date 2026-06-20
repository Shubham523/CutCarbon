import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  resolveDate,
  processAndMergeActivities,
  groupActivities,
  calculateTransitImpact,
} from '../utils/activityParser';

// ── Local-only helpers ────────────────────────────────────────────────────────

function relativeTime(ts) {
  const diff = Date.now() - resolveDate(ts).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return 'Just now';
}

const IMPACT = co2 =>
  co2 === 0 ? 'text-green-600' : co2 < 5 ? 'text-gray-600' : co2 < 20 ? 'text-amber-600' : 'text-red-500';

const MODES = [
  { value: 'carpool', label: 'Carpool 🚘' },
  { value: 'bus',     label: 'Bus 🚌' },
  { value: 'train',   label: 'Train 🚆' },
  { value: 'metro',   label: 'Metro 🚇' },
];

function modeLabel(mode, passengers) {
  if (mode === 'carpool') return `Carpool (${passengers} ppl)`;
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

/**
 * Persistent transit edit form for any log where type === 'transport'.
 * Pre-fills from the entry's existing transit_mode and passengers fields.
 * Always visible after first conversion — label changes to ‘Edit Transit ✏️’.
 * Uses the original duration_ms from Firestore on every recalculation.
 */
function TransitSwap({ entry, userId, onUpdate }) {
  // Pre-fill from existing Firestore values so re-edits show current state
  const [open,       setOpen]       = useState(false);
  const [mode,       setMode]       = useState(entry.transit_mode ?? 'bus');
  const [passengers, setPassengers] = useState(entry.passengers   ?? 2);
  const [saving,     setSaving]     = useState(false);

  if (!entry.id || !userId) return null;

  // True after the first successful save — changes trigger label
  const alreadyConverted = Boolean(entry.transit_mode);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Always use the ORIGINAL duration_ms from the Firestore document —
      // never derive it from Date.now() or any computed value.
      const impact   = calculateTransitImpact(entry.duration_ms ?? 0, mode, passengers);
      const newLabel = modeLabel(mode, passengers);

      const patch = {
        transit_mode:     mode,
        passengers:       mode === 'carpool' ? passengers : 1,
        co2_score_kg:     impact.emitted_kg,
        co2_prevented_kg: impact.prevented_kg,
        item_name:        newLabel,
        description:      newLabel,
        // type stays 'transport' — greener trip, same category
      };

      // updateDoc overwrites only these fields — never creates a new document
      await updateDoc(doc(db, 'users', userId, 'logs', entry.id), patch);

      // Optimistic local update so badges change before onSnapshot fires
      onUpdate(entry.id, patch);

      setOpen(false); // collapse form; trigger button remains visible
    } catch (err) {
      console.error('Transit update failed:', err);
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
            // Re-sync local state from entry in case Firestore updated it since mount
            setMode(entry.transit_mode ?? 'bus');
            setPassengers(entry.passengers ?? 2);
            setOpen(true);
          }}
          className="text-xs font-medium text-green-700 hover:text-green-900
            bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1
            rounded-full transition-colors"
        >
          {alreadyConverted ? `✏️ Edit Transit (${modeLabel(entry.transit_mode, entry.passengers)})` : '🌱 Swapped to Transit?'}
        </button>
      ) : (
        <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
          {/* Mode selector — pre-filled from current entry state */}
          <div className="flex items-center gap-2">
            <label htmlFor={`mode-${entry.id}`} className="text-xs font-medium text-gray-600 shrink-0">
              Mode
            </label>
            <select
              id={`mode-${entry.id}`}
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1
                bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {MODES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Passenger count — only for carpool, pre-filled if previously set */}
          {mode === 'carpool' && (
            <div className="flex items-center gap-2">
              <label htmlFor={`pax-${entry.id}`} className="text-xs font-medium text-gray-600 shrink-0">
                Passengers
              </label>
              <input
                id={`pax-${entry.id}`}
                type="number"
                min={2}
                max={6}
                value={passengers}
                onChange={e => setPassengers(Math.min(6, Math.max(2, Number(e.target.value))))}
                className="w-16 text-xs border border-gray-200 rounded-md px-2 py-1
                  bg-white focus:outline-none focus:ring-2 focus:ring-green-400 tabular-nums"
              />
            </div>
          )}

          {/* Live preview — recalculates on every mode/passenger change */}
          {(() => {
            const preview = calculateTransitImpact(entry.duration_ms ?? 0, mode, passengers);
            return (
              <p className="text-xs text-gray-500">
                <span className="text-red-500 font-medium">{preview.emitted_kg} kg</span> emitted
                {' · '}
                <span className="text-green-600 font-medium">{preview.prevented_kg} kg</span> saved
              </p>
            );
          })()}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-semibold px-3 py-1 bg-green-600 text-white
                rounded-full hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Update'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
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

// ── MergedGroup — one <details> accordion card per date + activity type ───────

function MergedGroup({ group, onDelete, onEntryUpdate, userId }) {
  // Local state mirrors the group's CO₂ totals so optimistic updates are instant.
  const [localTotals, setLocalTotals] = useState({
    emitted:   group.total_emitted,
    prevented: group.total_prevented,
  });

  const totalDurMin = Math.round(group.total_duration_ms / 60_000);
  const totalChunks = group.entries.reduce(
    (n, e) => n + (e.sub_blocks?.length ?? 1), 0,
  );

  /** Called by TransitSwap after a successful Firestore write. */
  const handleEntryUpdate = (id, patch) => {
    // Bubble up so App.jsx can optionally update its own state too
    onEntryUpdate?.(id, patch);

    // Recompute group totals immediately without waiting for onSnapshot
    setLocalTotals(prev => {
      const entry = group.entries.find(e => e.id === id);
      if (!entry) return prev;
      const oldEmitted   = entry.co2_score_kg ?? 0;
      const oldPrevented = entry.co2_prevented_kg ?? 0;
      return {
        emitted:   parseFloat(Math.max(0, prev.emitted   - oldEmitted   + patch.co2_score_kg).toFixed(2)),
        prevented: parseFloat(Math.max(0, prev.prevented - oldPrevented + patch.co2_prevented_kg).toFixed(2)),
      };
    });
  };

  return (
    <details className="mb-2 border border-gray-200 rounded-lg bg-white shadow-sm open:shadow-md transition-shadow">
      <summary className="p-3 font-semibold flex justify-between items-center cursor-pointer list-none select-none
        hover:bg-gray-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
        {/* Left: icon + label + total duration */}
        <span className="flex items-center gap-2 min-w-0">
          <span aria-hidden="true">{group.icon}</span>
          <span className="text-sm font-semibold text-gray-800 truncate">
            {group.date_string} &bull; {group.item_name}
          </span>
          {group.type !== 'grocery' && group.type !== 'scanned_product' && (
            <span className="text-xs text-gray-400 shrink-0 tabular-nums">
              {totalDurMin} min
            </span>
          )}
        </span>

        {/* Right: CO₂ badges — use localTotals for instant reflection */}
        <span className="flex items-center gap-2 shrink-0 ml-2">
          {localTotals.prevented > 0 && (
            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
              -{localTotals.prevented.toFixed(2)} kg saved
            </span>
          )}
          {localTotals.emitted > 0 && (
            <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              +{localTotals.emitted.toFixed(2)} kg CO₂
            </span>
          )}
        </span>
      </summary>

      {/* Expanded body */}
      <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
        {group.type === 'grocery' || group.type === 'scanned_product' ? (
          <div className="pt-2">
            {group.entries.map((entry, eIdx) => {
              const d = resolveDate(entry.timestamp);
              const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const co2Val = entry.co2_score_kg ?? entry.co2 ?? 0;

              return (
                <div key={entry.id ?? eIdx} className="flex flex-col border-b border-gray-100 last:border-0 py-2">
                  <div className="flex items-center justify-between">
                    <span className="tabular-nums text-gray-500 w-14 shrink-0">{timeStr}</span>
                    <span className="flex-1 text-gray-700 font-medium">
                      {entry.item_name || 'Scanned Item'}
                    </span>
                    <span className={`tabular-nums text-xs font-semibold ${IMPACT(co2Val)}`}>
                      +{co2Val.toFixed(2)} kg
                    </span>
                  </div>
                  {onDelete && entry.id && (
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="mt-1 self-start flex items-center gap-1 text-[10px] text-gray-300 hover:text-red-400 transition-colors"
                      aria-label={`Delete ${entry.item_name} entry`}
                    >
                      <Trash2 size={10} />
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <p className="pt-2 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
              Merged from {totalChunks} session{totalChunks !== 1 ? 's' : ''}
            </p>

            {group.entries.map((entry, eIdx) => {
              const blocks = entry.sub_blocks?.length ? entry.sub_blocks : [entry];
              const isVehicle = entry.item_name === 'In Vehicle';

              return (
                <div key={entry.id ?? eIdx}>
                  {blocks.map((block, bIdx) => {
                    const d         = resolveDate(block.timestamp);
                    const timeStr   = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const durMin    = Math.round((block.duration_ms ?? 0) / 60_000);
                    const prevented = block.co2_prevented_kg ?? 0;
                    const emitted   = block.co2_score_kg ?? block.co2 ?? 0;

                    return (
                      <div
                        key={bIdx}
                        className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0"
                      >
                        <span className="tabular-nums text-gray-500 w-14 shrink-0">{timeStr}</span>
                        <span className="flex-1 text-gray-700">
                          {durMin > 0 ? `${durMin} min` : '< 1 min'}
                        </span>

                        {prevented > 0 && (
                          <span className="text-green-600 tabular-nums text-xs mr-2">
                            -{prevented.toFixed(2)} kg
                          </span>
                        )}
                        {emitted > 0 && (
                          <span className={`tabular-nums text-xs ${IMPACT(emitted)}`}>
                            +{emitted.toFixed(2)} kg
                          </span>
                        )}
                        {prevented === 0 && emitted === 0 && (
                          <span className="text-green-600 text-xs">Carbon-free</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Transit swap — persistent on all transport entries, not just 'In Vehicle' */}
                  {entry.type === 'transport' && (
                    <TransitSwap
                      entry={entry}
                      userId={userId}
                      onUpdate={handleEntryUpdate}
                    />
                  )}

                  {onDelete && entry.id && (
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="mt-1 flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors"
                      aria-label={`Delete ${group.item_name} entry`}
                    >
                      <Trash2 size={11} />
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
}

// ── ActivityFeed ──────────────────────────────────────────────────────────────

export default function ActivityFeed({ activities, onDelete, onEntryUpdate, user }) {
  const merged      = processAndMergeActivities(
    activities.filter(a => a.type === 'fitness' || a.type === 'transport'),
  );
  const groceryLogs = activities.filter(a => a.type === 'grocery' || a.type === 'scanned_product');
  const groupedData = groupActivities([...merged, ...groceryLogs]);

  const groupedIds = new Set(
    Object.values(groupedData).flatMap(g => g.entries.map(e => e.id)),
  );
  const ungrouped = activities
    .filter(a => !groupedIds.has(a.id))
    .filter(a => a.type !== 'fitness' && a.type !== 'transport')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const hasContent = activities.length > 0;

  return (
    <section aria-label="Activity feed">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
        Recent activity
      </p>

      {!hasContent && (
        <p className="text-sm text-gray-400 py-6">
          No activities yet. Use the buttons below to get started.
        </p>
      )}

      {Object.values(groupedData).map((group, idx) => (
        <MergedGroup
          key={group.key ?? idx}
          group={group}
          onDelete={onDelete}
          onEntryUpdate={onEntryUpdate}
          userId={user?.uid}
        />
      ))}

      {/* Flat list for non-grouped types (groceries, etc.) */}
      {ungrouped.length > 0 && (
        <ul role="list" className="divide-y divide-gray-100 mt-2">
          {ungrouped.map(a => {
            const co2Val = a.co2 ?? a.co2_score_kg ?? 0;
            return (
              <li
                key={a.id}
                className="group flex items-center gap-4 py-3"
                aria-label={`${a.description}, ${co2Val} kg CO₂`}
              >
                <span className="text-xl leading-none shrink-0" role="img" aria-hidden="true">
                  {a.icon}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium truncate">{a.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.category} · {relativeTime(a.timestamp)}
                  </p>
                </div>

                <span className={`text-sm font-semibold tabular-nums shrink-0 ${IMPACT(co2Val)}`}>
                  {co2Val === 0 ? 'Carbon-free' : `${co2Val.toFixed(2)} kg`}
                </span>

                <button
                  onClick={() => onDelete(a.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-300
                    hover:text-red-400 transition-opacity shrink-0"
                  aria-label={`Delete: ${a.description}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
