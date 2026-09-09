/**
 * Product Image Resolution Mapping
 * Maps seeded product identifiers, image slugs, and titles to high-quality photography.
 */

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // Fresh Farm Collective products
  'rice-bag': 'https://images.unsplash.com/photo-1633536706496-873ce0d46277?w=600&h=450&fit=crop',
  'olive-oil': 'https://images.unsplash.com/photo-1621244320421-cc9782f5ce28?w=600&h=450&fit=crop',

  // Tech Wholesale Hub products
  'lightbulbs': 'https://images.unsplash.com/photo-1696269568998-2008e2b7cd59?w=600&h=450&fit=crop',
  'usb-cables': 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600&h=450&fit=crop',
  'camera': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=450&fit=crop',
  'smart-bulb': 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&h=450&fit=crop',
  'speaker': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=450&fit=crop',

  // Office Essentials Plus products
  'paper': 'https://images.unsplash.com/photo-1705682644779-ba6b02ae3fb2?w=600&h=450&fit=crop',
  'printer-paper': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&h=450&fit=crop',

  // PowerCell Solutions products
  'battery': 'https://images.unsplash.com/photo-1619725002198-6a689b72f41d?w=600&h=450&fit=crop',
  'powerbank': 'https://images.unsplash.com/photo-1609592424368-6d4ef633d7eb?w=600&h=450&fit=crop',
  'drill-battery': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=450&fit=crop',

  // SolarTech Distributors products
  'solar-panel': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&h=450&fit=crop',
  'inverter': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=450&fit=crop',
  'controller': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&h=450&fit=crop',
  'street-light': 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=600&h=450&fit=crop',
  'solar-generator': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&h=450&fit=crop',

  // Industrial Supplies Co. products
  'extension-cord': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=450&fit=crop',
  'work-light': 'https://images.unsplash.com/photo-1516541196182-6bdb0516ed27?w=600&h=450&fit=crop',
};

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=450&fit=crop';

/**
 * Returns a high-resolution image URL for any given product image key, URL, or fallback.
 */
export function getProductImage(imageKeyOrUrl: string | null | undefined): string {
  if (!imageKeyOrUrl) return DEFAULT_IMAGE;

  // Direct HTTP/HTTPS URLs pass through
  if (imageKeyOrUrl.startsWith('http://') || imageKeyOrUrl.startsWith('https://')) {
    return imageKeyOrUrl;
  }

  // Exact map match
  if (PRODUCT_IMAGE_MAP[imageKeyOrUrl]) {
    return PRODUCT_IMAGE_MAP[imageKeyOrUrl];
  }

  // Keyword lookup
  const lower = imageKeyOrUrl.toLowerCase();
  for (const [key, url] of Object.entries(PRODUCT_IMAGE_MAP)) {
    if (lower.includes(key)) {
      return url;
    }
  }

  return DEFAULT_IMAGE;
}
