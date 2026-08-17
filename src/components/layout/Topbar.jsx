import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, Button, Badge, Avatar, Input, EmptyState } from '../ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { relativeDay } from '../../utils/format.js';

const NOTIF_TONES = {
  overdue: {
    Glyph: Icon.AlertTriangle,
    cls: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  },
  critical: {
    Glyph: Icon.Flame,
    cls: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  },
  urgent: {
    Glyph: Icon.Clock,
    cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  },
};

export default function Topbar({ onOpenMobileNav, onNewTask, onOpenAiParse }) {
  const navigate = useNavigate();
  const { user, isDemo, tasks, notifications, dismissNotification, clearNotifications, signOut } =
    useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const notifRef = useRef(null);
  const accountRef = useRef(null);
  const searchRef = useRef(null);

  // Close popovers on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const results = query.trim()
    ? tasks
        .filter((t) => {
          const q = query.toLowerCase();
          return (
            t.title.toLowerCase().includes(q) ||
            (t.moduleCode || '').toLowerCase().includes(q) ||
            (t.moduleName || '').toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
    : [];

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        {/* Mobile nav trigger */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Open navigation"
        >
          <Icon.Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div ref={searchRef} className="relative min-w-0 flex-1 max-w-md">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search tasks and modules"
            className="h-9"
            leftIcon={<Icon.Search className="h-4 w-4" />}
          />

          {searchFocused && query.trim() && (
            <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift dark:border-slate-700 dark:bg-slate-900">
              {results.length ? (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {results.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/app/tasks', { state: { highlight: t.id } });
                          setQuery('');
                          setSearchFocused(false);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <Icon.CheckSquare className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">
                            {t.title}
                          </span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                            {t.moduleCode || 'No module'} · {relativeDay(t.deadline)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No tasks match “{query}”
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={onNewTask}>
            <Icon.Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span className="hidden sm:inline">New task</span>
          </Button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                setAccountOpen(false);
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Icon.Bell className="h-4.5 w-4.5" />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Reminders</p>
                    <Badge tone="neutral" size="xs">
                      SNS
                    </Badge>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearNotifications}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <EmptyState
                    icon={<Icon.CircleCheck className="h-5 w-5" />}
                    title="Nothing urgent"
                    description="You'll be alerted when a heavily weighted task is close to due and behind on progress."
                    className="!py-8"
                  />
                ) : (
                  <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                    {notifications.map((n) => {
                      const tone = NOTIF_TONES[n.type] || NOTIF_TONES.urgent;
                      const Glyph = tone.Glyph;
                      return (
                        <li key={n.id} className="flex gap-3 px-4 py-3">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.cls}`}
                          >
                            <Glyph className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {n.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                              {n.message}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Link
                                to="/app/tasks"
                                onClick={() => setNotifOpen(false)}
                                className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
                              >
                                View task
                              </Link>
                              <span className="text-xs text-slate-300 dark:text-slate-700">·</span>
                              <button
                                type="button"
                                onClick={() => dismissNotification(n.id)}
                                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Account */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setAccountOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-lg p-0.5 transition-opacity hover:opacity-80"
              aria-label="Account menu"
            >
              <Avatar name={user?.name} size="sm" />
              <Icon.ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </button>

            {accountOpen && (
              <div className="absolute right-0 top-11 z-40 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Avatar name={user?.name} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {user?.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  {user?.course && (
                    <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
                      {user.course}
                    </p>
                  )}
                </div>

                {isDemo && (
                  <div className="border-b border-slate-200 bg-brand-50 px-4 py-2.5 dark:border-slate-800 dark:bg-brand-500/5">
                    <p className="text-xs font-semibold text-brand-800 dark:text-brand-300">
                      You're exploring the demo
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-brand-700/80 dark:text-brand-400/70">
                      Create an account to keep your tasks across devices.
                    </p>
                    <Link
                      to="/login"
                      state={{ mode: 'signup' }}
                      onClick={() => setAccountOpen(false)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline dark:text-brand-300"
                    >
                      Sign up free
                      <Icon.ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                <div className="p-1.5">
                  <Link
                    to="/app/settings"
                    onClick={() => setAccountOpen(false)}
                    className="nav-item w-full"
                  >
                    <Icon.Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <Link to="/" onClick={() => setAccountOpen(false)} className="nav-item w-full">
                    <Icon.Info className="h-4 w-4" />
                    About Vectra
                  </Link>
                  {isDemo ? (
                    <Link
                      to="/login"
                      onClick={() => setAccountOpen(false)}
                      className="nav-item w-full"
                    >
                      <Icon.LogOut className="h-4 w-4" />
                      Log in
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="nav-item w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <Icon.LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
