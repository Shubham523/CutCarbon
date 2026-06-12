export default function StatsRow({ activities }) {
  const avg = (activities.reduce((s, a) => s + a.co2, 0) / 7).toFixed(1);
  const lowImpact = activities.filter(a => a.co2 <= 1).length;
  const topCategory = (() => {
    const totals = {};
    activities.forEach(a => { totals[a.category] = (totals[a.category] || 0) + a.co2; });
    return Object.entries(totals).sort((x, y) => y[1] - x[1])[0]?.[0] ?? '—';
  })();

  const stats = [
    { label: 'Avg / day',    value: `${avg} kg` },
    { label: 'Low-impact',   value: `${lowImpact} logs` },
    { label: 'Top category', value: topCategory },
  ];

  return (
    <section
      aria-label="Summary stats"
      className="grid grid-cols-3 divide-x divide-gray-100"
    >
      {stats.map(({ label, value }) => (
        <div key={label} className="pr-6 last:pr-0 pl-6 first:pl-0">
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
      ))}
    </section>
  );
}
