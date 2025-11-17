'use client';

// Enhanced profile view with edit mode

import { useState, useEffect, useRef, memo } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Shield,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  X,
  Camera,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { SimpleSkeleton, SkeletonText } from '@/components/ui/simple-skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUpdateProfile, useUploadAvatar } from '../api/mutations';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z
    .string()
    .transform((val) => {
      // Handle empty values
      if (!val || val.trim() === '') return '';

      // Strip formatting characters (spaces, hyphens, parentheses) while preserving leading '+'
      const trimmed = val.trim();
      const hasLeadingPlus = trimmed.startsWith('+');
      const digitsOnly = trimmed.replace(/[\s\-()]/g, '');

      // Ensure '+' is preserved if it was present
      return hasLeadingPlus && !digitsOnly.startsWith('+') ? '+' + digitsOnly : digitsOnly;
    })
    .refine((val) => val === '' || /^(\+\d{7,15}|0\d{6,14})$/.test(val), {
      message: 'Phone must be international (+1234567890) or national (0123456789) format',
    }),
  street: z.string().max(255, 'Street must be 255 characters or less').optional(),
  city: z.string().max(255, 'City must be 255 characters or less').optional(),
  country: z.string().max(255, 'Country must be 255 characters or less').optional(),
});

type ProfileInput = z.infer<typeof profileSchema>;

export function ProfileView() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      street: user?.street || '',
      city: user?.city || '',
      country: user?.country || '',
    },
  });

  // Re-sync form fields when user prop changes
  useEffect(() => {
    form.reset({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      street: user?.street || '',
      city: user?.city || '',
      country: user?.country || '',
    });
  }, [user, form]);

  const onSubmit = async (data: ProfileInput) => {
    try {
      await updateProfileMutation.mutateAsync(data);
      setIsEditing(false);
    } catch (error) {
      // Error is already handled in the mutation's onError callback
    }
  };

  const getInitials = () => {
    if (!user) return '??';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getRoleBadgeColor = () => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-800',
      AGENT: 'bg-green-100 text-green-800',
      CLIENT: 'bg-blue-100 text-blue-800',
    };
    return colors[user?.role || ''] || '';
  };

  const getRoleDisplayName = () => {
    const names: Record<string, string> = {
      ADMIN: 'Administrator',
      AGENT: 'Agent',
      CLIENT: 'Client',
    };
    return names[user?.role || ''] || user?.role || 'Unknown';
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please select an image file (JPEG, PNG, GIF, etc.)',
      });
      return;
    }

    // Validate file size (4MB max)
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Image size must be less than 4MB',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the file
    try {
      await uploadAvatarMutation.mutateAsync(file);
      setAvatarPreview(null); // Clear preview after successful upload
    } catch (error) {
      // Error is handled in the mutation
      setAvatarPreview(null); // Clear preview on error
    }

    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
            Manage your personal information
          </p>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="text-white hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: '#361d22',
              borderColor: '#ff4538',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
          <CardHeader className="text-center pb-3 sm:pb-4">
            <div className="flex justify-center mb-3 sm:mb-4 relative">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                <AvatarImage
                  src={avatarPreview || user?.profilePicture || undefined}
                  alt={`${user?.firstName} ${user?.lastName}`}
                />
                <AvatarFallback
                  className="text-xl sm:text-2xl text-white"
                  style={{ backgroundColor: '#091a24' }}
                >
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 text-white hover:border-white/30 transition-colors"
                    onClick={handleAvatarClick}
                    type="button"
                    disabled={uploadAvatarMutation.isPending}
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    {uploadAvatarMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  {/* Hidden file input for avatar upload */}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label="Upload avatar"
                    onChange={handleAvatarChange}
                  />
                </>
              )}
            </div>
            <CardTitle className="text-base sm:text-lg">
              {user?.firstName} {user?.lastName}
            </CardTitle>
            <CardDescription className="flex items-center justify-center mt-1 sm:mt-2 text-xs sm:text-sm">
              <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" style={{ color: '#ff4538' }} />
              {user?.email}
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-3 sm:pt-4">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-center">
                <span
                  className={cn(
                    'px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1',
                    getRoleBadgeColor()
                  )}
                >
                  <Shield className="h-3 w-3" style={{ color: '#ff4538' }} />
                  {getRoleDisplayName()}
                </span>
              </div>
              <Separator style={{ backgroundColor: 'rgba(255, 69, 56, 0.2)' }} />
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <ProfileStatusBadge
                  label="Status"
                  value={user?.isActive ? 'Active' : 'Inactive'}
                  isActive={user?.isActive}
                />
                <ProfileStatusBadge
                  label="Verified"
                  value={user?.isVerified ? 'Yes' : 'No'}
                  isActive={user?.isVerified}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card
          className="md:col-span-2"
          style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#ff4538' }} />
              Personal Information
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {isEditing ? 'Edit your account details' : 'Your account details and information'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John"
                            {...field}
                            className="h-10 sm:h-11 text-sm sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Doe"
                            {...field}
                            className="h-10 sm:h-11 text-sm sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" style={{ color: '#ff4538' }} />
                          Phone
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1234567890"
                            {...field}
                            className="h-10 sm:h-11 text-sm sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" style={{ color: '#ff4538' }} />
                          Street address
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Main St"
                            {...field}
                            className="h-10 sm:h-11 text-sm sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" style={{ color: '#ff4538' }} />
                          City
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Paris"
                            {...field}
                            className="h-10 sm:h-11 text-sm sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5" style={{ color: '#ff4538' }} />
                          Country
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="France"
                            {...field}
                            className="h-10 sm:h-11 text-sm sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-2 pt-3 sm:pt-4">
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting || updateProfileMutation.isPending}
                      className="text-white hover:opacity-90 transition-opacity disabled:opacity-50 h-10 sm:h-11"
                      style={{
                        backgroundColor: '#361d22',
                        borderColor: '#ff4538',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset();
                        setIsEditing(false);
                      }}
                      disabled={updateProfileMutation.isPending}
                      className="text-white hover:border-white/30 transition-colors disabled:opacity-50 h-10 sm:h-11"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                <ProfileField icon={User} label="First Name" value={user?.firstName || ''} />
                <ProfileField icon={User} label="Last Name" value={user?.lastName || ''} />
                <ProfileField icon={Mail} label="Email" value={user?.email || ''} />
                <ProfileField icon={Phone} label="Phone" value={user?.phone || 'Not provided'} />
                <ProfileField icon={MapPin} label="Street" value={user?.street || 'Not provided'} />
                <ProfileField icon={MapPin} label="City" value={user?.city || 'Not provided'} />
                <ProfileField
                  icon={Globe}
                  label="Country"
                  value={user?.country || 'Not provided'}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 sm:py-2">
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#ff4538' }} />
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="text-xs sm:text-sm font-medium">{value}</span>
    </div>
  );
}

