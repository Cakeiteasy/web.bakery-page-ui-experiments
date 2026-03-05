import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { IProductDetails } from '../../models/product.model';
import { DEFAULT_UI_CONFIG } from '../../models/ui-config.model';
import { ProductsService } from '../../services/products.service';
import { UiConfigService } from '../../services/ui-config.service';
import { ProductDetailsPageComponent } from './product-details-page.component';

describe('ProductDetailsPageComponent', () => {
  let component: ProductDetailsPageComponent;
  let fixture: ComponentFixture<ProductDetailsPageComponent>;

  const paramMapSubject = new BehaviorSubject(convertToParamMap({ productId: '28207' }));

  const detailsPayload: IProductDetails = {
    id: 28207,
    name: 'Bakevarer møtemat',
    descriptionHtml: '<p>Velg mellom <strong>din favorittbakst</strong>.</p>',
    descriptionText: 'Velg mellom din favorittbakst.',
    categoryName: 'Møtemat og Frokostpakke',
    bakeryName: 'Maschmanns',
    currencySymbol: 'kr',
    imageUrl: 'https://example.com/primary.jpg',
    image: { original: 'https://example.com/primary.jpg', small: 'https://example.com/primary-small.jpg' },
    images: [
      { original: 'https://example.com/primary.jpg', small: 'https://example.com/primary-small.jpg' },
      { original: 'https://example.com/second.jpg', small: 'https://example.com/second-small.jpg' }
    ],
    gallery: [230175, 230178],
    structureType: 'PIECES_GROUP',
    minQuantity: 4,
    maxQuantity: 10,
    increment: 1,
    minQuantityPerProduct: null,
    pickupAvailable: true,
    deliveryAvailable: true,
    mailDeliveryAvailable: false,
    ingredients: 'Hvetemel, smør',
    containsAllergenNames: ['Gluten'],
    greetingCard: {
      available: false,
      maxLength: 200,
      price: 40,
      vatRate: 15
    },
    variants: [
      {
        id: 232457,
        label: 'Croissant',
        priority: 0,
        price: 55,
        increment: 1,
        minQuantity: 1,
        maxQuantity: 10,
        isPiecesLike: true,
        imageUrl: ''
      },
      {
        id: 232458,
        label: 'Pain au chocolat',
        priority: 1,
        price: 59,
        increment: 1,
        minQuantity: 1,
        maxQuantity: 10,
        isPiecesLike: true,
        imageUrl: ''
      }
    ]
  };

  let productsServiceStub: {
    fetchProductDetailsById: jasmine.Spy<(productId: number) => Promise<IProductDetails | null>>;
    increasePieceQty: jasmine.Spy<(itemId: number) => void>;
    decreasePieceQty: jasmine.Spy<(itemId: number) => void>;
    getPieceQty: jasmine.Spy<(itemId: number) => number>;
  };

  let uiConfigServiceStub: {
    activeConfig: ReturnType<typeof signal<typeof DEFAULT_UI_CONFIG>>;
  };
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    paramMapSubject.next(convertToParamMap({ productId: '28207' }));

    productsServiceStub = {
      fetchProductDetailsById: jasmine.createSpy('fetchProductDetailsById').and.resolveTo(detailsPayload),
      increasePieceQty: jasmine.createSpy('increasePieceQty'),
      decreasePieceQty: jasmine.createSpy('decreasePieceQty'),
      getPieceQty: jasmine.createSpy('getPieceQty').and.returnValue(0)
    };

    uiConfigServiceStub = {
      activeConfig: signal(DEFAULT_UI_CONFIG)
    };
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [ProductDetailsPageComponent],
      providers: [
        { provide: ProductsService, useValue: productsServiceStub },
        { provide: UiConfigService, useValue: uiConfigServiceStub },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject.asObservable()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailsPageComponent);
    component = fixture.componentInstance;
  });

  it('renders rich HTML description from details payload', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const richDescription = fixture.nativeElement.querySelector('.details-description.rich') as HTMLElement;
    expect(richDescription).not.toBeNull();
    expect(richDescription.querySelector('strong')?.textContent).toContain('din favorittbakst');
  });

  it('renders variant rows and updates quantity by variant id', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const variantRows = fixture.nativeElement.querySelectorAll('.details-variant-row');
    expect(variantRows.length).toBe(2);
    expect(variantRows[0].textContent).toContain('Croissant');
    expect(variantRows[1].textContent).toContain('Pain au chocolat');

    const firstPlusButton = fixture.nativeElement.querySelector(
      '.details-variant-row .piece-counter button:last-child'
    ) as HTMLButtonElement;
    firstPlusButton.click();

    expect(productsServiceStub.increasePieceQty).toHaveBeenCalledWith(232457);
  });

  it('shows invalid id message for malformed route param', async () => {
    paramMapSubject.next(convertToParamMap({ productId: 'bad-id' }));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(productsServiceStub.fetchProductDetailsById).not.toHaveBeenCalled();
    const error = fixture.nativeElement.querySelector('.status.error') as HTMLElement;
    expect(error.textContent).toContain('Invalid product id.');
  });

  it('shows not found message when API returns null', async () => {
    productsServiceStub.fetchProductDetailsById.and.resolveTo(null);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.status.error') as HTMLElement;
    expect(error.textContent).toContain('Product not found.');
  });
});
