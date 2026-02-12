-- Create subcategories table (belongs to a category)
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create product_subcategories junction table for many-to-many relationship
CREATE TABLE product_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_product_subcategory UNIQUE (product_id, subcategory_id)
);

-- Add indexes for performance
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_subcategories_name ON subcategories(name);
CREATE INDEX idx_subcategories_deleted_at ON subcategories(deleted_at);
CREATE INDEX idx_product_subcategories_product_id ON product_subcategories(product_id);
CREATE INDEX idx_product_subcategories_subcategory_id ON product_subcategories(subcategory_id);

-- Add RLS policies
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;

-- Policies for subcategories
CREATE POLICY "Users can view subcategories" ON subcategories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage subcategories" ON subcategories
  FOR ALL USING (auth.role() = 'authenticated');

-- Policies for product_subcategories
CREATE POLICY "Users can view product subcategories" ON product_subcategories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage product subcategories" ON product_subcategories
  FOR ALL USING (auth.role() = 'authenticated');

-- Grant table permissions
GRANT ALL ON subcategories TO authenticated;
GRANT ALL ON product_subcategories TO authenticated;
