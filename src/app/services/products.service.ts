import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { IAllergen, IAllergenDto } from '../models/allergen.model';
import { ICategory, ICategoryDto } from '../models/category.model';
import {
  ActiveFilters,
  IFiltersResponse,
  IFiltersResponseDto,
  MotiveMode,
  ProductsViewMode,
} from '../models/filter.model';
import {
  ICartItem,
  IProduct,
  IProductAllergenDto,
  IProductDetails,
  IProductDetailsDto,
  IProductImageDto,
  IProductDetailsSizeDto,
  IProductDto,
  IProductSizeDto,
  IProductSizeOption,
  IProductVariantOption,
  ProductImageOrientation
} from '../models/product.model';
import { getActiveBakeryOption } from '../utils/active-bakery.util';

interface IPieceCounterRule {
  isPiecesLike: boolean;
  increment: number;
  minQuantity: number | null;
  maxQuantity: number | null;
}

function createEmptyFilters(): ActiveFilters {
  return {
    allergenIds: [],
    motive: 'any',
    productGroupIds: []
  };
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly bakery = getActiveBakeryOption();
  private readonly storeApiBase = `${this.bakery.api.proxyBase}/store`;

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly categories = signal<ICategory[]>([]);
  readonly selectedCategoryId = signal<number | null>(null);

  readonly filtersResponse = signal<IFiltersResponse | null>(null);
  readonly allergens = signal<IAllergen[]>([]);
  readonly products = signal<IProduct[]>([]);
  readonly searchQuery = signal<string>('');

  readonly activeFilters = signal<ActiveFilters>(createEmptyFilters());
  readonly viewMode = signal<ProductsViewMode>('grid');
  readonly pieceQuantities = signal<Record<number, number>>({});
  private readonly overviewCounterCatalog = signal<Record<number, IPieceCounterRule>>({});
  private readonly detailsCounterCatalog = signal<Record<number, IPieceCounterRule>>({});
  private readonly overviewNameCatalog = signal<Record<number, string>>({});
  private readonly detailsNameCatalog = signal<Record<number, string>>({});
  readonly pieceCounterRules = computed<Record<number, IPieceCounterRule>>(() =>
    this.mergeCatalogs(this.overviewCounterCatalog(), this.detailsCounterCatalog())
  );
  readonly cartItemNameLookup = computed<Record<number, string>>(() =>
    this.mergeCatalogs(this.overviewNameCatalog(), this.detailsNameCatalog())
  );
  readonly visibleProducts = computed<IProduct[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const products = this.products();

    if (!query) {
      return products;
    }

    return products.filter((product) => product.name.toLowerCase().includes(query));
  });
  readonly cartItems = computed<ICartItem[]>(() => {
    const quantities = this.pieceQuantities();
    const itemNames = this.cartItemNameLookup();

    return Object.entries(quantities).reduce<ICartItem[]>((items, [productIdKey, quantity]) => {
      if (quantity <= 0) {
        return items;
      }

      const productId = Number(productIdKey);
      const fallbackLabel = 'Valgt produkt';

      items.push({
        productId,
        name: itemNames[productId] ?? fallbackLabel,
        quantity
      });

      return items;
    }, []);
  });
  readonly cartQuantity = computed<number>(() =>
    Object.values(this.pieceQuantities()).reduce((sum, quantity) => sum + quantity, 0)
  );
  readonly hasCartItems = computed<boolean>(() => this.cartQuantity() > 0);

  readonly isMenuForcedForCategory = computed<boolean>(() => false);
  readonly effectiveViewMode = computed<ProductsViewMode>(() => this.viewMode());

  async loadInitialData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const categoryDtos = await this.fetchCategories();

      const categories = (categoryDtos ?? []).map((category) => this.mapCategory(category));
      this.categories.set(categories);

      if (!categories.length) {
        this.selectedCategoryId.set(null);
        this.filtersResponse.set(null);
        this.allergens.set([]);
        this.products.set([]);
        this.overviewCounterCatalog.set({});
        this.overviewNameCatalog.set({});
        this.pieceQuantities.set({});
        return;
      }

      const firstCategoryId = categories[0].id;
      this.selectedCategoryId.set(firstCategoryId);
      this.activeFilters.set(createEmptyFilters());
      this.overviewCounterCatalog.set({});
      this.overviewNameCatalog.set({});
      this.pieceQuantities.set({});

      await this.loadCategoryData(firstCategoryId);
    } catch (error) {
      console.error(error);
      this.error.set(`Failed to load initial data from ${this.bakery.name} API.`);
    } finally {
      this.loading.set(false);
    }
  }

  async selectCategory(categoryId: number): Promise<void> {
    if (this.selectedCategoryId() === categoryId) {
      return;
    }

    const previousFilters = this.filtersResponse();
    const previousAllergens = this.allergens();
    const previousProducts = this.products();
    const previousOverviewCounterCatalog = this.overviewCounterCatalog();
    const previousOverviewNameCatalog = this.overviewNameCatalog();
    const previousQuantities = this.pieceQuantities();

    this.selectedCategoryId.set(categoryId);
    this.activeFilters.set(createEmptyFilters());
    this.overviewCounterCatalog.set({});
    this.overviewNameCatalog.set({});
    this.pieceQuantities.set({});
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.loadCategoryData(categoryId);
    } catch (error) {
      console.error(error);
      this.filtersResponse.set(previousFilters);
      this.allergens.set(previousAllergens);
      this.products.set(previousProducts);
      this.overviewCounterCatalog.set(previousOverviewCounterCatalog);
      this.overviewNameCatalog.set(previousOverviewNameCatalog);
      this.pieceQuantities.set(previousQuantities);
      this.error.set('Failed to switch category. Showing previous results.');
    } finally {
      this.loading.set(false);
    }
  }

  setViewMode(mode: ProductsViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }

    this.viewMode.set(mode);
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query.trimStart());
  }

  getPieceQty(productId: number): number {
    return this.pieceQuantities()[productId] ?? 0;
  }

  increasePieceQty(productId: number): void {
    const pieceRule = this.pieceCounterRules()[productId];
    if (!pieceRule || !pieceRule.isPiecesLike) {
      return;
    }

    const step = this.getStep(pieceRule);
    const current = this.getPieceQty(productId);
    let next = current <= 0 ? this.getInitialQuantity(pieceRule) : current + step;

    if (pieceRule.maxQuantity !== null) {
      next = Math.min(next, pieceRule.maxQuantity);
    }

    this.pieceQuantities.update((currentValues) => ({
      ...currentValues,
      [productId]: next
    }));
  }

  decreasePieceQty(productId: number): void {
    const pieceRule = this.pieceCounterRules()[productId];
    if (!pieceRule || !pieceRule.isPiecesLike) {
      return;
    }

    const current = this.getPieceQty(productId);
    if (current <= 0) {
      return;
    }

    const step = this.getStep(pieceRule);
    let next = current - step;

    if (pieceRule.minQuantity !== null && next < pieceRule.minQuantity) {
      next = 0;
    }

    if (next < 0) {
      next = 0;
    }

    this.pieceQuantities.update((currentValues) => {
      if (next === 0) {
        const { [productId]: _removed, ...rest } = currentValues;
        return rest;
      }

      return {
        ...currentValues,
        [productId]: next
      };
    });
  }

  async toggleAllergen(allergenId: number): Promise<void> {
    this.activeFilters.update((current) => {
      const exists = current.allergenIds.includes(allergenId);

      return {
        ...current,
        allergenIds: exists
          ? current.allergenIds.filter((id) => id !== allergenId)
          : [...current.allergenIds, allergenId]
      };
    });

    await this.reloadProducts();
  }

  async setMotive(mode: MotiveMode): Promise<void> {
    this.activeFilters.update((current) => {
      const nextMode = mode !== 'any' && current.motive === mode ? 'any' : mode;
      return {
        ...current,
        motive: nextMode
      };
    });

    await this.reloadProducts();
  }

  async toggleProductGroup(groupId: number): Promise<void> {
    const groups = this.filtersResponse()?.productGroups ?? [];
    if (!groups.length) {
      return;
    }

    this.activeFilters.update((current) => {
      const exists = current.productGroupIds.includes(groupId);

      return {
        ...current,
        productGroupIds: exists
          ? current.productGroupIds.filter((id) => id !== groupId)
          : [...current.productGroupIds, groupId]
      };
    });

    await this.reloadProducts();
  }

  async reloadProducts(): Promise<void> {
    const categoryId = this.selectedCategoryId();
    if (!categoryId) {
      return;
    }

    const previousProducts = this.products();
    const previousOverviewCounterCatalog = this.overviewCounterCatalog();
    const previousOverviewNameCatalog = this.overviewNameCatalog();

    this.loading.set(true);
    this.error.set(null);

    try {
      const products = await this.fetchProducts(categoryId);
      this.products.set(products);
      this.overviewCounterCatalog.set(this.buildPieceCounterRules(products));
      this.overviewNameCatalog.set(this.buildCartItemNameLookup(products));
      this.pieceQuantities.set({});
    } catch (error) {
      console.error(error);
      this.products.set(previousProducts);
      this.overviewCounterCatalog.set(previousOverviewCounterCatalog);
      this.overviewNameCatalog.set(previousOverviewNameCatalog);
      this.error.set('Failed to reload products. Showing previous results.');
    } finally {
      this.loading.set(false);
    }
  }

  async fetchProductDetailsById(productId: number): Promise<IProductDetails | null> {
    const productDto = await firstValueFrom(
      this.http.get<IProductDetailsDto>(`${this.storeApiBase}/product-types/${productId}/`, {
        headers: this.buildStoreHeaders()
      })
    );

    if (!productDto || !Number.isFinite(productDto.id)) {
      this.detailsCounterCatalog.set({});
      this.detailsNameCatalog.set({});
      return null;
    }

    const details = this.mapProductDetails(productDto);

    this.detailsCounterCatalog.set(this.buildDetailsCounterRules(details));
    this.detailsNameCatalog.set(this.buildDetailsItemNameLookup(details));

    return details;
  }

  private async loadCategoryData(categoryId: number): Promise<void> {
    const [filtersDto, allergensDto, products] = await Promise.all([
      this.fetchFilters(categoryId),
      this.fetchAllergens(categoryId),
      this.fetchProducts(categoryId)
    ]);

    const filters = this.mapFilters(filtersDto);
    this.filtersResponse.set(filters);

    if (!filters.productGroups.length) {
      this.activeFilters.update((current) => ({
        ...current,
        productGroupIds: []
      }));
    }

    this.allergens.set(this.mapAllergens(allergensDto));
    this.products.set(products);
    this.overviewCounterCatalog.set(this.buildPieceCounterRules(products));
    this.overviewNameCatalog.set(this.buildCartItemNameLookup(products));
    this.pieceQuantities.set({});
  }

  private fetchCategories(): Promise<ICategoryDto[]> {
    const params = this.buildCategoriesParams();

    return firstValueFrom(
      this.http.get<ICategoryDto[]>(
        `${this.storeApiBase}/bakeries/${this.bakery.api.bakeryId}/categories/`,
        { params, headers: this.buildStoreHeaders() }
      )
    ).then((categoryDtos) => {
      if ((categoryDtos ?? []).length > 0) {
        return categoryDtos;
      }

      const fallbackCategories = this.bakery.api.fallbackCategories ?? [];
      if (!fallbackCategories.length) {
        return [];
      }

      return fallbackCategories.map((fallback) => ({
        id: fallback.id,
        name: fallback.name,
        groups: [],
        priority: 0,
        custom_category_title: undefined,
        show_product_images: true
      }));
    });
  }

  private fetchFilters(categoryId: number): Promise<IFiltersResponseDto> {
    return firstValueFrom(
      this.http.get<IFiltersResponseDto>(`${this.storeApiBase}/product-types/filters/`, {
        params: this.buildFilterParams(categoryId),
        headers: this.buildStoreHeaders()
      })
    );
  }

  private fetchAllergens(categoryId: number): Promise<IAllergenDto[]> {
    return firstValueFrom(
      this.http.get<IAllergenDto[]>(`${this.storeApiBase}/product-types/filters/allergens/`, {
        params: this.buildProductParams(categoryId),
        headers: this.buildStoreHeaders()
      })
    );
  }

  private async fetchProducts(categoryId: number): Promise<IProduct[]> {
    let params = this.buildProductParams(categoryId);
    const active = this.activeFilters();

    for (const allergenId of active.allergenIds) {
      params = params.append('allergen', String(allergenId));
    }

    if (active.motive === 'with') {
      params = params.set('has_motive', 'true');
    } else if (active.motive === 'without') {
      params = params.set('has_motive', 'false');
    }

    const hasProductGroups = (this.filtersResponse()?.productGroups.length ?? 0) > 0;
    if (hasProductGroups && active.productGroupIds.length) {
      for (const groupId of active.productGroupIds) {
        params = params.append('group', String(groupId));
      }
    }

    const productDtos = await firstValueFrom(
      this.http.get<IProductDto[]>(`${this.storeApiBase}/product-types/`, {
        params,
        headers: this.buildStoreHeaders()
      })
    );

    return (productDtos ?? []).map((product) => this.mapProduct(product));
  }

  private buildCategoriesParams(): HttpParams {
    let params = new HttpParams();

    const locale = this.bakery.api.categoriesLocale;
    if (locale) {
      params = params.set('locale', locale);
    }

    return this.appendTimestamp(params);
  }

  private buildProductParams(categoryId: number): HttpParams {
    const params = new HttpParams()
      .set('bakery_id', String(this.bakery.api.bakeryId))
      .set('category_id', String(categoryId));

    return this.appendTimestamp(params);
  }

  private buildFilterParams(categoryId: number): HttpParams {
    const params = new HttpParams()
      .set('bakery_id', String(this.bakery.api.bakeryId))
      .set('categoryId', String(categoryId));

    return this.appendTimestamp(params);
  }

  private appendTimestamp(params: HttpParams): HttpParams {
    return params.set('t', String(Date.now()));
  }

  private buildStoreHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-cart-key-header': `Bakery:${this.bakery.api.bakeryId}`,
      'x-cart-source-type': 'STANDARD',
      'x-source-header': 'WEB_SHOP'
    });
  }

  private mapCategory(category: ICategoryDto): ICategory {
    return {
      id: category.id,
      name: category.name,
      groups: (category.groups ?? []).map((group) => ({
        id: group.id,
        name: group.name,
        category: group.category
      })),
      priority: category.priority,
      customCategoryTitle: category.custom_category_title,
      showProductImages: category.show_product_images
    };
  }

  private mapFilters(filters: IFiltersResponseDto): IFiltersResponse {
    return {
      tags: filters?.tags ?? [],
      productGroups: (filters?.product_groups ?? []).map((group) => ({
        id: group.id,
        name: group.name
      })),
      canHasMotive: Boolean(filters?.can_has_motive)
    };
  }

  private mapAllergens(allergens: IAllergenDto[]): IAllergen[] {
    return (allergens ?? [])
      .filter((allergen) => allergen.is_show_in_filters)
      .map((allergen) => ({
        id: allergen.id,
        name: allergen.name,
        isShowInFilters: allergen.is_show_in_filters,
        parentAllergen: allergen.parent_allergen,
        showAsChild: allergen.show_as_child
      }));
  }

  private mapProduct(product: IProductDto): IProduct {
    const structureType = product.structure_type ?? '';
    const increment = this.toPositiveNumberOrDefault(product.increment, 1);
    const minQuantity = this.toNullablePositiveNumber(product.min_quantity);
    const maxQuantity = this.toNullablePositiveNumber(product.max_quantity);
    const imageIsVertical = product.image?.is_vertical ?? product.image?.isVertical;
    const imageOrientation = this.getImageOrientation(imageIsVertical);
    const sizes = this.mapProductSizes(product, structureType, increment, minQuantity, maxQuantity);
    const priceRange = this.resolvePriceRange(product, sizes);

    return {
      id: product.id,
      name: (product.name ?? '').trim(),
      descriptionText: this.toPlainText(product.description),
      containsAllergenNames: this.mapContainsAllergenNames(product.allergens),
      imageUrl: this.normalizeImageUrl(product.image?.small ?? product.image?.original ?? ''),
      image: product.image,
      imageOrientation,
      sizes,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      structureType,
      showQuantityPicker: Boolean(product.show_quantity_picker),
      increment,
      minQuantity,
      maxQuantity,
      isPiecesLike: structureType === 'PIECES' || structureType === 'PIECES_GROUP',
      canHasMotive: Boolean(product.can_has_motive),
      canHasText: Boolean(product.can_has_text),
      mailDeliveryAvailable: Boolean(product.mail_delivery_available),
      pickupAvailable: Boolean(product.pickup_available),
      discountValue: product.discount?.value ?? null,
      bakeryName: product.bakery?.name ?? '',
      currencySymbol: product.bakery?.country?.currencySymbol ?? 'kr'
    };
  }

  private mapProductDetails(product: IProductDetailsDto): IProductDetails {
    const structureType = product.structure_type ?? '';
    const increment = this.toPositiveNumberOrDefault(product.increment, 1);
    const minQuantity = this.toNullablePositiveNumber(product.min_quantity);
    const maxQuantity = this.toNullablePositiveNumber(product.max_quantity);
    const normalizedImage = this.normalizeProductImage(product.image);
    const normalizedImages = (product.images ?? [])
      .map((image) => this.normalizeProductImage(image))
      .filter((image): image is NonNullable<typeof image> => Boolean(image));
    const defaultImage = normalizedImage ?? normalizedImages[0];
    const imageUrl = this.normalizeImageUrl(defaultImage?.small ?? defaultImage?.original ?? '');
    const variants = this.mapProductDetailsVariants(product, structureType, increment, minQuantity, maxQuantity);
    const currencySymbol =
      product.bakery?.country?.currency_symbol ?? product.bakery?.country?.currencySymbol ?? 'kr';

    return {
      id: product.id,
      name: (product.name ?? '').trim(),
      descriptionHtml: product.description ?? '',
      descriptionText: this.toPlainText(product.description),
      categoryName: (product.category?.name ?? '').trim(),
      bakeryName: (product.bakery?.name ?? '').trim(),
      currencySymbol: (currencySymbol || 'kr').trim() || 'kr',
      imageUrl,
      image: defaultImage,
      images: normalizedImages,
      gallery: (product.gallery ?? []).filter((id) => Number.isFinite(id)),
      structureType,
      minQuantity,
      maxQuantity,
      increment,
      minQuantityPerProduct: this.toNullablePositiveNumber(product.min_quantity_per_product),
      pickupAvailable: Boolean(product.pickup_available),
      deliveryAvailable: Boolean(product.delivery_available),
      mailDeliveryAvailable: Boolean(product.mail_delivery_available),
      ingredients: (product.ingredients ?? '').trim(),
      containsAllergenNames: this.mapAllergenNamesForDetails(product.allergens),
      greetingCard: {
        available: Boolean(product.greeting_card?.available),
        maxLength: this.toNullablePositiveNumber(product.greeting_card?.max_length),
        price: this.toNullableNonNegativeNumber(product.greeting_card?.price),
        vatRate: this.toNullableNonNegativeNumber(product.greeting_card?.vat_rate)
      },
      variants
    };
  }

  private mapProductDetailsVariants(
    product: IProductDetailsDto,
    structureType: string,
    fallbackIncrement: number,
    fallbackMinQuantity: number | null,
    fallbackMaxQuantity: number | null
  ): IProductVariantOption[] {
    const sizes = product.sizes ?? [];
    const isPiecesByStructure = structureType === 'PIECES' || structureType === 'PIECES_GROUP';
    const usedIds = new Set<number>();
    const variantsWithOrder: Array<IProductVariantOption & { order: number }> = [];
    let fallbackOrder = 0;

    for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex += 1) {
      const size = sizes[sizeIndex];
      const sizeIncrement = this.toPositiveNumberOrDefault(size.details?.increment, fallbackIncrement);
      const sizeMinQuantity = this.toNullablePositiveNumber(size.details?.minimum_quantity ?? fallbackMinQuantity);
      const sizeMaxQuantity = fallbackMaxQuantity;
      const sizeIsPiecesLike = size.details?.pieces ?? isPiecesByStructure;
      const sizeProducts = size.products ?? [];

      if (!sizeProducts.length) {
        const fallbackId = this.buildDetailsFallbackVariantId(product.id, sizeIndex, 0, usedIds);
        const fallbackLabel = this.resolveSizeLabel(size, sizeIndex);
        variantsWithOrder.push({
          id: fallbackId,
          label: fallbackLabel,
          priority: null,
          price: this.toNonNegativeNumber(size.price),
          increment: sizeIncrement,
          minQuantity: sizeMinQuantity,
          maxQuantity: sizeMaxQuantity,
          isPiecesLike: Boolean(sizeIsPiecesLike),
          imageUrl: '',
          order: fallbackOrder
        });
        fallbackOrder += 1;
        continue;
      }

      for (let variantIndex = 0; variantIndex < sizeProducts.length; variantIndex += 1) {
        const sizeProduct = sizeProducts[variantIndex];
        const id = this.resolveDetailsVariantId(product.id, sizeProduct.id, sizeIndex, variantIndex, usedIds);
        const label = this.resolveDetailsVariantLabel(sizeProduct, fallbackOrder + 1);
        const priority = this.toNullableFiniteNumber(sizeProduct.variant?.priority);
        const price = this.toNonNegativeNumber(sizeProduct.price ?? size.price);
        const image = this.normalizeProductImage(sizeProduct.image);

        variantsWithOrder.push({
          id,
          label,
          priority,
          price,
          increment: sizeIncrement,
          minQuantity: sizeMinQuantity,
          maxQuantity: sizeMaxQuantity,
          isPiecesLike: Boolean(sizeIsPiecesLike),
          imageUrl: this.normalizeImageUrl(image?.small ?? image?.original ?? ''),
          order: fallbackOrder
        });
        fallbackOrder += 1;
      }
    }

    return [...variantsWithOrder]
      .sort((left, right) => {
        if (left.priority === null && right.priority === null) {
          return left.order - right.order;
        }

        if (left.priority === null) {
          return 1;
        }

        if (right.priority === null) {
          return -1;
        }

        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }

        return left.order - right.order;
      })
      .map(({ order: _order, ...variant }) => variant);
  }

  private mapProductSizes(
    product: IProductDto,
    structureType: string,
    fallbackIncrement: number,
    fallbackMinQuantity: number | null,
    fallbackMaxQuantity: number | null
  ): IProductSizeOption[] {
    const sizes = product.sizes ?? [];
    const isPiecesByStructure = structureType === 'PIECES' || structureType === 'PIECES_GROUP';
    const usedIds = new Set<number>();

    return sizes.map((size, index) => {
      const resolvedId = this.resolveSizeItemId(product.id, size, index, usedIds);
      const increment = this.toPositiveNumberOrDefault(size.details?.increment, fallbackIncrement);
      const minQuantity = this.toNullablePositiveNumber(size.details?.minimum_quantity ?? fallbackMinQuantity);
      const maxQuantity = fallbackMaxQuantity;
      const isPiecesLike = size.details?.pieces ?? isPiecesByStructure;
      const label = this.resolveSizeLabel(size, index);
      const price = this.toNonNegativeNumber(size.price);

      return {
        id: resolvedId,
        label,
        price,
        increment,
        minQuantity,
        maxQuantity,
        isPiecesLike
      };
    });
  }

  private resolveSizeItemId(
    productId: number,
    size: IProductSizeDto,
    index: number,
    usedIds: Set<number>
  ): number {
    const directProductId = this.toNullablePositiveNumber(size.products?.[0]?.id);
    const detailsId = this.toNullablePositiveNumber(size.details?.id);
    let resolved = directProductId ?? detailsId ?? this.buildFallbackSizeId(productId, index, usedIds);

    if (usedIds.has(resolved)) {
      resolved = this.buildFallbackSizeId(productId, index, usedIds);
    }

    usedIds.add(resolved);
    return resolved;
  }

  private buildFallbackSizeId(productId: number, index: number, usedIds: Set<number>): number {
    let fallback = -(Math.abs(productId) * 100 + index + 1);
    while (usedIds.has(fallback)) {
      fallback -= 1;
    }
    return fallback;
  }

  private resolveSizeLabel(size: IProductSizeDto, index: number): string {
    const definition = size.details?.definition?.trim();
    if (definition) {
      return definition;
    }

    const variantName = size.products?.[0]?.variant?.name?.trim();
    if (variantName) {
      return variantName;
    }

    const productName = size.products?.[0]?.name?.trim();
    if (productName) {
      return productName;
    }

    const detailsValue = size.details?.value;
    const unitKey = (size.details?.unit?.key ?? '').toUpperCase();
    const unitName = size.details?.unit?.name?.trim();
    if (detailsValue && unitName && unitKey !== 'PER_PIECE') {
      return `${detailsValue} ${unitName}`;
    }

    return `Alternativ ${index + 1}`;
  }

  private resolvePriceRange(
    product: IProductDto,
    sizes: IProductSizeOption[]
  ): { min: number; max: number } {
    const sizePrices = sizes
      .map((size) => size.price)
      .filter((price) => price > 0);

    if (sizePrices.length) {
      return {
        min: Math.min(...sizePrices),
        max: Math.max(...sizePrices)
      };
    }

    const min = this.toNonNegativeNumber(product.min_price);
    const max = this.toNonNegativeNumber(product.max_price ?? product.min_price);

    return {
      min,
      max: max > 0 ? max : min
    };
  }

  private buildDetailsCounterRules(details: IProductDetails): Record<number, IPieceCounterRule> {
    const rules: Record<number, IPieceCounterRule> = {};

    for (const variant of details.variants) {
      rules[variant.id] = {
        // Details page always renders variant-level quantity controls, so keep these counters actionable
        // even when backend structure_type is COMPLEX and `pieces` is false.
        isPiecesLike: true,
        increment: variant.increment,
        minQuantity: variant.minQuantity,
        maxQuantity: variant.maxQuantity
      };
    }

    return rules;
  }

  private buildDetailsItemNameLookup(details: IProductDetails): Record<number, string> {
    const lookup: Record<number, string> = {};
    const multipleVariants = details.variants.length > 1;

    for (const variant of details.variants) {
      lookup[variant.id] = multipleVariants ? `${details.name} (${variant.label})` : details.name;
    }

    return lookup;
  }

  private resolveDetailsVariantId(
    productId: number,
    variantId: number | undefined,
    sizeIndex: number,
    variantIndex: number,
    usedIds: Set<number>
  ): number {
    const directId = this.toNullablePositiveNumber(variantId);
    if (directId !== null && !usedIds.has(directId)) {
      usedIds.add(directId);
      return directId;
    }

    const fallbackId = this.buildDetailsFallbackVariantId(productId, sizeIndex, variantIndex, usedIds);
    usedIds.add(fallbackId);
    return fallbackId;
  }

  private buildDetailsFallbackVariantId(
    productId: number,
    sizeIndex: number,
    variantIndex: number,
    usedIds: Set<number>
  ): number {
    let fallback = -(Math.abs(productId) * 10000 + (sizeIndex + 1) * 100 + variantIndex + 1);
    while (usedIds.has(fallback)) {
      fallback -= 1;
    }
    return fallback;
  }

  private resolveDetailsVariantLabel(
    variant:
      | {
          name?: string;
          product_number?: string | null;
          variant?: { name?: string } | null;
        }
      | null
      | undefined,
    fallbackIndex: number
  ): string {
    const variantName = variant?.variant?.name?.trim();
    if (variantName) {
      return variantName;
    }

    const name = variant?.name?.trim();
    if (name) {
      return name;
    }

    const productNumber = variant?.product_number?.trim();
    if (productNumber) {
      return productNumber;
    }

    return `Alternativ ${fallbackIndex}`;
  }

  private toPlainText(text: string | null | undefined): string {
    if (!text) {
      return '';
    }

    return text
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private mapAllergenNamesForDetails(allergens: IProductAllergenDto[] | null | undefined): string[] {
    if (!allergens?.length) {
      return [];
    }

    const containsNames = this.mapContainsAllergenNames(allergens);
    if (containsNames.length) {
      return containsNames;
    }

    return allergens.map((allergen) => (allergen.name ?? '').trim()).filter((name) => Boolean(name));
  }

  private mapContainsAllergenNames(allergens: IProductAllergenDto[] | null | undefined): string[] {
    if (!allergens?.length) {
      return [];
    }

    return allergens
      .filter((allergen) => (allergen.state ?? '').toUpperCase() === 'CONTAINS')
      .map((allergen) => (allergen.name ?? '').trim())
      .filter((name) => Boolean(name));
  }

  private normalizeImageUrl(url: string): string {
    if (!url) {
      return '';
    }

    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    return url;
  }

  private normalizeProductImage(image: IProductImageDto | null | undefined): IProductImageDto | null {
    if (!image) {
      return null;
    }

    return {
      ...image,
      original: this.normalizeImageUrl(image.original ?? ''),
      small: this.normalizeImageUrl(image.small ?? '')
    };
  }

  private getImageOrientation(isVertical: boolean | null | undefined): ProductImageOrientation {
    if (isVertical === true) {
      return 'portrait';
    }

    if (isVertical === false) {
      return 'landscape';
    }

    return 'auto';
  }

  private toNullablePositiveNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private toPositiveNumberOrDefault(value: number | null | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private toNonNegativeNumber(value: number | null | undefined): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return parsed;
  }

  private toNullableNonNegativeNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  }

  private toNullableFiniteNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return parsed;
  }

  private buildPieceCounterRules(products: IProduct[]): Record<number, IPieceCounterRule> {
    return products.reduce<Record<number, IPieceCounterRule>>((rules, product) => {
      rules[product.id] = {
        isPiecesLike: product.isPiecesLike,
        increment: product.increment,
        minQuantity: product.minQuantity,
        maxQuantity: product.maxQuantity
      };

      for (const size of product.sizes ?? []) {
        rules[size.id] = {
          isPiecesLike: size.isPiecesLike,
          increment: size.increment,
          minQuantity: size.minQuantity,
          maxQuantity: size.maxQuantity
        };
      }

      return rules;
    }, {});
  }

  private buildCartItemNameLookup(products: IProduct[]): Record<number, string> {
    return products.reduce<Record<number, string>>((lookup, product) => {
      lookup[product.id] = product.name;

      const multipleSizes = (product.sizes?.length ?? 0) > 1;
      for (const size of product.sizes ?? []) {
        const label = multipleSizes ? `${product.name} (${size.label})` : product.name;
        lookup[size.id] = label;
      }

      return lookup;
    }, {});
  }

  private mergeCatalogs<T>(primary: Record<number, T>, secondary: Record<number, T>): Record<number, T> {
    return {
      ...primary,
      ...secondary
    };
  }

  private getStep(pieceRule: IPieceCounterRule): number {
    return pieceRule.increment > 0 ? pieceRule.increment : 1;
  }

  private getInitialQuantity(pieceRule: IPieceCounterRule): number {
    if (pieceRule.minQuantity !== null && pieceRule.minQuantity > 0) {
      return pieceRule.minQuantity;
    }

    return this.getStep(pieceRule);
  }
}
