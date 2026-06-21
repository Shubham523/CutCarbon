import PropTypes from "prop-types";

const BAR_COLORS = {
  Transport: "#3b82f6",
  Food: "#f97316",
  Energy: "#eab308",
  Shopping: "#a855f7",
  Groceries: "#16a34a",
};
const DEFAULT_COLOR = "#6b7280";

/**
 * CategoryEmissionsTab renders the carbon footprint grouped by category.
 *
 * @param {Object} props - Component props.
 * @param {Array} props.categoryData - Pre-calculated category list.
 * @param {number} props.maxCo2 - Pre-calculated max CO2 value for percent representation.
 */
export default function CategoryEmissionsTab({ categoryData, maxCo2 }) {
  return (
    <section aria-label="Emissions by category">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">
        This week
      </p>
      {categoryData.length === 0 ? (
        <p className="text-sm text-gray-400 py-6">
          No analysis data yet — categories will appear here once you add
          analysis.
        </p>
      ) : (
        <div className="space-y-5">
          {categoryData.map(({ category, current }) => {
            const pct = ((current / maxCo2) * 100).toFixed(0);
            const color = BAR_COLORS[category] ?? DEFAULT_COLOR;
            return (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-800">{category}</span>
                  <span className="text-gray-400 tabular-nums">
                    {current} kg
                  </span>
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
  );
}

CategoryEmissionsTab.propTypes = {
  categoryData: PropTypes.arrayOf(PropTypes.object).isRequired,
  maxCo2: PropTypes.number.isRequired,
};
