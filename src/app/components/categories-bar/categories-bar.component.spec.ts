import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriesBarComponent } from './categories-bar.component';

describe('CategoriesBarComponent', () => {
  let component: CategoriesBarComponent;
  let fixture: ComponentFixture<CategoriesBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesBarComponent);
    component = fixture.componentInstance;
  });

  it('renders categories and emits selection', () => {
    component.categories = [
      { id: 1, name: 'Cakes', groups: [] },
      { id: 3, name: 'Baked goods', groups: [] },
    ];
    component.selectedCategoryId = 1;

    const spy = spyOn(component.categorySelected, 'emit');

    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.category-button') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2);

    buttons[1].click();
    expect(spy).toHaveBeenCalledWith(3);
  });
});
