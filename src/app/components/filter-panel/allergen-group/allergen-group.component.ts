import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IAllergen } from '../../../models/allergen.model';

@Component({
  selector: 'app-allergen-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './allergen-group.component.html',
  styleUrl: './allergen-group.component.scss'
})
export class AllergenGroupComponent {
  @Input({ required: true }) allergen!: IAllergen;
  @Input() checked = false;

  @Output() toggled = new EventEmitter<number>();

  toggle(): void {
    this.toggled.emit(this.allergen.id);
  }
}
