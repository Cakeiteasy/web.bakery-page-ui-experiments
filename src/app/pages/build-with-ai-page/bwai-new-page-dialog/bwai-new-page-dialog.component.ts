import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type NewPageMode = 'blank' | 'ai';

export interface NewPageResult {
  mode: NewPageMode;
  title: string;
  slug: string;
  description?: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Component({
  selector: 'app-bwai-new-page-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bwai-new-page-dialog.component.html',
  styleUrl: './bwai-new-page-dialog.component.scss'
})
export class BwaiNewPageDialogComponent {
  @Output() created = new EventEmitter<NewPageResult>();
  @Output() closed = new EventEmitter<void>();

  readonly mode = signal<NewPageMode>('blank');
  readonly title = signal('');
  readonly slug = signal('');
  readonly description = signal('');
  readonly slugManuallyEdited = signal(false);
  readonly error = signal('');

  setMode(m: NewPageMode): void {
    this.mode.set(m);
  }

  onTitleChange(value: string): void {
    this.title.set(value);
    if (!this.slugManuallyEdited()) {
      this.slug.set(slugify(value));
    }
  }

  onSlugChange(value: string): void {
    this.slugManuallyEdited.set(true);
    this.slug.set(value.toLowerCase());
  }

  onCreate(): void {
    const title = this.title().trim();
    const slug = this.slug().trim();

    if (!title) {
      this.error.set('Page name is required.');
      return;
    }
    if (!slug || !/^[a-z0-9][a-z0-9\-/]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
      this.error.set('Invalid slug. Use lowercase letters, numbers, and hyphens.');
      return;
    }

    this.error.set('');
    this.created.emit({
      mode: this.mode(),
      title,
      slug,
      description: this.mode() === 'ai' ? this.description().trim() : undefined
    });
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
