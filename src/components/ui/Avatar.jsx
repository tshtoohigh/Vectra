import React from 'react';
import { initials } from '../../utils/format.js';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
  xl: 'h-14 w-14 text-lg',
};

export default function Avatar({ name, size = 'md', className = '' }) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'bg-brand-600 font-bold text-white',
        SIZES[size] || SIZES.md,
        className,
      ].join(' ')}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
