-- Shaku Maku Posts Table Schema
-- Run this in Supabase SQL Editor first

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id BIGINT REFERENCES businesses(id),
  
  -- Display content
  display_name TEXT NOT NULL,
  caption_ar TEXT NOT NULL,
  caption_en TEXT,
  
  -- Visuals
  image_url TEXT NOT NULL,
  image_prompt TEXT, -- For AI-generated images in future
  
  -- Business details (snapshot at post creation)
  category TEXT,
  governorate TEXT,
  raw_phone TEXT,
  normalized_phone TEXT,
  whatsapp_phone TEXT,
  
  -- Metadata
  post_style TEXT DEFAULT 'postcard', -- postcard, spotlight, story
  featured BOOLEAN DEFAULT false,
  
  -- Engagement
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_post_style CHECK (post_style IN ('postcard', 'spotlight', 'story'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_governorate ON posts(governorate);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_posts_business_id ON posts(business_id);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published posts
CREATE POLICY "Allow public read access to published posts"
  ON posts
  FOR SELECT
  TO anon
  USING (published_at IS NOT NULL AND published_at <= NOW());

-- Allow service role full access
CREATE POLICY "Allow service role full access"
  ON posts
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE posts IS 'Shaku Maku social feed posts featuring businesses';
