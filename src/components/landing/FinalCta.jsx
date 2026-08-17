import React from 'react';
import { Icon, Button } from '../ui/index.js';

export default function FinalCta() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-brand-600 px-6 py-14 text-center sm:px-12 dark:border-brand-500/30">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-brand-400/25 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Start the semester ahead of it
            </h2>
            <p className="mt-4 text-base leading-relaxed text-brand-50">
              Add your deadlines once and let PolyTrack handle the ordering. Free for students, no
              card required.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                to="/app"
                size="xl"
                className="w-full bg-white !text-brand-700 hover:bg-brand-50 sm:w-auto"
              >
                Open the demo
                <Icon.ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                to="/login"
                size="xl"
                className="w-full border border-white/30 bg-white/10 !text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto"
              >
                Create an account
              </Button>
            </div>

            <p className="mt-5 text-xs text-brand-100">
              Takes about two minutes to add your first module.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
