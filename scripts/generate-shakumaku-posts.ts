#!/usr/bin/env node
/**
 * Shaku Maku Post Generator
 * Generates 50 beautiful postcard-style posts for the social feed
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment
dotenv.config({ path: resolve(process.cwd(), '.env.shakumaku') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hsadukhmcclwixuntqwu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const TARGET_POST_COUNT = 50;

// Target categories for diversity
const TARGET_CATEGORIES = [
  'مطعم', 'Restaurant',
  'كافيه', 'Cafe',
  'صالون', 'Salon', 'حلاق',
  'محل', 'Store', 'Shop',
  'صيدلية', 'Pharmacy',
  'مخبز', 'Bakery',
  'مكتبة', 'Bookstore',
  'ملابس', 'Clothing',
  'هاتف', 'Mobile',
  'سوبرماركت', 'Supermarket',
  'حدادة', 'Carpentry',
  'كهرباء', 'Electronics',
  'خدمات', 'Services'
];

// Unsplash image collections by category
const CATEGORY_IMAGES: Record<string, string> = {
  'مطعم': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  'Restaurant': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  'كافيه': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
  'Cafe': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
  'صالون': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
  'Salon': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
  'صيدلية': 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=800&q=80',
  'Pharmacy': 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=800&q=80',
  'مخبز': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
  'Bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
  'مكتبة': 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80',
  'Bookstore': 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80',
  'ملابس': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
  'Clothing': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
  'default': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'
};

// Interfaces
interface Business {
  id: number;
  name: string;
  phone?: string;
  governorate: string;
  category?: string;
  description?: string;
  address?: string;
}

interface GeneratedPost {
  business_id: number;
  display_name: string;
  caption_ar: string;
  caption_en: string;
  image_url: string;
  image_prompt: string;
  category: string;
  governorate: string;
  raw_phone?: string;
  normalized_phone?: string;
  whatsapp_phone?: string;
  post_style: string;
  featured: boolean;
}

// Validation
function validateEnv(): void {
  const missing: string[] = [];
  if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');
  if (!GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    process.exit(1);
  }
}

// Phone normalization
function normalizePhone(phone?: string): { normalized: string; whatsapp: string; raw: string } {
  if (!phone) return { normalized: '', whatsapp: '', raw: '' };
  
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  
  if (cleaned.startsWith('07')) cleaned = '+964' + cleaned.substring(1);
  else if (cleaned.startsWith('7') && cleaned.length >= 10) cleaned = '+964' + cleaned;
  else if (cleaned.startsWith('964')) cleaned = '+' + cleaned;
  
  const whatsapp = cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
  
  return { normalized: cleaned, whatsapp, raw: phone };
}

// Select diverse businesses
async function selectDiverseBusinesses(client: SupabaseClient): Promise<Business[]> {
  console.log('📊 Selecting diverse businesses...\n');
  
  const selected: Business[] = [];
  const seenIds = new Set<number>();
  const targetPerCategory = Math.ceil(TARGET_POST_COUNT / TARGET_CATEGORIES.length);
  
  for (const category of TARGET_CATEGORIES) {
    if (selected.length >= TARGET_POST_COUNT) break;
    
    const { data, error } = await client
      .from('businesses')
      .select('id, name, phone, governorate, category, description, address')
      .ilike('category', `%${category}%`)
      .not('name', 'is', null)
      .limit(targetPerCategory * 2);
    
    if (error) {
      console.warn(`⚠️ Error querying ${category}: ${error.message}`);
      continue;
    }
    
    if (data) {
      for (const business of data) {
        if (!seenIds.has(business.id) && selected.length < TARGET_POST_COUNT) {
          // Prefer businesses with phone numbers
          if (business.phone || Math.random() > 0.3) {
            selected.push(business);
            seenIds.add(business.id);
          }
        }
      }
    }
    
    console.log(`  ${category}: ${data?.length || 0} found, ${selected.length} total selected`);
  }
  
  // Fill remaining with random selection if needed
  if (selected.length < TARGET_POST_COUNT) {
    const needed = TARGET_POST_COUNT - selected.length;
    const { data } = await client
      .from('businesses')
      .select('id, name, phone, governorate, category, description, address')
      .not('id', 'in', `(${Array.from(seenIds).join(',')})`)
      .not('name', 'is', null)
      .limit(needed * 3);
    
    if (data) {
      for (const business of data) {
        if (selected.length < TARGET_POST_COUNT) {
          selected.push(business);
          seenIds.add(business.id);
        }
      }
    }
  }
  
  console.log(`\n✅ Selected ${selected.length} diverse businesses\n`);
  return selected;
}

// Generate Arabic caption using Gemini
async function generateCaption(business: Business, genAI: GoogleGenerativeAI): Promise<{ ar: string; en: string; prompt: string }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const categoryHint = business.category || 'business';
  const governorateHint = business.governorate || 'Iraq';
  
  const prompt = `
You are a social media content creator for "Shaku Maku" (شاكو ماكو), a platform featuring Iraqi businesses.

Create an engaging Instagram-style caption for this business in ARABIC:

Business Name: ${business.name}
Category: ${categoryHint}
Location: ${governorateHint}, Iraq
${business.description ? `Description: ${business.description}` : ''}
${business.address ? `Address: ${business.address}` : ''}

Follow this structure:
1. Opening hook welcoming followers to "زاوية الشاكو ماكو"
2. Introduce the business with enthusiasm (2-3 sentences about what makes it special)
3. Call to action inviting people to visit
4. Brief contact/location info mention

Tone: Friendly, conversational, enthusiastic. Use Iraqi Arabic expressions naturally.
Length: 80-120 words.

Also provide an English translation of the caption.

Format your response EXACTLY like this:
ARABIC_CAPTION: [the Arabic caption]
ENGLISH_CAPTION: [the English translation]
IMAGE_PROMPT: [a short 10-word prompt for an illustration of this business]
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse response
    const arabicMatch = text.match(/ARABIC_CAPTION:\s*([\s\S]*?)(?=ENGLISH_CAPTION:|$)/i);
    const englishMatch = text.match(/ENGLISH_CAPTION:\s*([\s\S]*?)(?=IMAGE_PROMPT:|$)/i);
    const promptMatch = text.match(/IMAGE_PROMPT:\s*([\s\S]*?)$/i);
    
    const arabicCaption = arabicMatch ? arabicMatch[1].trim() : generateFallbackCaption(business).ar;
    const englishCaption = englishMatch ? englishMatch[1].trim() : generateFallbackCaption(business).en;
    const imagePrompt = promptMatch ? promptMatch[1].trim() : `Illustration of ${business.name} in ${categoryHint} style`;
    
    return { ar: arabicCaption, en: englishCaption, prompt: imagePrompt };
  } catch (err) {
    console.warn(`⚠️ Gemini failed for ${business.name}, using fallback`);
    const fallback = generateFallbackCaption(business);
    return { ar: fallback.ar, en: fallback.en, prompt: fallback.prompt };
  }
}

// Fallback caption generator
function generateFallbackCaption(business: Business): { ar: string; en: string; prompt: string } {
  const name = business.name;
  const category = business.category || 'مكان رائع';
  const location = business.governorate || 'العراق';
  
  return {
    ar: `أهلاً بكم في زاوية الشاكو ماكو! ✨

اليوم نأخذكم في جولة سريعة لـ ${name}، المكان المثالي لـ ${category} في ${location}.

هذا المكان يتميز بتقديم أفضل الخدمات والمنتجات لعملائه. إذا كنت تبحث عن تجربة مميزة، فـ ${name} هو وجهتك المناسبة!

تفضل بزيارتهم واكتشف المزيد عن خدماتهم المميزة! 🌟

📍 ${location}`,
    en: `Welcome to the Shaku Maku corner! ✨

Today we take you on a quick tour of ${name}, the perfect place for ${category} in ${location}, Iraq.

This place is known for offering the best services and products to its customers. If you're looking for a special experience, ${name} is your destination!

Visit them and discover their special services! 🌟

📍 ${location}`,
    prompt: `Warm illustration of ${category} in Iraq, postcard style, vibrant colors`
  };
}

// Get image URL for category
function getImageUrl(category?: string): string {
  if (!category) return CATEGORY_IMAGES.default;
  
  // Try exact match
  if (CATEGORY_IMAGES[category]) return CATEGORY_IMAGES[category];
  
  // Try partial match
  for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
    if (category.includes(key) || key.includes(category)) return url;
  }
  
  return CATEGORY_IMAGES.default;
}

// Generate posts
async function generatePosts(
  businesses: Business[],
  genAI: GoogleGenerativeAI
): Promise<GeneratedPost[]> {
  console.log('🤖 Generating captions with Gemini AI...\n');
  
  const posts: GeneratedPost[] = [];
  
  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i];
    console.log(`  [${i + 1}/${businesses.length}] ${business.name}...`);
    
    const phoneData = normalizePhone(business.phone);
    const captions = await generateCaption(business, genAI);
    
    const post: GeneratedPost = {
      business_id: business.id,
      display_name: business.name,
      caption_ar: captions.ar,
      caption_en: captions.en,
      image_url: getImageUrl(business.category),
      image_prompt: captions.prompt,
      category: business.category || 'General',
      governorate: business.governorate,
      raw_phone: phoneData.raw,
      normalized_phone: phoneData.normalized,
      whatsapp_phone: phoneData.whatsapp,
      post_style: 'postcard',
      featured: i < 5 // First 5 are featured
    };
    
    posts.push(post);
    
    // Small delay to avoid rate limiting
    if (i < businesses.length - 1) await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n✅ Generated ${posts.length} posts\n`);
  return posts;
}

// Insert posts to database
async function insertPosts(client: SupabaseClient, posts: GeneratedPost[]): Promise<void> {
  console.log('💾 Inserting posts to database...\n');
  
  // Try to get existing columns first
  console.log('  Checking table schema...');
  const { data: sampleData, error: sampleError } = await client
    .from('posts')
    .select('*')
    .limit(1);
  
  let existingColumns: string[] = [];
  if (sampleData && sampleData.length > 0) {
    existingColumns = Object.keys(sampleData[0]);
    console.log(`  Found columns: ${existingColumns.join(', ')}`);
  } else if (sampleError && sampleError.message.includes('does not exist')) {
    console.error('  ❌ posts table does not exist');
    return;
  }
  
  const batchSize = 10;
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    // Prepare batch with only existing columns
    const preparedBatch = batch.map(post => {
      const prepared: any = {};
      
      // Map fields to columns - support both snake_case and camelCase
      if (!existingColumns.length || existingColumns.includes('business_id')) prepared.business_id = post.business_id;
      if (!existingColumns.length || existingColumns.includes('businessId')) prepared.businessId = post.business_id;
      
      if (!existingColumns.length || existingColumns.includes('display_name')) prepared.display_name = post.display_name;
      if (!existingColumns.length || existingColumns.includes('businessName')) prepared.businessName = post.display_name;
      
      if (!existingColumns.length || existingColumns.includes('caption_ar')) prepared.caption_ar = post.caption_ar;
      if (!existingColumns.length || existingColumns.includes('caption')) prepared.caption = post.caption_ar;
      if (!existingColumns.length || existingColumns.includes('content')) prepared.content = post.caption_ar;
      
      if (!existingColumns.length || existingColumns.includes('caption_en')) prepared.caption_en = post.caption_en;
      
      if (!existingColumns.length || existingColumns.includes('image_url')) prepared.image_url = post.image_url;
      if (!existingColumns.length || existingColumns.includes('imageUrl')) prepared.imageUrl = post.image_url;
      
      if (!existingColumns.length || existingColumns.includes('image_prompt')) prepared.image_prompt = post.image_prompt;
      
      if (!existingColumns.length || existingColumns.includes('category')) prepared.category = post.category;
      
      if (!existingColumns.length || existingColumns.includes('governorate')) prepared.governorate = post.governorate;
      
      if (!existingColumns.length || existingColumns.includes('raw_phone')) prepared.raw_phone = post.raw_phone;
      if (!existingColumns.length || existingColumns.includes('normalized_phone')) prepared.normalized_phone = post.normalized_phone;
      if (!existingColumns.length || existingColumns.includes('whatsapp_phone')) prepared.whatsapp_phone = post.whatsapp_phone;
      
      if (!existingColumns.length || existingColumns.includes('post_style')) prepared.post_style = post.post_style;
      
      if (!existingColumns.length || existingColumns.includes('featured')) prepared.featured = post.featured;
      
      // Set defaults for required fields that might be missing
      if (!existingColumns.length || existingColumns.includes('isVerified')) prepared.isVerified = false;
      if (!existingColumns.length || existingColumns.includes('likes')) prepared.likes = 0;
      if (!existingColumns.length || existingColumns.includes('businessAvatar')) prepared.businessAvatar = null;
      
      // Always set published timestamp
      if (!existingColumns.length || existingColumns.includes('published_at')) prepared.published_at = new Date().toISOString();
      if (!existingColumns.length || existingColumns.includes('createdAt')) prepared.createdAt = new Date().toISOString();
      if (!existingColumns.length || existingColumns.includes('created_at')) prepared.created_at = new Date().toISOString();
      
      return prepared;
    });
    
    const { error } = await client.from('posts').insert(preparedBatch);
    
    if (error) {
      console.error(`  ❌ Batch ${batchNum} failed: ${error.message}`);
      failed += batch.length;
    } else {
      console.log(`  ✅ Batch ${batchNum} inserted (${batch.length} posts)`);
      success += batch.length;
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\n📊 Results: ${success} success, ${failed} failed\n`);
}

// Preview posts
function previewPosts(posts: GeneratedPost[]): void {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   POST PREVIEW (First 3)');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  posts.slice(0, 3).forEach((post, i) => {
    console.log(`--- Post ${i + 1}${post.featured ? ' ⭐ FEATURED' : ''} ---`);
    console.log(`Name: ${post.display_name}`);
    console.log(`Category: ${post.category} | Governorate: ${post.governorate}`);
    console.log(`\nArabic Caption (${post.caption_ar.length} chars):`);
    console.log(post.caption_ar.substring(0, 200) + '...\n');
    console.log(`Image: ${post.image_url.substring(0, 60)}...\n`);
  });
  
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Ensure posts table exists
async function ensurePostsTable(client: SupabaseClient): Promise<void> {
  console.log('🔧 Checking posts table...');
  
  const { error: checkError } = await client.from('posts').select('id').limit(1);
  
  if (checkError && checkError.message.includes('does not exist')) {
    console.log('  Creating posts table via RPC...');
    
    // Create table using raw SQL via rpc or direct query
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id BIGINT REFERENCES businesses(id),
        display_name TEXT NOT NULL,
        caption_ar TEXT NOT NULL,
        caption_en TEXT,
        image_url TEXT NOT NULL,
        image_prompt TEXT,
        category TEXT,
        governorate TEXT,
        raw_phone TEXT,
        normalized_phone TEXT,
        whatsapp_phone TEXT,
        post_style TEXT DEFAULT 'postcard',
        featured BOOLEAN DEFAULT false,
        likes_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        published_at TIMESTAMPTZ,
        CONSTRAINT valid_post_style CHECK (post_style IN ('postcard', 'spotlight', 'story'))
      );
    `;
    
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
      CREATE INDEX IF NOT EXISTS idx_posts_governorate ON posts(governorate);
    `;
    
    // Use pg_execute or exec_sql if available, otherwise we'll guide user
    console.log('  ⚠️ Please run the SQL in sql/create_posts_table.sql first!');
    console.log('     Table does not exist.\n');
    throw new Error('Posts table does not exist. Run the SQL first.');
  }
  
  console.log('  ✅ Posts table exists\n');
}

// Main function
async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   SHAKU MAKU POST GENERATOR');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  validateEnv();
  
  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  
  console.log('🔗 Connected to Supabase:', SUPABASE_URL);
  console.log('🤖 Gemini AI initialized\n');
  
  // Check/Create table
  await ensurePostsTable(supabase);
  
  // Select businesses
  const businesses = await selectDiverseBusinesses(supabase);
  
  if (businesses.length === 0) {
    console.error('❌ No businesses found');
    process.exit(1);
  }
  
  // Generate posts
  const posts = await generatePosts(businesses, genAI);
  
  // Preview
  previewPosts(posts);
  
  // Confirm
  console.log('⚡ Ready to insert to database');
  console.log('   (Continuing in 3 seconds... Ctrl+C to cancel)\n');
  await new Promise(r => setTimeout(r, 3000));
  
  // Insert
  await insertPosts(supabase, posts);
  
  // Verify
  const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  console.log(`✅ Total posts in database: ${count}`);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   GENERATION COMPLETE 🎉');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n💥 Error:', err);
  process.exit(1);
});
