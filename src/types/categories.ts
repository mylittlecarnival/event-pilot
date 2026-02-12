export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CategoryWithProductCount extends Category {
  product_count: number
  subcategory_count: number
}

export interface Subcategory {
  id: string
  category_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SubcategoryWithProductCount extends Subcategory {
  product_count: number
}
