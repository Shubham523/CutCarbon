import StatsRow from './StatsRow';
import ActivityFeed from './ActivityFeed';
import WeeklyChart from './WeeklyChart';

export default function Dashboard({ activities, onDelete }) {
  const total = activities.reduce((s, a) => s + a.co2, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Hero number */}
      <section aria-label="Total footprint this week">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">
          This week
        </p>
        <p className="text-5xl font-bold text-gray-900 tabular-nums leading-none">
          {total.toFixed(1)}
          <span className="text-lg font-normal text-gray-400 ml-2">kg CO₂</span>
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Target: 70 kg/week &nbsp;·&nbsp;
          <span className={total > 70 ? 'text-red-500' : 'text-green-600'}>
            {total > 70 ? `${(total - 70).toFixed(1)} kg over` : `${(70 - total).toFixed(1)} kg remaining`}
          </span>
        </p>
      </section>

      {/* Stat row */}
      <StatsRow activities={activities} />

      {/* Chart */}
      <WeeklyChart />

      {/* Feed */}
      <ActivityFeed activities={activities} onDelete={onDelete} />
    </div>
  );
}
