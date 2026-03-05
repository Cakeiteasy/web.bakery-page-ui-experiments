export interface ICategoryGroupDto {
  id: number;
  name: string;
  category: number;
}

export interface ICategoryDto {
  id: number;
  name: string;
  groups: ICategoryGroupDto[];
  priority?: number;
  is_custom_category_title?: boolean;
  custom_category_title?: string;
  bottom_text_for_city_page?: string;
  top_text_for_city_page?: string;
  note_for_business_customers?: string;
  is_show_category_info_note?: boolean;
  category_info_note?: string;
  layout_mode?: string;
  show_product_images?: boolean;
}

export interface ICategoryGroup {
  id: number;
  name: string;
  category: number;
}

export interface ICategory {
  id: number;
  name: string;
  groups: ICategoryGroup[];
  priority?: number;
  customCategoryTitle?: string;
  showProductImages?: boolean;
}
