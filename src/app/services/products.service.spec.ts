import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ACTIVE_BAKERY_STORAGE_KEY } from '../config/bakeries.config';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let categoryRequestUrl: string | undefined;
  let categoryRequestParams: HttpParams | undefined;
  let categoryRequestHeaders: HttpHeaders | undefined;
  let lastProductParams: HttpParams | undefined;
  let lastProductHeaders: HttpHeaders | undefined;
  let lastFilterParams: HttpParams | undefined;

  beforeEach(() => {
    localStorage.removeItem(ACTIVE_BAKERY_STORAGE_KEY);
    httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);

    const detailsResponse = {
      id: 28207,
      name: 'Bakevarer møtemat',
      description: '<p>Velg mellom din favorittbakst.</p><p>(Maksimum 10 stykker)</p>',
      category: { id: 5132, name: 'Møtemat og Frokostpakke' },
      bakery: {
        id: 531,
        name: 'Maschmanns',
        country: { currency_symbol: 'kr' }
      },
      image: { original: '//example.com/details-main.jpg', small: '//example.com/details-main-small.jpg' },
      images: [
        { original: '//example.com/details-main.jpg', small: '//example.com/details-main-small.jpg' },
        { original: '//example.com/details-2.jpg', small: '//example.com/details-2-small.jpg' }
      ],
      gallery: [230175, 230178],
      structure_type: 'PIECES_GROUP',
      increment: 1,
      min_quantity: 4,
      max_quantity: 10,
      min_quantity_per_product: null,
      pickup_available: true,
      delivery_available: true,
      mail_delivery_available: false,
      ingredients: 'Hvetemel, smør',
      allergens: [{ id: 1, name: 'Gluten', state: 'CONTAINS' }],
      greeting_card: {
        available: false,
        max_length: 200,
        price: 40,
        vat_rate: 15
      },
      sizes: [
        {
          details: {
            id: 24376,
            pieces: true,
            minimum_quantity: 1,
            increment: 1
          },
          products: [
            {
              id: 232458,
              name: '',
              product_number: '41041130',
              price: 59,
              variant: { id: 23263, name: 'Pain au chocolat', priority: 1 }
            },
            {
              id: 232457,
              name: '',
              product_number: '41041121',
              price: 55,
              variant: { id: 23262, name: 'Croissant', priority: 0 }
            }
          ]
        }
      ]
    };
    const complexDetailsResponse = {
      id: 925,
      name: 'Konfirmasjonskake',
      description: '<p>Nydelig pyntet kake til konfirmanten.</p>',
      category: { id: 5132, name: 'Cakes' },
      bakery: {
        id: 113,
        name: 'Rosenborg bakeri',
        country: { currency_symbol: 'kr' }
      },
      image: { original: '//example.com/complex-main.jpg', small: '//example.com/complex-main-small.jpg' },
      images: [{ original: '//example.com/complex-main.jpg', small: '//example.com/complex-main-small.jpg' }],
      gallery: [320001],
      structure_type: 'COMPLEX',
      increment: null,
      min_quantity: null,
      max_quantity: null,
      min_quantity_per_product: null,
      pickup_available: true,
      delivery_available: true,
      mail_delivery_available: false,
      ingredients: '',
      allergens: [],
      greeting_card: {
        available: false,
        max_length: 200,
        price: 40,
        vat_rate: 15
      },
      sizes: [
        {
          details: {
            id: 2001,
            pieces: false,
            minimum_quantity: null,
            increment: null
          },
          price: 1150,
          products: [
            {
              id: 91400,
              name: '',
              product_number: null,
              price: null,
              variant: { id: 3001, name: '12 biter', priority: 1 }
            }
          ]
        },
        {
          details: {
            id: 2002,
            pieces: false,
            minimum_quantity: null,
            increment: null
          },
          price: 1600,
          products: [
            {
              id: 11748,
              name: '',
              product_number: null,
              price: null,
              variant: { id: 3002, name: '20 biter', priority: 2 }
            }
          ]
        }
      ]
    };

    (httpClientSpy.get as any).and.callFake((url: string, options?: any) => {
      if (url.endsWith('/bakeries/113/categories/')) {
        categoryRequestUrl = url;
        categoryRequestParams = options?.params;
        categoryRequestHeaders = options?.headers;
        return of([{ id: 1, name: 'Cakes', groups: [], show_product_images: true }] as never);
      }

      if (url.includes('/product-types/filters/allergens/')) {
        return of([
          {
            id: 1,
            name: 'Gluten',
            is_show_in_filters: true,
            parent_allergen: null,
            show_as_child: false,
          },
        ] as never);
      }

      if (url.includes('/product-types/filters/')) {
        lastFilterParams = options?.params;
        return of({
          tags: [],
          product_groups: [{ id: 10, name: 'Birthday' }],
          can_has_motive: true,
        } as never);
      }

      if (/\/product-types\/\d+\/$/.test(url)) {
        lastProductHeaders = options?.headers;
        const requestedId = Number(url.match(/\/product-types\/(\d+)\/$/)?.[1]);
        if (requestedId === 925) {
          return of(complexDetailsResponse as never);
        }

        return of(detailsResponse as never);
      }

      if (url.endsWith('/product-types/')) {
        lastProductParams = options?.params;
        lastProductHeaders = options?.headers;
        return of([
          {
            id: 1,
            name: 'Piece Product',
            description: '<p>Fresh <strong>piece</strong> product.</p>',
            sizes: [
              {
                details: {
                  id: 7001,
                  pieces: true,
                  minimum_quantity: 2,
                  increment: 2
                },
                price: 100,
                products: [{ id: 9001, variant: { id: 1, name: 'Small' } }]
              },
              {
                details: {
                  id: 7002,
                  pieces: true,
                  minimum_quantity: 1,
                  increment: 1
                },
                price: 160,
                products: [{ id: 9002, variant: { id: 2, name: 'Large' } }]
              }
            ],
            allergens: [
              { id: 1, name: 'Gluten', state: 'CONTAINS' },
              { id: 2, name: 'Milk', state: 'CONTAINS' },
              { id: 3, name: 'Eggs', state: 'MIGHT_FREE' }
            ],
            structure_type: 'PIECES',
            can_has_motive: true,
            can_has_text: true,
            pickup_available: true,
            mail_delivery_available: true,
            min_price: 100,
            max_price: 100,
            increment: 2,
            min_quantity: 4,
            max_quantity: 8,
            image: { original: '//example.com/a.jpg', is_vertical: true },
            bakery: { name: 'Bakery', country: { currencySymbol: 'kr' } }
          },
          {
            id: 2,
            name: 'Complex Product',
            description: 'Complex item',
            allergens: [],
            structure_type: 'COMPLEX',
            can_has_motive: false,
            can_has_text: false,
            pickup_available: false,
            mail_delivery_available: false,
            min_price: 200,
            max_price: 200,
            increment: null,
            min_quantity: null,
            max_quantity: null,
            image: { original: '//example.com/b.jpg', isVertical: false },
            bakery: { name: 'Bakery', country: { currencySymbol: 'kr' } }
          }
        ] as never);
      }

      return of([] as never);
    });

    TestBed.configureTestingModule({
      providers: [ProductsService, { provide: HttpClient, useValue: httpClientSpy }],
    });

    service = TestBed.inject(ProductsService);
  });

  it('uses categoryId on filters and snake_case params for products', async () => {
    await service.loadInitialData();

    expect(categoryRequestUrl).toContain('/rosenborg-api/store/bakeries/113/categories/');
    expect(categoryRequestParams?.has('t')).toBeTrue();
    expect(lastFilterParams?.get('categoryId')).toBe('1');
    expect(lastFilterParams?.get('category_id')).toBeNull();
    expect(lastFilterParams?.has('t')).toBeTrue();

    expect(lastProductParams?.get('category_id')).toBe('1');
    expect(lastProductParams?.get('bakery_id')).toBe('113');
    expect(lastProductParams?.get('categoryId')).toBeNull();
    expect(lastProductParams?.has('t')).toBeTrue();
    expect(categoryRequestHeaders?.get('x-cart-key-header')).toBe('Bakery:113');
    expect(lastProductHeaders?.get('x-cart-source-type')).toBe('STANDARD');
    expect(lastProductHeaders?.get('x-source-header')).toBe('WEB_SHOP');
  });

  it('sends repeated group and allergen params to product query', async () => {
    await service.loadInitialData();
    await service.toggleAllergen(1);
    await service.toggleProductGroup(10);

    expect(lastProductParams?.getAll('allergen')).toEqual(['1']);
    expect(lastProductParams?.getAll('group')).toEqual(['10']);
  });

  it('sends has_motive only for explicit motive mode', async () => {
    await service.loadInitialData();
    await service.setMotive('with');

    expect(lastProductParams?.get('has_motive')).toBe('true');

    await service.setMotive('with');
    expect(lastProductParams?.has('has_motive')).toBeFalse();
  });

  it('applies piece counter min/increment/max rules for pieces products', async () => {
    await service.loadInitialData();

    expect(service.getPieceQty(1)).toBe(0);

    service.increasePieceQty(1);
    expect(service.getPieceQty(1)).toBe(4);

    service.increasePieceQty(1);
    expect(service.getPieceQty(1)).toBe(6);

    service.increasePieceQty(1);
    service.increasePieceQty(1);
    expect(service.getPieceQty(1)).toBe(8);

    service.decreasePieceQty(1);
    expect(service.getPieceQty(1)).toBe(6);

    service.decreasePieceQty(1);
    expect(service.getPieceQty(1)).toBe(4);

    service.decreasePieceQty(1);
    expect(service.getPieceQty(1)).toBe(0);

    service.increasePieceQty(2);
    expect(service.getPieceQty(2)).toBe(0);
  });

  it('maps product sizes and resolves product price range from size prices', async () => {
    await service.loadInitialData();

    const pieceProduct = service.products()[0];
    expect(pieceProduct.sizes?.length).toBe(2);
    expect(pieceProduct.minPrice).toBe(100);
    expect(pieceProduct.maxPrice).toBe(160);
    expect(pieceProduct.sizes?.[0].label).toBe('Small');
    expect(pieceProduct.sizes?.[1].label).toBe('Large');
  });

  it('tracks quantities per size id for multi-size menu products', async () => {
    await service.loadInitialData();

    service.increasePieceQty(9001);
    expect(service.getPieceQty(9001)).toBe(2);
    expect(service.cartItems()).toEqual([
      { productId: 9001, name: 'Piece Product (Small)', quantity: 2 }
    ]);

    service.increasePieceQty(9002);
    expect(service.getPieceQty(9002)).toBe(1);
    expect(service.cartQuantity()).toBe(3);
  });

  it('exposes cart quantity and hasCartItems from piece quantities', async () => {
    await service.loadInitialData();

    expect(service.cartQuantity()).toBe(0);
    expect(service.hasCartItems()).toBeFalse();
    expect(service.cartItems().length).toBe(0);

    service.increasePieceQty(1);
    expect(service.cartQuantity()).toBe(4);
    expect(service.hasCartItems()).toBeTrue();
    expect(service.cartItems()).toEqual([
      { productId: 1, name: 'Piece Product', quantity: 4 }
    ]);

    service.increasePieceQty(1);
    expect(service.cartQuantity()).toBe(6);

    service.decreasePieceQty(1);
    service.decreasePieceQty(1);
    expect(service.cartQuantity()).toBe(0);
    expect(service.hasCartItems()).toBeFalse();
    expect(service.cartItems()).toEqual([]);
  });

  it('filters visible products with case-insensitive local search query', async () => {
    await service.loadInitialData();

    expect(service.visibleProducts().length).toBe(2);

    service.setSearchQuery('piece');
    expect(service.visibleProducts().length).toBe(1);
    expect(service.visibleProducts()[0].name).toBe('Piece Product');

    service.setSearchQuery('COMPLEX');
    expect(service.visibleProducts().length).toBe(1);
    expect(service.visibleProducts()[0].name).toBe('Complex Product');

    service.setSearchQuery('');
    expect(service.visibleProducts().length).toBe(2);
  });

  it('maps image orientation from both snake_case and camelCase image flags', async () => {
    await service.loadInitialData();

    const products = service.products();
    expect(products[0].imageOrientation).toBe('portrait');
    expect(products[1].imageOrientation).toBe('landscape');
  });

  it('maps delivery/pickup/text capability flags for product badges', async () => {
    await service.loadInitialData();

    const [pieceProduct, complexProduct] = service.products();
    expect(pieceProduct.pickupAvailable).toBeTrue();
    expect(pieceProduct.mailDeliveryAvailable).toBeTrue();
    expect(pieceProduct.canHasMotive).toBeTrue();
    expect(pieceProduct.canHasText).toBeTrue();

    expect(complexProduct.pickupAvailable).toBeFalse();
    expect(complexProduct.mailDeliveryAvailable).toBeFalse();
    expect(complexProduct.canHasMotive).toBeFalse();
    expect(complexProduct.canHasText).toBeFalse();
  });

  it('maps plain-text description and contains-allergens for menu rows', async () => {
    await service.loadInitialData();

    const [pieceProduct, complexProduct] = service.products();
    expect(pieceProduct.descriptionText).toBe('Fresh piece product.');
    expect(pieceProduct.containsAllergenNames).toEqual(['Gluten', 'Milk']);
    expect(complexProduct.descriptionText).toBe('Complex item');
    expect(complexProduct.containsAllergenNames).toEqual([]);
  });

  it('maps product details payload with rich description, gallery, and sorted variants', async () => {
    const details = await service.fetchProductDetailsById(28207);

    expect(details).not.toBeNull();
    expect(details?.id).toBe(28207);
    expect(details?.name).toBe('Bakevarer møtemat');
    expect(details?.descriptionHtml).toContain('<p>Velg mellom din favorittbakst.</p>');
    expect(details?.descriptionText).toContain('Maksimum 10 stykker');
    expect(details?.images.length).toBe(2);
    expect(details?.gallery).toEqual([230175, 230178]);
    expect(details?.containsAllergenNames).toEqual(['Gluten']);
    expect(details?.variants.map((variant) => variant.label)).toEqual(['Croissant', 'Pain au chocolat']);
    expect(details?.variants.map((variant) => variant.price)).toEqual([55, 59]);
  });

  it('applies details-derived piece rules and names without overview data load', async () => {
    await service.fetchProductDetailsById(28207);

    service.increasePieceQty(232457);
    expect(service.getPieceQty(232457)).toBe(1);
    expect(service.cartItems()).toEqual([
      { productId: 232457, name: 'Bakevarer møtemat (Croissant)', quantity: 1 }
    ]);

    service.increasePieceQty(232458);
    expect(service.getPieceQty(232458)).toBe(1);
    expect(service.cartQuantity()).toBe(2);
    expect(service.cartItems()).toContain({
      productId: 232458,
      name: 'Bakevarer møtemat (Pain au chocolat)',
      quantity: 1
    });
  });

  it('allows variant quantity updates for complex details products', async () => {
    await service.fetchProductDetailsById(925);

    service.increasePieceQty(91400);
    expect(service.getPieceQty(91400)).toBe(1);
    expect(service.cartItems()).toContain({
      productId: 91400,
      name: 'Konfirmasjonskake (12 biter)',
      quantity: 1
    });

    service.increasePieceQty(11748);
    expect(service.getPieceQty(11748)).toBe(1);
    expect(service.cartItems()).toContain({
      productId: 11748,
      name: 'Konfirmasjonskake (20 biter)',
      quantity: 1
    });
  });

  it('keeps view mode user-controlled regardless of category image flags', () => {
    service.categories.set([
      { id: 11, name: 'No Image Category', groups: [], showProductImages: false },
      { id: 12, name: 'Image Category', groups: [], showProductImages: true }
    ]);
    service.selectedCategoryId.set(11);
    service.setViewMode('grid');

    expect(service.isMenuForcedForCategory()).toBeFalse();
    expect(service.effectiveViewMode()).toBe('grid');

    service.selectedCategoryId.set(12);
    service.setViewMode('list');

    expect(service.isMenuForcedForCategory()).toBeFalse();
    expect(service.effectiveViewMode()).toBe('list');

    service.setViewMode('menu');
    expect(service.effectiveViewMode()).toBe('menu');
  });

  it('resets piece quantities after successful product reload', async () => {
    await service.loadInitialData();

    service.increasePieceQty(1);
    expect(service.getPieceQty(1)).toBe(4);
    expect(service.cartQuantity()).toBe(4);

    await service.toggleAllergen(1);

    expect(service.getPieceQty(1)).toBe(0);
    expect(service.cartQuantity()).toBe(0);
    expect(service.hasCartItems()).toBeFalse();
  });
});

