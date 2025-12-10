'use client';

// Login form component with shadcn/ui
// SESSION AWARE: Redirects if already logged in

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useLogin, useGoogleSignIn } from '../api/useAuth';
import { useAuthStore } from '../store';
import { loginSchema, LoginInput } from '../schemas/auth.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Separator } from '@/components/ui/separator';
import { AuthLoadingOverlay } from './AuthLoadingOverlay';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [eyeIconColor, setEyeIconColor] = useState('#ffffff');
  const loginMutation = useLogin();
  const googleSignInMutation = useGoogleSignIn();
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Always call useForm (hooks must be called in same order every render)
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
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

  const onSubmit = async (data: LoginInput) => {
    try {
      await loginMutation.mutateAsync(data);
      // Redirect handled in mutation's onSuccess
    } catch {
      // Error is handled by mutation's onError
    }
  };

  // Show loading while checking session or hydrating
  if (!mounted || isLoading || redirecting || isAuthenticated) {
    const statusLabel =
      !mounted || isLoading ? t('auth.loading.authenticating') : t('auth.loading.redirecting');
    return (
      <div className="w-full max-w-md mx-auto">
        <Card
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
              aria-label={statusLabel}
            />
            <p className="text-sm text-muted-foreground">{statusLabel}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAuthLoading = loginMutation.isPending || googleSignInMutation.isPending;

  return (
    <>
      {/* Enhanced Loading Overlay */}
      <AuthLoadingOverlay
        isLoading={isAuthLoading}
        isSuccess={isAuthenticated}
        steps={{
          authenticating: t('auth.loading.authenticating'),
          settingUp: t('auth.loading.settingUp'),
          redirecting: t('auth.loading.redirecting'),
        }}
      />

      <div className="w-full max-w-md mx-auto">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-foreground">
              {t('auth.welcomeBack')}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              {t('auth.signInMessage')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full transition-all duration-200 text-foreground/80 border-border hover:text-primary hover:border-primary hover:bg-primary/10"
              onClick={handleGoogleSignIn}
              disabled={googleSignInMutation.isPending}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              {googleSignInMutation.isPending ? t('auth.signingIn') : t('auth.continueWithGoogle')}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-background text-muted-foreground">
                  {t('auth.orContinueWithEmail')}
                </span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }: { field: ControllerRenderProps<LoginInput, 'email'> }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">{t('auth.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('auth.emailPlaceholder')}
                          {...field}
                          className="bg-background border-border text-foreground focus:border-primary"
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
                  render={({ field }: { field: ControllerRenderProps<LoginInput, 'password'> }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">{t('auth.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            {...field}
                            className="bg-background border-border text-foreground focus:border-primary"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-primary"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({
                      field,
                    }: {
                      field: ControllerRenderProps<LoginInput, 'rememberMe'>;
                    }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                        </FormControl>
                        <Label className="text-sm font-normal cursor-pointer text-foreground/80">
                          {t('auth.rememberMe')}
                        </Label>
                      </FormItem>
                    )}
                  />
                  <Link
                    href="/forgot-password"
                    className="text-sm transition-colors hover:underline text-primary hover:text-primary/80"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full text-primary-foreground bg-primary hover:bg-primary/90"
                  disabled={form.formState.isSubmitting || loginMutation.isPending}
                >
                  {loginMutation.isPending ? t('auth.signingIn') : t('auth.signIn')}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-center w-full text-muted-foreground">
              {t('auth.dontHaveAccount')}{' '}
              <Link
                href="/register"
                className="transition-colors hover:underline font-medium text-primary hover:text-primary/80"
              >
                {t('auth.signUp')}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
