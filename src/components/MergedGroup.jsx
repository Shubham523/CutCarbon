import { useState } from "react";
import PropTypes from "prop-types";
import { Trash2 } from "lucide-react";
import { resolveDate } from "../utils/activityParser";
import TransitSwap from "./TransitSwap";

const IMPACT = (co2) =>
  co2 === 0
    ? "text-green-600"
    : co2 < 5
      ? "text-gray-600"
      : co2 < 20
        ? "text-amber-600"
        : "text-red-500";

/**
 * MergedGroup displays a collapsible summary accordion card for a specific day and activity category.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.group - Group containing date, activity details, and list of entries.
 * @param {Function} [props.onDelete] - Optional delete callback function.
 * @param {Function} props.onEntryUpdate - Callback function to update an entry state.
 * @param {string} [props.userId] - Optional authenticated user's ID.
 */
export default function MergedGroup({
  group,
  onDelete,
  onEntryUpdate,
  userId,
}) {
  const [localTotals, setLocalTotals] = useState({
    emitted: group.total_emitted,
    prevented: group.total_prevented,
  });

  const handleEntryUpdate = (entryId, patch) => {
    onEntryUpdate(entryId, patch);
    setLocalTotals((prev) => {
      const idx = group.entries.findIndex((e) => e.id === entryId);
      if (idx === -1) return prev;

      const oldEntry = group.entries[idx];
      const oldCo2 = oldEntry.co2_score_kg ?? oldEntry.co2 ?? 0;
      const oldPrev = oldEntry.co2_prevented_kg ?? 0;

      const newCo2 = patch.co2_score_kg ?? oldCo2;
      const newPrev = patch.co2_prevented_kg ?? oldPrev;

      return {
        emitted: prev.emitted - oldCo2 + newCo2,
        prevented: prev.prevented - oldPrev + newPrev,
      };
    });
  };

  const totalChunks = group.entries.reduce(
    (acc, cur) => acc + (cur.sub_blocks?.length ?? 1),
    0,
  );

  return (
    <details className="group border-b border-gray-100 last:border-0 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex items-center justify-between py-4 cursor-pointer focus:outline-none">
        <div className="flex items-center gap-3">
          <span
            className="text-xl w-6 text-center"
            role="img"
            aria-label="Icon"
          >
            {group.icon}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              {group.item_name}
            </h3>
            <p className="text-xs text-gray-400">{group.date_string}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {localTotals.prevented > 0 && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full tabular-nums">
              -{localTotals.prevented.toFixed(2)} kg
            </span>
          )}
          {localTotals.emitted > 0 && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                localTotals.emitted > 10
                  ? "bg-red-50 text-red-600"
                  : "bg-gray-50 text-gray-600"
              }`}
            >
              +{localTotals.emitted.toFixed(2)} kg
            </span>
          )}
          {localTotals.prevented === 0 && localTotals.emitted === 0 && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Carbon-free
            </span>
          )}
          <span
            className="text-gray-300 group-open:rotate-180 transition-transform duration-200 text-xs pl-1"
            aria-hidden="true"
          >
            ▼
          </span>
        </div>
      </summary>

      <div className="pl-9 pb-4 pr-4 space-y-4">
        {group.type === "grocery" ? (
          <div className="space-y-2 border-l border-gray-100 pl-3">
            {group.entries.map((entry, eIdx) => {
              const d = resolveDate(entry.timestamp);
              const timeStr = d.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const co2Val = entry.co2_score_kg ?? entry.co2 ?? 0;

              return (
                <div
                  key={entry.id ?? eIdx}
                  className="flex flex-col border-b border-gray-100 last:border-0 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="tabular-nums text-gray-500 w-14 shrink-0">
                      {timeStr}
                    </span>
                    <span className="flex-1 text-gray-700 font-medium">
                      {entry.item_name || "Scanned Item"}
                    </span>
                    <span
                      className={`tabular-nums text-xs font-semibold ${IMPACT(
                        co2Val,
                      )}`}
                    >
                      +{co2Val.toFixed(2)} kg
                    </span>
                  </div>
                  {onDelete && entry.id && (
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="mt-1 self-start flex items-center gap-1 text-[10px] text-gray-300 hover:text-red-400 transition-colors"
                      aria-label={`Delete ${entry.item_name} entry`}
                    >
                      <Trash2 size={10} aria-hidden="true" />
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <p className="pt-2 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
              Merged from {totalChunks} session{totalChunks !== 1 ? "s" : ""}
            </p>

            {group.entries.map((entry, eIdx) => {
              const blocks = entry.sub_blocks?.length
                ? entry.sub_blocks
                : [entry];

              return (
                <div key={entry.id ?? eIdx}>
                  {blocks.map((block, bIdx) => {
                    const d = resolveDate(block.timestamp);
                    const timeStr = d.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const durMin = Math.round(
                      (block.duration_ms ?? 0) / 60_000,
                    );
                    const prevented = block.co2_prevented_kg ?? 0;
                    const emitted = block.co2_score_kg ?? block.co2 ?? 0;

                    return (
                      <div
                        key={bIdx}
                        className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0"
                      >
                        <span className="tabular-nums text-gray-500 w-14 shrink-0">
                          {timeStr}
                        </span>
                        <span className="flex-1 text-gray-700">
                          {durMin > 0 ? `${durMin} min` : "< 1 min"}
                        </span>

                        {prevented > 0 && (
                          <span className="text-green-600 tabular-nums text-xs mr-2">
                            -{prevented.toFixed(2)} kg
                          </span>
                        )}
                        {emitted > 0 && (
                          <span
                            className={`tabular-nums text-xs ${IMPACT(emitted)}`}
                          >
                            +{emitted.toFixed(2)} kg
                          </span>
                        )}
                        {prevented === 0 && emitted === 0 && (
                          <span className="text-green-600 text-xs">
                            Carbon-free
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {entry.type === "transport" && (
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
                      <Trash2 size={11} aria-hidden="true" />
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </details>
  );
}

MergedGroup.propTypes = {
  group: PropTypes.object.isRequired,
  onDelete: PropTypes.func,
  onEntryUpdate: PropTypes.func.isRequired,
  userId: PropTypes.string,
};
