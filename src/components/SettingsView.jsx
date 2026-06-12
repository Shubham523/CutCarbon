import { useState } from 'react';
import { Bell, User, Sliders ,Shield} from 'lucide-react';

const SETTINGS_SECTIONS = [
  {
    id: 'profile',
    title: 'Profile',
    icon: User,
    description: 'Your personal information and account details',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    description: 'Manage alerts, digests, and weekly summaries',
  },
  {
    id: 'targets',
    title: 'Emission Targets',
    icon: Sliders,
    description: 'Set your personal CO₂ reduction goals',
  },
  {
    id: 'privacy',
    title: 'Privacy & Data',
    icon: Shield,
    description: 'Control how your data is stored and used',
  },
];

export default function SettingsView({ user }) {
  const [dailyTarget, setDailyTarget] = useState(10);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [activityReminders, setActivityReminders] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account, targets, and preferences.</p>
      </div>

      {/* Profile card */}
      <section aria-labelledby="section-profile" className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 id="section-profile" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User size={15} className="text-gray-400" aria-hidden="true" />
            Profile
          </h2>
        </div>
        <div className="px-4 py-4 grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="settings-name" className="block text-xs font-medium text-gray-600 mb-1">
              Display name
            </label>
            <input
              id="settings-name"
              type="text"
              defaultValue={user?.displayName ?? ''}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-100"
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="block text-xs font-medium text-gray-600 mb-1">
              Email address
            </label>
            <input
              id="settings-email"
              type="email"
              defaultValue={user?.email ?? ''}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-100"
            />
          </div>
        </div>
      </section>

      {/* Targets */}
      <section aria-labelledby="section-targets" className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 id="section-targets" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sliders size={15} className="text-gray-400" aria-hidden="true" />
            Emission Targets
          </h2>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="daily-target" className="text-sm font-medium text-gray-700">
                Daily CO₂ target
              </label>
              <span className="text-sm font-semibold text-green-700 tabular-nums">{dailyTarget} kg / day</span>
            </div>
            <input
              id="daily-target"
              type="range"
              min={5}
              max={30}
              value={dailyTarget}
              onChange={e => setDailyTarget(Number(e.target.value))}
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
            🌍 The global 1.5°C target requires average daily emissions of around <strong>7 kg CO₂</strong> per person.
          </p>
        </div>
      </section>

      {/* Notifications */}
      <section aria-labelledby="section-notifications" className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 id="section-notifications" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Bell size={15} className="text-gray-400" aria-hidden="true" />
            Notifications
          </h2>
        </div>
        <ul role="list" className="divide-y divide-gray-100">
          {[
            {
              id: 'weekly-digest',
              label: 'Weekly digest email',
              desc: 'Receive a summary of your weekly emissions every Monday',
              state: weeklyDigest,
              setter: setWeeklyDigest,
            },
            {
              id: 'activity-reminders',
              label: 'Activity log reminders',
              desc: 'Get a daily nudge to log your activities at 8 PM',
              state: activityReminders,
              setter: setActivityReminders,
            },
            {
              id: 'public-profile',
              label: 'Public leaderboard profile',
              desc: 'Show your username on the community leaderboard',
              state: publicProfile,
              setter: setPublicProfile,
            },
          ].map(item => (
            <li key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                id={`toggle-${item.id}`}
                role="switch"
                aria-checked={item.state}
                aria-label={item.label}
                onClick={() => item.setter(!item.state)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0
                  ${item.state ? 'bg-green-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform
                    ${item.state ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          id="settings-save-btn"
          className="px-5 py-2 bg-green-700 text-white text-sm font-medium rounded-md hover:bg-green-800 transition-colors"
          aria-label="Save settings"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
