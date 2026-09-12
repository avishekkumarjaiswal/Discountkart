export type PlanType = 'free' | 'pro';
export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'expired';

export interface ShopSubscription {
  subscriptionPlan?: PlanType;
  subscriptionStatus?: SubscriptionStatus;
  trialStartDate?: any;
  trialEndDate?: any;
  subscriptionStartDate?: any;
  subscriptionEndDate?: any;
}

export const FEATURES = {
  unlimitedActiveDiscounts: 'unlimitedActiveDiscounts',
  offerClaims: 'offerClaims',
  otpRedemption: 'otpRedemption',
  redemptionHistory: 'redemptionHistory',
  analytics: 'analytics',
  verifiedBadge: 'verifiedBadge',
  priorityPlacement: 'priorityPlacement',
  fullProductManagement: 'fullProductManagement',
  performanceInsights: 'performanceInsights',
};

export function getShopPlanStatus(shop: ShopSubscription | null): SubscriptionStatus {
  // EVERYTHING FREE FOR NOW - Admin handles approvals.
  // We return 'active' so that all shops get full access without expiring, 
  // since payments are coming soon.
  if (!shop) return 'free';
  return 'active';
}

export function hasFeature(shop: ShopSubscription | null, featureName: string): boolean {
  const status = getShopPlanStatus(shop);
  
  if (status === 'active') {
    return true; // Pro gets all features
  }

  if (status === 'trial') {
    const trialRestricted = [FEATURES.unlimitedActiveDiscounts, FEATURES.fullProductManagement];
    if (trialRestricted.includes(featureName)) {
      return false;
    }
    return true;
  }

  // Free features mapping
  const freeFeatures = [
    FEATURES.otpRedemption, // Maybe limited, but basic redemption needed
    FEATURES.offerClaims, 
  ];

  return freeFeatures.includes(featureName);
}

export function getSubscriptionDaysLeft(shop: ShopSubscription | null): number | null {
  if (!shop) return null;
  const status = getShopPlanStatus(shop);
  const now = new Date().getTime();
  
  if (status === 'trial' && shop.trialEndDate) {
    const end = shop.trialEndDate.toDate ? shop.trialEndDate.toDate().getTime() : new Date(shop.trialEndDate).getTime();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }
  
  if (status === 'active' && shop.subscriptionEndDate) {
    const end = shop.subscriptionEndDate.toDate ? shop.subscriptionEndDate.toDate().getTime() : new Date(shop.subscriptionEndDate).getTime();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }
  
  return null;
}
