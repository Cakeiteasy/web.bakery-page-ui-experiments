import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterPanelComponent } from './filter-panel.component';

describe('FilterPanelComponent', () => {
  let component: FilterPanelComponent;
  let fixture: ComponentFixture<FilterPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FilterPanelComponent);
    component = fixture.componentInstance;
  });

  it('renders groups inside allergens panel when groups exist', () => {
    component.filters = {
      tags: [],
      productGroups: [{ id: 1, name: 'Birthday' }],
      canHasMotive: true,
    };
    component.allergens = [
      {
        id: 3,
        name: 'Eggs',
        isShowInFilters: true,
        parentAllergen: null,
        showAsChild: false,
      },
    ];

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Allergens');
    expect(fixture.nativeElement.textContent).toContain('Groups');
    expect(fixture.nativeElement.textContent).not.toContain('Product Groups');
  });

  it('hides groups block when there are no product groups', () => {
    component.filters = {
      tags: [],
      productGroups: [],
      canHasMotive: true,
    };
    component.allergens = [
      {
        id: 3,
        name: 'Eggs',
        isShowInFilters: true,
        parentAllergen: null,
        showAsChild: false,
      },
    ];

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Groups');
  });

  it('shows motive section only when canHasMotive is true', () => {
    component.filters = {
      tags: [],
      productGroups: [],
      canHasMotive: false,
    };

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Motive');

    component.filters = {
      tags: [],
      productGroups: [],
      canHasMotive: true,
    };

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Motive');
  });

  it('does not render busy loading text', () => {
    component.filters = {
      tags: [],
      productGroups: [],
      canHasMotive: true
    };

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Updating products...');
  });
});
