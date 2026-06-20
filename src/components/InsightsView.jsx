import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TABS = ['Weekly', 'By Category'];
const BAR_COLORS = {
  Transport: '#3b82f6',
  Food: '#f97316',
  Energy: '#eab308',
  Shopping: '#a855f7',
  Groceries: '#16a34a',
};
const DEFAULT_COLOR = '#6b7280';

/**
 * Group activities into daily buckets for the last 7 days (oldest → newest).
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
    return { day: DAY_LABELS[d.getDay()], co2: +co2.toFixed(2), target: dailyTarget };
  });
}

/**
 * Aggregate co2 totals per category from the activities list.
 */
function buildCategoryData(activities) {
  const totals = {};
  activities.forEach((a) => {
    const cat = a.category ?? 'Uncategorized';
    totals[cat] = (totals[cat] ?? 0) + (a.co2 ?? 0);
  });
  return Object.entries(totals)
    .map(([category, current]) => ({ category, current: +current.toFixed(2) }))
    .sort((a, b) => b.current - a.current);
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-600">{payload[0].value} kg CO₂</p>
    </div>
  );
};

export default function InsightsView({ activities = [], settings = {} }) {
  const [tab, setTab] = useState('Weekly');
  const dailyTarget = settings.dailyTargetKg ?? 10;

  const weeklyData   = buildWeeklyData(activities, dailyTarget);
  const categoryData = buildCategoryData(activities);
  const maxCo2       = Math.max(...categoryData.map((c) => c.current), 1);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-sm text-gray-400 mt-1">Your emission patterns over the last 7 days.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === t
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Weekly line chart */}
      {tab === 'Weekly' && (
        <section aria-label="Weekly daily breakdown">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Daily — this week</p>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 py-6">No scan data yet for this week.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit=" kg" />
                <Tooltip content={<Tip />} />
                <ReferenceLine y={dailyTarget} stroke="#d1d5db" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="co2"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: '#16a34a', strokeWidth: 2, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>
      )}

      {/* Category breakdown */}
      {tab === 'By Category' && (
        <section aria-label="Emissions by category">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">This week</p>
          {categoryData.length === 0 ? (
            <p className="text-sm text-gray-400 py-6">No scan data yet — categories will appear here once you add scans.</p>
          ) : (
            <div className="space-y-5">
              {categoryData.map(({ category, current }) => {
                const pct = ((current / maxCo2) * 100).toFixed(0);
                const color = BAR_COLORS[category] ?? DEFAULT_COLOR;
                return (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-800">{category}</span>
                      <span className="text-gray-400 tabular-nums">{current} kg</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                        role="progressbar"
                        aria-valuenow={current}
                        aria-valuemin={0}
                        aria-valuemax={maxCo2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
