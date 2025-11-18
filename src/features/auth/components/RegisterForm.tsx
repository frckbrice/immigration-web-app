'use client';

// Registration form component with shadcn/ui
// SESSION AWARE: Redirects if already logged in

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useRegister, useGoogleSignIn } from '../api/useAuth';
import { useAuthStore } from '../store';
import { registerSchema, RegisterInput } from '../schemas/auth.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  FormDescription,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { AuthLoadingOverlay } from './AuthLoadingOverlay';

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [eyeIconColor, setEyeIconColor] = useState('#ffffff');
  const registerMutation = useRegister();
  const googleSignInMutation = useGoogleSignIn();
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Always call useForm (hooks must be called in same order every render)
  const form = useForm<RegisterInput>({
    // Cast to align with react-hook-form Resolver typing and avoid TFieldValues mismatches
    resolver: zodResolver(registerSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      street: '',
      city: '',
      country: '',
      inviteCode: '',
      acceptedTerms: false,
      acceptedPrivacy: false,
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated && !redirecting) {
      setRedirecting(true);
      router.replace('/dashboard');
    }
  }, [mounted, isLoading, isAuthenticated, redirecting, router]);

  const handleGoogleSignIn = async () => {
    try {
      await googleSignInMutation.mutateAsync();
      // Redirect handled in mutation's onSuccess
    } catch {
      // Error is already handled by the mutation's onError callback
    }
  };

  const onSubmit = async (data: RegisterInput) => {
    try {
      // Add GDPR consent timestamp
      const registrationData = {
        ...data,
        consentedAt: new Date().toISOString(),
      };
      await registerMutation.mutateAsync(registrationData);
      // Redirect handled in mutation's onSuccess
    } catch {
      // Error is handled by mutation's onError
    }
  };

  // Show loading while checking session or hydrating
  if (!mounted || isLoading || redirecting || isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">
              {isLoading ? t('auth.loading.authenticating') : t('auth.loading.redirecting')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAuthLoading = registerMutation.isPending || googleSignInMutation.isPending;

  return (
    <>
      {/* Enhanced Loading Overlay */}
      <AuthLoadingOverlay
        isLoading={isAuthLoading}
        isSuccess={isAuthenticated}
        steps={{
          authenticating: t('auth.loading.creatingAccount'),
          settingUp: t('auth.loading.settingUpProfile'),
          redirecting: t('auth.loading.redirectingWelcome'),
        }}
      />

      <div className="w-full max-w-md mx-auto">
        <Card
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center" style={{ color: '#ffffff' }}>
              {t('auth.createAccount')}
            </CardTitle>
            <CardDescription className="text-center" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {t('auth.signUpMessage')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full transition-all duration-200"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ff4538';
                e.currentTarget.style.backgroundColor = 'rgba(255, 69, 56, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onClick={handleGoogleSignIn}
              disabled={googleSignInMutation.isPending}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              {googleSignInMutation.isPending ? t('auth.signingIn') : t('auth.continueWithGoogle')}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div
                  style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                  className="w-full"
                />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span
                  className="px-2"
                  style={{ backgroundColor: '#091a24', color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {t('auth.orContinueWithEmail')}
                </span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* First Name */}
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: '#ffffff' }}>{t('auth.firstName')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.placeholders.firstName')}
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

                {/* Last Name */}
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: '#ffffff' }}>{t('auth.lastName')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.placeholders.lastName')}
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

                {/* Email */}
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

                {/* Phone (Optional) */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: '#ffffff' }}>{t('auth.phone')}</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder={t('auth.placeholders.phone')}
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

                {/* Street (Optional) */}
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: '#ffffff' }}>{t('auth.address.street')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.placeholders.street')}
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

                {/* City (Optional) */}
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: '#ffffff' }}>{t('auth.address.city')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.placeholders.city')}
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

                {/* Country (Optional) */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: '#ffffff' }}>
                        {t('auth.address.country')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.placeholders.country')}
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

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: '#ffffff' }}>{t('auth.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="pr-10"
                            {...field}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#ff4538';
                              const bgColor = window.getComputedStyle(
                                e.currentTarget
                              ).backgroundColor;
                              const isWhite =
                                bgColor === 'rgb(255, 255, 255)' || bgColor === 'white';
                              setEyeIconColor(isWhite ? 'rgba(0, 0, 0, 0.7)' : '#ffffff');
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                              const bgColor = window.getComputedStyle(
                                e.currentTarget
                              ).backgroundColor;
                              const isWhite =
                                bgColor === 'rgb(255, 255, 255)' || bgColor === 'white';
                              setEyeIconColor(isWhite ? 'rgba(0, 0, 0, 0.7)' : '#ffffff');
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors z-10"
                            style={{
                              color: eyeIconColor,
                              backgroundColor: 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ff4538';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = eyeIconColor;
                            }}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Invite Code (Optional - for AGENT/ADMIN roles) */}
                <FormField
                  control={form.control}
                  name="inviteCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: '#ffffff' }}>
                        {t('auth.inviteCode.label')}{' '}
                        <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {t('auth.inviteCode.subLabel')}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.inviteCode.placeholder')}
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
                      <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {t('auth.inviteCode.helper')}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* GDPR Consent Section */}
                <div
                  className="space-y-4 pt-4"
                  style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#ffffff' }}>
                    {t('auth.privacy.title')}
                  </p>

                  {/* Terms & Conditions Checkbox */}
                  <FormField
                    control={form.control}
                    name="acceptedTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel
                            className="text-sm font-normal"
                            style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                          >
                            {t('auth.privacy.acceptTermsPrefix')}{' '}
                            <Link
                              href="/terms"
                              target="_blank"
                              className="transition-colors hover:underline font-medium"
                              style={{ color: '#ff4538' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ff5c50';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#ff4538';
                              }}
                            >
                              {t('auth.privacy.termsLabel')}
                            </Link>
                            <span className="ml-1" style={{ color: '#ff4538' }}>
                              {t('auth.privacy.requiredIndicator')}
                            </span>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Privacy Policy Checkbox */}
                  <FormField
                    control={form.control}
                    name="acceptedPrivacy"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel
                            className="text-sm font-normal"
                            style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                          >
                            {t('auth.privacy.acceptPrivacyPrefix')}{' '}
                            <Link
                              href="/privacy"
                              target="_blank"
                              className="transition-colors hover:underline font-medium"
                              style={{ color: '#ff4538' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ff5c50';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#ff4538';
                              }}
                            >
                              {t('auth.privacy.privacyLabel')}
                            </Link>
                            <span className="ml-1" style={{ color: '#ff4538' }}>
                              {t('auth.privacy.requiredIndicator')}
                            </span>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormDescription
                    className="text-xs"
                    style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  >
                    {t('auth.privacy.notice')}
                  </FormDescription>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ backgroundColor: '#ff4538' }}
                  onMouseEnter={(e) => {
                    if (!form.formState.isSubmitting && !registerMutation.isPending) {
                      e.currentTarget.style.backgroundColor = '#ff5c50';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!form.formState.isSubmitting && !registerMutation.isPending) {
                      e.currentTarget.style.backgroundColor = '#ff4538';
                    }
                  }}
                  disabled={form.formState.isSubmitting || registerMutation.isPending}
                >
                  {registerMutation.isPending ? t('auth.signingUp') : t('auth.createAccount')}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-center w-full" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {t('auth.alreadyHaveAccount')}{' '}
              <Link
                href="/login"
                className="transition-colors hover:underline font-medium"
                style={{ color: '#ff4538' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ff5c50';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#ff4538';
                }}
              >
                {t('auth.signIn')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
