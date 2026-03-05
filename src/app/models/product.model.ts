export interface IProductImageDto {
  original?: string;
  small?: string;
  isVertical?: boolean;
  is_vertical?: boolean;
}

export interface IProductSizeUnitDto {
  id?: number;
  name?: string;
  key?: string;
}

export interface IProductSizeDetailsDto {
  id?: number;
  value?: number;
  definition?: string;
  pieces?: boolean;
  minimum_quantity?: number | null;
  increment?: number | null;
  measurement?: string;
  unit?: IProductSizeUnitDto | null;
}

export interface IProductSizeVariantDto {
  id?: number;
  name?: string;
  priority?: number;
}

export interface IProductSizeProductDto {
  id?: number;
  name?: string;
  variant?: IProductSizeVariantDto | null;
}

export interface IProductSizeDto {
  details?: IProductSizeDetailsDto | null;
  product_number?: string | null;
  price?: number | null;
  has_custom_price?: boolean;
  products?: IProductSizeProductDto[] | null;
}

export interface IProductBakeryDto {
  id?: number;
  name?: string;
  country?: {
    currencySymbol?: string;
  };
}

export interface IProductAllergenDto {
  id: number;
  name: string;
  state?: string;
  parent_allergen?: number | null;
  show_as_child?: boolean;
}

export interface IProductDto {
  id: number;
  name: string;
  description?: string;
  image?: IProductImageDto;
  sizes?: IProductSizeDto[];
  allergens?: IProductAllergenDto[];
  min_price?: number;
  max_price?: number;
  structure_type?: string;
  can_has_motive?: boolean;
  can_has_text?: boolean;
  show_quantity_picker?: boolean;
  mail_delivery_available?: boolean;
  pickup_available?: boolean;
  increment?: number | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  bakery?: IProductBakeryDto;
  discount?: { value: number };
}

export interface IProductDetailsVariantDto extends IProductSizeProductDto {
  product_number?: string | null;
  price?: number | null;
  image?: IProductImageDto | null;
}

export interface IProductDetailsSizeDto extends IProductSizeDto {
  products?: IProductDetailsVariantDto[] | null;
}

export interface IProductDetailsDto {
  id: number;
  name?: string;
  description?: string;
  category?: {
    id?: number;
    name?: string;
  } | null;
  bakery?: {
    id?: number;
    name?: string;
    country?: {
      code?: string;
      name?: string;
      currency?: string;
      currency_symbol?: string;
      currencySymbol?: string;
    } | null;
  } | null;
  image?: IProductImageDto | null;
  images?: IProductImageDto[] | null;
  gallery?: number[] | null;
  structure_type?: string;
  min_quantity?: number | null;
  max_quantity?: number | null;
  increment?: number | null;
  min_quantity_per_product?: number | null;
  pickup_available?: boolean;
  delivery_available?: boolean;
  mail_delivery_available?: boolean;
  allergens?: IProductAllergenDto[] | null;
  ingredients?: string;
  greeting_card?: {
    available?: boolean;
    max_length?: number | null;
    price?: number | null;
    vat_rate?: number | null;
  } | null;
  sizes?: IProductDetailsSizeDto[] | null;
}

export type ProductImageOrientation = 'portrait' | 'landscape' | 'auto';

export interface IProductSizeOption {
  id: number;
  label: string;
  price: number;
  increment: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  isPiecesLike: boolean;
}

export interface IProduct {
  id: number;
  name: string;
  descriptionText: string;
  containsAllergenNames: string[];
  imageUrl: string;
  image?: IProductImageDto;
  imageOrientation: ProductImageOrientation;
  sizes?: IProductSizeOption[];
  minPrice: number;
  maxPrice: number;
  structureType: string;
  showQuantityPicker: boolean;
  increment: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  isPiecesLike: boolean;
  canHasMotive: boolean;
  canHasText: boolean;
  mailDeliveryAvailable: boolean;
  pickupAvailable: boolean;
  discountValue: number | null;
  bakeryName: string;
  currencySymbol: string;
}

export interface IProductVariantOption {
  id: number;
  label: string;
  priority: number | null;
  price: number;
  increment: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  isPiecesLike: boolean;
  imageUrl: string;
}

export interface IProductDetails {
  id: number;
  name: string;
  descriptionHtml: string;
  descriptionText: string;
  categoryName: string;
  bakeryName: string;
  currencySymbol: string;
  imageUrl: string;
  image?: IProductImageDto;
  images: IProductImageDto[];
  gallery: number[];
  structureType: string;
  minQuantity: number | null;
  maxQuantity: number | null;
  increment: number;
  minQuantityPerProduct: number | null;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  mailDeliveryAvailable: boolean;
  ingredients: string;
  containsAllergenNames: string[];
  greetingCard: {
    available: boolean;
    maxLength: number | null;
    price: number | null;
    vatRate: number | null;
  };
  variants: IProductVariantOption[];
}

export interface ICartItem {
  productId: number;
  name: string;
  quantity: number;
}
