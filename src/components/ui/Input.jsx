import React from 'react';

export function Field({ label, hint, error, required, htmlFor, className = '', children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label mb-1.5">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef(function Input(
  { className = '', leftIcon, rightSlot, ...rest },
  ref,
) {
  if (leftIcon || rightSlot) {
    return (
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={`field ${leftIcon ? 'pl-9' : ''} ${rightSlot ? 'pr-10' : ''} ${className}`}
          {...rest}
        />
        {rightSlot && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
    );
  }
  return <input ref={ref} className={`field ${className}`} {...rest} />;
});

export const Select = React.forwardRef(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} className={`field cursor-pointer pr-9 ${className}`} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = React.forwardRef(function Textarea(
  { className = '', rows = 3, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={`field resize-y ${className}`} {...rest} />;
});

export function Switch({ checked, onChange, label, description, id }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 dark:text-white">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
            {description}
          </span>
        )}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700',
        ].join(' ')}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: checked ? 'translateX(1.125rem)' : 'translateX(0.125rem)' }}
        />
      </button>
    </label>
  );
}

export function SegmentedControl({ options, value, onChange, size = 'md', className = '' }) {
  const heights = { sm: 'h-7', md: 'h-8' };
  return (
    <div
      className={[
        'inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5',
        'dark:border-slate-700 dark:bg-slate-800/70',
        heights[size],
        className,
      ].join(' ')}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'inline-flex h-full items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-semibold transition-all',
              active
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
            ].join(' ')}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
