'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-md bg-white/10 animate-pulse border border-white/20 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-white/20"></div>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="h-8 sm:h-9 w-9 sm:w-9 p-0 transition-all duration-200 border hover:border-[#ff4538]/50"
      style={{
        backgroundColor: 'transparent',
        borderColor: 'rgba(255, 69, 56, 0.3)',
        borderWidth: '1px',
        borderStyle: 'solid',
        color: 'rgba(255, 255, 255, 0.8)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
        e.currentTarget.style.color = '#ff4538';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 sm:h-4 sm:w-4" />
      ) : (
        <Moon className="h-4 w-4 sm:h-4 sm:w-4" />
      )}
    </Button>
  );
}
