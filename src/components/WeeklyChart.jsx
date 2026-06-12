import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { WEEKLY_DATA } from '../data/mockData';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-white border border-gray-100 rounded-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className={val > 10 ? 'text-red-500' : 'text-green-600'}>{val} kg CO₂</p>
    </div>
  );
};

export default function WeeklyChart() {
  return (
    <section aria-label="Weekly emissions chart">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
        Daily emissions — this week
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={WEEKLY_DATA} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit=" kg" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fafafa' }} />
          <ReferenceLine y={10} stroke="#d1d5db" strokeDasharray="4 4" />
          <Bar dataKey="co2" radius={[2, 2, 0, 0]} maxBarSize={32}>
            {WEEKLY_DATA.map((d, i) => (
              <Cell key={i} fill={d.co2 > d.target ? '#f87171' : '#16a34a'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