describe('ProductsService with maschmanns bakery profile', () => {
  let service: ProductsService;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let categoryRequestUrl: string | undefined;
  let categoryRequestParams: HttpParams | undefined;
  let lastProductHeaders: HttpHeaders | undefined;

  beforeEach(() => {
    localStorage.setItem(ACTIVE_BAKERY_STORAGE_KEY, 'maschmanns');
    httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);

    (httpClientSpy.get as any).and.callFake((url: string, options?: any) => {
      if (url.endsWith('/bakeries/531/categories/')) {
        categoryRequestUrl = url;
        categoryRequestParams = options?.params;
        return of([{ id: 11, name: 'Kaker', groups: [] }] as never);
      }

      if (url.includes('/product-types/filters/allergens/')) {
        return of([] as never);
      }

      if (url.includes('/product-types/filters/')) {
        return of({
          tags: [],
          product_groups: [],
          can_has_motive: false
        } as never);
      }

      if (url.includes('/product-types/')) {
        lastProductHeaders = options?.headers;
        return of([] as never);
      }

      return of([] as never);
    });

    TestBed.configureTestingModule({
      providers: [ProductsService, { provide: HttpClient, useValue: httpClientSpy }],
    });

    service = TestBed.inject(ProductsService);
  });

  afterEach(() => {
    localStorage.removeItem(ACTIVE_BAKERY_STORAGE_KEY);
  });

  it('uses maschmanns proxy/id and locale for categories', async () => {
    await service.loadInitialData();

    expect(categoryRequestUrl).toContain('/maschmanns-api/store/bakeries/531/categories/');
    expect(categoryRequestParams?.get('locale')).toBe('no');
    expect(categoryRequestParams?.has('t')).toBeTrue();
  });

  it('sends bakery cart/source headers for maschmanns API calls', async () => {
    await service.loadInitialData();

    expect(lastProductHeaders?.get('x-cart-key-header')).toBe('Bakery:531');
    expect(lastProductHeaders?.get('x-cart-source-type')).toBe('STANDARD');
    expect(lastProductHeaders?.get('x-source-header')).toBe('WEB_SHOP');
  });

  it('uses fallback category when maschmanns categories API is empty', async () => {
    (httpClientSpy.get as any).and.callFake((url: string, options?: any) => {
      if (url.endsWith('/bakeries/531/categories/')) {
        categoryRequestUrl = url;
        categoryRequestParams = options?.params;
        return of([] as never);
      }

      if (url.includes('/product-types/filters/allergens/')) {
        return of([] as never);
      }

      if (url.includes('/product-types/filters/')) {
        return of({
          tags: [],
          product_groups: [],
          can_has_motive: false
        } as never);
      }

      if (url.includes('/product-types/')) {
        return of([] as never);
      }

      return of([] as never);
    });

    await service.loadInitialData();

    expect(service.categories().length).toBeGreaterThan(0);
    expect(service.categories()[0].id).toBe(5517);
    expect(service.selectedCategoryId()).toBe(5517);
  });
});
