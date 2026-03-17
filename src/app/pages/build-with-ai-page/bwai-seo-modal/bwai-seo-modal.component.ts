import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BwaiPage } from '../../../models/bwai-page.model';

export interface BwaiSeoFormValue {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
}

function slugValid(slug: string): boolean {
  return /^[a-z0-9][a-z0-9\-/]*[a-z0-9]$|^[a-z0-9]$/.test(slug) && !/\/\//.test(slug);
}

@Component({
  selector: 'app-bwai-seo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bwai-seo-modal.component.html',
  styleUrl: './bwai-seo-modal.component.scss'
})
export class BwaiSeoModalComponent implements OnChanges {
  @Input() page!: BwaiPage;
  @Output() saved = new EventEmitter<BwaiSeoFormValue>();
  @Output() closed = new EventEmitter<void>();

  readonly form = signal<BwaiSeoFormValue>({
    title: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    ogTitle: '',
    ogDescription: '',
    ogImageUrl: ''
  });

  readonly slugError = signal<string>('');

  ngOnChanges(): void {
    if (this.page) {
      this.form.set({
        title: this.page.title,
        slug: this.page.slug,
        seoTitle: this.page.seoTitle,
        seoDescription: this.page.seoDescription,
        ogTitle: this.page.ogTitle,
        ogDescription: this.page.ogDescription,
        ogImageUrl: this.page.ogImageUrl
      });
      this.slugError.set('');
    }
  }

  onFieldChange(field: keyof BwaiSeoFormValue, value: string): void {
    this.form.update((f) => ({ ...f, [field]: value }));
    if (field === 'slug') {
      const slug = value.trim().toLowerCase();
      if (slug && !slugValid(slug)) {
        this.slugError.set('Lowercase letters, numbers, hyphens, and slashes only. No double slashes or trailing chars.');
      } else {
        this.slugError.set('');
      }
    }
  }

  onSave(): void {
    const f = this.form();
    const slug = f.slug.trim().toLowerCase();
    if (!slug || !slugValid(slug)) {
      this.slugError.set('Invalid slug.');
      return;
    }
    this.saved.emit({ ...f, slug });
  }

  onClose(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as Element).classList.contains('modal-backdrop')) {
      this.closed.emit();
    }
  }
}
