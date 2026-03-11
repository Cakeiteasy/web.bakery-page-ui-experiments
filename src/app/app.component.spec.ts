import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { ACTIVE_BAKERY_STORAGE_KEY } from './config/bakeries.config';
import { ActiveFilters, ProductsViewMode } from './models/filter.model';
import { ICartItem } from './models/product.model';
import { DEFAULT_UI_CONFIG, PresetKey } from './models/ui-config.model';
import { IBakeryBranding } from './models/web-shop.model';
import { BakeryBrandingService } from './services/bakery-branding.service';
import { ProductsService } from './services/products.service';
import { UiConfigService } from './services/ui-config.service';

function createBranding(overrides: Partial<IBakeryBranding> = {}): IBakeryBranding {
  return {
    bakeryName: 'Rosenborg bakeri',
    bakeryWebsite: 'https://www.rosenborgbakeri.no',
    bakeryEmail: 'post@rosenborgbakeri.no',
    bakeryPhone: '+47 12 34 56 78',
    logoUrl: 'https://example.com/logo.png',
    faviconUrl: '',
    heroTitle: 'Bakery Shop',
    heroSubtitle: 'Fresh cakes daily',
    notificationText: '',
    notificationColor: '',
    notificationButtonColor: '',
    headerLinks: [],
    theme: {},
    ...overrides
  };
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  let bakeryBrandingServiceStub: {
    branding: ReturnType<typeof signal<IBakeryBranding | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    loadBranding: jasmine.Spy<() => Promise<void>>;
  };

  let productsServiceStub: {
    loadInitialData: jasmine.Spy<() => Promise<void>>;
    selectCategory: jasmine.Spy<(categoryId: number) => Promise<void>>;
    toggleAllergen: jasmine.Spy<(allergenId: number) => Promise<void>>;
    toggleProductGroup: jasmine.Spy<(groupId: number) => Promise<void>>;
    setMotive: jasmine.Spy<(mode: ActiveFilters['motive']) => Promise<void>>;
    setViewMode: jasmine.Spy<(mode: ProductsViewMode) => void>;
    setSearchQuery: jasmine.Spy<(query: string) => void>;
    increasePieceQty: jasmine.Spy<(productId: number) => void>;
    decreasePieceQty: jasmine.Spy<(productId: number) => void>;
    categories: ReturnType<typeof signal<any[]>>;
    selectedCategoryId: ReturnType<typeof signal<number | null>>;
    filtersResponse: ReturnType<typeof signal<any>>;
    allergens: ReturnType<typeof signal<any[]>>;
    activeFilters: ReturnType<typeof signal<ActiveFilters>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    products: ReturnType<typeof signal<any[]>>;
    searchQuery: ReturnType<typeof signal<string>>;
    visibleProducts: ReturnType<typeof signal<any[]>>;
    viewMode: ReturnType<typeof signal<ProductsViewMode>>;
    effectiveViewMode: ReturnType<typeof signal<ProductsViewMode>>;
    isMenuForcedForCategory: ReturnType<typeof signal<boolean>>;
    pieceQuantities: ReturnType<typeof signal<Record<number, number>>>;
    cartItems: ReturnType<typeof signal<ICartItem[]>>;
    cartQuantity: ReturnType<typeof signal<number>>;
    hasCartItems: ReturnType<typeof signal<boolean>>;
  };

  let uiConfigServiceStub: {
    presetOptions: Array<{ key: PresetKey; label: string }>;
    activePresetKey: ReturnType<typeof signal<PresetKey>>;
    activeConfig: ReturnType<typeof signal<typeof DEFAULT_UI_CONFIG>>;
    setPreset: jasmine.Spy<(key: PresetKey) => void>;
    setBakeryBranding: jasmine.Spy<(branding: IBakeryBranding | null) => void>;
  };

  beforeEach(async () => {
    localStorage.removeItem(ACTIVE_BAKERY_STORAGE_KEY);
    bakeryBrandingServiceStub = {
      branding: signal<IBakeryBranding | null>(null),
      loading: signal(false),
      error: signal<string | null>(null),
      loadBranding: jasmine.createSpy('loadBranding').and.resolveTo()
    };

    productsServiceStub = {
      loadInitialData: jasmine.createSpy('loadInitialData').and.resolveTo(),
      selectCategory: jasmine.createSpy('selectCategory').and.resolveTo(),
      toggleAllergen: jasmine.createSpy('toggleAllergen').and.resolveTo(),
      toggleProductGroup: jasmine.createSpy('toggleProductGroup').and.resolveTo(),
      setMotive: jasmine.createSpy('setMotive').and.resolveTo(),
      setViewMode: jasmine.createSpy('setViewMode'),
      setSearchQuery: jasmine.createSpy('setSearchQuery'),
      increasePieceQty: jasmine.createSpy('increasePieceQty'),
      decreasePieceQty: jasmine.createSpy('decreasePieceQty'),
      categories: signal<any[]>([]),
      selectedCategoryId: signal<number | null>(null),
      filtersResponse: signal<any>(null),
      allergens: signal<any[]>([]),
      activeFilters: signal<ActiveFilters>({
        allergenIds: [],
        motive: 'any',
        productGroupIds: []
      }),
      loading: signal(false),
      error: signal<string | null>(null),
      products: signal<any[]>([]),
      searchQuery: signal(''),
      visibleProducts: signal<any[]>([]),
      viewMode: signal<ProductsViewMode>('grid'),
      effectiveViewMode: signal<ProductsViewMode>('grid'),
      isMenuForcedForCategory: signal(false),
      pieceQuantities: signal<Record<number, number>>({}),
      cartItems: signal<ICartItem[]>([]),
      cartQuantity: signal<number>(0),
      hasCartItems: signal<boolean>(false)
    };

    uiConfigServiceStub = {
      presetOptions: [
        { key: 'rosenborgbakeri', label: 'Rosenborg' },
        { key: 'neobrutal', label: 'Neo Brutal' }
      ],
      activePresetKey: signal<PresetKey>('rosenborgbakeri'),
      activeConfig: signal(DEFAULT_UI_CONFIG),
      setPreset: jasmine.createSpy('setPreset').and.callFake((key: PresetKey) => {
        uiConfigServiceStub.activePresetKey.set(key);
      }),
      setBakeryBranding: jasmine.createSpy('setBakeryBranding')
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: BakeryBrandingService, useValue: bakeryBrandingServiceStub },
        { provide: ProductsService, useValue: productsServiceStub },
        { provide: UiConfigService, useValue: uiConfigServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('renders header links as anchors only when URL exists', async () => {
    bakeryBrandingServiceStub.branding.set(
      createBranding({
        headerLinks: [
          { text: 'Delivery', type: 'DELIVERY', url: 'https://example.com/delivery' },
          { text: 'Outlet', type: 'OUTLET', url: null }
        ]
      })
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const linkedChips = fixture.nativeElement.querySelectorAll('.header-links a.header-link');
    const plainChips = fixture.nativeElement.querySelectorAll('.header-links span.header-link');

    expect(linkedChips.length).toBe(1);
    expect(linkedChips[0].getAttribute('href')).toBe('https://example.com/delivery');
    expect(plainChips.length).toBe(1);
    expect(plainChips[0].textContent).toContain('Outlet');
  });

  it('sets preset to active bakery default on init', () => {
    fixture.detectChanges();

    expect(uiConfigServiceStub.setPreset).toHaveBeenCalledWith('rosenborgbakeri');
  });

  it('does not load products at app-shell level', () => {
    fixture.detectChanges();

    expect(productsServiceStub.loadInitialData).not.toHaveBeenCalled();
  });

  it('hides footer while branding request is unresolved', () => {
    bakeryBrandingServiceStub.loadBranding.and.returnValue(new Promise<void>(() => {}));

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-footer')).toBeNull();
  });

  it('shows footer after branding request resolves', async () => {
    bakeryBrandingServiceStub.loadBranding.and.resolveTo();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-footer')).not.toBeNull();
  });

  it('shows footer after branding request fails', async () => {
    spyOn(console, 'error');
    bakeryBrandingServiceStub.loadBranding.and.returnValue(Promise.reject(new Error('branding failed')));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-footer')).not.toBeNull();
  });

  it('renders cart indicator and hides badge when cart is empty', async () => {
    productsServiceStub.cartQuantity.set(0);
    productsServiceStub.cartItems.set([]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cart-button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cart-badge')).toBeNull();
  });

  it('shows cart badge with total quantity when cart has items', async () => {
    productsServiceStub.cartQuantity.set(8);
    productsServiceStub.cartItems.set([
      { productId: 10, name: 'Brownie', quantity: 6 },
      { productId: 11, name: 'Muffin', quantity: 2 }
    ]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.cart-badge') as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent?.trim()).toBe('8');
  });

  it('caps cart badge text at 99+', async () => {
    productsServiceStub.cartQuantity.set(145);
    productsServiceStub.cartItems.set([{ productId: 99, name: 'Bulk', quantity: 145 }]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.cart-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('99+');
  });

  it('renders global shell only without overview controls', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-categories-bar')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-filter-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('.view-toggle')).toBeNull();
  });

  it('hides global shell when build-with-ai route mode is active', async () => {
    (component as any).buildWithAiMode.set(true);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-preset-switcher')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-shop-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('.build-with-ai-route-shell')).not.toBeNull();
  });
});
