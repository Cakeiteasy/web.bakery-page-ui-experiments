import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BuildWithAiSessionSnapshot, BuildWithAiEditableFiles } from '../models/build-with-ai.model';
import { BUILD_WITH_AI_STORAGE_KEY } from '../pages/build-with-ai-page/build-with-ai.constants';

@Injectable({ providedIn: 'root' })
export class BuildWithAiSessionService {
  private readonly http = inject(HttpClient);

  async loadBaselineFiles(): Promise<BuildWithAiEditableFiles> {
    const [html, css, js] = await Promise.all([
      firstValueFrom(this.http.get('/assets/build-with-ai/content.html', { responseType: 'text' })),
      firstValueFrom(this.http.get('/assets/build-with-ai/content.css', { responseType: 'text' })),
      firstValueFrom(this.http.get('/assets/build-with-ai/content.js', { responseType: 'text' }))
    ]);

    return {
      html,
      css,
      js
    };
  }

  readSnapshot(): BuildWithAiSessionSnapshot | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }

    const raw = storage.getItem(BUILD_WITH_AI_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as BuildWithAiSessionSnapshot;
      if (!this.isSnapshot(parsed)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  saveSnapshot(snapshot: BuildWithAiSessionSnapshot): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.setItem(BUILD_WITH_AI_STORAGE_KEY, JSON.stringify(snapshot));
  }

  clearSnapshot(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.removeItem(BUILD_WITH_AI_STORAGE_KEY);
  }

  private isSnapshot(snapshot: BuildWithAiSessionSnapshot | null | undefined): snapshot is BuildWithAiSessionSnapshot {
    if (!snapshot) {
      return false;
    }

    return Boolean(
      snapshot.modelKey &&
        snapshot.files &&
        typeof snapshot.files.html === 'string' &&
        typeof snapshot.files.css === 'string' &&
        typeof snapshot.files.js === 'string' &&
        Array.isArray(snapshot.messages) &&
        Array.isArray(snapshot.patchLogs)
    );
  }

  private getStorage(): Storage | null {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  }
}
