import PropTypes from "prop-types";

/**
 * EmittersList component displaying the top carbon emitters with percentage progress bars.
 *
 * @param {Object} props - The component props.
 * @param {Array} props.topEmitters - Sorted list of top carbon emitting activities.
 * @param {number} props.maxEmitterVal - Maximum emission value for scale.
 */
export default function EmittersList({ topEmitters, maxEmitterVal }) {
  return (
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
  );
}

EmittersList.propTypes = {
  topEmitters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    }),
  ).isRequired,
  maxEmitterVal: PropTypes.number.isRequired,
};
