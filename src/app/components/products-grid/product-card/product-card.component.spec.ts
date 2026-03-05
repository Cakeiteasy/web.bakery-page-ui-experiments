import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IProduct } from '../../../models/product.model';
import { ChooseCakeUIConfig, RatioMode } from '../../../models/ui-config.model';
import { ProductCardComponent } from './product-card.component';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;

  const createCardsConfig = (ratioMode: RatioMode): ChooseCakeUIConfig['chooseCake']['cards'] => ({
    preset: 'masonry_classic',
    grid: {
      desktopColumns: 3,
      tabletColumns: 2,
      mobileColumns: 1,
      mode: 'uniform',
      gapPx: 18
    },
    image: {
      fit: 'cover',
      ratioMode,
      uniformRatio: '3:4',
      cornerRadiusPx: 8
    },
    frame: {
      bgColor: 'transparent',
      borderColor: '#dddddd',
      borderWidthPx: 1,
      shadowStyle: 'soft',
      paddingPx: 0
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
  });

  const createProduct = (overrides: Partial<IProduct> = {}): IProduct => ({
    id: 101,
    name: 'Test Cake',
    descriptionText: 'A test cake description',
    containsAllergenNames: ['Gluten'],
    imageUrl: 'https://example.com/cake.jpg',
    image: { original: 'https://example.com/cake.jpg', is_vertical: true },
    imageOrientation: 'portrait',
    minPrice: 100,
    maxPrice: 120,
    structureType: 'COMPLEX',
    showQuantityPicker: false,
    increment: 1,
    minQuantity: null,
    maxQuantity: null,
    isPiecesLike: false,
    canHasMotive: false,
    canHasText: false,
    mailDeliveryAvailable: false,
    pickupAvailable: false,
    discountValue: null,
    bakeryName: 'Rosenborg',
    currencySymbol: 'kr',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.cardsConfig = createCardsConfig('uniform');
    component.product = createProduct();
  });

  it('uses uniform ratio when ratio mode is uniform', () => {
    component.product = createProduct({ imageOrientation: 'auto' });
    fixture.detectChanges();
    const imageShell = fixture.nativeElement.querySelector('.image-shell') as HTMLElement;
    const image = fixture.nativeElement.querySelector('.product-image') as HTMLImageElement;

    expect(imageShell.style.aspectRatio).toBe('3 / 4');
    expect(image.style.objectFit).toBe('cover');
  });

  it('uses portrait ratio and contain fit in orientation mode', () => {
    component.cardsConfig = createCardsConfig('orientation');
    component.cardsConfig.grid.mode = 'masonry';
    component.product = createProduct({ imageOrientation: 'portrait' });
    fixture.detectChanges();
    const imageShell = fixture.nativeElement.querySelector('.image-shell') as HTMLElement;
    const image = fixture.nativeElement.querySelector('.product-image') as HTMLImageElement;

    expect(imageShell.style.aspectRatio).toContain('0.678');
    expect(image.style.objectFit).toBe('contain');
  });

  it('uses global portrait ratio for non-rosenborg orientation presets', () => {
    component.cardsConfig = createCardsConfig('orientation');
    component.cardsConfig.grid.mode = 'masonry';
    component.cardsConfig.preset = 'maschmanns_market';
    component.product = createProduct({ imageOrientation: 'portrait' });
    fixture.detectChanges();
    const imageShell = fixture.nativeElement.querySelector('.image-shell') as HTMLElement;

    expect(imageShell.style.aspectRatio).toBe('3 / 4');
  });

  it('uses landscape ratio and cover fit in orientation mode', () => {
    component.cardsConfig = createCardsConfig('orientation');
    component.cardsConfig.grid.mode = 'masonry';
    component.product = createProduct({ imageOrientation: 'landscape' });
    fixture.detectChanges();
    const imageShell = fixture.nativeElement.querySelector('.image-shell') as HTMLElement;
    const image = fixture.nativeElement.querySelector('.product-image') as HTMLImageElement;

    expect(imageShell.style.aspectRatio).toBe('4 / 3');
    expect(image.style.objectFit).toBe('cover');
  });

  it('falls back to uniform ratio in orientation mode when orientation is auto', () => {
    component.cardsConfig = createCardsConfig('orientation');
    component.cardsConfig.grid.mode = 'masonry';
    component.product = createProduct({ imageOrientation: 'auto' });
    fixture.detectChanges();
    const imageShell = fixture.nativeElement.querySelector('.image-shell') as HTMLElement;

    expect(imageShell.style.aspectRatio).toBe('3 / 4');
  });

  it('keeps uniform ratio in uniform grid mode to avoid layout gaps', () => {
    component.cardsConfig = createCardsConfig('uniform');
    component.product = createProduct({ imageOrientation: 'landscape' });
    fixture.detectChanges();
    const imageShell = fixture.nativeElement.querySelector('.image-shell') as HTMLElement;

    expect(imageShell.style.aspectRatio).toBe('3 / 4');
  });

  it('uses contain fit for portrait images in uniform grid mode', () => {
    component.cardsConfig = createCardsConfig('uniform');
    component.product = createProduct({ imageOrientation: 'portrait' });
    component.viewMode = 'grid';
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.product-image') as HTMLImageElement;

    expect(image.style.objectFit).toBe('contain');
  });

  it('uses orientation ratio in list mode even when preset is uniform', () => {
    component.cardsConfig = createCardsConfig('uniform');
    component.product = createProduct({ imageOrientation: 'landscape' });
    component.viewMode = 'list';
    fixture.detectChanges();
    const imageShell = fixture.nativeElement.querySelector('.image-shell') as HTMLElement;

    expect(imageShell.style.aspectRatio).toBe('4 / 3');
  });

  it('renders piece counter only for pieces-like products', () => {
    component.product = createProduct({ isPiecesLike: false, structureType: 'COMPLEX' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.piece-counter')).toBeNull();

    component.product = createProduct({ isPiecesLike: true, structureType: 'PIECES' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.piece-counter')).not.toBeNull();
  });

  it('applies clamped title class in both grid and list mode', () => {
    component.viewMode = 'grid';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.product-title')).not.toBeNull();

    component.viewMode = 'list';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.product-title')).not.toBeNull();
  });

  it('renders compact badges with priority and max of 3', () => {
    component.product = createProduct({
      pickupAvailable: true,
      mailDeliveryAvailable: true,
      canHasMotive: true,
      canHasText: true
    });

    fixture.detectChanges();
    const badges = Array.from(
      fixture.nativeElement.querySelectorAll('.top-badge') as NodeListOf<HTMLElement>
    ).map((badge) => badge.textContent?.trim());

    expect(badges).toEqual(['Hentes', 'Post', 'Motiv']);
  });

  it('renders de-emphasized prefix and emphasized price amount', () => {
    fixture.detectChanges();

    const prefix = fixture.nativeElement.querySelector('.price-prefix') as HTMLElement;
    const value = fixture.nativeElement.querySelector('.price-value') as HTMLElement;

    expect(prefix.textContent?.trim()).toBe('Fra');
    expect(value.textContent?.trim()).toBe('100 - 120 kr');
  });

  it('emits viewProduct when CTA button is clicked', () => {
    fixture.detectChanges();
    spyOn(component.viewProduct, 'emit');

    const ctaButton = fixture.nativeElement.querySelector('.cta-button') as HTMLButtonElement;
    ctaButton.click();

    expect(component.viewProduct.emit).toHaveBeenCalledWith(101);
  });

  it('uses faster animation duration for fly_in and fade_up entries', () => {
    component.cardsConfig = createCardsConfig('uniform');
    component.cardsConfig.motion.entry = 'fly_in';
    expect(component.animationDurationMs).toBe(220);

    component.cardsConfig.motion.entry = 'fade_up';
    expect(component.animationDurationMs).toBe(220);
  });

  it('returns zero animation duration and delay when entry is none', () => {
    component.cardsConfig = createCardsConfig('uniform');
    component.cardsConfig.motion.entry = 'none';
    component.cardsConfig.motion.stagger = true;
    component.index = 5;

    expect(component.animationDurationMs).toBe(0);
    expect(component.animationDelayMs).toBe(0);
  });

  it('uses 20ms stagger with cap at 160ms', () => {
    component.cardsConfig = createCardsConfig('uniform');
    component.cardsConfig.motion.entry = 'fly_in';
    component.cardsConfig.motion.stagger = true;

    component.index = 3;
    expect(component.animationDelayMs).toBe(60);

    component.index = 8;
    expect(component.animationDelayMs).toBe(160);

    component.index = 20;
    expect(component.animationDelayMs).toBe(160);
  });

  it('updates image transform on pointer move and resets on leave', () => {
    if (!component.hasHoverMotion) {
      expect(component.imageTransform).toBe('translate3d(0px, 0px, 0px) scale(1)');
      return;
    }

    const host = document.createElement('article');
    spyOn(host, 'getBoundingClientRect').and.returnValue({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      top: 0,
      right: 200,
      bottom: 100,
      left: 0,
      toJSON: () => ({})
    } as DOMRect);

    component.onPointerMove({
      pointerType: 'mouse',
      clientX: 160,
      clientY: 65,
      currentTarget: host
    } as unknown as PointerEvent);

    expect(component.imageTransform).toContain('scale(1.08)');
    expect(component.imageTransform).not.toBe('translate3d(0px, 0px, 0px) scale(1)');

    component.onPointerLeave();
    expect(component.imageTransform).toBe('translate3d(0px, 0px, 0px) scale(1)');
  });
});
