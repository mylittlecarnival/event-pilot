-- Create categories table for organizing products
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create product_categories junction table for many-to-many relationship
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_product_category UNIQUE (product_id, category_id)
);

-- Add indexes for performance
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_deleted_at ON categories(deleted_at);
CREATE INDEX idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX idx_product_categories_category_id ON product_categories(category_id);

-- Add RLS policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Policies for categories
CREATE POLICY "Users can view categories" ON categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Policies for product_categories
CREATE POLICY "Users can view product categories" ON product_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage product categories" ON product_categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Grant table permissions
GRANT ALL ON categories TO authenticated;
GRANT ALL ON product_categories TO authenticated;
