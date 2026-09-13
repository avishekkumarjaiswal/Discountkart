export type OfferType = 'percentage_flat' | 'bxgy' | 'quantity_pricing' | 'bundle' | 'flash_sale';

export interface QuantityTier {
  quantity: number;
  totalPrice: number; // or price tier
  label?: string;
}

export interface BundleItem {
  name: string;
  quantity: number;
  productId?: string;
  originalPrice?: number;
}

export interface DiscountOffer {
  id?: string;
  shopId: string;
  title: string;
  offerType: OfferType;
  categoryId?: string;
  eligibleProducts?: string[]; // Array of product names/IDs or empty for category/all
  
  // Percentage / Flat fields
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  
  // Buy X Get Y (BXGY) fields
  bxgyBuyQty?: number;
  bxgyGetQty?: number;
  bxgyRewardType?: 'free' | 'percentage' | 'flat' | 'fixed_price';
  bxgyRewardValue?: number; // e.g. 50 for 50% off or ₹100 for ₹100 off
  bxgyMatchRule?: 'same_product' | 'mix_match';

  // Quantity Pricing fields
  quantityPricingMethod?: 'fixed_total' | 'percentage_discount' | 'flat_discount';
  quantityTiers?: QuantityTier[];
  quantityMatchRule?: 'same_product' | 'mix_match';
  quantityRepeatRule?: 'repeat_highest' | 'stop_at_highest';

  // Combo / Bundle fields
  bundleType?: 'fixed_bundle' | 'mix_match_bundle';
  bundleItems?: BundleItem[];
  bundlePrice?: number;
  bundleOriginalPrice?: number;

  // Flash Sale fields
  flashSaleOfferType?: 'percentage' | 'flat' | 'fixed_price';
  flashSaleValue?: number;
  stockLimit?: number;
  maxPerCustomer?: number;

  // Common metadata
  validFrom?: any;
  validUntil?: any;
  terms?: string;
  usageLimit?: number;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Returns human readable tag/badge text for any offer type
 */
export function getOfferBadgeText(discount: Partial<DiscountOffer>): string {
  if (!discount) return 'OFFER AVAILABLE';
  const type = discount.offerType || (discount.discountType ? 'percentage_flat' : 'percentage_flat');
  
  switch (type) {
    case 'bxgy': {
      const buy = discount.bxgyBuyQty || 1;
      const get = discount.bxgyGetQty || 1;
      const reward = discount.bxgyRewardType || 'free';
      if (reward === 'free') {
        return `BUY ${buy} GET ${get} FREE`;
      } else if (reward === 'percentage') {
        const val = Math.min(100, Math.max(1, discount.bxgyRewardValue || 50));
        return `BUY ${buy} GET ${get} @ ${val}% OFF`;
      } else if (reward === 'flat') {
        return `BUY ${buy} GET ${get} @ ₹${discount.bxgyRewardValue || 100} OFF`;
      }
      return `BUY ${buy} GET ${get}`;
    }

    case 'quantity_pricing': {
      const tiers = discount.quantityTiers || [];
      if (tiers.length > 0) {
        const sorted = [...tiers].sort((a, b) => a.quantity - b.quantity);
        const bestTier = sorted[sorted.length - 1];
        return `BUY MORE SAVE MORE (${bestTier.quantity} for ₹${bestTier.totalPrice})`;
      }
      return 'BUY MORE SAVE MORE';
    }

    case 'bundle': {
      return `COMBO BUNDLE @ ₹${discount.bundlePrice || discount.discountValue || 999}`;
    }

    case 'flash_sale': {
      if (discount.flashSaleOfferType === 'percentage' || (discount.discountType === 'percentage' && !discount.flashSaleOfferType)) {
        const val = Math.min(100, Math.max(1, discount.flashSaleValue || discount.discountValue || 30));
        return `⚡ FLASH SALE ${val}% OFF`;
      }
      return `⚡ FLASH SALE ₹${discount.flashSaleValue || discount.discountValue || 500} OFF`;
    }

    case 'percentage_flat':
    default: {
      if (discount.discountType === 'percentage') {
        // Cap percentage discount display at 100% max
        const val = Math.min(100, Math.max(1, discount.discountValue || 0));
        return `${val}% OFF`;
      }
      return `₹${discount.discountValue || 0} OFF`;
    }
  }
}

/**
 * Returns formatted label for ShopCard buttons (e.g. "Buy 2 Get 1 Free Available", "20% OFF Available")
 */
export function getShopCardOfferLabel(discount: Partial<DiscountOffer>): string {
  if (!discount) return 'Explore Shop';
  const type = discount.offerType || 'percentage_flat';

  switch (type) {
    case 'bxgy': {
      const buy = discount.bxgyBuyQty || 1;
      const get = discount.bxgyGetQty || 1;
      const reward = discount.bxgyRewardType || 'free';
      if (reward === 'free') {
        return `Buy ${buy} Get ${get} Free Available`;
      }
      return `Buy ${buy} Get ${get} Offer Available`;
    }
    case 'quantity_pricing': {
      const tiers = discount.quantityTiers || [];
      if (tiers.length > 0) {
        const sorted = [...tiers].sort((a, b) => a.quantity - b.quantity);
        const bestTier = sorted[sorted.length - 1];
        return `${bestTier.quantity} for ₹${bestTier.totalPrice} (Buy More Save More)`;
      }
      return `Buy More Save More Available`;
    }
    case 'bundle': {
      return `Combo Bundle @ ₹${discount.bundlePrice || discount.discountValue || 999}`;
    }
    case 'flash_sale': {
      if (discount.flashSaleOfferType === 'percentage' || discount.discountType === 'percentage') {
        const val = Math.min(100, Math.max(1, discount.flashSaleValue || discount.discountValue || 30));
        return `⚡ Flash Sale ${val}% OFF`;
      }
      return `⚡ Flash Sale ₹${discount.flashSaleValue || discount.discountValue || 500} OFF`;
    }
    case 'percentage_flat':
    default: {
      if (discount.discountType === 'percentage') {
        const val = Math.min(100, Math.max(1, discount.discountValue || 0));
        return `${val}% OFF Available`;
      }
      return `₹${discount.discountValue || 0} OFF Available`;
    }
  }
}

/**
 * Check if flash sale or offer is currently active based on date/time window
 */
export function isOfferCurrentlyActive(validFrom?: any, validUntil?: any, activeStatus = true): { isActive: boolean; statusLabel: string } {
  if (!activeStatus) return { isActive: false, statusLabel: 'Inactive' };

  const now = new Date();
  const startDate = validFrom?.toDate ? validFrom.toDate() : validFrom ? new Date(validFrom) : null;
  const endDate = validUntil?.toDate ? validUntil.toDate() : validUntil ? new Date(validUntil) : null;

  if (startDate && now < startDate) {
    return { isActive: false, statusLabel: 'Scheduled' };
  }

  if (endDate && now > endDate) {
    return { isActive: false, statusLabel: 'Expired' };
  }

  return { isActive: true, statusLabel: 'Active' };
}

/**
 * Format time remaining until expiry (for Flash Sale countdown)
 */
export function getTimeRemaining(validUntil?: any): { hours: number; minutes: number; seconds: number; isExpired: boolean; formatted: string } {
  if (!validUntil) return { hours: 0, minutes: 0, seconds: 0, isExpired: true, formatted: 'Expired' };
  
  const endDate = validUntil?.toDate ? validUntil.toDate() : new Date(validUntil);
  const diffMs = endDate.getTime() - Date.now();

  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true, formatted: 'Expired' };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = hours > 24 
    ? `${Math.floor(hours / 24)} days left`
    : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return { hours, minutes, seconds, isExpired: false, formatted };
}

