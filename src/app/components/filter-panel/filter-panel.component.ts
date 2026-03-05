import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IAllergen } from '../../models/allergen.model';
import { ActiveFilters, IFiltersResponse, MotiveMode } from '../../models/filter.model';
import { AllergenGroupComponent } from './allergen-group/allergen-group.component';
import { GroupFilterComponent } from './group-filter/group-filter.component';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, AllergenGroupComponent, GroupFilterComponent],
  templateUrl: './filter-panel.component.html',
  styleUrl: './filter-panel.component.scss'
})
export class FilterPanelComponent {
  @Input() filters: IFiltersResponse | null = null;
  @Input() allergens: IAllergen[] = [];
  @Input() activeFilters: ActiveFilters = {
    allergenIds: [],
    motive: 'any',
    productGroupIds: []
  };

  @Output() allergenToggled = new EventEmitter<number>();
  @Output() productGroupToggled = new EventEmitter<number>();
  @Output() motiveChanged = new EventEmitter<MotiveMode>();

  mobileSheetOpen = false;

  toggleAllergen(allergenId: number): void {
    this.allergenToggled.emit(allergenId);
  }

  toggleProductGroup(groupId: number): void {
    this.productGroupToggled.emit(groupId);
  }

  selectMotive(mode: MotiveMode): void {
    this.motiveChanged.emit(mode);
  }

  openMobileSheet(): void {
    this.mobileSheetOpen = true;
  }

  closeMobileSheet(): void {
    this.mobileSheetOpen = false;
  }

  isAllergenChecked(allergenId: number): boolean {
    return this.activeFilters.allergenIds.includes(allergenId);
  }

  isProductGroupChecked(groupId: number): boolean {
    return this.activeFilters.productGroupIds.includes(groupId);
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  get hasProductGroups(): boolean {
    return (this.filters?.productGroups?.length ?? 0) > 0;
  }
}
