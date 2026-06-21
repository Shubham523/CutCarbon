import PropTypes from "prop-types";
import { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  LineChart,
  Settings,
  Leaf,
  LogOut,
} from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "insights", label: "Insights", icon: LineChart },
  { id: "settings", label: "Settings", icon: Settings },
];

const VIEW_LABELS = {
  dashboard: "Dashboard",
  insights: "Insights",
  settings: "Settings",
};

/**
 * TopAppBar component rendering the navigation bar for mobile layout
 * and title/logout controls for desktop layout.
 *
 * @param {Object} props - The component props.
 * @param {string} props.activeView - Currently active view ID (e.g. 'dashboard').
 * @param {Function} props.onNavigate - Callback invoked when navigation occurs.
 * @param {Function} props.onLogout - Callback invoked when logging out.
 */
export default function TopAppBar({ activeView, onNavigate, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-30 bg-white border-b border-gray-100"
      role="banner"
    >
      <div className="flex items-center justify-between px-5 h-13">
        {/* Mobile brand */}
        <div className="flex md:hidden items-center gap-2">
          <Leaf size={15} className="text-green-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-900">CutCarbon</span>
        </div>

        {/* Page title (desktop) */}
        <h1 className="hidden md:block text-sm font-semibold text-gray-900">
          {VIEW_LABELS[activeView]}
        </h1>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-gray-500 hover:text-gray-900"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logout button (desktop) */}
        <button
          id="logout-btn"
          onClick={onLogout}
          aria-label="Sign out"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500
            rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} aria-hidden="true" />
          Logout
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden border-t border-gray-100 px-3 py-2 space-y-0.5"
        >
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                onNavigate(id);
                setMobileOpen(false);
              }}
              aria-current={activeView === id ? "page" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left
                ${activeView === id ? "font-semibold text-gray-900 bg-gray-100" : "text-gray-500"}`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
          {/* Logout (mobile) */}
          <button
            id="logout-btn-mobile"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left
              text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} aria-hidden="true" />
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}

TopAppBar.propTypes = {
  activeView: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};
