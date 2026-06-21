import StatsRow from "./StatsRow";
import ActivityFeed from "./ActivityFeed";
import WeeklyChart from "./WeeklyChart";
import ContributorsAndActions from "./ContributorsAndActions";
import NetZeroScale from "./NetZeroScale";
import PropTypes from "prop-types";

/**
 * Dashboard component displaying weekly emissions statistics, charts, and activity feed.
 *
 * @param {Object} props - The component props.
 * @param {Array} props.activities - List of activities logged by the user.
 * @param {Function} props.onDelete - Callback to trigger when an activity is deleted.
 * @param {Function} props.onEntryUpdate - Callback to trigger when an activity entry is updated.
 * @param {Object} props.user - The current authenticated Firebase user.
 * @param {Object} [props.settings] - The user settings.
 */
export default function Dashboard({
  activities,
  onDelete,
  onEntryUpdate,
  user,
  settings = {},
}) {
  const dailyTarget = settings.dailyTargetKg ?? 10;
  const weeklyTarget = dailyTarget * 7;
  const total = activities.reduce(
    (s, a) => s + (a.co2 ?? a.co2_score_kg ?? 0),
    0,
  );

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Net-Zero Scale */}
      <NetZeroScale activities={activities} />

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
          <span
            className={total > weeklyTarget ? "text-red-500" : "text-green-600"}
          >
            {total > weeklyTarget
              ? `${(total - weeklyTarget).toFixed(1)} kg over`
              : `${(weeklyTarget - total).toFixed(1)} kg remaining`}
          </span>
        </p>
      </section>

      {/* Stat row */}
      <StatsRow activities={activities} />

      {/* Chart */}
      <WeeklyChart activities={activities} settings={settings} />

      {/* Contributors & Actions */}
      <ContributorsAndActions activities={activities} />

      {/* Feed */}
      <ActivityFeed
        activities={activities}
        onDelete={onDelete}
        onEntryUpdate={onEntryUpdate}
        user={user}
      />
    </div>
  );
}

Dashboard.propTypes = {
  activities: PropTypes.arrayOf(PropTypes.object).isRequired,
  onDelete: PropTypes.func.isRequired,
  onEntryUpdate: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  settings: PropTypes.shape({
    dailyTargetKg: PropTypes.number,
  }),
};
