import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { IBakeryBranding } from '../models/web-shop.model';
import { UiConfigService } from './ui-config.service';

describe('UiConfigService', () => {
  let service: UiConfigService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UiConfigService, { provide: DOCUMENT, useValue: document }]
    });

    service = TestBed.inject(UiConfigService);
    doc = TestBed.inject(DOCUMENT);
  });

  it('applies light color scheme for non-dark presets', () => {
    service.applyTheme(service.activeConfig(), 'rosenborgbakeri');

    expect(doc.documentElement.style.colorScheme).toBe('light');
    expect(doc.documentElement.style.getPropertyValue('--primary').trim()).toBe('#00b4a6');
    expect(doc.documentElement.style.getPropertyValue('--on-primary').trim().length).toBeGreaterThan(0);
  });

  it('applies dark color scheme for dark_luxury preset', () => {
    service.setPreset('dark_luxury');
    service.applyTheme(service.activeConfig(), 'dark_luxury');

    expect(doc.documentElement.style.colorScheme).toBe('dark');
    expect(doc.documentElement.style.getPropertyValue('--primary').trim()).toBe('#c9a96e');
  });

  it('applies bakery branding palette for rosenborg preset', () => {
    const branding: IBakeryBranding = {
      bakeryName: 'Rosenborg bakeri',
      bakeryWebsite: 'https://www.rosenborgbakeri.no',
      bakeryEmail: 'kundeservice@rosenborgbakeri.no',
      bakeryPhone: '+4773 87 84 00',
      logoUrl: 'https://cdn.example.com/logo.png',
      faviconUrl: 'https://cdn.example.com/favicon.png',
      heroTitle: 'Forhåndsbestill kaker',
      heroSubtitle: 'Levert hjem eller hent i butikk',
      notificationText: '',
      notificationColor: '',
      notificationButtonColor: '',
      headerLinks: [],
      theme: {
        primary: '#c89a2c',
        secondary: '#2cc89a',
        background: '#ffffff',
        headerBg: '#ffffff',
        headerText: '#000000',
        footerBg: '#222222',
        footerText: '#ffffff'
      }
    };

    service.setBakeryBranding(branding);
    service.applyTheme(service.activeConfig(), 'rosenborgbakeri', branding);

    expect(doc.documentElement.style.getPropertyValue('--primary').trim()).toBe('#c89a2c');
    expect(doc.documentElement.style.getPropertyValue('--header-bg').trim()).toBe('#ffffff');
    expect(doc.documentElement.style.getPropertyValue('--footer-bg').trim()).toBe('#222222');
    expect(doc.documentElement.style.getPropertyValue('--on-primary').trim()).toBe('#111111');
  });

  it('applies zero radius tokens for mono_brutal preset', () => {
    service.setPreset('mono_brutal');
    service.applyTheme(service.activeConfig(), 'mono_brutal');

    expect(doc.documentElement.style.getPropertyValue('--radius-sm').trim()).toBe('0px');
    expect(doc.documentElement.style.getPropertyValue('--radius-pill').trim()).toBe('0px');
  });
});
