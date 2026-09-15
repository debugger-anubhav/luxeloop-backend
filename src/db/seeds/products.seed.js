require('dotenv').config();
const { pool } = require('../../config/db');
const logger = require('../../config/logger');

// ─── Unsplash image pools per category ───────────────────────────────────────
const IMAGES = {
  lehengas: [
    'https://images.unsplash.com/photo-1610189844534-9e580d4e35a0?w=600&q=80',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    'https://images.unsplash.com/photo-1583391733981-8498408ee4b6?w=600&q=80',
    'https://images.unsplash.com/photo-1594938298603-c8148c4b4357?w=600&q=80',
    'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=600&q=80',
    'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=600&q=80',
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
  ],
  sarees: [
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    'https://images.unsplash.com/photo-1617627143233-9e6b9c8f77b7?w=600&q=80',
    'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=600&q=80',
    'https://images.unsplash.com/photo-1610189844534-9e580d4e35a0?w=600&q=80',
    'https://images.unsplash.com/photo-1594938298603-c8148c4b4357?w=600&q=80',
    'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=600&q=80',
  ],
  sherwanis: [
    'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=600&q=80',
    'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&q=80',
    'https://images.unsplash.com/photo-1600091166971-7f9faad6c8e6?w=600&q=80',
    'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80',
    'https://images.unsplash.com/photo-1584559582128-b8be739912e1?w=600&q=80',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
  ],
  kurtas: [
    'https://images.unsplash.com/photo-1594938298603-c8148c4b4357?w=600&q=80',
    'https://images.unsplash.com/photo-1584559582128-b8be739912e1?w=600&q=80',
    'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&q=80',
    'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=600&q=80',
    'https://images.unsplash.com/photo-1600091166971-7f9faad6c8e6?w=600&q=80',
  ],
  gowns: [
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80',
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80',
    'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80',
  ],
  jewellery: [
    'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&q=80',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80',
    'https://images.unsplash.com/photo-1601121141499-d2b9c2b8d5e2?w=600&q=80',
    'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600&q=80',
  ],
};

// Pick primary image at imageIdx, then pull 2 extras from different positions in the pool.
function buildImages(imageKey, imageIdx) {
  const pool = IMAGES[imageKey] || IMAGES.lehengas;
  const primary = pool[imageIdx % pool.length];
  const extras = [];
  for (let i = 1; i <= 2; i++) {
    const url = pool[(imageIdx + i) % pool.length];
    if (url !== primary) extras.push(url);
  }
  return { primary, extras };
}

