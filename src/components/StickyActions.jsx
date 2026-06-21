import PropTypes from "prop-types";
import useStickyActions from "../hooks/useStickyActions";

/**
 * StickyActions component rendering the fixed bottom CTA buttons for receipt analysis and fitness syncing.
 *
 * @param {Object} props - The component props.
 * @param {Function} props.onAction - Toast message callback.
 * @param {Object} props.user - The current authenticated user.
 */
export default function StickyActions({ onAction, user }) {
  const {
    analyzing,
    syncing,
    groceryInputRef,
    handleGroceryAnalysis,
    handleSync,
  } = useStickyActions({ onAction, user });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center gap-3 px-4 py-4 bg-white border-t border-gray-100">
      {/* Hidden file input — triggered by button click via ref */}
      <input
        type="file"
        ref={groceryInputRef}
        accept="image/*"
        onChange={handleGroceryAnalysis}
        aria-label="Upload receipt image for analysis"
        className="hidden"
      />

      <button
        id="analyze-impact-btn"
        onClick={() => groceryInputRef.current.click()}
        disabled={analyzing}
        aria-label="Analyze grocery receipt to log food emissions"
        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white text-sm font-semibold rounded-full
          hover:bg-green-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {analyzing ? (
          <span
            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : (
          <span aria-hidden="true">📷</span>
        )}
        {analyzing ? "Analyzing image..." : "Analyze Impact"}
      </button>

      <button
        id="sync-fitness-btn"
        onClick={handleSync}
        disabled={syncing}
        aria-label="Sync fitness data to log activity emissions"
        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-full
          hover:bg-gray-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {syncing ? (
          <span
            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : (
          <span aria-hidden="true">🏃‍♂️</span>
        )}
        {syncing ? "Syncing…" : "Sync Fitness"}
      </button>
    </div>
  );
}

StickyActions.propTypes = {
  onAction: PropTypes.func.isRequired,
  user: PropTypes.object,
};
