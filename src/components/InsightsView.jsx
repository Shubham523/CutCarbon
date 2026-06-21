import { useState } from "react";
import PropTypes from "prop-types";
import WeeklyEmissionsTab from "./WeeklyEmissionsTab";
import CategoryEmissionsTab from "./CategoryEmissionsTab";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TABS = ["Weekly", "By Category"];

/**
 * Group activities into daily buckets for the last 7 days (oldest → newest).
 *
 * @param {Array} activities - List of activity logs.
 * @param {number} dailyTarget - The carbon emission target for a single day.
 * @returns {Array} - Aggregated daily data array.
 */
function buildWeeklyData(activities, dailyTarget) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toDateString();
    const co2 = activities
      .filter((a) => new Date(a.timestamp).toDateString() === dateStr)
      .reduce((sum, a) => sum + (a.co2 ?? 0), 0);
    return {
      day: DAY_LABELS[d.getDay()],
      co2: +co2.toFixed(2),
      target: dailyTarget,
    };
  });
}

/**
 * Aggregate co2 totals per category from the activities list.
 *
 * @param {Array} activities - List of activity logs.
 * @returns {Array} - Emissions grouped and sorted by categories.
 */
function buildCategoryData(activities) {
  const totals = {};
  activities.forEach((a) => {
    const cat = a.category ?? "Uncategorized";
    totals[cat] = (totals[cat] ?? 0) + (a.co2 ?? 0);
  });
  return Object.entries(totals)
    .map(([category, current]) => ({ category, current: +current.toFixed(2) }))
    .sort((a, b) => b.current - a.current);
}

/**
 * InsightsView rendering analytics, daily charts, and categorization logs.
 *
 * @param {Object} props - The component props.
 * @param {Array} [props.activities] - List of activity logs.
 * @param {Object} [props.settings] - Current user settings.
 */
export default function InsightsView({ activities = [], settings = {} }) {
  const [tab, setTab] = useState("Weekly");
  const dailyTarget = settings.dailyTargetKg ?? 10;

  const weeklyData = buildWeeklyData(activities, dailyTarget);
  const categoryData = buildCategoryData(activities);
  const maxCo2 = Math.max(...categoryData.map((c) => c.current), 1);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-sm text-gray-400 mt-1">
          Your emission patterns over the last 7 days.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-150" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${
                tab === t
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Weekly line chart tab */}
      {tab === "Weekly" && (
        <WeeklyEmissionsTab
          activities={activities}
          weeklyData={weeklyData}
          dailyTarget={dailyTarget}
        />
      )}

      {/* Category breakdown tab */}
      {tab === "By Category" && (
        <CategoryEmissionsTab categoryData={categoryData} maxCo2={maxCo2} />
      )}
    </div>
  );
}

InsightsView.propTypes = {
  activities: PropTypes.arrayOf(PropTypes.object),
  settings: PropTypes.shape({
    dailyTargetKg: PropTypes.number,
  }),
};
