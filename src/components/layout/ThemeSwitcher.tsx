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
      <div className="w-9 h-9 rounded-md bg-muted animate-pulse border border-border flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-muted-foreground/20"></div>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="h-8 sm:h-9 w-9 sm:w-9 p-0 transition-all duration-200 border border-primary/30 hover:border-primary/50 text-foreground/80 hover:text-primary"
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
