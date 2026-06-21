import { useState, useEffect } from "react";
import { User, Sliders } from "lucide-react";
import PropTypes from "prop-types";

/**
 * SettingsView component rendering personal settings options (Target KG, profile details, public status).
 *
 * @param {Object} props - The component props.
 * @param {Object} props.user - Current authenticated Firebase user.
 * @param {Object} [props.settings] - Initial/fetched user settings object.
 */
export default function SettingsView({ user, settings = {} }) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const [dailyTarget, setDailyTarget] = useState(10);
  const [publicProfile, setPublicProfile] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'error'

  // Hydrate local form state whenever Firestore delivers fresh settings.
  // Using individual setters avoids a render loop (no object identity churn).
  useEffect(() => {
    if (!settings || Object.keys(settings).length === 0) return;
    if (settings.dailyTargetKg !== undefined)
      setDailyTarget(settings.dailyTargetKg);
    if (settings.publicProfile !== undefined)
      setPublicProfile(settings.publicProfile);
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    setSaveStatus("saving");

    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.uid,
          settings: {
            dailyTargetKg: dailyTarget,
            publicProfile,
          },
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (_) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your account, targets, and preferences.
        </p>
      </div>

      {/* Profile card */}
      <section
        aria-labelledby="section-profile"
        className="border border-gray-200 rounded-lg bg-white overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2
            id="section-profile"
            className="text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            <User size={15} className="text-gray-400" aria-hidden="true" />
            Profile
          </h2>
        </div>
        <div className="px-4 py-4 grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-name"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Display name
            </label>
            <input
              id="settings-name"
              type="text"
              defaultValue={user?.displayName ?? ""}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-100"
            />
          </div>
          <div>
            <label
              htmlFor="settings-email"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Email address
            </label>
            <input
              id="settings-email"
              type="email"
              defaultValue={user?.email ?? ""}
              readOnly
              disabled
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-500 bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* Targets */}
      <section
        aria-labelledby="section-targets"
        className="border border-gray-200 rounded-lg bg-white overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2
            id="section-targets"
            className="text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            <Sliders size={15} className="text-gray-400" aria-hidden="true" />
            Emission Targets
          </h2>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="daily-target"
                className="text-sm font-medium text-gray-700"
              >
                Daily CO₂ target
              </label>
              <span className="text-sm font-semibold text-green-700 tabular-nums">
                {dailyTarget} kg / day
              </span>
            </div>
            <input
              id="daily-target"
              type="range"
              min={5}
              max={30}
              value={dailyTarget}
              onChange={(e) => setDailyTarget(Number(e.target.value))}
              className="w-full h-1.5 appearance-none bg-gray-200 rounded-full cursor-pointer accent-green-700"
              aria-valuemin={5}
              aria-valuemax={30}
              aria-valuenow={dailyTarget}
              aria-label={`Daily CO₂ target: ${dailyTarget} kg`}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5 kg (ambitious)</span>
              <span>30 kg (baseline)</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 bg-green-50 border border-green-100 rounded-md px-3 py-2">
            🌍 The global 1.5°C target requires average daily emissions of
            around <strong>7 kg CO₂</strong> per person.
          </p>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saveStatus === "saved" && (
          <p
            className="text-sm text-green-600 font-medium"
            role="status"
            aria-live="polite"
          >
            ✓ Preferences saved
          </p>
        )}
        {saveStatus === "error" && (
          <p className="text-sm text-red-500 font-medium" role="alert">
            ✗ Save failed — check backend is running
          </p>
        )}
        <button
          id="settings-save-btn"
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className="px-5 py-2 bg-green-700 text-white text-sm font-medium rounded-md
            hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          aria-label="Save settings"
        >
          {saveStatus === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

SettingsView.propTypes = {
  user: PropTypes.object.isRequired,
  settings: PropTypes.shape({
    dailyTargetKg: PropTypes.number,
    publicProfile: PropTypes.bool,
  }),
};
