import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Icon, Button, Field, Input } from '../components/ui/index.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { CognitoAuth } from '../services/aws/cognitoAuth.js';

const VALUE_PROPS = [
  {
    Glyph: Icon.Target,
    title: 'One clear next action',
    body: 'Stop re-reading your whole to-do list. Vectra surfaces the single task that matters most tonight.',
  },
  {
    Glyph: Icon.BarChart,
    title: 'Spot crunch weeks early',
    body: 'Your hours are mapped against real availability, so overloaded days show up days in advance.',
  },
  {
    Glyph: Icon.Sparkles,
    title: 'Breaks big work down',
    body: 'An 18-hour project becomes five milestones you can actually start on a Tuesday evening.',
  },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const [mode, setMode] = useState(location.state?.mode === 'signup' ? 'signup' : 'login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    institution: '',
    course: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  // Already signed in? Go straight to the app.
  useEffect(() => {
    CognitoAuth.init();
    if (CognitoAuth.isAuthenticated()) navigate('/app', { replace: true });
  }, [navigate]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (isSignup) {
        if (form.password.length < 6) {
          throw new Error('Password needs to be at least 6 characters.');
        }
        await CognitoAuth.signUp({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name.trim() || 'Student',
          institution: form.institution.trim(),
          course: form.course.trim(),
          dailyHours: 4,
        });
      } else {
        await CognitoAuth.signIn({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });
      }
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      {/* ---------- Form column ---------- */}
      <div className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-[52%] lg:px-16">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.Logo className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Vectra
            </span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Icon.Sun className="h-4 w-4" /> : <Icon.Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Form body */}
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <Icon.ChevronLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {isSignup
                ? 'Track every deadline in one place and know what to do first.'
                : 'Log in to pick up where you left off.'}
            </p>

            {/* Mode tabs */}
            <div className="mt-7 flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/70">
              {[
                { value: 'login', label: 'Log in' },
                { value: 'signup', label: 'Sign up' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => switchMode(tab.value)}
                  className={[
                    'flex-1 rounded-md py-1.5 text-sm font-semibold transition-all',
                    mode === tab.value
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {isSignup && (
                <Field label="Full name" htmlFor="auth-name">
                  <Input
                    id="auth-name"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Alex Tan"
                    autoComplete="name"
                    leftIcon={<Icon.User className="h-4 w-4" />}
                  />
                </Field>
              )}

              <Field label="Email address" htmlFor="auth-email" required>
                <Input
                  id="auth-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@student.edu.sg"
                  autoComplete="email"
                  leftIcon={<Icon.Mail className="h-4 w-4" />}
                />
              </Field>

              <Field
                label="Password"
                htmlFor="auth-password"
                required
                hint={isSignup ? 'At least 6 characters.' : undefined}
              >
                <Input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={update('password')}
                  placeholder={isSignup ? 'Create a password' : 'Your password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  leftIcon={<Icon.Lock className="h-4 w-4" />}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <Icon.EyeOff className="h-4 w-4" />
                      ) : (
                        <Icon.Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
              </Field>

              {isSignup && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Institution" htmlFor="auth-institution">
                    <Input
                      id="auth-institution"
                      value={form.institution}
                      onChange={update('institution')}
                      placeholder="Nanyang Polytechnic"
                    />
                  </Field>
                  <Field label="Course" htmlFor="auth-course">
                    <Input
                      id="auth-course"
                      value={form.course}
                      onChange={update('course')}
                      placeholder="Diploma in Engineering"
                    />
                  </Field>
                </div>
              )}

              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/25 dark:bg-red-500/10"
                  role="alert"
                >
                  <Icon.AlertTriangle className="mt-px h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-xs font-medium leading-relaxed text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              )}

              <Button type="submit" size="lg" fullWidth loading={busy}>
                {isSignup ? 'Create account' : 'Log in'}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
              Accounts are managed with Amazon Cognito.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Value panel (desktop only) ---------- */}
      <div className="relative hidden overflow-hidden bg-brand-600 lg:flex lg:w-[48%]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-brand-400/25 blur-3xl" />
        </div>

        <div className="relative flex w-full flex-col justify-center px-14 py-16">
          <div>
            <h2 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight text-white">
              Built for weeks where everything is due at once
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-brand-50">
              Three assignments, a test and a group project in the same week is normal. Vectra works
              out the order for you and shows its reasoning.
            </p>
          </div>

          <div className="mt-12 space-y-7">
            {VALUE_PROPS.map(({ Glyph, title, body }) => (
              <div key={title} className="flex max-w-md gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
                  <Glyph className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-brand-50/90">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <figure className="mt-14 max-w-md rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <blockquote>
              <p className="text-sm leading-relaxed text-white">
                “I stopped keeping deadlines in three different apps. Seeing that my Wednesday was
                already nine hours deep changed how I planned the whole week.”
              </p>
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3 border-t border-white/15 pt-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                NH
              </span>
              <div>
                <p className="text-xs font-bold text-white">Nurul H.</p>
                <p className="text-[11px] text-brand-100">Year 2, Engineering with Business</p>
              </div>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