/**
 * Calculate quantity pricing for a given cart quantity and tier list
 */
export function calculateQuantityPricing(quantity: number, tiers: QuantityTier[], unitPrice: number, repeatHighest = true) {
  if (!tiers || tiers.length === 0 || quantity <= 0) {
    return { totalPrice: quantity * unitPrice, savings: 0, effectiveUnitPrice: unitPrice, appliedTier: null };
  }

  const sortedTiers = [...tiers].sort((a, b) => a.quantity - b.quantity);
  const highestTier = sortedTiers[sortedTiers.length - 1];

  let totalPrice = 0;
  let appliedTier: QuantityTier | null = null;

  if (repeatHighest && quantity >= highestTier.quantity) {
    const fullMultiplier = Math.floor(quantity / highestTier.quantity);
    const remainder = quantity % highestTier.quantity;
    
    // Find best tier for remainder if any
    let remainderPrice = remainder * unitPrice;
    if (remainder > 0) {
      const matchRemainderTier = [...sortedTiers].reverse().find(t => t.quantity <= remainder);
      if (matchRemainderTier) {
        remainderPrice = matchRemainderTier.totalPrice + (remainder - matchRemainderTier.quantity) * unitPrice;
      }
    }
    
    totalPrice = (fullMultiplier * highestTier.totalPrice) + remainderPrice;
    appliedTier = highestTier;
  } else {
    // Find highest applicable tier <= quantity
    const applicableTier = [...sortedTiers].reverse().find(t => t.quantity <= quantity);
    if (applicableTier) {
      const extraQty = quantity - applicableTier.quantity;
      totalPrice = applicableTier.totalPrice + (extraQty * unitPrice);
      appliedTier = applicableTier;
    } else {
      totalPrice = quantity * unitPrice;
    }
  }

  const originalTotalPrice = quantity * unitPrice;
  const savings = Math.max(0, originalTotalPrice - totalPrice);
  const effectiveUnitPrice = Math.round(totalPrice / quantity);

  return {
    totalPrice,
    savings,
    effectiveUnitPrice,
    appliedTier
  };
}