// ─── Product definitions ──────────────────────────────────────────────────────
const PRODUCTS = [
  // ── LEHENGAS (8 products) ──────────────────────────────────────────────────
  {
    categorySlug: 'lehengas',
    name: 'Ivory Pearl Lehenga',
    slug: 'ivory-pearl-lehenga',
    description: 'Ivory lehenga adorned with delicate pearl embroidery and hand-stitched motifs.',
    listing_type: 'rent',
    deposit_amount: 8000,
    dry_cleaning_fee: 500,
    brand: 'Royal Threads',
    fabric: 'Georgette',
    tags: ['lehenga', 'ivory', 'pearl', 'bridal'],
    is_featured: true,
    is_trending: true,
    variants: [
      { size: 'XS', color: 'Ivory', color_hex: '#FFFFF0', sku: 'IPL-XS-001', rent_price_per_day: 2200, sale_price: null, stock_qty: 2 },
      { size: 'S',  color: 'Ivory', color_hex: '#FFFFF0', sku: 'IPL-S-001',  rent_price_per_day: 2200, sale_price: null, stock_qty: 3 },
      { size: 'M',  color: 'Ivory', color_hex: '#FFFFF0', sku: 'IPL-M-001',  rent_price_per_day: 2200, sale_price: null, stock_qty: 2 },
      { size: 'L',  color: 'Ivory', color_hex: '#FFFFF0', sku: 'IPL-L-001',  rent_price_per_day: 2200, sale_price: null, stock_qty: 1 },
    ],
    imageKey: 'lehengas', imageIdx: 0,
  },
  {
    categorySlug: 'lehengas',
    name: 'Blush Pink Sequin Lehenga',
    slug: 'blush-pink-sequin-lehenga',
    description: 'All-over sequin blush lehenga with a mirror-work blouse.',
    listing_type: 'both',
    deposit_amount: 6000,
    dry_cleaning_fee: 600,
    brand: 'Anita Dongre Studio',
    fabric: 'Net',
    tags: ['lehenga', 'pink', 'sequin', 'sangeet'],
    is_designer_pick: true,
    variants: [
      { size: 'S', color: 'Blush', color_hex: '#FFB6C1', sku: 'BPS-S-001', rent_price_per_day: 1800, sale_price: 52000, stock_qty: 2 },
      { size: 'M', color: 'Blush', color_hex: '#FFB6C1', sku: 'BPS-M-001', rent_price_per_day: 1800, sale_price: 52000, stock_qty: 3 },
      { size: 'L', color: 'Blush', color_hex: '#FFB6C1', sku: 'BPS-L-001', rent_price_per_day: 1800, sale_price: 52000, stock_qty: 2 },
    ],
    imageKey: 'lehengas', imageIdx: 1,
  },
  {
    categorySlug: 'lehengas',
    name: 'Emerald Banarasi Lehenga',
    slug: 'emerald-banarasi-lehenga',
    description: 'Rich emerald Banarasi silk lehenga with gold zari weave.',
    listing_type: 'rent',
    deposit_amount: 9000,
    dry_cleaning_fee: 700,
    brand: 'Sabyasachi Atelier',
    fabric: 'Banarasi Silk',
    tags: ['lehenga', 'emerald', 'banarasi', 'silk'],
    is_featured: true,
    is_designer_pick: true,
    variants: [
      { size: 'S', color: 'Emerald', color_hex: '#50C878', sku: 'EBL-S-001', rent_price_per_day: 3500, sale_price: null, stock_qty: 2 },
      { size: 'M', color: 'Emerald', color_hex: '#50C878', sku: 'EBL-M-001', rent_price_per_day: 3500, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'lehengas', imageIdx: 2,
  },
  {
    categorySlug: 'lehengas',
    name: 'Mustard Mirror Work Lehenga',
    slug: 'mustard-mirror-work-lehenga',
    description: 'Vibrant mustard lehenga with traditional Rajasthani mirror work.',
    listing_type: 'both',
    deposit_amount: 4000,
    dry_cleaning_fee: 450,
    brand: 'Royal Threads',
    fabric: 'Chanderi',
    tags: ['lehenga', 'mustard', 'mirror-work', 'rajasthani'],
    is_trending: true,
    variants: [
      { size: 'XS', color: 'Mustard', color_hex: '#FFDB58', sku: 'MML-XS-001', rent_price_per_day: 1400, sale_price: 38000, stock_qty: 2 },
      { size: 'S',  color: 'Mustard', color_hex: '#FFDB58', sku: 'MML-S-001',  rent_price_per_day: 1400, sale_price: 38000, stock_qty: 3 },
      { size: 'M',  color: 'Mustard', color_hex: '#FFDB58', sku: 'MML-M-001',  rent_price_per_day: 1400, sale_price: 38000, stock_qty: 2 },
      { size: 'L',  color: 'Mustard', color_hex: '#FFDB58', sku: 'MML-L-001',  rent_price_per_day: 1400, sale_price: 38000, stock_qty: 1 },
      { size: 'XL', color: 'Mustard', color_hex: '#FFDB58', sku: 'MML-XL-001', rent_price_per_day: 1400, sale_price: 38000, stock_qty: 1 },
    ],
    imageKey: 'lehengas', imageIdx: 3,
  },
  {
    categorySlug: 'lehengas',
    name: 'Cobalt Blue Resham Lehenga',
    slug: 'cobalt-blue-resham-lehenga',
    description: 'Cobalt blue lehenga with intricate resham thread embroidery.',
    listing_type: 'rent',
    deposit_amount: 7000,
    dry_cleaning_fee: 600,
    brand: 'Manish Malhotra',
    fabric: 'Velvet',
    tags: ['lehenga', 'blue', 'resham', 'velvet'],
    is_designer_pick: true,
    variants: [
      { size: 'S', color: 'Cobalt', color_hex: '#0047AB', sku: 'CBR-S-001', rent_price_per_day: 2800, sale_price: null, stock_qty: 2 },
      { size: 'M', color: 'Cobalt', color_hex: '#0047AB', sku: 'CBR-M-001', rent_price_per_day: 2800, sale_price: null, stock_qty: 3 },
      { size: 'L', color: 'Cobalt', color_hex: '#0047AB', sku: 'CBR-L-001', rent_price_per_day: 2800, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'lehengas', imageIdx: 4,
  },
  {
    categorySlug: 'lehengas',
    name: 'Coral Gota Patti Lehenga',
    slug: 'coral-gota-patti-lehenga',
    description: 'Coral silk lehenga with traditional gota patti embellishment.',
    listing_type: 'both',
    deposit_amount: 5500,
    dry_cleaning_fee: 450,
    brand: 'Royal Threads',
    fabric: 'Silk',
    tags: ['lehenga', 'coral', 'gota-patti'],
    variants: [
      { size: 'S', color: 'Coral', color_hex: '#FF7F50', sku: 'CGL-S-001', rent_price_per_day: 1600, sale_price: 42000, stock_qty: 2 },
      { size: 'M', color: 'Coral', color_hex: '#FF7F50', sku: 'CGL-M-001', rent_price_per_day: 1600, sale_price: 42000, stock_qty: 2 },
      { size: 'L', color: 'Coral', color_hex: '#FF7F50', sku: 'CGL-L-001', rent_price_per_day: 1600, sale_price: 42000, stock_qty: 1 },
    ],
    imageKey: 'lehengas', imageIdx: 5,
  },
  {
    categorySlug: 'lehengas',
    name: 'Rose Gold Embellished Lehenga',
    slug: 'rose-gold-embellished-lehenga',
    description: 'Shimmering rose gold lehenga with heavy stone embellishments.',
    listing_type: 'rent',
    deposit_amount: 10000,
    dry_cleaning_fee: 800,
    brand: 'Tarun Tahiliani',
    fabric: 'Satin',
    tags: ['lehenga', 'rose-gold', 'embellished', 'reception'],
    is_featured: true,
    is_trending: true,
    is_designer_pick: true,
    variants: [
      { size: 'XS', color: 'Rose Gold', color_hex: '#B76E79', sku: 'RGB-XS-001', rent_price_per_day: 4000, sale_price: null, stock_qty: 1 },
      { size: 'S',  color: 'Rose Gold', color_hex: '#B76E79', sku: 'RGB-S-001',  rent_price_per_day: 4000, sale_price: null, stock_qty: 2 },
      { size: 'M',  color: 'Rose Gold', color_hex: '#B76E79', sku: 'RGB-M-001',  rent_price_per_day: 4000, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'lehengas', imageIdx: 6,
  },
  {
    categorySlug: 'lehengas',
    name: 'Peacock Green Phulkari Lehenga',
    slug: 'peacock-green-phulkari-lehenga',
    description: 'Deep peacock green lehenga with traditional Punjabi phulkari embroidery.',
    listing_type: 'both',
    deposit_amount: 6500,
    dry_cleaning_fee: 500,
    brand: 'Royal Threads',
    fabric: 'Raw Silk',
    tags: ['lehenga', 'green', 'phulkari', 'punjabi'],
    is_trending: true,
    variants: [
      { size: 'S', color: 'Peacock', color_hex: '#006B6B', sku: 'PGP-S-001', rent_price_per_day: 2000, sale_price: 48000, stock_qty: 2 },
      { size: 'M', color: 'Peacock', color_hex: '#006B6B', sku: 'PGP-M-001', rent_price_per_day: 2000, sale_price: 48000, stock_qty: 3 },
      { size: 'L', color: 'Peacock', color_hex: '#006B6B', sku: 'PGP-L-001', rent_price_per_day: 2000, sale_price: 48000, stock_qty: 2 },
    ],
    imageKey: 'lehengas', imageIdx: 2,
  },

  // ── SAREES (6 products) ────────────────────────────────────────────────────
  {
    categorySlug: 'sarees',
    name: 'Kanjivaram Silk Saree',
    slug: 'kanjivaram-silk-saree',
    description: 'Classic temple-border Kanjivaram saree in deep red with gold zari.',
    listing_type: 'both',
    deposit_amount: 5000,
    dry_cleaning_fee: 400,
    brand: 'Royal Threads',
    fabric: 'Kanjivaram Silk',
    tags: ['saree', 'kanjivaram', 'silk', 'south-indian'],
    is_featured: true,
    is_trending: true,
    variants: [
      { size: 'Free Size', color: 'Deep Red', color_hex: '#8B0000', sku: 'KSS-FS-001', rent_price_per_day: 1200, sale_price: 35000, stock_qty: 4 },
    ],
    imageKey: 'sarees', imageIdx: 0,
  },
  {
    categorySlug: 'sarees',
    name: 'Organza Floral Saree',
    slug: 'organza-floral-saree',
    description: 'Lightweight organza saree with hand-painted floral motifs.',
    listing_type: 'rent',
    deposit_amount: 3000,
    dry_cleaning_fee: 350,
    brand: 'Anita Dongre Studio',
    fabric: 'Organza',
    tags: ['saree', 'organza', 'floral', 'cocktail'],
    is_designer_pick: true,
    variants: [
      { size: 'Free Size', color: 'Pastel Pink', color_hex: '#FFD1DC', sku: 'OFS-FS-001', rent_price_per_day: 900, sale_price: null, stock_qty: 3 },
    ],
    imageKey: 'sarees', imageIdx: 1,
  },
  {
    categorySlug: 'sarees',
    name: 'Banarasi Tissue Saree',
    slug: 'banarasi-tissue-saree',
    description: 'Tissue-weave Banarasi saree with subtle butis and a gold border.',
    listing_type: 'both',
    deposit_amount: 4500,
    dry_cleaning_fee: 500,
    brand: 'Sabyasachi Atelier',
    fabric: 'Tissue Silk',
    tags: ['saree', 'banarasi', 'tissue', 'bridal'],
    is_featured: true,
    is_designer_pick: true,
    variants: [
      { size: 'Free Size', color: 'Gold', color_hex: '#FFD700', sku: 'BTS-FS-001', rent_price_per_day: 1500, sale_price: 42000, stock_qty: 3 },
    ],
    imageKey: 'sarees', imageIdx: 2,
  },
  {
    categorySlug: 'sarees',
    name: 'Chiffon Embroidered Saree',
    slug: 'chiffon-embroidered-saree',
    description: 'Soft chiffon saree with intricate thread embroidery across the pallu.',
    listing_type: 'rent',
    deposit_amount: 2500,
    dry_cleaning_fee: 300,
    brand: 'Royal Threads',
    fabric: 'Chiffon',
    tags: ['saree', 'chiffon', 'embroidered', 'reception'],
    is_trending: true,
    variants: [
      { size: 'Free Size', color: 'Mint Green', color_hex: '#98FF98', sku: 'CES-FS-001', rent_price_per_day: 750, sale_price: null, stock_qty: 4 },
    ],
    imageKey: 'sarees', imageIdx: 3,
  },
  {
    categorySlug: 'sarees',
    name: 'Chanderi Cotton Saree',
    slug: 'chanderi-cotton-saree',
    description: 'Breezy Chanderi cotton saree with zari border, ideal for daytime ceremonies.',
    listing_type: 'both',
    deposit_amount: 2000,
    dry_cleaning_fee: 250,
    brand: 'Royal Threads',
    fabric: 'Chanderi Cotton',
    tags: ['saree', 'chanderi', 'cotton', 'mehendi'],
    variants: [
      { size: 'Free Size', color: 'Yellow', color_hex: '#FFFF00', sku: 'CCS-FS-001', rent_price_per_day: 600, sale_price: 18000, stock_qty: 5 },
    ],
    imageKey: 'sarees', imageIdx: 4,
  },
  {
    categorySlug: 'sarees',
    name: 'Velvet Border Silk Saree',
    slug: 'velvet-border-silk-saree',
    description: 'Luxe silk saree with contrast velvet border and stone embellishments.',
    listing_type: 'rent',
    deposit_amount: 6000,
    dry_cleaning_fee: 450,
    brand: 'Tarun Tahiliani',
    fabric: 'Silk',
    tags: ['saree', 'velvet', 'silk', 'wedding'],
    is_designer_pick: true,
    is_featured: true,
    variants: [
      { size: 'Free Size', color: 'Maroon', color_hex: '#800000', sku: 'VBS-FS-001', rent_price_per_day: 1800, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'sarees', imageIdx: 5,
  },

  // ── SHERWANIS (6 products) ─────────────────────────────────────────────────
  {
    categorySlug: 'sherwanis',
    name: 'Ivory Embroidered Sherwani',
    slug: 'ivory-embroidered-sherwani',
    description: 'Classic ivory sherwani with fine chikankari embroidery and matching churidar.',
    listing_type: 'rent',
    deposit_amount: 6000,
    dry_cleaning_fee: 500,
    brand: 'Royal Threads',
    fabric: 'Georgette',
    tags: ['sherwani', 'ivory', 'chikankari', 'groom'],
    is_featured: true,
    is_trending: true,
    variants: [
      { size: '38', color: 'Ivory', color_hex: '#FFFFF0', sku: 'IES-38-001', rent_price_per_day: 2000, sale_price: null, stock_qty: 2 },
      { size: '40', color: 'Ivory', color_hex: '#FFFFF0', sku: 'IES-40-001', rent_price_per_day: 2000, sale_price: null, stock_qty: 3 },
      { size: '42', color: 'Ivory', color_hex: '#FFFFF0', sku: 'IES-42-001', rent_price_per_day: 2000, sale_price: null, stock_qty: 2 },
      { size: '44', color: 'Ivory', color_hex: '#FFFFF0', sku: 'IES-44-001', rent_price_per_day: 2000, sale_price: null, stock_qty: 1 },
    ],
    imageKey: 'sherwanis', imageIdx: 0,
  },
  {
    categorySlug: 'sherwanis',
    name: 'Navy Blue Bandhgala Sherwani',
    slug: 'navy-blue-bandhgala-sherwani',
    description: 'Sharp navy blue bandhgala sherwani with gold button detailing.',
    listing_type: 'both',
    deposit_amount: 7000,
    dry_cleaning_fee: 600,
    brand: 'Manish Malhotra',
    fabric: 'Wool Blend',
    tags: ['sherwani', 'navy', 'bandhgala', 'groom'],
    is_designer_pick: true,
    is_trending: true,
    variants: [
      { size: '38', color: 'Navy', color_hex: '#000080', sku: 'NBB-38-001', rent_price_per_day: 2500, sale_price: 65000, stock_qty: 2 },
      { size: '40', color: 'Navy', color_hex: '#000080', sku: 'NBB-40-001', rent_price_per_day: 2500, sale_price: 65000, stock_qty: 3 },
      { size: '42', color: 'Navy', color_hex: '#000080', sku: 'NBB-42-001', rent_price_per_day: 2500, sale_price: 65000, stock_qty: 2 },
    ],
    imageKey: 'sherwanis', imageIdx: 1,
  },
  {
    categorySlug: 'sherwanis',
    name: 'Royal Gold Brocade Sherwani',
    slug: 'royal-gold-brocade-sherwani',
    description: 'Opulent gold brocade sherwani with intricate weave pattern.',
    listing_type: 'rent',
    deposit_amount: 9000,
    dry_cleaning_fee: 700,
    brand: 'Sabyasachi Atelier',
    fabric: 'Brocade',
    tags: ['sherwani', 'gold', 'brocade', 'baraat'],
    is_featured: true,
    is_designer_pick: true,
    variants: [
      { size: '38', color: 'Gold', color_hex: '#FFD700', sku: 'RGB-38-001', rent_price_per_day: 3500, sale_price: null, stock_qty: 2 },
      { size: '40', color: 'Gold', color_hex: '#FFD700', sku: 'RGB-40-001', rent_price_per_day: 3500, sale_price: null, stock_qty: 2 },
      { size: '42', color: 'Gold', color_hex: '#FFD700', sku: 'RGB-42-001', rent_price_per_day: 3500, sale_price: null, stock_qty: 1 },
    ],
    imageKey: 'sherwanis', imageIdx: 2,
  },
  {
    categorySlug: 'sherwanis',
    name: 'Slate Grey Nehru Jacket Set',
    slug: 'slate-grey-nehru-jacket-set',
    description: 'Slate grey kurta with matching Nehru jacket and churidar, contemporary groom style.',
    listing_type: 'both',
    deposit_amount: 4000,
    dry_cleaning_fee: 400,
    brand: 'Royal Threads',
    fabric: 'Linen Blend',
    tags: ['nehru', 'grey', 'kurta', 'contemporary'],
    is_trending: true,
    variants: [
      { size: '38', color: 'Slate', color_hex: '#708090', sku: 'SGN-38-001', rent_price_per_day: 1500, sale_price: 32000, stock_qty: 3 },
      { size: '40', color: 'Slate', color_hex: '#708090', sku: 'SGN-40-001', rent_price_per_day: 1500, sale_price: 32000, stock_qty: 4 },
      { size: '42', color: 'Slate', color_hex: '#708090', sku: 'SGN-42-001', rent_price_per_day: 1500, sale_price: 32000, stock_qty: 2 },
      { size: '44', color: 'Slate', color_hex: '#708090', sku: 'SGN-44-001', rent_price_per_day: 1500, sale_price: 32000, stock_qty: 1 },
    ],
    imageKey: 'sherwanis', imageIdx: 3,
  },
  {
    categorySlug: 'sherwanis',
    name: 'Maroon Velvet Sherwani',
    slug: 'maroon-velvet-sherwani',
    description: 'Deep maroon velvet sherwani with gold thread embroidery at collar and cuffs.',
    listing_type: 'rent',
    deposit_amount: 8000,
    dry_cleaning_fee: 600,
    brand: 'Tarun Tahiliani',
    fabric: 'Velvet',
    tags: ['sherwani', 'maroon', 'velvet', 'winter-wedding'],
    is_featured: true,
    variants: [
      { size: '38', color: 'Maroon', color_hex: '#800000', sku: 'MVS-38-001', rent_price_per_day: 2800, sale_price: null, stock_qty: 2 },
      { size: '40', color: 'Maroon', color_hex: '#800000', sku: 'MVS-40-001', rent_price_per_day: 2800, sale_price: null, stock_qty: 3 },
      { size: '42', color: 'Maroon', color_hex: '#800000', sku: 'MVS-42-001', rent_price_per_day: 2800, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'sherwanis', imageIdx: 4,
  },
  {
    categorySlug: 'sherwanis',
    name: 'Pastel Pink Lucknowi Sherwani',
    slug: 'pastel-pink-lucknowi-sherwani',
    description: 'Delicate pastel pink sherwani with all-over Lucknowi chikankari.',
    listing_type: 'both',
    deposit_amount: 5000,
    dry_cleaning_fee: 500,
    brand: 'Royal Threads',
    fabric: 'Georgette',
    tags: ['sherwani', 'pink', 'lucknowi', 'chikankari'],
    is_designer_pick: true,
    variants: [
      { size: '38', color: 'Pastel Pink', color_hex: '#FFD1DC', sku: 'PLS-38-001', rent_price_per_day: 1800, sale_price: 48000, stock_qty: 2 },
      { size: '40', color: 'Pastel Pink', color_hex: '#FFD1DC', sku: 'PLS-40-001', rent_price_per_day: 1800, sale_price: 48000, stock_qty: 3 },
      { size: '42', color: 'Pastel Pink', color_hex: '#FFD1DC', sku: 'PLS-42-001', rent_price_per_day: 1800, sale_price: 48000, stock_qty: 2 },
    ],
    imageKey: 'sherwanis', imageIdx: 5,
  },

  // ── KURTA SETS (5 products) ────────────────────────────────────────────────
  {
    categorySlug: 'kurta-sets',
    name: 'White Silk Kurta Pyjama',
    slug: 'white-silk-kurta-pyjama',
    description: 'Elegant white silk kurta with straight pyjama, perfect for nikaah or engagement.',
    listing_type: 'both',
    deposit_amount: 3000,
    dry_cleaning_fee: 300,
    brand: 'Royal Threads',
    fabric: 'Silk',
    tags: ['kurta', 'white', 'silk', 'nikaah'],
    is_trending: true,
    variants: [
      { size: 'S',  color: 'White', color_hex: '#FFFFFF', sku: 'WSK-S-001',  rent_price_per_day: 900,  sale_price: 22000, stock_qty: 3 },
      { size: 'M',  color: 'White', color_hex: '#FFFFFF', sku: 'WSK-M-001',  rent_price_per_day: 900,  sale_price: 22000, stock_qty: 4 },
      { size: 'L',  color: 'White', color_hex: '#FFFFFF', sku: 'WSK-L-001',  rent_price_per_day: 900,  sale_price: 22000, stock_qty: 3 },
      { size: 'XL', color: 'White', color_hex: '#FFFFFF', sku: 'WSK-XL-001', rent_price_per_day: 900,  sale_price: 22000, stock_qty: 2 },
    ],
    imageKey: 'kurtas', imageIdx: 0,
  },
  {
    categorySlug: 'kurta-sets',
    name: 'Olive Linen Kurta Set',
    slug: 'olive-linen-kurta-set',
    description: 'Relaxed fit olive linen kurta with churidar, great for a daytime function.',
    listing_type: 'rent',
    deposit_amount: 2000,
    dry_cleaning_fee: 200,
    brand: 'Royal Threads',
    fabric: 'Linen',
    tags: ['kurta', 'olive', 'linen', 'casual'],
    variants: [
      { size: 'S',  color: 'Olive', color_hex: '#808000', sku: 'OLK-S-001',  rent_price_per_day: 600, sale_price: null, stock_qty: 3 },
      { size: 'M',  color: 'Olive', color_hex: '#808000', sku: 'OLK-M-001',  rent_price_per_day: 600, sale_price: null, stock_qty: 4 },
      { size: 'L',  color: 'Olive', color_hex: '#808000', sku: 'OLK-L-001',  rent_price_per_day: 600, sale_price: null, stock_qty: 3 },
      { size: 'XL', color: 'Olive', color_hex: '#808000', sku: 'OLK-XL-001', rent_price_per_day: 600, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'kurtas', imageIdx: 1,
  },
  {
    categorySlug: 'kurta-sets',
    name: 'Indigo Embroidered Angarakha',
    slug: 'indigo-embroidered-angarakha',
    description: 'Indigo angarakha style kurta with golden thread embroidery.',
    listing_type: 'both',
    deposit_amount: 4000,
    dry_cleaning_fee: 400,
    brand: 'Manish Malhotra',
    fabric: 'Cotton Silk',
    tags: ['angarakha', 'indigo', 'embroidered', 'groom'],
    is_designer_pick: true,
    is_trending: true,
    variants: [
      { size: 'S',  color: 'Indigo', color_hex: '#4B0082', sku: 'IEA-S-001',  rent_price_per_day: 1200, sale_price: 36000, stock_qty: 2 },
      { size: 'M',  color: 'Indigo', color_hex: '#4B0082', sku: 'IEA-M-001',  rent_price_per_day: 1200, sale_price: 36000, stock_qty: 3 },
      { size: 'L',  color: 'Indigo', color_hex: '#4B0082', sku: 'IEA-L-001',  rent_price_per_day: 1200, sale_price: 36000, stock_qty: 2 },
    ],
    imageKey: 'kurtas', imageIdx: 2,
  },
  {
    categorySlug: 'kurta-sets',
    name: 'Beige Block Print Kurta',
    slug: 'beige-block-print-kurta',
    description: 'Handblock printed beige cotton kurta set for relaxed ethnic occasions.',
    listing_type: 'both',
    deposit_amount: 1500,
    dry_cleaning_fee: 150,
    brand: 'Royal Threads',
    fabric: 'Cotton',
    tags: ['kurta', 'beige', 'block-print', 'cotton'],
    variants: [
      { size: 'S',  color: 'Beige', color_hex: '#F5F5DC', sku: 'BBK-S-001',  rent_price_per_day: 450, sale_price: 12000, stock_qty: 4 },
      { size: 'M',  color: 'Beige', color_hex: '#F5F5DC', sku: 'BBK-M-001',  rent_price_per_day: 450, sale_price: 12000, stock_qty: 5 },
      { size: 'L',  color: 'Beige', color_hex: '#F5F5DC', sku: 'BBK-L-001',  rent_price_per_day: 450, sale_price: 12000, stock_qty: 4 },
      { size: 'XL', color: 'Beige', color_hex: '#F5F5DC', sku: 'BBK-XL-001', rent_price_per_day: 450, sale_price: 12000, stock_qty: 3 },
    ],
    imageKey: 'kurtas', imageIdx: 3,
  },
  {
    categorySlug: 'kurta-sets',
    name: 'Teal Chanderi Kurta Set',
    slug: 'teal-chanderi-kurta-set',
    description: 'Teal Chanderi silk kurta with zari detailing and matching dupatta.',
    listing_type: 'rent',
    deposit_amount: 3500,
    dry_cleaning_fee: 350,
    brand: 'Anita Dongre Studio',
    fabric: 'Chanderi Silk',
    tags: ['kurta', 'teal', 'chanderi', 'dupatta'],
    is_featured: true,
    variants: [
      { size: 'XS', color: 'Teal', color_hex: '#008080', sku: 'TCS-XS-001', rent_price_per_day: 1000, sale_price: null, stock_qty: 2 },
      { size: 'S',  color: 'Teal', color_hex: '#008080', sku: 'TCS-S-001',  rent_price_per_day: 1000, sale_price: null, stock_qty: 3 },
      { size: 'M',  color: 'Teal', color_hex: '#008080', sku: 'TCS-M-001',  rent_price_per_day: 1000, sale_price: null, stock_qty: 3 },
      { size: 'L',  color: 'Teal', color_hex: '#008080', sku: 'TCS-L-001',  rent_price_per_day: 1000, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'kurtas', imageIdx: 4,
  },

  // ── GOWNS (4 products) ─────────────────────────────────────────────────────
  {
    categorySlug: 'gowns',
    name: 'Champagne Draped Gown',
    slug: 'champagne-draped-gown',
    description: 'Floor-length champagne satin gown with elegant one-shoulder drape.',
    listing_type: 'rent',
    deposit_amount: 5000,
    dry_cleaning_fee: 600,
    brand: 'Tarun Tahiliani',
    fabric: 'Satin',
    tags: ['gown', 'champagne', 'reception', 'draped'],
    is_featured: true,
    is_trending: true,
    variants: [
      { size: 'XS', color: 'Champagne', color_hex: '#F7E7CE', sku: 'CDG-XS-001', rent_price_per_day: 1600, sale_price: null, stock_qty: 2 },
      { size: 'S',  color: 'Champagne', color_hex: '#F7E7CE', sku: 'CDG-S-001',  rent_price_per_day: 1600, sale_price: null, stock_qty: 2 },
      { size: 'M',  color: 'Champagne', color_hex: '#F7E7CE', sku: 'CDG-M-001',  rent_price_per_day: 1600, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'gowns', imageIdx: 0,
  },
  {
    categorySlug: 'gowns',
    name: 'Midnight Blue Ball Gown',
    slug: 'midnight-blue-ball-gown',
    description: 'Full-volume midnight blue ball gown with beaded bodice.',
    listing_type: 'rent',
    deposit_amount: 8000,
    dry_cleaning_fee: 800,
    brand: 'Manish Malhotra',
    fabric: 'Tulle',
    tags: ['gown', 'blue', 'ball-gown', 'engagement'],
    is_designer_pick: true,
    variants: [
      { size: 'XS', color: 'Midnight Blue', color_hex: '#191970', sku: 'MBG-XS-001', rent_price_per_day: 2500, sale_price: null, stock_qty: 1 },
      { size: 'S',  color: 'Midnight Blue', color_hex: '#191970', sku: 'MBG-S-001',  rent_price_per_day: 2500, sale_price: null, stock_qty: 2 },
      { size: 'M',  color: 'Midnight Blue', color_hex: '#191970', sku: 'MBG-M-001',  rent_price_per_day: 2500, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'gowns', imageIdx: 1,
  },
  {
    categorySlug: 'gowns',
    name: 'Blush Ruffle Gown',
    slug: 'blush-ruffle-gown',
    description: 'Romantic blush ruffle gown with tiered skirt and off-shoulder neckline.',
    listing_type: 'both',
    deposit_amount: 4000,
    dry_cleaning_fee: 500,
    brand: 'Royal Threads',
    fabric: 'Chiffon',
    tags: ['gown', 'blush', 'ruffle', 'cocktail'],
    is_trending: true,
    variants: [
      { size: 'XS', color: 'Blush', color_hex: '#FFB6C1', sku: 'BRG-XS-001', rent_price_per_day: 1200, sale_price: 28000, stock_qty: 2 },
      { size: 'S',  color: 'Blush', color_hex: '#FFB6C1', sku: 'BRG-S-001',  rent_price_per_day: 1200, sale_price: 28000, stock_qty: 3 },
      { size: 'M',  color: 'Blush', color_hex: '#FFB6C1', sku: 'BRG-M-001',  rent_price_per_day: 1200, sale_price: 28000, stock_qty: 2 },
    ],
    imageKey: 'gowns', imageIdx: 2,
  },
  {
    categorySlug: 'gowns',
    name: 'Forest Green Mermaid Gown',
    slug: 'forest-green-mermaid-gown',
    description: 'Fitted forest green mermaid gown with sequin embellishments.',
    listing_type: 'rent',
    deposit_amount: 7000,
    dry_cleaning_fee: 700,
    brand: 'Tarun Tahiliani',
    fabric: 'Sequin Net',
    tags: ['gown', 'green', 'mermaid', 'reception'],
    is_featured: true,
    is_designer_pick: true,
    variants: [
      { size: 'XS', color: 'Forest Green', color_hex: '#228B22', sku: 'FGM-XS-001', rent_price_per_day: 2200, sale_price: null, stock_qty: 1 },
      { size: 'S',  color: 'Forest Green', color_hex: '#228B22', sku: 'FGM-S-001',  rent_price_per_day: 2200, sale_price: null, stock_qty: 2 },
      { size: 'M',  color: 'Forest Green', color_hex: '#228B22', sku: 'FGM-M-001',  rent_price_per_day: 2200, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'gowns', imageIdx: 3,
  },

  // ── JEWELLERY (4 products) ─────────────────────────────────────────────────
  {
    categorySlug: 'jewellery',
    name: 'Polki Diamond Necklace Set',
    slug: 'polki-diamond-necklace-set',
    description: 'Regal polki diamond necklace with matching earrings and maang tikka.',
    listing_type: 'rent',
    deposit_amount: 15000,
    dry_cleaning_fee: null,
    brand: 'Royal Threads',
    fabric: 'Gold',
    tags: ['jewellery', 'polki', 'diamond', 'bridal'],
    is_featured: true,
    is_designer_pick: true,
    variants: [
      { size: 'Free Size', color: 'Gold', color_hex: '#FFD700', sku: 'PDN-FS-001', rent_price_per_day: 3000, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'jewellery', imageIdx: 0,
  },
  {
    categorySlug: 'jewellery',
    name: 'Kundan Choker Set',
    slug: 'kundan-choker-set',
    description: 'Traditional kundan choker with green meenakari back and drop earrings.',
    listing_type: 'rent',
    deposit_amount: 8000,
    dry_cleaning_fee: null,
    brand: 'Royal Threads',
    fabric: 'Gold',
    tags: ['jewellery', 'kundan', 'choker', 'meenakari'],
    is_trending: true,
    variants: [
      { size: 'Free Size', color: 'Gold & Green', color_hex: '#FFD700', sku: 'KCS-FS-001', rent_price_per_day: 1500, sale_price: null, stock_qty: 3 },
    ],
    imageKey: 'jewellery', imageIdx: 1,
  },
  {
    categorySlug: 'jewellery',
    name: 'Pearl Maala Set',
    slug: 'pearl-maala-set',
    description: 'Long pearl maala with gold accents and matching jhumka earrings.',
    listing_type: 'both',
    deposit_amount: 5000,
    dry_cleaning_fee: null,
    brand: 'Royal Threads',
    fabric: 'Pearl',
    tags: ['jewellery', 'pearl', 'maala', 'traditional'],
    variants: [
      { size: 'Free Size', color: 'White & Gold', color_hex: '#F5F5F5', sku: 'PMS-FS-001', rent_price_per_day: 1000, sale_price: 25000, stock_qty: 3 },
    ],
    imageKey: 'jewellery', imageIdx: 2,
  },
  {
    categorySlug: 'jewellery',
    name: 'Temple Jewellery Set',
    slug: 'temple-jewellery-set',
    description: 'South Indian temple jewellery set with necklace, jhumkas, and vaddanam.',
    listing_type: 'rent',
    deposit_amount: 12000,
    dry_cleaning_fee: null,
    brand: 'Royal Threads',
    fabric: 'Gold',
    tags: ['jewellery', 'temple', 'south-indian', 'antique'],
    is_featured: true,
    variants: [
      { size: 'Free Size', color: 'Antique Gold', color_hex: '#B8860B', sku: 'TJS-FS-001', rent_price_per_day: 2500, sale_price: null, stock_qty: 2 },
    ],
    imageKey: 'jewellery', imageIdx: 3,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve vendor
    const { rows: vendorRows } = await client.query(
      `SELECT id FROM vendors WHERE slug = 'royal-threads'`
    );
    if (!vendorRows[0]) throw new Error('Vendor royal-threads not found — run demo.seed.js first');
    const defaultVendorId = vendorRows[0].id;

    // Cache categories by slug
    const { rows: catRows } = await client.query('SELECT id, slug FROM categories');
    const catMap = Object.fromEntries(catRows.map((r) => [r.slug, r.id]));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const p of PRODUCTS) {
      const categoryId = catMap[p.categorySlug];
      if (!categoryId) {
        logger.warn({ slug: p.categorySlug }, 'Category not found, skipping product');
        skipped++;
        continue;
      }

      const { primary, extras } = buildImages(p.imageKey, p.imageIdx);

      // Upsert product
      const { rows: pRows } = await client.query(
        `INSERT INTO products
           (vendor_id, category_id, name, slug, description, listing_type,
            deposit_amount, dry_cleaning_fee, brand, fabric, tags,
            is_featured, is_trending, is_designer_pick)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (slug) DO UPDATE
           SET name              = EXCLUDED.name,
               description       = EXCLUDED.description,
               listing_type      = EXCLUDED.listing_type,
               deposit_amount    = EXCLUDED.deposit_amount,
               dry_cleaning_fee  = EXCLUDED.dry_cleaning_fee,
               brand             = EXCLUDED.brand,
               fabric            = EXCLUDED.fabric,
               tags              = EXCLUDED.tags,
               is_featured       = EXCLUDED.is_featured,
               is_trending       = EXCLUDED.is_trending,
               is_designer_pick  = EXCLUDED.is_designer_pick
         RETURNING id, (xmax = 0) AS was_inserted`,
        [
          defaultVendorId, categoryId, p.name, p.slug, p.description, p.listing_type,
          p.deposit_amount, p.dry_cleaning_fee ?? null, p.brand || null, p.fabric || null, p.tags || [],
          p.is_featured || false, p.is_trending || false, p.is_designer_pick || false,
        ]
      );
      const productId = pRows[0].id;
      const wasInserted = pRows[0].was_inserted;

      // Upsert variants — first variant is the default selection on PDP
      for (let vi = 0; vi < p.variants.length; vi++) {
        const v = p.variants[vi];
        await client.query(
          `INSERT INTO product_variants
             (product_id, size, color, color_hex, sku, rent_price_per_day, sale_price,
              stock_qty, available_qty, is_default)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9)
           ON CONFLICT (sku) DO UPDATE
             SET rent_price_per_day = EXCLUDED.rent_price_per_day,
                 sale_price         = EXCLUDED.sale_price,
                 stock_qty          = EXCLUDED.stock_qty,
                 available_qty      = EXCLUDED.available_qty,
                 is_default         = EXCLUDED.is_default`,
          [
            productId, v.size, v.color, v.color_hex, v.sku,
            v.rent_price_per_day || null, v.sale_price || null, v.stock_qty,
            vi === 0,
          ]
        );
      }

      // Replace images: delete existing, insert primary + 2 extras
      await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
      await client.query(
        `INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES ($1,$2,TRUE,0)`,
        [productId, primary]
      );
      for (let ei = 0; ei < extras.length; ei++) {
        await client.query(
          `INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES ($1,$2,FALSE,$3)`,
          [productId, extras[ei], ei + 1]
        );
      }

      if (wasInserted) inserted++;
      else updated++;
    }

    await client.query('COMMIT');
    logger.info({ inserted, updated, skipped }, 'Products seed completed');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Products seed failed');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
