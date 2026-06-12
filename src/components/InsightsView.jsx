import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { WEEKLY_DATA, CATEGORY_DATA } from '../data/mockData';

const MONTHLY_DATA = [
  { month: 'Jan', co2: 98 },
  { month: 'Feb', co2: 112 },
  { month: 'Mar', co2: 89 },
  { month: 'Apr', co2: 103 },
  { month: 'May', co2: 95 },
  { month: 'Jun', co2: 87 },
];

const TABS = ['Monthly', 'Weekly', 'By Category'];

const BAR_COLORS = { Transport: '#3b82f6', Food: '#f97316', Energy: '#eab308', Shopping: '#a855f7' };

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-600">{payload[0].value} kg CO₂</p>
    </div>
  );
};

export default function InsightsView() {
  const [tab, setTab] = useState('Monthly');

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-sm text-gray-400 mt-1">Your emission patterns over time.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100" role="tablist">
        {TABS.map(t => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Monthly line chart */}
      {tab === 'Monthly' && (
        <section aria-label="6-month trend">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">6-month footprint</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MONTHLY_DATA} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit=" kg" />
              <Tooltip content={<Tip />} />
              <ReferenceLine y={90} stroke="#d1d5db" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="co2" stroke="#16a34a" strokeWidth={2}
                dot={{ fill: '#16a34a', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: '#16a34a', strokeWidth: 2, fill: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Weekly line chart */}
      {tab === 'Weekly' && (
        <section aria-label="Weekly daily breakdown">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Daily — this week</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={WEEKLY_DATA} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit=" kg" />
              <Tooltip content={<Tip />} />
              <ReferenceLine y={10} stroke="#d1d5db" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="co2" stroke="#16a34a" strokeWidth={2}
                dot={{ fill: '#16a34a', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: '#16a34a', strokeWidth: 2, fill: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Category breakdown */}
      {tab === 'By Category' && (
        <section aria-label="Emissions by category">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">This week</p>
          <div className="space-y-5">
            {CATEGORY_DATA.map(({ category, current }) => {
              const max = Math.max(...CATEGORY_DATA.map(c => c.current));
              const pct = ((current / max) * 100).toFixed(0);
              return (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-800">{category}</span>
                    <span className="text-gray-400 tabular-nums">{current} kg</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[category] }}
                      role="progressbar"
                      aria-valuenow={current}
                      aria-valuemin={0}
                      aria-valuemax={max}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
