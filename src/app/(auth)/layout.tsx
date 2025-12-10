import { ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Gradient Background Orbs - Theme-aware */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 dark:opacity-20"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-0">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl backdrop-blur-sm border border-border shadow-lg bg-card/40">
              <Image
                src="/images/app-logo.png"
                alt="Patrick Travel Services"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary">Patrick Travel Services</h1>
          <p className="mt-2 text-muted-foreground">Immigration Services Management Platform</p>
        </div>

        {/* Content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-muted-foreground">
          <p>&copy; 2025 Patrick Travel Services. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
