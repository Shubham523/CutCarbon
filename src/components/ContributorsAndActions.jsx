import { useMemo } from "react";
import PropTypes from "prop-types";

/**
 * Returns advice based on the top carbon contributor.
 *
 * @param {string} name - Name of the category or item.
 * @param {number} value - Carbon value in kg.
 * @param {number} totalFootprint - Total weekly carbon footprint.
 * @returns {string} - Personalized advisory sentence.
 */
function getEmitterAdvice(name, value, totalFootprint) {
  const percentage =
    totalFootprint > 0 ? Math.round((value / totalFootprint) * 100) : 0;
  const key = name.toLowerCase();

  if (
    key === "solo car" ||
    key === "in vehicle" ||
    key.includes("solo car") ||
    key.includes("vehicle")
  ) {
    return `Solo driving makes up ${percentage}% of your footprint. Try carpooling once this week to cut this down.`;
  }
  if (key.includes("grocery") || key.includes("food")) {
    return `Groceries make up ${percentage}% of your footprint. Consider buying local produce or reducing meat intake to lower this.`;
  }
  return `${name} makes up ${percentage}% of your footprint. Look for eco-friendly alternatives to reduce this impact.`;
}

/**
 * Returns advice based on the top carbon saver (offset).
 *
 * @param {string} name - Name of the category or item.
 * @param {number} value - Saved carbon value in kg.
 * @returns {string} - Personalized offset encouragement sentence.
 */
function getSaverAdvice(name, value) {
  const key = name.toLowerCase();
  const X = value.toFixed(1);

  if (
    key === "walking" ||
    key === "on foot" ||
    key.includes("walking") ||
    key === "on_foot"
  ) {
    return `Your morning walks are your biggest carbon offset! You've neutralized ${X} kg of CO2 just by staying on your feet.`;
  }
  if (
    key.includes("bike") ||
    key.includes("cycling") ||
    key.includes("biking")
  ) {
    return `Pedal power is paying off! You've avoided ${X} kg of CO2 by choosing to bike instead of drive.`;
  }
  if (
    key.includes("run") ||
    key.includes("aerobics") ||
    key.includes("treadmill")
  ) {
    return `Running is keeping both you and the planet fit! You've prevented ${X} kg of CO2 emissions.`;
  }
  if (
    key.includes("bus") ||
    key.includes("train") ||
    key.includes("metro") ||
    key.includes("carpool")
  ) {
    return `Choosing transit or carpooling saved ${X} kg of CO2 vs. driving solo. Keep up the sustainable travel habits!`;
  }
  return `By choosing ${name}, you've saved ${X} kg of CO2 this week. Every green choice counts!`;
}

/**
 * ContributorsAndActions rendering the top carbon emitter/saver listings
 * and custom dynamic insights.
 *
 * @param {Object} props - The component props.
 * @param {Array} [props.activities] - List of activity logs.
 */
export default function ContributorsAndActions({ activities = [] }) {
  const { emitters, savers, totalFootprint } = useMemo(() => {
    const emittersDict = {};
    const saversDict = {};
    let total = 0;

    activities.forEach((a) => {
      // Use item_name, fallback to category, fallback to 'Unknown'
      const name = a.item_name || a.category || "Unknown";

      const score = Number(a.co2_score_kg ?? a.co2 ?? 0);
      if (score > 0) {
        emittersDict[name] = (emittersDict[name] || 0) + score;
        total += score;
      }

      const prevented = Number(a.co2_prevented_kg ?? 0);
      if (prevented > 0) {
        saversDict[name] = (saversDict[name] || 0) + prevented;
      }
    });

    const emittersSorted = Object.entries(emittersDict)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const saversSorted = Object.entries(saversDict)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      emitters: emittersSorted,
      savers: saversSorted,
      totalFootprint: total,
    };
  }, [activities]);

  const topEmitters = emitters.slice(0, 3);
  const topSavers = savers.slice(0, 3);

  const maxEmitterVal = topEmitters[0]?.value || 1;
  const maxSaverVal = topSavers[0]?.value || 1;

  const topEmitter = emitters[0];
  const topSaver = savers[0];

  const emitterAdvice = topEmitter
    ? getEmitterAdvice(topEmitter.name, topEmitter.value, totalFootprint)
    : null;

  const saverAdvice = topSaver
    ? getSaverAdvice(topSaver.name, topSaver.value)
    : null;

  return (
    <section
      aria-label="Contributors and Actions"
      className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm"
    >
      <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
        <span className="text-xl">📊</span> Contributors &amp; Actions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Visual Breakdown */}
        <div className="space-y-6">
          {/* Emitters List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Top Emitters (kg CO₂)
            </h3>
            {topEmitters.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">
                No emitters recorded this week.
              </p>
            ) : (
              <div className="space-y-3">
                {topEmitters.map((item) => {
                  const pct = ((item.value / maxEmitterVal) * 100).toFixed(0);
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-gray-600">
                        <span>{item.name}</span>
                        <span className="tabular-nums">
                          {item.value.toFixed(1)} kg
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                          role="progressbar"
                          aria-valuenow={item.value}
                          aria-valuemin={0}
                          aria-valuemax={maxEmitterVal}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Savers List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              Top Savers (kg CO₂ saved)
            </h3>
            {topSavers.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">
                No savers recorded this week.
              </p>
            ) : (
              <div className="space-y-3">
                {topSavers.map((item) => {
                  const pct = ((item.value / maxSaverVal) * 100).toFixed(0);
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-gray-600">
                        <span>{item.name}</span>
                        <span className="tabular-nums">
                          {item.value.toFixed(1)} kg
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                          role="progressbar"
                          aria-valuenow={item.value}
                          aria-valuemin={0}
                          aria-valuemax={maxSaverVal}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Insights */}
        <div className="flex flex-col justify-center space-y-4 bg-gray-50/50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
            Personalized Actions &amp; Insights
          </h3>

          {!topEmitter && !topSaver ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              No activity logs found for this week. Start logging or sync your
              data to see custom insights.
            </p>
          ) : (
            <div className="space-y-4">
              {topEmitter && emitterAdvice && (
                <div className="flex gap-3 items-start">
                  <div
                    className="text-lg mt-0.5"
                    role="img"
                    aria-label="Warning"
                  >
                    ⚠️
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-0.5">
                      Top Emission Contributor
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {emitterAdvice}
                    </p>
                  </div>
                </div>
              )}

              {topSaver && saverAdvice && (
                <div className="flex gap-3 items-start pt-3 border-t border-gray-100">
                  <div className="text-lg mt-0.5" role="img" aria-label="Leaf">
                    🌱
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-0.5">
                      Top Carbon Offset
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {saverAdvice}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

ContributorsAndActions.propTypes = {
  activities: PropTypes.arrayOf(PropTypes.object),
};
