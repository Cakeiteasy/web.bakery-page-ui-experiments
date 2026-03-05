export interface IProductGroupDto {
  id: number;
  name: string;
}

export interface ITagDto {
  id: number;
  name: string;
}

export interface IFiltersResponseDto {
  tags: ITagDto[];
  product_groups: IProductGroupDto[];
  can_has_motive: boolean;
}

export interface IProductGroup {
  id: number;
  name: string;
}

export interface IFiltersResponse {
  tags: ITagDto[];
  productGroups: IProductGroup[];
  canHasMotive: boolean;
}

export type MotiveMode = 'any' | 'with' | 'without';
export type ProductsViewMode = 'grid' | 'list' | 'menu';

export interface ActiveFilters {
  allergenIds: number[];
  motive: MotiveMode;
  productGroupIds: number[];
}
