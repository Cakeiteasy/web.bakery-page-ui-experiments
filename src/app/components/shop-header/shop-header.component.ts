import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';

import { ICartItem } from '../../models/product.model';
import { IBakeryHeaderLink } from '../../models/web-shop.model';

@Component({
  selector: 'app-shop-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop-header.component.html',
  styleUrl: './shop-header.component.scss'
})
export class ShopHeaderComponent implements OnChanges {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly cartOpen = signal(false);

  @Input() bakeryName = '';
  @Input() logoUrl = '';
  @Input() websiteUrl = '';
  @Input() headerLinks: IBakeryHeaderLink[] = [];
  @Input() searchQuery = '';
  @Input() cartItems: ICartItem[] = [];
  @Input() cartQuantity = 0;
  @Input() cartBadgeText = '0';

  @Output() searchChanged = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['cartQuantity'] || changes['cartItems']) && this.cartQuantity <= 0 && this.cartOpen()) {
      this.cartOpen.set(false);
    }
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.searchChanged.emit(value);
  }

  toggleCart(event: MouseEvent): void {
    event.stopPropagation();
    this.cartOpen.update((open) => !open);
  }

  trackByLink(index: number, link: IBakeryHeaderLink): string {
    return `${index}-${link.type}-${link.text}`;
  }

  trackByCartItem(_index: number, item: ICartItem): number {
    return item.productId;
  }

  get cartAriaLabel(): string {
    if (this.cartQuantity <= 0) {
      return 'Open cart';
    }

    return `Open cart with ${this.cartQuantity} items`;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cartOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.cartOpen()) {
      return;
    }

    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) {
      return;
    }

    this.cartOpen.set(false);
  }
}
