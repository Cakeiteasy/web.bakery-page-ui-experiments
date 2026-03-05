export interface IAllergenDto {
  id: number;
  name: string;
  is_show_in_filters: boolean;
  parent_allergen: number | null;
  show_as_child: boolean;
}

export interface IAllergen {
  id: number;
  name: string;
  isShowInFilters: boolean;
  parentAllergen: number | null;
  showAsChild: boolean;
}
