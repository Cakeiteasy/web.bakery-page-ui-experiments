import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BWAI_UNSPLASH_RECENT_LS_KEY } from '../build-with-ai.constants';

export interface UnsplashPhotoResult {
  id: string;
  thumbUrl: string;
  regularUrl: string;
  description: string;
  photographerName: string;
  photographerUrl: string;
}

export interface UnsplashRecentEntry {
  unsplashId: string;
  url: string;
  thumbUrl: string;
  description: string;
  photographerName: string;
  photographerUrl: string;
  pickedAt: number;
}

export interface UnsplashPickerSelection {
  source: 'unsplash' | 'upload';
  unsplashId?: string;
  url?: string;
  thumbUrl?: string;
  description?: string;
  photographerName?: string;
  photographerUrl?: string;
  file?: File;
}

interface PendingFileEntry {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-bwai-image-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bwai-image-picker-modal.component.html',
  styleUrl: './bwai-image-picker-modal.component.scss'
})
export class BwaiImagePickerModalComponent implements OnInit, OnDestroy {
  @Output() confirmed = new EventEmitter<UnsplashPickerSelection[]>();
  @Output() closed = new EventEmitter<void>();

  readonly activeTab = signal<'search' | 'upload'>('search');

  // Search tab state
  readonly searchQuery = signal('');
  readonly searchResults = signal<UnsplashPhotoResult[]>([]);
  readonly recentImages = signal<UnsplashRecentEntry[]>([]);
  readonly searching = signal(false);
  readonly searchError = signal('');
  readonly searchPage = signal(1);
  readonly searchTotalPages = signal(0);
  readonly hasMorePages = computed(() => this.searchPage() < this.searchTotalPages());

  // Upload tab state
  readonly dragActive = signal(false);
  readonly pendingFileEntries = signal<PendingFileEntry[]>([]);

  // Shared selection
  readonly selectedImages = signal<UnsplashPickerSelection[]>([]);

  private debounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loadRecents();
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
    for (const entry of this.pendingFileEntries()) {
      URL.revokeObjectURL(entry.previewUrl);
    }
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
    clearTimeout(this.debounceTimer);
    if (!query.trim()) {
      this.searchResults.set([]);
      this.searchError.set('');
      this.searchPage.set(1);
      this.searchTotalPages.set(0);
      return;
    }
    this.debounceTimer = setTimeout(() => this.performSearch(1), 400);
  }

  async performSearch(page: number): Promise<void> {
    const query = this.searchQuery().trim();
    if (!query) return;

    this.searching.set(true);
    this.searchError.set('');

    try {
      const response = await fetch(`/api/unsplash-search?query=${encodeURIComponent(query)}&page=${page}`);
      if (!response.ok) {
        const data = await response.json();
        this.searchError.set(data.error ?? 'Search failed.');
        return;
      }
      const data = await response.json() as { total: number; totalPages: number; results: UnsplashPhotoResult[] };
      this.searchTotalPages.set(data.totalPages);
      this.searchPage.set(page);
      if (page === 1) {
        this.searchResults.set(data.results);
      } else {
        this.searchResults.update(prev => [...prev, ...data.results]);
      }
    } catch {
      this.searchError.set('Search failed. Please check your connection.');
    } finally {
      this.searching.set(false);
    }
  }

  onLoadMore(): void {
    void this.performSearch(this.searchPage() + 1);
  }

  isSelected(unsplashId: string): boolean {
    return this.selectedImages().some(s => s.source === 'unsplash' && s.unsplashId === unsplashId);
  }

  toggleSearchResult(photo: UnsplashPhotoResult): void {
    if (this.isSelected(photo.id)) {
      this.selectedImages.update(arr => arr.filter(s => s.unsplashId !== photo.id));
    } else {
      this.selectedImages.update(arr => [...arr, {
        source: 'unsplash',
        unsplashId: photo.id,
        url: photo.regularUrl,
        thumbUrl: photo.thumbUrl,
        description: photo.description,
        photographerName: photo.photographerName,
        photographerUrl: photo.photographerUrl
      }]);
    }
  }

  toggleRecentImage(photo: UnsplashRecentEntry): void {
    if (this.isSelected(photo.unsplashId)) {
      this.selectedImages.update(arr => arr.filter(s => s.unsplashId !== photo.unsplashId));
    } else {
      this.selectedImages.update(arr => [...arr, {
        source: 'unsplash',
        unsplashId: photo.unsplashId,
        url: photo.url,
        thumbUrl: photo.thumbUrl,
        description: photo.description,
        photographerName: photo.photographerName,
        photographerUrl: photo.photographerUrl
      }]);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.addFiles(Array.from(files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  removePendingFile(entry: PendingFileEntry): void {
    URL.revokeObjectURL(entry.previewUrl);
    this.pendingFileEntries.update(arr => arr.filter(e => e !== entry));
    this.selectedImages.update(arr => arr.filter(s => s.file !== entry.file));
  }

  onConfirm(): void {
    const picks = this.selectedImages();
    this.persistRecents(picks);
    this.confirmed.emit(picks);
    this.closed.emit();
  }

  onClose(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as Element).classList.contains('modal-backdrop')) {
      this.closed.emit();
    }
  }

  private addFiles(files: File[]): void {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    const entries: PendingFileEntry[] = imageFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    this.pendingFileEntries.update(prev => [...prev, ...entries]);
    this.selectedImages.update(prev => [...prev, ...imageFiles.map(file => ({
      source: 'upload' as const,
      file
    }))]);
  }

  private loadRecents(): void {
    try {
      const data = JSON.parse(localStorage.getItem(BWAI_UNSPLASH_RECENT_LS_KEY) || '[]');
      this.recentImages.set(Array.isArray(data) ? data : []);
    } catch {
      this.recentImages.set([]);
    }
  }

  private persistRecents(picks: UnsplashPickerSelection[]): void {
    const unsplashPicks = picks.filter(s => s.source === 'unsplash' && s.unsplashId);
    if (!unsplashPicks.length) return;

    let existing: UnsplashRecentEntry[] = [];
    try {
      existing = JSON.parse(localStorage.getItem(BWAI_UNSPLASH_RECENT_LS_KEY) || '[]');
    } catch { existing = []; }

    const newEntries: UnsplashRecentEntry[] = unsplashPicks.map(p => ({
      unsplashId: p.unsplashId!,
      url: p.url!,
      thumbUrl: p.thumbUrl!,
      description: p.description || '',
      photographerName: p.photographerName || '',
      photographerUrl: p.photographerUrl || '',
      pickedAt: Date.now()
    }));

    const merged = [
      ...newEntries,
      ...existing.filter(e => !newEntries.some(n => n.unsplashId === e.unsplashId))
    ].slice(0, 20);

    localStorage.setItem(BWAI_UNSPLASH_RECENT_LS_KEY, JSON.stringify(merged));
  }
}
