import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ActiveFilters, ProductsViewMode } from '../../models/filter.model';
import { DEFAULT_UI_CONFIG } from '../../models/ui-config.model';
import { ProductsService } from '../../services/products.service';
import { UiConfigService } from '../../services/ui-config.service';
import { ProductsOverviewPageComponent } from './products-overview-page.component';

describe('ProductsOverviewPageComponent', () => {
  let component: ProductsOverviewPageComponent;
  let fixture: ComponentFixture<ProductsOverviewPageComponent>;

  let productsServiceStub: {
    loadInitialData: jasmine.Spy<() => Promise<void>>;
    selectCategory: jasmine.Spy<(categoryId: number) => Promise<void>>;
    toggleAllergen: jasmine.Spy<(allergenId: number) => Promise<void>>;
    toggleProductGroup: jasmine.Spy<(groupId: number) => Promise<void>>;
    setMotive: jasmine.Spy<(mode: ActiveFilters['motive']) => Promise<void>>;
    setViewMode: jasmine.Spy<(mode: ProductsViewMode) => void>;
    increasePieceQty: jasmine.Spy<(productId: number) => void>;
    decreasePieceQty: jasmine.Spy<(productId: number) => void>;
    categories: ReturnType<typeof signal<any[]>>;
    selectedCategoryId: ReturnType<typeof signal<number | null>>;
    filtersResponse: ReturnType<typeof signal<any>>;
    allergens: ReturnType<typeof signal<any[]>>;
    activeFilters: ReturnType<typeof signal<ActiveFilters>>;
    error: ReturnType<typeof signal<string | null>>;
    visibleProducts: ReturnType<typeof signal<any[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    pieceQuantities: ReturnType<typeof signal<Record<number, number>>>;
    effectiveViewMode: ReturnType<typeof signal<ProductsViewMode>>;
  };

  let uiConfigServiceStub: {
    activeConfig: ReturnType<typeof signal<typeof DEFAULT_UI_CONFIG>>;
  };

  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.resolveTo(true);

    productsServiceStub = {
      loadInitialData: jasmine.createSpy('loadInitialData').and.resolveTo(),
      selectCategory: jasmine.createSpy('selectCategory').and.resolveTo(),
      toggleAllergen: jasmine.createSpy('toggleAllergen').and.resolveTo(),
      toggleProductGroup: jasmine.createSpy('toggleProductGroup').and.resolveTo(),
      setMotive: jasmine.createSpy('setMotive').and.resolveTo(),
      setViewMode: jasmine.createSpy('setViewMode'),
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
      error: signal<string | null>(null),
      visibleProducts: signal<any[]>([]),
      loading: signal<boolean>(false),
      pieceQuantities: signal<Record<number, number>>({}),
      effectiveViewMode: signal<ProductsViewMode>('grid')
    };

    uiConfigServiceStub = {
      activeConfig: signal(DEFAULT_UI_CONFIG)
    };

    await TestBed.configureTestingModule({
      imports: [ProductsOverviewPageComponent],
      providers: [
        { provide: ProductsService, useValue: productsServiceStub },
        { provide: UiConfigService, useValue: uiConfigServiceStub },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsOverviewPageComponent);
    component = fixture.componentInstance;
  });

  it('loads initial data on init when categories are empty', async () => {
    productsServiceStub.categories.set([]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(productsServiceStub.loadInitialData).toHaveBeenCalled();
  });

  it('does not reload initial data when categories already exist', async () => {
    productsServiceStub.categories.set([{ id: 1, name: 'Cakes', groups: [], showProductImages: true }]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(productsServiceStub.loadInitialData).not.toHaveBeenCalled();
  });

  it('renders categories, filters, and view mode toggle on overview', async () => {
    productsServiceStub.categories.set([{ id: 1, name: 'Cakes', groups: [], showProductImages: true }]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-categories-bar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-filter-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.view-toggle button').length).toBe(3);
  });

  it('navigates to details route when product view action is triggered', async () => {
    component.onViewProduct(28207);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/products', 28207]);
  });
});
