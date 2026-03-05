import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { IProductGroup } from '../../../models/filter.model';

@Component({
  selector: 'app-group-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-filter.component.html',
  styleUrl: './group-filter.component.scss'
})
export class GroupFilterComponent {
  @Input({ required: true }) group!: IProductGroup;
  @Input() checked = false;

  @Output() toggled = new EventEmitter<number>();

  toggle(): void {
    this.toggled.emit(this.group.id);
  }
}
