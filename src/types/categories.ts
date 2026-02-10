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
}
