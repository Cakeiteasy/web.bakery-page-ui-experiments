import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BakeryKey } from '../../models/bakery.model';
import { PresetKey } from '../../models/ui-config.model';
import { PresetSwitcherComponent } from './preset-switcher.component';

describe('PresetSwitcherComponent', () => {
  let fixture: ComponentFixture<PresetSwitcherComponent>;
  let component: PresetSwitcherComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresetSwitcherComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PresetSwitcherComponent);
    component = fixture.componentInstance;
    component.activeBakery = 'rosenborg';
    component.bakeries = [
      {
        key: 'rosenborg',
        name: 'Rosenborg',
        defaultPreset: 'rosenborgbakeri',
        api: { proxyBase: '/rosenborg-api', bakeryId: 113, webShopKey: 'rosenborg' }
      },
      {
        key: 'maschmanns',
        name: 'Maschmanns',
        defaultPreset: 'maschmanns_market',
        api: { proxyBase: '/maschmanns-api', bakeryId: 531, webShopKey: 'maschmanns' }
      }
    ];
    component.activePreset = 'rosenborgbakeri';
    component.presets = [
      { key: 'rosenborgbakeri', label: 'Rosenborg' },
      { key: 'maschmanns_market', label: 'Maschmanns' }
    ];
    fixture.detectChanges();
  });

  it('renders bakery options and preset buttons', () => {
    const bakeryOptions = fixture.nativeElement.querySelectorAll('.bakery-select option');
    const presetButtons = fixture.nativeElement.querySelectorAll('.preset-button');

    expect(bakeryOptions.length).toBe(2);
    expect(presetButtons.length).toBe(2);
  });

  it('emits bakeryChanged when bakery selection changes', () => {
    const emitted: BakeryKey[] = [];
    component.bakeryChanged.subscribe((key) => emitted.push(key));

    const select = fixture.nativeElement.querySelector('.bakery-select') as HTMLSelectElement;
    select.value = 'maschmanns';
    select.dispatchEvent(new Event('change'));

    expect(emitted).toEqual(['maschmanns']);
  });

  it('emits presetChanged when preset button is clicked', () => {
    const emitted: PresetKey[] = [];
    component.presetChanged.subscribe((key) => emitted.push(key));

    const button = fixture.nativeElement.querySelectorAll('.preset-button')[1] as HTMLButtonElement;
    button.click();

    expect(emitted).toEqual(['maschmanns_market']);
  });
});
