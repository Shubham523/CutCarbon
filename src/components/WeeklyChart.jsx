import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// No hardcoded TARGET constant here anymore; it is read from user settings.

/**
 * Build a 7-element array (one entry per day, Mon→Sun order)
 * from the live activities array passed down from App.
 */
function buildWeeklyBuckets(activities, dailyTarget) {
  const today = new Date();
  // Build slots for the last 7 days, oldest first
  const slots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i)); // 6 days ago → today
    return {
      day: DAY_LABELS[d.getDay()],
      date: d.toDateString(),
      co2: 0,
      target: dailyTarget,
    };
  });

  activities.forEach((a) => {
    const actDate = new Date(a.timestamp).toDateString();
    const slot = slots.find((s) => s.date === actDate);
    if (slot) slot.co2 = +(slot.co2 + (a.co2 ?? 0)).toFixed(2);
  });

  return slots;
}

export default function WeeklyChart({ activities = [], settings = {} }) {
  const dailyTarget = settings.dailyTargetKg ?? 10;
  const weeklyData = buildWeeklyBuckets(activities, dailyTarget);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    return (
      <div className="bg-white border border-gray-100 rounded-md px-3 py-2 text-xs">
        <p className="font-semibold text-gray-700">{label}</p>
        <p className={val > dailyTarget ? 'text-red-500' : 'text-green-600'}>
          {val} kg CO₂
        </p>
      </div>
    );
  };

  return (
    <section aria-label="Weekly emissions chart">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
        Daily emissions — this week
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={weeklyData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit=" kg" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fafafa' }} />
          <ReferenceLine y={dailyTarget} stroke="#d1d5db" strokeDasharray="4 4" />
          <Bar dataKey="co2" radius={[2, 2, 0, 0]} maxBarSize={32}>
            {weeklyData.map((d, i) => (
               <Cell key={i} fill={d.co2 > d.target ? '#f87171' : '#16a34a'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
