import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IProduct } from '../../models/product.model';
import { ChooseCakeUIConfig } from '../../models/ui-config.model';
import { ProductsGridComponent } from './products-grid.component';

describe('ProductsGridComponent', () => {
  let component: ProductsGridComponent;
  let fixture: ComponentFixture<ProductsGridComponent>;

  const cardsConfig: ChooseCakeUIConfig['chooseCake']['cards'] = {
    preset: 'masonry_classic',
    grid: {
      desktopColumns: 3,
      tabletColumns: 2,
      mobileColumns: 1,
      mode: 'masonry',
      gapPx: 18
    },
    image: {
      fit: 'cover',
      ratioMode: 'uniform',
      uniformRatio: '4:5',
      cornerRadiusPx: 8
    },
    price: {
      position: 'footer_right',
      showFromLabel: true,
      discountStyle: 'strike_plus_new'
    },
    overlay: {
      desktop: 'full_overlay',
      mobile: 'buy_button',
      blurOnHover: true
    },
    cta: {
      primaryStyle: 'primary',
      labelMode: 'buy'
    },
    motion: {
      entry: 'fly_in',
      hoverMs: 220
    }
  };

  const products: IProduct[] = [
    {
      id: 1,
      name: 'Cake',
      descriptionText: 'A tasty product',
      containsAllergenNames: ['Gluten', 'Milk'],
      imageUrl: 'https://example.com/cake.jpg',
      image: { original: 'https://example.com/cake.jpg', is_vertical: false },
      imageOrientation: 'landscape',
      minPrice: 400,
      maxPrice: 500,
      structureType: 'COMPLEX',
      showQuantityPicker: false,
      increment: 1,
      minQuantity: null,
      maxQuantity: null,
      isPiecesLike: false,
      canHasMotive: false,
      canHasText: false,
      mailDeliveryAvailable: false,
      pickupAvailable: true,
      discountValue: null,
      bakeryName: 'Rosenborg',
      currencySymbol: 'kr'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsGridComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsGridComponent);
    component = fixture.componentInstance;
    component.cardsConfig = cardsConfig;
  });

  it('uses masonry mode when cards config mode is masonry', () => {
    fixture.detectChanges();

    expect(component.isMasonry).toBeTrue();
  });

  it('switches to list mode when viewMode is list', () => {
    component.cardsConfig = {
      ...cardsConfig,
      grid: {
        ...cardsConfig.grid,
        mode: 'uniform'
      }
    };
    component.viewMode = 'list';

    fixture.detectChanges();

    expect(component.isListMode).toBeTrue();
  });

  it('switches to menu mode when viewMode is menu', () => {
    component.viewMode = 'menu';

    fixture.detectChanges();

    expect(component.isMenuMode).toBeTrue();
  });

  it('renders skeleton cards while loading and hides empty state', () => {
    component.loading = true;
    component.products = [];

    fixture.detectChanges();

    const skeletonCards = fixture.nativeElement.querySelectorAll('.skeleton-card');
    const emptyState = fixture.nativeElement.querySelector('.empty-state');

    expect(skeletonCards.length).toBe(6);
    expect(emptyState).toBeNull();
  });

  it('renders list skeletons in list mode while loading', () => {
    component.loading = true;
    component.viewMode = 'list';

    fixture.detectChanges();

    const listSkeletonCards = fixture.nativeElement.querySelectorAll('.skeleton-card-list');
    expect(listSkeletonCards.length).toBe(6);
  });

  it('renders menu skeletons in menu mode while loading', () => {
    component.loading = true;
    component.viewMode = 'menu';

    fixture.detectChanges();

    const menuSkeletonCards = fixture.nativeElement.querySelectorAll('.skeleton-card-menu');
    expect(menuSkeletonCards.length).toBe(8);
  });

  it('renders products and no skeletons after loading', () => {
    component.loading = false;
    component.products = products;

    fixture.detectChanges();

    const productCards = fixture.nativeElement.querySelectorAll('app-product-card');
    const skeletonCards = fixture.nativeElement.querySelectorAll('.skeleton-card');
    expect(productCards.length).toBe(1);
    expect(skeletonCards.length).toBe(0);
  });

  it('renders menu rows in menu mode after loading', () => {
    component.loading = false;
    component.viewMode = 'menu';
    component.products = products;

    fixture.detectChanges();

    const menuRows = fixture.nativeElement.querySelectorAll('app-product-menu-row');
    expect(menuRows.length).toBe(1);
  });

  it('re-emits viewProduct when child event handler is called', () => {
    spyOn(component.viewProduct, 'emit');

    component.onViewProduct(77);

    expect(component.viewProduct.emit).toHaveBeenCalledWith(77);
  });
});
