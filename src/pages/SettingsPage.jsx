import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Icon,
  Button,
  Badge,
  Field,
  Input,
  Switch,
  Avatar,
  Modal,
  AwsChip,
} from '../components/ui/index.js';
import { useApp } from '../context/AppContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

function Section({ title, description, icon, children, footer }) {
  return (
    <section className="surface overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="heading-card">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          {footer}
        </div>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const { user, isDemo, tasks, modules, updateProfile, signOut, resetDemoData, pushToast } =
    useApp();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    institution: user?.institution || '',
    course: user?.course || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [capacity, setCapacity] = useState(user?.dailyHours || 4);
  const [notifs, setNotifs] = useState({
    push: user?.notifications?.push ?? true,
    email: user?.notifications?.email ?? true,
    quietHours: user?.notifications?.quietHours ?? true,
  });
  const [confirmReset, setConfirmReset] = useState(false);

  const profileDirty =
    profile.name !== (user?.name || '') ||
    profile.institution !== (user?.institution || '') ||
    profile.course !== (user?.course || '');

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    await updateProfile(profile);
    setSavingProfile(false);
    pushToast({ tone: 'success', title: 'Profile updated' });
  };

  const saveCapacity = async (value) => {
    const hours = Math.min(16, Math.max(1, Number(value) || 1));
    setCapacity(hours);
    await updateProfile({ dailyHours: hours });
    pushToast({
      tone: 'success',
      title: 'Study capacity updated',
      message: `Workload now calculated against ${hours}h a day.`,
    });
  };

  const saveNotifs = async (next) => {
    setNotifs(next);
    await updateProfile({ notifications: next });
  };

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your profile, study capacity and reminders
        </p>
      </div>

      {/* Demo notice */}
      {isDemo && (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center dark:border-brand-500/25 dark:bg-brand-500/5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-brand-900 dark:text-brand-200">
              You're using the demo
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-brand-800/80 dark:text-brand-300/80">
              Changes save to this browser only. Create an account to sync across devices and
              receive reminders by email.
            </p>
          </div>
          <Button size="sm" to="/login" state={{ mode: 'signup' }} className="shrink-0">
            Create account
            <Icon.ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Profile */}
      <Section
        title="Profile"
        description="Used to personalise your dashboard."
        icon={<Icon.User className="h-4 w-4" />}
      >
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={profile.name || user?.name} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {profile.name || 'Your name'}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            {isDemo && (
              <Badge tone="brand" size="xs" className="mt-1.5">
                Demo account
              </Badge>
            )}
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Full name" htmlFor="set-name">
            <Input
              id="set-name"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              placeholder="Alex Tan"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Institution" htmlFor="set-institution">
              <Input
                id="set-institution"
                value={profile.institution}
                onChange={(e) => setProfile((p) => ({ ...p, institution: e.target.value }))}
                placeholder="Nanyang Polytechnic"
              />
            </Field>
            <Field label="Course" htmlFor="set-course">
              <Input
                id="set-course"
                value={profile.course}
                onChange={(e) => setProfile((p) => ({ ...p, course: e.target.value }))}
                placeholder="Diploma in Engineering"
              />
            </Field>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" size="md" disabled={!profileDirty} loading={savingProfile}>
              Save changes
            </Button>
            {profileDirty && (
              <Button
                type="button"
                size="md"
                variant="ghost"
                onClick={() =>
                  setProfile({
                    name: user?.name || '',
                    institution: user?.institution || '',
                    course: user?.course || '',
                  })
                }
              >
                Discard
              </Button>
            )}
          </div>
        </form>
      </Section>

      {/* Study capacity */}
      <Section
        title="Study capacity"
        description="How many hours you can realistically study on a normal day. This drives overload detection."
        icon={<Icon.Timer className="h-4 w-4" />}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {capacity}
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              hours / day
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              onMouseUp={(e) => saveCapacity(e.target.value)}
              onTouchEnd={(e) => saveCapacity(e.target.value)}
              onKeyUp={(e) => saveCapacity(e.target.value)}
              className="w-full cursor-pointer accent-brand-600"
              aria-label="Daily study hours"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>1h</span>
              <span>6h</span>
              <span>12h</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <Icon.Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Any day where the work due exceeds {capacity}h is flagged as over capacity on your
            dashboard and calendar, so you can start earlier instead of cramming.
          </p>
        </div>
      </Section>

      {/* Reminders */}
      <Section
        title="Reminders"
        description="Alerts only fire when a task is genuinely at risk — heavily weighted, close to due, and behind on progress."
        icon={<Icon.Bell className="h-4 w-4" />}
        footer={
          <div className="flex items-center gap-2">
            <Icon.Cloud className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Push alerts are delivered through Amazon SNS, daily digests through Amazon SES.
            </p>
            <div className="ml-auto flex shrink-0 gap-1">
              <AwsChip service="SNS" />
              <AwsChip service="SES" />
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <Switch
            id="notif-push"
            checked={notifs.push}
            onChange={(v) => saveNotifs({ ...notifs, push: v })}
            label="Urgent push alerts"
            description="Notify me when something is at risk of being late."
          />
          <div className="divider" />
          <Switch
            id="notif-email"
            checked={notifs.email}
            onChange={(v) => saveNotifs({ ...notifs, email: v })}
            label="Morning digest email"
            description="One email each morning summarising what is due."
          />
          <div className="divider" />
          <Switch
            id="notif-quiet"
            checked={notifs.quietHours}
            onChange={(v) => saveNotifs({ ...notifs, quietHours: v })}
            label="Quiet hours"
            description="Hold non-urgent notifications between 11pm and 8am."
          />
        </div>
      </Section>

      {/* Appearance */}
      <Section
        title="Appearance"
        description="Choose how Vectra looks."
        icon={<Icon.Sun className="h-4 w-4" />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: 'light', label: 'Light', Glyph: Icon.Sun },
            { value: 'dark', label: 'Dark', Glyph: Icon.Moon },
          ].map(({ value, label, Glyph }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={[
                  'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                  active
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-500/10'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    active
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  ].join(' ')}
                >
                  <Glyph className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {value === 'light' ? 'Bright and clean' : 'Easier at night'}
                  </p>
                </div>
                {active && (
                  <Icon.CircleCheck className="ml-auto h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Data */}
      <Section
        title="Your data"
        description="Everything is stored against your account and only visible to you."
        icon={<Icon.Database className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tasks', value: tasks.length },
            { label: 'Modules', value: modules.length },
            {
              label: 'Milestones',
              value: tasks.reduce((s, t) => s + (t.subtasks || []).length, 0),
            },
            { label: 'Completed', value: tasks.filter((t) => t.status === 'Completed').length },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {isDemo && (
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3.5 sm:flex-row sm:items-center dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Reset sample data
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Restore the original demo modules and deadlines.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0"
                onClick={() => setConfirmReset(true)}
              >
                Reset
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3.5 sm:flex-row sm:items-center dark:border-slate-700">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {isDemo ? 'Leave the demo' : 'Sign out'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {isDemo
                  ? 'Return to the homepage. Your demo data stays in this browser.'
                  : 'You will need to log in again to access your tasks.'}
              </p>
            </div>
            <Button
              size="sm"
              variant={isDemo ? 'secondary' : 'danger'}
              className="shrink-0"
              onClick={handleSignOut}
            >
              <Icon.LogOut className="h-3.5 w-3.5" />
              {isDemo ? 'Exit demo' : 'Sign out'}
            </Button>
          </div>
        </div>
      </Section>

      {/* Reset confirmation */}
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset sample data?"
        icon={<Icon.AlertTriangle className="h-4 w-4" />}
        size="sm"
      >
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          This replaces your current tasks and modules with the original demo set. Anything you have
          added in this browser will be lost.
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              resetDemoData();
              setConfirmReset(false);
            }}
          >
            Reset everything
          </Button>
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
