'use client';

import Link from 'next/link';

export default function HomePage() {
  const calendlyLink = 'https://calendly.com/uzziaslam/evidentia-demo';

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">
      {/* HEADER — Nielsen H4: Consistency & Standards */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900">Evidentia</span>
            <span className="text-sm text-slate-400 font-normal hidden sm:inline">Legal Reasoning</span>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* HERO — Nielsen H6: Recognition over Recall */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
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
              <Link
                href="/login"
                className="px-6 py-3 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-50 transition-colors"
              >
                Sign In
              </Link>
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
              'Case summary and issues list',
              'Laws affected analysis',
              'Breaches mapping',
              'Cause of action matrix',
              'Adversarial analysis',
              'Evidence schedule',
              'Lawyer case pack',
              'Scoping analysis',
            ].map((capability) => (
              <div key={capability} className="bg-white rounded-lg p-5 border border-slate-200">
                <p className="text-sm font-medium text-slate-700">{capability}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm text-slate-400">© 2026 Evidentia. Legal Intelligence.</span>
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Sign In
          </Link>
        </div>
      </footer>
    </main>
  );
}
