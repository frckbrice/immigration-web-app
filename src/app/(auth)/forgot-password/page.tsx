'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuthStore } from '@/features/auth/store';
import axios from 'axios';
import { apiClient } from '@/lib/utils/axios';

type ForgotPasswordSchema = z.ZodObject<{
  email: z.ZodString;
}>;

type ForgotPasswordInput = z.infer<ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Redirect authenticated users away from auth page
  useEffect(() => {
    if (!isLoading && isAuthenticated && !redirecting) {
      setRedirecting(true);
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, redirecting, router]);

  const forgotPasswordSchema = useMemo<ForgotPasswordSchema>(
    () =>
      z.object({
        email: z
          .string()
          .email({ message: t('validation.invalidEmail') })
          .min(1, { message: t('validation.required') }),
      }),
    [t]
  );

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      const response = await apiClient.post('/api/auth/forgot-password', data);
      setEmailSent(true);
      toast.success(response.data?.message || t('auth.toasts.resetEmailSent'));
    } catch (error) {
      logger.error('Password reset request failed:', error);
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : t('auth.errors.resetEmailFailed');
      toast.error(message);
    }
  };

  // Show lightweight loader during redirect/auth check
  if (isLoading || redirecting || isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">{t('auth.loading.redirecting')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardHeader className="text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255, 69, 56, 0.2)' }}
            >
              <CheckCircle2 className="h-6 w-6" style={{ color: '#ff4538' }} />
            </div>
            <CardTitle style={{ color: '#ffffff' }}>{t('auth.checkEmail')}</CardTitle>
            <CardDescription style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {t('auth.resetLinkSent')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              asChild
              className="w-full text-white"
              style={{ backgroundColor: '#ff4538' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ff5c50';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ff4538';
              }}
            >
              <Link href="/login">{t('auth.backToLogin')}</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setEmailSent(false)}
              className="w-full transition-all duration-200"
              style={{
                borderColor: '#ff4538',
                color: '#ff4538',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {t('auth.sendAnotherEmail')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center" style={{ color: '#ffffff' }}>
            {t('auth.resetPassword')}
          </CardTitle>
          <CardDescription className="text-center" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {t('auth.resetPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: '#ffffff' }}>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        {...field}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#ff4538';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: '#ff4538' }}
                onMouseEnter={(e) => {
                  if (!form.formState.isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#ff5c50';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!form.formState.isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#ff4538';
                  }
                }}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? t('auth.sending') : t('auth.sendResetLink')}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <Link
            href="/login"
            className="text-sm transition-colors hover:underline mx-auto"
            style={{ color: '#ff4538' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff5c50';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#ff4538';
            }}
          >
            {t('auth.backToLogin')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
