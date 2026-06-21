import PropTypes from "prop-types";

/**
 * SaversList component displaying the top carbon savings with progress bars.
 *
 * @param {Object} props - The component props.
 * @param {Array} props.topSavers - Sorted list of carbon savings activities.
 * @param {number} props.maxSaverVal - Maximum savings value for scale.
 */
export default function SaversList({ topSavers, maxSaverVal }) {
  return (
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
  );
}

SaversList.propTypes = {
  topSavers: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    }),
  ).isRequired,
  maxSaverVal: PropTypes.number.isRequired,
};
