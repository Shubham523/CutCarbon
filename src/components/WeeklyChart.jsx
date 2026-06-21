import PropTypes from "prop-types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Builds a 7-element daily data slot array (Sun to Sat) for the past 7 days.
 *
 * @param {Array} activities - List of activity logs.
 * @returns {Array} - The structured daily slot array.
 */
function buildWeeklyBuckets(activities) {
  const today = new Date();
  // Build slots for the last 7 days, oldest first
  const slots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i)); // 6 days ago → today
    return {
      day: DAY_LABELS[d.getDay()],
      date: d.toDateString(),
      emitted: 0,
      prevented: 0,
    };
  });

  activities.forEach((a) => {
    const actDate = new Date(a.timestamp).toDateString();
    const slot = slots.find((s) => s.date === actDate);
    if (slot) {
      const co2Val = Number(a.co2_score_kg ?? a.co2 ?? 0);
      const prevVal = Number(a.co2_prevented_kg ?? 0);
      slot.emitted = +(slot.emitted + co2Val).toFixed(2);
      slot.prevented = +(slot.prevented + Math.abs(prevVal)).toFixed(2);
    }
  });

  return slots;
}

/**
 * Tooltip overlay renderer for the weekly bar chart.
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-150 rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, idx) => (
        <p key={idx} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toFixed(2)} kg
        </p>
      ))}
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(PropTypes.object),
  label: PropTypes.string,
};

/**
 * WeeklyChart component displaying daily emissions vs savings using Recharts.
 *
 * @param {Object} props - The component props.
 * @param {Array} [props.activities] - List of activity logs.
 */
export default function WeeklyChart({ activities = [] }) {
  const weeklyData = buildWeeklyBuckets(activities);

  return (
    <section aria-label="Weekly emissions chart">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
        Daily emissions &amp; savings — this week
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={weeklyData}
          barGap={2}
          barCategoryGap="25%"
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fafafa" }} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Bar
            dataKey="emitted"
            name="Emitted CO₂"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
          />
          <Bar
            dataKey="prevented"
            name="Prevented CO₂"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

WeeklyChart.propTypes = {
  activities: PropTypes.arrayOf(PropTypes.object),
};
