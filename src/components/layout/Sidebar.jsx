import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Icon } from '../ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

const NAV_GROUPS = [
  {
    label: 'Your studies',
    items: [
      { to: '/app', label: 'Dashboard', Glyph: Icon.Dashboard, end: true },
      { to: '/app/tasks', label: 'Tasks', Glyph: Icon.CheckSquare, badge: 'dueSoon' },
      { to: '/app/calendar', label: 'Calendar', Glyph: Icon.Calendar },
      { to: '/app/modules', label: 'Modules', Glyph: Icon.BookOpen },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/app/settings', label: 'Settings', Glyph: Icon.Settings }],
  },
];

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, stats, overloadedDays } = useApp();
  const { isDark, toggleTheme } = useTheme();

  const badgeValue = (key) => {
    if (key === 'dueSoon') return stats.overdue + stats.dueSoon || null;
    return null;
  };

  const content = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={[
          'flex h-14 shrink-0 items-center border-b border-slate-200 dark:border-slate-800',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        ].join(' ')}
      >
        <Link to="/app" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon.Logo className="h-4.5 w-4.5" strokeWidth={2.25} />
          </span>
          {!collapsed && (
            <span className="truncate text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Vectra
            </span>
          )}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:flex dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Collapse sidebar"
          >
            <Icon.PanelLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mb-2 flex h-9 w-full items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Expand sidebar"
          >
            <Icon.PanelLeft className="h-4 w-4" />
          </button>
        )}

        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && <p className="nav-group-label">{group.label}</p>}
            {collapsed && <div className="my-2 border-t border-slate-200 dark:border-slate-800" />}

            <div className="space-y-0.5">
              {group.items.map(({ to, label, Glyph, end, badge }) => {
                const count = badge ? badgeValue(badge) : null;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      [
                        'nav-item',
                        isActive ? 'nav-item-active' : '',
                        collapsed ? 'justify-center px-0' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                    title={collapsed ? label : undefined}
                  >
                    <Glyph className="h-4.5 w-4.5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{label}</span>
                        {count ? (
                          <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {count}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        {/* Workload warning */}
        {!collapsed && overloadedDays.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/25 dark:bg-amber-500/5">
            <div className="flex items-center gap-1.5">
              <Icon.AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {overloadedDays.length} heavy {overloadedDays.length === 1 ? 'day' : 'days'}
              </p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-700/90 dark:text-amber-400/80">
              You have more scheduled than your daily study time allows. Review your week and shift
              what you can.
            </p>
            <Link
              to="/app"
              onClick={onCloseMobile}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline dark:text-amber-300"
            >
              Review workload
              <Icon.ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-200 p-2 dark:border-slate-800">
        <button
          type="button"
          onClick={toggleTheme}
          className={['nav-item w-full', collapsed ? 'justify-center px-0' : ''].join(' ')}
          title={collapsed ? 'Toggle theme' : undefined}
        >
          {isDark ? (
            <Icon.Sun className="h-4.5 w-4.5 shrink-0" />
          ) : (
            <Icon.Moon className="h-4.5 w-4.5 shrink-0" />
          )}
          {!collapsed && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {!collapsed && (
          <div className="mt-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user?.institution || user?.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={[
          'hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block',
          'dark:border-slate-800 dark:bg-slate-900',
          collapsed ? 'w-16' : 'w-60',
        ].join(' ')}
      >
        <div className="sticky top-0 h-screen">{content}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 animate-slide-up border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
