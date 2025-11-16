/**
 * Payment Utility Functions
 * Handles payment status checks and tier information
 */

export type SubscriptionTier = 'basic' | 'standard' | 'premium';

export const TIER_PRICES: Record<SubscriptionTier, number> = {
  basic: 500,
  standard: 1500,
  premium: 2000,
};

export const TIER_NAMES: Record<SubscriptionTier, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

/**
 * Check if user role should bypass payment requirement
 */
export function shouldBypassPayment(role?: string): boolean {
  return role === 'AGENT' || role === 'ADMIN';
}

/**
 * Validate subscription tier
 */
export function isValidTier(tier: string): tier is SubscriptionTier {
  return tier === 'basic' || tier === 'standard' || tier === 'premium';
}

/**
 * Get tier price
 */
export function getTierPrice(tier: SubscriptionTier): number {
  return TIER_PRICES[tier];
}

/**
 * Get tier name
 */
export function getTierName(tier: SubscriptionTier): string {
  return TIER_NAMES[tier];
}
