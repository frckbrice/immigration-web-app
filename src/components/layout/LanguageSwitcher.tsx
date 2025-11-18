'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
}

export function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  // Safely get language code with fallback
  const languageCode = i18n.language ? i18n.language.split('-')[0] : 'en';
  const currentLanguage = languages.find((lang) => lang.code === languageCode) || languages[0];

  // Prevent hydration mismatch by only rendering language code after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const changeLanguage = (langCode: string) => {
    if (i18n && i18n.changeLanguage) {
      i18n.changeLanguage(langCode);
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', langCode);
      }
    }
  };

  // Determine text color based on variant
  const textColor = variant === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 sm:gap-2 transition-all duration-200 border hover:border-[#ff4538]/50 h-8 sm:h-9 px-2 sm:px-3"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'rgba(255, 69, 56, 0.3)',
            borderWidth: '1px',
            borderStyle: 'solid',
            color: textColor,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
            e.currentTarget.style.color = '#ff4538';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
            e.currentTarget.style.color = textColor;
          }}
        >
          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" style={{ color: '#ff4538' }} />
          {mounted && (
            <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: textColor }}>
              {currentLanguage.code.toUpperCase()}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className="gap-2"
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
            {currentLanguage.code === language.code && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
