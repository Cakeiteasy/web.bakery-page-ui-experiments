import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

import {
  BwaiPage,
  BwaiPageCreatePayload,
  BwaiPageSummary,
  BwaiPageUpdatePayload,
  BwaiPageVersion
} from '../models/bwai-page.model';
import { BuildWithAiEditableFiles } from '../models/build-with-ai.model';

@Injectable({ providedIn: 'root' })
export class BwaiPageService {
  private readonly http = inject(HttpClient);

  // ── Pages ──────────────────────────────────────────────────────────────

  listPages(): Observable<BwaiPageSummary[]> {
    return this.http.get<BwaiPageSummary[]>('/api/pages');
  }

  getPage(id: string): Observable<BwaiPage> {
    return this.http.get<BwaiPage>(`/api/pages?id=${id}`);
  }

  createPage(payload: BwaiPageCreatePayload): Observable<BwaiPage> {
    return this.http.post<BwaiPage>('/api/pages', payload);
  }

  updatePage(id: string, patch: BwaiPageUpdatePayload): Observable<BwaiPage> {
    return this.http.put<BwaiPage>(`/api/pages?id=${id}`, patch);
  }

  deletePage(id: string): Observable<void> {
    return this.http.delete<void>(`/api/pages?id=${id}`);
  }

  duplicatePage(id: string): Observable<BwaiPageSummary> {
    return this.http.post<BwaiPageSummary>(`/api/pages?id=${id}&action=duplicate`, {});
  }

  // ── Versions ───────────────────────────────────────────────────────────

  listVersions(pageId: string): Observable<BwaiPageVersion[]> {
    return this.http.get<BwaiPageVersion[]>(`/api/page-versions?pageId=${pageId}`);
  }

  saveVersion(
    pageId: string,
    data: { files: BuildWithAiEditableFiles; diff?: string; status?: 'applied' | 'rejected' | 'partial'; label?: string }
  ): Observable<BwaiPageVersion> {
    return this.http.post<BwaiPageVersion>(`/api/page-versions?pageId=${pageId}`, data);
  }

  getVersionFiles(pageId: string, versionId: string): Observable<BwaiPageVersion> {
    return this.http.get<BwaiPageVersion>(`/api/page-versions?pageId=${pageId}&versionId=${versionId}`);
  }

  restoreVersion(pageId: string, versionId: string): Observable<{ ok: boolean; files: BuildWithAiEditableFiles }> {
    return this.http.post<{ ok: boolean; files: BuildWithAiEditableFiles }>(
      `/api/page-versions?pageId=${pageId}&versionId=${versionId}&action=restore`,
      {}
    );
  }

  // ── Helpers (promise wrappers for component use) ───────────────────────

  async listPagesAsync(): Promise<BwaiPageSummary[]> {
    return firstValueFrom(this.listPages());
  }

  async getPageAsync(id: string): Promise<BwaiPage> {
    return firstValueFrom(this.getPage(id));
  }

  async createPageAsync(payload: BwaiPageCreatePayload): Promise<BwaiPage> {
    return firstValueFrom(this.createPage(payload));
  }

  async updatePageAsync(id: string, patch: BwaiPageUpdatePayload): Promise<BwaiPage> {
    return firstValueFrom(this.updatePage(id, patch));
  }

  async deletePageAsync(id: string): Promise<void> {
    return firstValueFrom(this.deletePage(id));
  }

  async duplicatePageAsync(id: string): Promise<BwaiPageSummary> {
    return firstValueFrom(this.duplicatePage(id));
  }

  async saveVersionAsync(
    pageId: string,
    data: { files: BuildWithAiEditableFiles; diff?: string; status?: 'applied' | 'rejected' | 'partial'; label?: string }
  ): Promise<BwaiPageVersion> {
    return firstValueFrom(this.saveVersion(pageId, data));
  }

  async getVersionFilesAsync(pageId: string, versionId: string): Promise<BwaiPageVersion> {
    return firstValueFrom(this.getVersionFiles(pageId, versionId));
  }

  async restoreVersionAsync(pageId: string, versionId: string): Promise<BuildWithAiEditableFiles> {
    const result = await firstValueFrom(this.restoreVersion(pageId, versionId));
    return result.files;
  }
}
