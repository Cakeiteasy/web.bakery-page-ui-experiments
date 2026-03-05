import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { BakeryKey, IBakeryOption } from '../../models/bakery.model';
import { PresetKey } from '../../models/ui-config.model';

@Component({
  selector: 'app-preset-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preset-switcher.component.html',
  styleUrl: './preset-switcher.component.scss'
})
export class PresetSwitcherComponent {
  @Input() activeBakery: BakeryKey = 'rosenborg';
  @Input() bakeries: IBakeryOption[] = [];
  @Input() activePreset: PresetKey = 'rosenborgbakeri';
  @Input() presets: Array<{ key: PresetKey; label: string }> = [];

  @Output() bakeryChanged = new EventEmitter<BakeryKey>();
  @Output() presetChanged = new EventEmitter<PresetKey>();

  onBakerySelect(event: Event): void {
    const selected = (event.target as HTMLSelectElement | null)?.value;
    if (!selected) {
      return;
    }

    this.bakeryChanged.emit(selected as BakeryKey);
  }

  selectPreset(preset: PresetKey): void {
    this.presetChanged.emit(preset);
  }

  trackByBakery(_index: number, bakery: IBakeryOption): BakeryKey {
    return bakery.key;
  }
}
