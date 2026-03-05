import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShopHeaderComponent } from './shop-header.component';

describe('ShopHeaderComponent', () => {
  let component: ShopHeaderComponent;
  let fixture: ComponentFixture<ShopHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShopHeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ShopHeaderComponent);
    component = fixture.componentInstance;
    component.bakeryName = 'Rosenborg';
    component.headerLinks = [
      { text: 'Delivery', type: 'DELIVERY', url: 'https://example.com/delivery' },
      { text: 'Outlet', type: 'OUTLET', url: null }
    ];
    component.cartItems = [
      { productId: 10, name: 'Napoleon', quantity: 2 },
      { productId: 11, name: 'Croissant', quantity: 1 }
    ];
    component.cartQuantity = 3;
    component.cartBadgeText = '3';
    fixture.detectChanges();
  });

  it('renders URL links as anchors and non-URL links as muted text', () => {
    const anchor = fixture.nativeElement.querySelector('.header-links a.header-link') as HTMLAnchorElement;
    const muted = fixture.nativeElement.querySelector('.header-links span.header-link.muted') as HTMLSpanElement;

    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toBe('https://example.com/delivery');
    expect(muted.textContent?.trim()).toBe('Outlet');
  });

  it('emits search query changes', () => {
    spyOn(component.searchChanged, 'emit');
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;

    input.value = 'sjokolade';
    input.dispatchEvent(new Event('input'));

    expect(component.searchChanged.emit).toHaveBeenCalledWith('sjokolade');
  });

  it('toggles popup and renders selected cart rows', () => {
    const cartButton = fixture.nativeElement.querySelector('.cart-button') as HTMLButtonElement;

    cartButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cart-popup')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.cart-items li').length).toBe(2);
  });

  it('hides cart badge when quantity is zero', () => {
    component.cartQuantity = 0;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cart-badge')).toBeNull();
  });

  it('closes popup on escape and outside click', () => {
    component.cartOpen.set(true);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(component.cartOpen()).toBeFalse();

    component.cartOpen.set(true);
    fixture.detectChanges();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(component.cartOpen()).toBeFalse();
  });
});
