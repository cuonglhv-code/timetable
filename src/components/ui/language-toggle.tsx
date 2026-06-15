'use client';

import { useLanguage } from '@/providers/language-provider';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
      title={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang Tiếng Anh'}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all"
      style={{
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-default)',
        cursor: 'pointer',
        fontFamily: 'Arial, sans-serif',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: 'var(--text-secondary)',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-glass-hover)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-glass)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
      }}
    >
      {/* Flag emoji + label */}
      <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>
        {lang === 'en' ? '🇻🇳' : '🇬🇧'}
      </span>
      <span>{lang === 'en' ? 'VI' : 'EN'}</span>
    </button>
  );
}
