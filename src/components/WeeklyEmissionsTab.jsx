import PropTypes from "prop-types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/**
 * Tooltip overlay component for the daily emissions line chart.
 *
 * @param {Object} props - Component props.
 * @param {boolean} props.active - Active tooltip state.
 * @param {Array} props.payload - Data payload.
 * @param {string} props.label - X-axis data label.
 */
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-600">{payload[0].value} kg CO₂</p>
    </div>
  );
}

Tip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(PropTypes.object),
  label: PropTypes.string,
};

/**
 * WeeklyEmissionsTab renders the daily emissions line chart for the last 7 days.
 *
 * @param {Object} props - Component props.
 * @param {Array} props.activities - List of activity logs.
 * @param {Array} props.weeklyData - Pre-calculated weekly data array.
 * @param {number} props.dailyTarget - Current user's daily emission target.
 */
export default function WeeklyEmissionsTab({
  activities,
  weeklyData,
  dailyTarget,
}) {
  return (
    <section aria-label="Weekly daily breakdown">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">
        Daily — this week
      </p>
      {activities.length === 0 ? (
        <p className="text-sm text-gray-400 py-6">
          No analysis data yet for this week.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={weeklyData}
            margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f3f4f6"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              unit=" kg"
            />
            <Tooltip content={<Tip />} />
            <ReferenceLine
              y={dailyTarget}
              stroke="#d1d5db"
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="co2"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ fill: "#16a34a", r: 3, strokeWidth: 0 }}
              activeDot={{
                r: 5,
                stroke: "#16a34a",
                strokeWidth: 2,
                fill: "#fff",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

WeeklyEmissionsTab.propTypes = {
  activities: PropTypes.arrayOf(PropTypes.object).isRequired,
  weeklyData: PropTypes.arrayOf(PropTypes.object).isRequired,
  dailyTarget: PropTypes.number.isRequired,
};
