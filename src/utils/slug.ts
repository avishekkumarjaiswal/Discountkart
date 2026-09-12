export function generateShopSlug(shop: { id: string; shopName: string; area?: string; city?: string }) {
  const parts = [shop.shopName];
  if (shop.area) parts.push(shop.area);
  if (shop.city) parts.push(shop.city);
  
  const namePart = parts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
    
  return `${namePart}-${shop.id}`;
}

export function extractIdFromSlug(slug: string | undefined): string {
  if (!slug) return '';
  const parts = slug.split('-');
  return parts[parts.length - 1];
}
