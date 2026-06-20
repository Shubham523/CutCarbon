import { LayoutDashboard, LineChart, Settings, Leaf } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'insights',  label: 'Insights',  icon: LineChart },
  { id: 'settings',  label: 'Settings',  icon: Settings },
];

export default function Sidebar({ activeView, onNavigate }) {
  return (
    <aside
      className="hidden md:flex flex-col w-52 shrink-0 border-r border-gray-100 h-screen sticky top-0"
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-5">
        <Leaf size={16} className="text-green-600" aria-hidden="true" />
        <span className="text-sm font-semibold text-gray-900 tracking-tight">CutCarbon</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              id={`nav-${id}`}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left
                ${active ? 'font-semibold text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
