'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      toast.success(
        data.data?.message || t('landing.contact.success') || 'Message sent successfully!',
        {
          icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
        }
      );

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error: any) {
      let errorMessage = t('landing.contact.error') || 'Failed to send message. Please try again.';

      if (error.message.includes('rate limit')) {
        errorMessage =
          t('landing.contact.error_too_many_requests') ||
          'Too many requests. Please try again later.';
      } else if (error.message.includes('server')) {
        errorMessage = t('landing.contact.error_server') || 'Server error. Please try again later.';
      } else if (error.message.includes('network')) {
        errorMessage =
          t('landing.contact.error_network') ||
          'Network error. Please check your internet connection.';
      }

      toast.error(errorMessage, {
        icon: <AlertCircle className="h-5 w-5 text-primary" />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-background dark:bg-[#091a24]">
      {/* Theme-aware Background - Redis style for dark mode */}
      <div className="fixed inset-0 -z-10">
        {/* Base background */}
        <div className="absolute inset-0 bg-background dark:bg-[#091a24]"></div>

        {/* Subtle animated gradient orbs - Theme-aware */}
        <div
          className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 dark:opacity-20"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)',
            animation: 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        ></div>

        <div
          className="absolute top-1/3 left-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
            animation: 'pulse 10s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '2s',
          }}
        ></div>

        <div
          className="absolute bottom-0 right-1/4 w-[700px] h-[700px] rounded-full blur-3xl opacity-15 dark:opacity-15"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)',
            animation: 'pulse 12s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '4s',
          }}
        ></div>
      </div>

      <Navbar />
      <main className="flex-1 w-full relative z-0">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 lg:py-32">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-foreground/90">
                <span suppressHydrationWarning>{t('landing.contact.title') || 'Get in Touch'}</span>
              </h1>
              <p className="text-xl md:text-2xl max-w-2xl mx-auto text-foreground/70">
                <span suppressHydrationWarning>
                  {t('landing.contact.subtitle') ||
                    "Have questions? We're here to help you with your immigration journey"}
                </span>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold mb-6 text-foreground/90">
                    <span suppressHydrationWarning>
                      {t('landing.contact.badge') || 'Contact Information'}
                    </span>
                  </h2>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl flex-shrink-0 bg-primary/10">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-foreground/90">
                          {t('landing.contact.email') || 'Email'}
                        </h3>
                        <a
                          href="mailto:info@patricktravelservices.com"
                          className="transition-colors text-foreground/70 hover:text-primary"
                        >
                          info@patricktravelservices.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl flex-shrink-0 bg-primary/10">
                        <Phone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-foreground/90">
                          {t('landing.contact.phone') || 'Phone'}
                        </h3>
                        <a
                          href="tel:+237600000000"
                          className="transition-colors text-foreground/70 hover:text-primary"
                        >
                          +237600000000
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl flex-shrink-0 bg-primary/10">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-foreground/90">
                          {t('landing.contact.address') || 'Address'}
                        </h3>
                        <p className="text-foreground/70">rue 123, yaounde, Cameroon</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <h3 className="font-semibold mb-4 text-foreground/90">
                    {t('landing.contact.hours') || 'Office Hours'}
                  </h3>
                  <div className="space-y-2 text-sm text-foreground/70">
                    <div className="flex justify-between">
                      <span>{t('landing.contact.weekdays') || 'Mon - Fri'}</span>
                      <span>9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('landing.contact.saturday') || 'Saturday'}</span>
                      <span>10:00 AM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('landing.contact.sunday') || 'Sunday'}</span>
                      <span className="text-primary">
                        {t('landing.contact.closed') || 'Closed'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <div className="rounded-xl p-8 bg-card dark:bg-[rgba(255,255,255,0.03)] border border-border">
                  <h2 className="text-2xl font-semibold mb-2 text-foreground/90">
                    <span suppressHydrationWarning>
                      {t('landing.contact.formTitle') || 'Send us a message'}
                    </span>
                  </h2>
                  <p className="mb-6 text-foreground/70">
                    <span suppressHydrationWarning>
                      {t('landing.contact.formSubtitle') ||
                        "Fill out the form below and we'll get back to you within 24 hours"}
                    </span>
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-foreground/90">
                        <span suppressHydrationWarning>
                          {t('landing.contact.name') || 'Full Name'}
                        </span>
                        <span className="text-destructive ml-1">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-2 bg-input dark:bg-[rgba(255,255,255,0.05)] border-input dark:border-[rgba(255,255,255,0.2)] text-foreground focus:border-primary"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-foreground/90">
                        <span suppressHydrationWarning>
                          {t('landing.contact.emailLabel') || 'Email Address'}
                        </span>
                        <span className="text-destructive ml-1">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-2 bg-input dark:bg-[rgba(255,255,255,0.05)] border-input dark:border-[rgba(255,255,255,0.2)] text-foreground focus:border-primary"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-foreground/90">
                        <span suppressHydrationWarning>
                          {t('landing.contact.phoneLabel') || 'Phone Number (Optional)'}
                        </span>
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-2 bg-input dark:bg-[rgba(255,255,255,0.05)] border-input dark:border-[rgba(255,255,255,0.2)] text-foreground focus:border-primary"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject" className="text-foreground/90">
                        <span suppressHydrationWarning>
                          {t('landing.contact.subject') || 'Subject (Optional)'}
                        </span>
                      </Label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        value={formData.subject}
                        onChange={handleChange}
                        className="mt-2 bg-input dark:bg-[rgba(255,255,255,0.05)] border-input dark:border-[rgba(255,255,255,0.2)] text-foreground focus:border-primary"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message" className="text-foreground/90">
                        <span suppressHydrationWarning>
                          {t('landing.contact.message') || 'Message'}
                        </span>
                        <span className="text-destructive ml-1">*</span>
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        rows={6}
                        value={formData.message}
                        onChange={handleChange}
                        className="mt-2 bg-input dark:bg-[rgba(255,255,255,0.05)] border-input dark:border-[rgba(255,255,255,0.2)] text-foreground focus:border-primary resize-none"
                        placeholder={
                          t('landing.contact.messagePlaceholder') ||
                          'Tell us about your immigration needs...'
                        }
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full text-primary-foreground bg-primary hover:bg-primary/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          {t('landing.contact.sending') || 'Sending...'}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          {t('landing.contact.send') || 'Send Message'}
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
