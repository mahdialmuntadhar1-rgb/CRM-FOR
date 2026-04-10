#!/usr/bin/env node
/**
 * Database Setup Script
 * Creates the posts table for Shaku Maku feed
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.shakumaku') });
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});
async function setupDatabase() {
    console.log('🔧 Setting up database...\n');
    // SQL to create posts table
    const sql = `
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
  post_style TEXT DEFAULT 'postcard' CHECK (post_style IN ('postcard', 'spotlight', 'story')),
  featured BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_governorate ON posts(governorate);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured) WHERE featured = true;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Allow public read access to published posts'
  ) THEN
    CREATE POLICY "Allow public read access to published posts"
      ON posts FOR SELECT TO anon
      USING (published_at IS NOT NULL AND published_at <= NOW());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Allow service role full access'
  ) THEN
    CREATE POLICY "Allow service role full access"
      ON posts TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE posts IS 'Shaku Maku social feed posts featuring businesses';
`;
    // Execute SQL using rpc with pg_exec or similar
    console.log('Creating posts table...');
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
        // Try alternative method - direct query via pg_execute
        console.log('  RPC method failed, trying alternative...');
        const { error: err2 } = await supabase.rpc('pg_execute', { query: sql });
        if (err2) {
            console.log('  ⚠️ Could not auto-create table. Please run this SQL manually:');
            console.log('\n--- COPY AND PASTE INTO SUPABASE SQL EDITOR ---\n');
            console.log(sql);
            console.log('\n--- END SQL ---\n');
            console.log('Go to: https://hsadukhmcclwixuntqwu.supabase.co/project/sql');
            return;
        }
    }
    console.log('✅ Database setup complete!\n');
}
setupDatabase().catch(err => {
    console.error('❌ Setup failed:', err);
    process.exit(1);
});
