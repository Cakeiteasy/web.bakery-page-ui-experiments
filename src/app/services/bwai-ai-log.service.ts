import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { BwaiAiLog, BwaiAiLogUpdatePayload } from '../models/bwai-ai-log.model';

export interface BwaiAiLogListResponse {
  items: BwaiAiLog[];
  hasMore: boolean;
}

export interface BwaiAiLogListParams {
  status?: string;
  pageSlug?: string;
  before?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class BwaiAiLogService {
  private readonly http = inject(HttpClient);

  listLogs(params?: BwaiAiLogListParams): Observable<BwaiAiLogListResponse> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.pageSlug) query.set('pageSlug', params.pageSlug);
    if (params?.before) query.set('before', params.before);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.http.get<BwaiAiLogListResponse>(`/api/ai-logs${qs ? '?' + qs : ''}`);
  }

  getLog(id: string): Observable<BwaiAiLog> {
    return this.http.get<BwaiAiLog>(`/api/ai-logs?id=${id}`);
  }

  updateLog(id: string, payload: BwaiAiLogUpdatePayload): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`/api/ai-logs?id=${id}`, payload);
  }

  async listLogsAsync(params?: BwaiAiLogListParams): Promise<BwaiAiLogListResponse> {
    return firstValueFrom(this.listLogs(params));
  }

  async updateLogAsync(id: string, payload: BwaiAiLogUpdatePayload): Promise<void> {
    await firstValueFrom(this.updateLog(id, payload));
  }
}
