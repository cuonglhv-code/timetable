'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function PublicEmailPrompt() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    if (!trimmedEmail.toLowerCase().endsWith('@jaxtina.com')) {
      setError('Access is restricted. Please enter a valid @jaxtina.com email address.');
      setIsLoading(false);
      return;
    }

    // Set cookie on client side (valid for 30 days)
    document.cookie = `viewer_email=${encodeURIComponent(trimmedEmail)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;

    // Refresh the current route to update the server component state
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
         style={{ background: 'var(--gradient-prompt)' }}>

      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />

      <div className="w-full max-w-md animate-fade-up">

        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="heading-xl mb-1">Jaxtina Timetable</h1>
          <p className="muted">Enter your email to view the current schedule</p>
        </div>

        {/* Card */}
        <div className="card p-8"
             style={{ background: 'var(--bg-surface-glass)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-default)' }}>

          {error && (
            <div className="flex items-center gap-2 mb-5 p-3 rounded-lg text-sm animate-fade-in"
                 style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.30)', color: '#fca5a5' }}>
               <span className="font-medium text-xs sm:text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label block mb-2">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                       style={{ color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field pl-10"
                  placeholder="yourname@jaxtina.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5 text-base mt-2 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  View Timetable
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 muted text-xs">
          © {new Date().getFullYear()} Jaxtina English Centre. All rights reserved.
        </p>
      </div>
    </div>
  );
}
