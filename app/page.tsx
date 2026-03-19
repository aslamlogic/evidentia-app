'use client';

import Link from 'next/link';

export default function HomePage() {
  const calendlyLink = 'https://calendly.com/uzziaslam/evidentia-demo';

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-slate-900">Evidentia</span>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-3">
              Evidentia
            </h1>
            <h2 className="text-2xl font-normal text-slate-500 mb-8">
              Legal Reasoning
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-10">
              Evidentia analyses case facts, connects them to applicable law, and evaluates risks
              and strategic options through structured legal reasoning.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={calendlyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800 transition-colors"
              >
                Request a Demonstration
              </a>

            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-12 text-center">
            What Evidentia Does
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              'Automated chronology generation',
              'Comprehensive case summaries',
              'Laws and breaches mapping',
              'Legal reasoning analysis',
              'Risk and strategy evaluation',
            ].map((item) => (
              <div
                key={item}
                className="bg-white border border-slate-200 rounded-lg px-6 py-5 hover:border-slate-400 transition-colors"
              >
                <p className="text-slate-800 font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REASONING FLOW */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-12">
            Legal Reasoning Framework
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-center gap-3">
            {['Facts', 'Law', 'Reasoning', 'Risks', 'Strategy'].map((step, index) => (
              <div key={step} className="flex flex-col md:flex-row items-center gap-3">
                <div className="px-6 py-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-semibold text-sm">
                  {step}
                </div>
                {index < 4 && (
                  <>
                    <span className="text-slate-400 font-light text-xl hidden md:block">&rarr;</span>
                    <span className="text-slate-400 font-light text-xl md:hidden">&darr;</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDITABLE ANALYSIS */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">
            Auditable Analysis
          </h3>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Every stage of analysis is traceable, structured, and verifiable.
          </p>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 px-6 bg-slate-900">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-white mb-8">
            Request a Demonstration
          </h3>
          <a
            href={calendlyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-white text-slate-900 text-base font-semibold rounded-md hover:bg-slate-100 transition-colors"
          >
            Request a Demonstration
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-slate-900 font-bold">Evidentia</span>
          <span className="text-slate-500 text-sm">Legal reasoning system</span>
          <div className="flex items-center gap-6 text-slate-400 text-sm">
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
            <span>&copy; 2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
