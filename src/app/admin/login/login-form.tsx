'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Loader2, BookOpen, Lock, Mail, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useLanguage } from '@/providers/language-provider';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const { tr, lang } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError(tr('login_error'));
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError(tr('login_error_generic'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--bg-app)' }}
    >
      {/* Controls — top right */}
      <div className="absolute top-5 right-5 z-50 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Atmospheric warm light */}
      <div className="absolute pointer-events-none"
        style={{
          top: '-10%', left: '-10%',
          width: '55vw', height: '55vw',
          background: 'radial-gradient(circle at 30% 30%, rgba(232,160,32,0.10) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />
      <div className="absolute pointer-events-none"
        style={{
          bottom: '-5%', right: '0',
          width: '40vw', height: '40vw',
          background: 'radial-gradient(circle at 70% 70%, rgba(45,212,191,0.07) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Top editorial rule */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
           style={{ background: 'linear-gradient(90deg, transparent 0%, var(--brand-primary) 40%, var(--brand-secondary) 80%, transparent 100%)' }} />

      <div className="w-full max-w-sm animate-fade-up relative z-10" style={{ animationDelay: '80ms' }}>

        {/* Brand header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="flex items-center justify-center w-9 h-9 rounded"
              style={{ background: 'var(--brand-primary)', boxShadow: 'var(--shadow-glow)' }}
            >
              <BookOpen style={{ color: '#0e0d0b', width: '1.1rem', height: '1.1rem' }} />
            </div>
            <div className="leading-none">
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                Jaxtina
              </div>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.16em', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                {tr('login_system')}
              </div>
            </div>
          </div>

          {/* Bilingual heading — stacked EN + VI */}
          <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.15, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {lang === 'en' ? (
              <>Welcome <span style={{ color: 'var(--text-accent)' }}>back.</span></>
            ) : (
              <>Chào mừng <span style={{ color: 'var(--text-accent)' }}>trở lại.</span></>
            )}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {tr('login_subtitle')}
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-xl p-7"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {error && (
            <div
              className="flex items-start gap-2.5 mb-5 p-3 rounded-lg text-sm animate-fade-in"
              style={{ background: 'rgba(240,80,80,0.10)', border: '1px solid rgba(240,80,80,0.25)', color: '#f87171' }}
            >
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label block mb-2">{tr('login_email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field pl-10"
                  placeholder="you@jaxtina.edu.vn"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label block mb-2">{tr('login_password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3 mt-2"
              style={{ fontSize: '0.8rem' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tr('login_signing_in')}
                </>
              ) : (
                <>
                  {tr('login_submit')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 mt-8">
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          <p style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            © {new Date().getFullYear()} {tr('login_copyright')}
          </p>
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
        </div>
      </div>
    </div>
  );
}