function ProfileStatusBadge({
  label,
  value,
  isActive,
}: {
  label: string;
  value: string;
  isActive?: boolean;
}) {
  return (
    <div className="flex flex-col items-center space-y-0.5 sm:space-y-1 p-1.5 sm:p-2">
      <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
      <Badge
        className="w-fit text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 sm:px-2 border"
        style={
          isActive
            ? {
                backgroundColor: '#091a24',
                borderColor: '#ff4538',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: '#ffffff',
              }
            : {
                backgroundColor: '#091a24',
                borderColor: '#ff4538',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: '#ffffff',
              }
        }
      >
        {isActive ? (
          <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
        ) : (
          <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
        )}
        {value}
      </Badge>
    </div>
  );
}

/**
 * PERFORMANCE OPTIMIZED: Reduced from ~40 DOM elements to ~12
 * - Memoized → Better TBT
 * - Simplified card structure → Better FCP
 * - Reduced from 2 cards to simple blocks → Better Speed Index & CLS
 */
export const ProfileViewSkeleton = memo(function ProfileViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <SkeletonText size="xl" className="w-32" />
          <SkeletonText size="sm" className="w-64" />
        </div>
        <SimpleSkeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Profile content - Simplified 2-column layout */}
      <div className="grid gap-6 md:grid-cols-3">
        <SimpleSkeleton className="h-80 rounded-lg" />
        <SimpleSkeleton className="md:col-span-2 h-80 rounded-lg" />
      </div>
    </div>
  );
});
