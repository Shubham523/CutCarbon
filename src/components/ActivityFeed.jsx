import { Trash2 } from 'lucide-react';

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return 'Just now';
}

const IMPACT = co2 =>
  co2 === 0 ? 'text-green-600' : co2 < 5 ? 'text-gray-600' : co2 < 20 ? 'text-amber-600' : 'text-red-500';

export default function ActivityFeed({ activities, onDelete }) {
  return (
    <section aria-label="Activity feed">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
        Recent activity
      </p>

      {activities.length === 0 && (
        <p className="text-sm text-gray-400 py-6">
          No activities yet. Use the buttons below to get started.
        </p>
      )}

      <ul role="list" className="divide-y divide-gray-100">
        {activities.map(a => (
          <li
            key={a.id}
            className="group flex items-center gap-4 py-3"
            aria-label={`${a.description}, ${a.co2} kg CO₂`}
          >
            <span className="text-xl leading-none shrink-0" role="img" aria-hidden="true">
              {a.icon}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-medium truncate">{a.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">{a.category} · {relativeTime(a.timestamp)}</p>
            </div>

            <span className={`text-sm font-semibold tabular-nums shrink-0 ${IMPACT(a.co2)}`}>
              {a.co2 === 0 ? 'Carbon-free' : `${a.co2} kg`}
            </span>

            <button
              onClick={() => onDelete(a.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-opacity shrink-0"
              aria-label={`Delete: ${a.description}`}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
