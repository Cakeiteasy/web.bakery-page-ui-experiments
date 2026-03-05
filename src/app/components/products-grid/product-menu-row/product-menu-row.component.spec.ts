import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IProduct } from '../../../models/product.model';
import { ChooseCakeUIConfig } from '../../../models/ui-config.model';
import { ProductMenuRowComponent } from './product-menu-row.component';

describe('ProductMenuRowComponent', () => {
  let component: ProductMenuRowComponent;
  let fixture: ComponentFixture<ProductMenuRowComponent>;

  const cardsConfig: ChooseCakeUIConfig['chooseCake']['cards'] = {
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

  const createProduct = (overrides: Partial<IProduct> = {}): IProduct => ({
    id: 11,
    name: 'Pizza Vinter',
    descriptionText: 'Steinovnsbakt pizza med trøffel og gode råvarer.',
    containsAllergenNames: ['Gluten', 'Milk', 'Lactose', 'Egg'],
    imageUrl: 'https://example.com/pizza.jpg',
    image: { original: 'https://example.com/pizza.jpg', is_vertical: false },
    imageOrientation: 'landscape',
    minPrice: 249,
    maxPrice: 279,
    structureType: 'COMPLEX',
    showQuantityPicker: false,
    increment: 1,
    minQuantity: null,
    maxQuantity: null,
    isPiecesLike: false,
    canHasMotive: true,
    canHasText: false,
    mailDeliveryAvailable: false,
    pickupAvailable: true,
    discountValue: null,
    bakeryName: 'Maschmanns',
    currencySymbol: 'kr',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductMenuRowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductMenuRowComponent);
    component = fixture.componentInstance;
    component.cardsConfig = cardsConfig;
    component.product = createProduct();
    component.pieceQuantities = {};
    fixture.detectChanges();
  });

  it('renders compact allergen chips with overflow', () => {
    const chips = fixture.nativeElement.querySelectorAll('.allergen-chip');

    expect(chips.length).toBe(4);
    expect(chips[0].textContent?.trim()).toBe('Gluten');
    expect(chips[3].textContent?.trim()).toBe('+1');
  });

  it('renders menu image when imageUrl is available', () => {
    const image = fixture.nativeElement.querySelector('.menu-image') as HTMLImageElement;
    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toBe('https://example.com/pizza.jpg');
  });

  it('hides menu image block when imageUrl is empty', () => {
    component.product = createProduct({ imageUrl: '' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.menu-media')).toBeNull();
    expect(fixture.nativeElement.querySelector('.product-menu-row')?.classList.contains('no-image')).toBeTrue();
  });

  it('shows price prefix and emphasized value', () => {
    const prefix = fixture.nativeElement.querySelector('.price-prefix') as HTMLElement;
    const value = fixture.nativeElement.querySelector('.price-value') as HTMLElement;

    expect(prefix.textContent?.trim()).toBe('Fra');
    expect(value.textContent?.trim()).toBe('249 - 279 kr');
  });

  it('shows CTA for non-pieces products', () => {
    expect(fixture.nativeElement.querySelector('.cta-button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.piece-counter')).toBeNull();
  });

  it('emits product id when details link is clicked', () => {
    spyOn(component.viewProduct, 'emit');

    const detailsLink = fixture.nativeElement.querySelector('.details-link') as HTMLButtonElement;
    detailsLink.click();

    expect(component.viewProduct.emit).toHaveBeenCalledWith(11);
  });

  it('shows quantity counter for pieces products', () => {
    component.product = createProduct({ isPiecesLike: true, structureType: 'PIECES' });
    component.pieceQuantities = { 11: 3 };
    fixture.detectChanges();

    const counter = fixture.nativeElement.querySelector('.piece-counter');
    expect(counter).not.toBeNull();
    expect(counter.textContent).toContain('3');
    expect(fixture.nativeElement.querySelector('.cta-button')).toBeNull();
  });

  it('renders size rows with independent counters when product has multiple sizes', () => {
    component.product = createProduct({
      isPiecesLike: true,
      structureType: 'PIECES',
      sizes: [
        {
          id: 101,
          label: 'Liten',
          price: 199,
          increment: 1,
          minQuantity: 1,
          maxQuantity: null,
          isPiecesLike: true
        },
        {
          id: 102,
          label: 'Stor',
          price: 299,
          increment: 1,
          minQuantity: 1,
          maxQuantity: null,
          isPiecesLike: true
        }
      ]
    });
    component.pieceQuantities = { 101: 1, 102: 4 };
    fixture.detectChanges();

    const sizeRows = fixture.nativeElement.querySelectorAll('.menu-size-row');
    expect(sizeRows.length).toBe(2);
    expect(sizeRows[0].textContent).toContain('Liten');
    expect(sizeRows[0].textContent).toContain('199 kr');
    expect(sizeRows[1].textContent).toContain('Stor');
    expect(sizeRows[1].textContent).toContain('299 kr');
    expect(sizeRows[0].textContent).toContain('1');
    expect(sizeRows[1].textContent).toContain('4');
  });

  it('emits selected size id when clicking + on a multi-size row', () => {
    component.product = createProduct({
      sizes: [
        {
          id: 201,
          label: 'Standard',
          price: 245,
          increment: 1,
          minQuantity: 1,
          maxQuantity: null,
          isPiecesLike: true
        },
        {
          id: 202,
          label: 'Large',
          price: 305,
          increment: 1,
          minQuantity: 1,
          maxQuantity: null,
          isPiecesLike: true
        }
      ]
    });
    fixture.detectChanges();

    spyOn(component.increasePieceQty, 'emit');
    const plusButtons = fixture.nativeElement.querySelectorAll('.menu-size-row .piece-counter button:last-child');
    (plusButtons[1] as HTMLButtonElement).click();

    expect(component.increasePieceQty.emit).toHaveBeenCalledWith(202);
  });

  it('emits product id when CTA is clicked for non-pieces item', () => {
    spyOn(component.viewProduct, 'emit');

    const ctaButton = fixture.nativeElement.querySelector('.cta-button') as HTMLButtonElement;
    ctaButton.click();

    expect(component.viewProduct.emit).toHaveBeenCalledWith(11);
  });
});
