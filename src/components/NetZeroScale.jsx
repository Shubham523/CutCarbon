import { useMemo } from 'react';

export default function NetZeroScale({ activities = [] }) {
  const { emitted, saved, totalVolume, emittedPercent, savedPercent, netCarbon } = useMemo(() => {
    const emittedSum = activities.reduce((sum, a) => sum + Number(a.co2_score_kg ?? a.co2 ?? 0), 0);
    const savedSum = activities.reduce((sum, a) => sum + Number(a.co2_prevented_kg ?? 0), 0);
    const volume = emittedSum + savedSum;

    let emittedPct = 50;
    let savedPct = 50;

    if (volume > 0) {
      emittedPct = (emittedSum / volume) * 100;
      savedPct = (savedSum / volume) * 100;
    }

    return {
      emitted: emittedSum,
      saved: savedSum,
      totalVolume: volume,
      emittedPercent: emittedPct,
      savedPercent: savedPct,
      netCarbon: emittedSum - savedSum,
    };
  }, [activities]);

  const isNetNegative = netCarbon <= 0;
  const shadowClass = isNetNegative
    ? 'shadow-[0_0_15px_rgba(34,197,94,0.4)] border-green-200'
    : 'shadow-[0_0_15px_rgba(239,68,68,0.25)] border-red-150';

  return (
    <section
      aria-label="Net-Zero Balance Scale"
      className={`bg-white border rounded-2xl p-5 transition-all duration-300 ${shadowClass}`}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
            Net-Zero Balance
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Ratio of emissions to savings this week
          </p>
        </div>

        {/* Badge & net amount */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800 tabular-nums">
            {isNetNegative ? '' : '+'}{netCarbon.toFixed(1)} kg CO₂
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isNetNegative
                ? 'bg-green-50 text-green-700 border border-green-150'
                : 'bg-red-50 text-red-600 border border-red-150'
            }`}
          >
            {isNetNegative ? 'Positive Impact 🌱' : 'Negative Impact ⚠️'}
          </span>
        </div>
      </div>

      {/* The Scale Bar */}
      <div className="h-8 w-full rounded-full flex overflow-hidden bg-gray-100 relative">
        {totalVolume === 0 ? (
          <div className="w-full flex items-center justify-center text-xs font-medium text-gray-400 bg-gray-50 italic">
            No activity data available to calculate balance
          </div>
        ) : (
          <>
            <div
              style={{ width: `${savedPercent}%` }}
              className="h-full bg-green-500 transition-all duration-700 flex items-center justify-start pl-4"
            >
              {savedPercent >= 15 && (
                <span className="text-[10px] font-bold text-white tracking-wider">
                  {savedPercent.toFixed(0)}%
                </span>
              )}
            </div>
            <div
              style={{ width: `${emittedPercent}%` }}
              className="h-full bg-red-500 transition-all duration-700 flex items-center justify-end pr-4"
            >
              {emittedPercent >= 15 && (
                <span className="text-[10px] font-bold text-white tracking-wider">
                  {emittedPercent.toFixed(0)}%
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Legend & Details */}
      {totalVolume > 0 && (
        <div className="flex justify-between items-center mt-3 text-xs">
          <div className="flex items-center gap-1.5 text-green-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Saved: {saved.toFixed(1)} kg</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Emitted: {emitted.toFixed(1)} kg</span>
          </div>
        </div>
      )}
    </section>
  );
}
