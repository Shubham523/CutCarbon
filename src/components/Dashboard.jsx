import StatsRow from './StatsRow';
import ActivityFeed from './ActivityFeed';
import WeeklyChart from './WeeklyChart';

export default function Dashboard({ activities, onDelete, onEntryUpdate, user, settings = {} }) {
  const dailyTarget = settings.dailyTargetKg ?? 10;
  const weeklyTarget = dailyTarget * 7;
  const total = activities.reduce((s, a) => s + (a.co2 ?? a.co2_score_kg ?? 0), 0);

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
          Target: {weeklyTarget} kg/week &nbsp;·&nbsp;
          <span className={total > weeklyTarget ? 'text-red-500' : 'text-green-600'}>
            {total > weeklyTarget ? `${(total - weeklyTarget).toFixed(1)} kg over` : `${(weeklyTarget - total).toFixed(1)} kg remaining`}
          </span>
        </p>
      </section>

      {/* Stat row */}
      <StatsRow activities={activities} />

      {/* Chart */}
      <WeeklyChart activities={activities} settings={settings} />

      {/* Feed */}
      <ActivityFeed activities={activities} onDelete={onDelete} onEntryUpdate={onEntryUpdate} user={user} />
    </div>
  );
}
