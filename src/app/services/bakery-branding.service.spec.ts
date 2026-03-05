import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ACTIVE_BAKERY_STORAGE_KEY } from '../config/bakeries.config';
import { BakeryBrandingService } from './bakery-branding.service';

describe('BakeryBrandingService', () => {
  let service: BakeryBrandingService;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    localStorage.removeItem(ACTIVE_BAKERY_STORAGE_KEY);
    httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);

    TestBed.configureTestingModule({
      providers: [BakeryBrandingService, { provide: HttpClient, useValue: httpClientSpy }]
    });

    service = TestBed.inject(BakeryBrandingService);
  });

  it('maps branding fields from web-shop payload', async () => {
    httpClientSpy.get.and.returnValue(
      of({
        shop_url: 'https://www.rosenborgbakeri.no/shop/',
        title_web_shop: 'Forhåndsbestill kaker',
        sub_text_web_shop: 'Levert hjem eller hent i butikk',
        notification_bar_banner_text: 'Fri levering over 1900',
        notification_bar_color: '#f1f1f1',
        notification_bar_button_color: '#c89a2c',
        bakery: {
          name: 'Rosenborg bakeri',
          web_site_url: 'https://www.rosenborgbakeri.no',
          email: 'kundeservice@rosenborgbakeri.no',
          phone: '+4773 87 84 00',
          image: { small: 'https://cdn.example.com/logo-small.png' }
        },
        theme: {
          logo: { url: 'https://cdn.example.com/theme-logo.png' },
          favicon: { url: 'https://cdn.example.com/favicon.png' },
          colors: { primary: '#c89a2c', secondary: '#2cc89a', background: '#ffffff' },
          header: { bg_color: '#ffffff', text_color: '#000000' },
          footer: { bg_color: '#222222', text_color: '#ffffff' },
          header_links_settings: [
            { show: true, text: 'Sjekk leveringspris', type: 'DELIVERY' },
            { show: true, text: 'Logg inn', type: 'LOGIN', url: 'https://auth.example.com/login' },
            { show: false, text: 'Hidden', type: 'CUSTOM' }
          ]
        }
      } as never)
    );

    await service.loadBranding();
    const branding = service.branding();

    expect(httpClientSpy.get).toHaveBeenCalledWith('/rosenborg-api/store/bakeries/rosenborg/web-shop/');
    expect(branding).not.toBeNull();
    expect(branding?.logoUrl).toBe('https://cdn.example.com/theme-logo.png');
    expect(branding?.heroTitle).toBe('Forhåndsbestill kaker');
    expect(branding?.headerLinks.length).toBe(2);
    expect(branding?.headerLinks[0].text).toBe('Sjekk leveringspris');
    expect(branding?.headerLinks[0].url).toBe('https://www.rosenborgbakeri.no/shop/delivery-prices');
    expect(branding?.headerLinks[1].url).toBe('https://auth.example.com/login');
    expect(branding?.theme.primary).toBe('#c89a2c');
  });

  it('falls back to bakery image when theme logo is missing', async () => {
    httpClientSpy.get.and.returnValue(
      of({
        bakery: {
          name: 'Rosenborg bakeri',
          image: { small: '//cdn.example.com/bakery-small.png' }
        },
        theme: {
          logo: { url: '' }
        }
      } as never)
    );

    await service.loadBranding();

    expect(service.branding()?.logoUrl).toBe('https://cdn.example.com/bakery-small.png');
  });

  it('keeps unknown typed links non-clickable when URL is missing', async () => {
    httpClientSpy.get.and.returnValue(
      of({
        shop_url: 'https://www.rosenborgbakeri.no/shop/',
        theme: {
          header_links_settings: [
            { show: true, text: 'Custom', type: 'CUSTOM' }
          ]
        }
      } as never)
    );

    await service.loadBranding();

    expect(service.branding()?.headerLinks[0].url).toBeNull();
  });

  it('keeps app stable when branding request fails', async () => {
    spyOn(console, 'error');
    httpClientSpy.get.and.returnValue(throwError(() => new Error('request failed')));

    await service.loadBranding();

    expect(service.branding()).toBeNull();
    expect(service.error()).toBe('Failed to load bakery branding.');
  });
});

describe('BakeryBrandingService with maschmanns bakery profile', () => {
  let service: BakeryBrandingService;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    localStorage.setItem(ACTIVE_BAKERY_STORAGE_KEY, 'maschmanns');
    httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);

    TestBed.configureTestingModule({
      providers: [BakeryBrandingService, { provide: HttpClient, useValue: httpClientSpy }]
    });

    service = TestBed.inject(BakeryBrandingService);
  });

  afterEach(() => {
    localStorage.removeItem(ACTIVE_BAKERY_STORAGE_KEY);
  });

  it('calls maschmanns web-shop endpoint for active bakery', async () => {
    httpClientSpy.get.and.returnValue(of({ bakery: { name: 'Maschmanns' }, theme: {} } as never));

    await service.loadBranding();

    expect(httpClientSpy.get).toHaveBeenCalledWith('/maschmanns-api/store/bakeries/maschmanns/web-shop/');
  });
});
