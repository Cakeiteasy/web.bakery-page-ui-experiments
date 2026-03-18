import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BwaiAiLog, BwaiAiLogEditResult } from '../../models/bwai-ai-log.model';
import { BwaiAiLogService } from '../../services/bwai-ai-log.service';

@Component({
  selector: 'app-admin-ai-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="shell">
      <div class="page-header">
        <h1 class="page-title">AI Request Logs</h1>
        <p class="page-subtitle">Every AI patch request — tokens, timing, and per-edit match status.</p>
      </div>

      <div class="filters">
        <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
          <option value="all">All statuses</option>
          <option value="applied">Applied</option>
          <option value="rejected">Rejected</option>
          <option value="error">Error</option>
        </select>
        <input
          class="filter-input"
          type="text"
          placeholder="Filter by page slug…"
          [(ngModel)]="slugFilter"
          (ngModelChange)="onSlugFilterChange()"
        />
      </div>

      @if (loading()) {
        <div class="spinner-wrap">
          <div class="spinner"></div>
          <p class="spinner-label">Loading logs…</p>
        </div>
      } @else if (logs().length === 0) {
        <div class="empty-state">No logs found.</div>
      } @else {
        <table class="logs-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Page</th>
              <th>Model</th>
              <th>Status</th>
              <th>Tokens (in / out)</th>
              <th>LLM time</th>
            </tr>
          </thead>
          <tbody>
            @for (log of logs(); track log.id) {
              <tr class="log-row" [class.log-row--expanded]="expandedLogId() === log.id" (click)="onToggleExpand(log.id)">
                <td class="cell-date">{{ log.createdAt | date:'MMM d, HH:mm' }}</td>
                <td class="cell-slug">{{ log.pageSlug ?? '—' }}</td>
                <td class="cell-model">{{ log.modelKey }}</td>
                <td class="cell-status">
                  <span class="badge badge--{{ log.applyStatus ?? 'pending' }}">
                    {{ log.applyStatus ?? 'pending' }}
                  </span>
                </td>
                <td class="cell-tokens">
                  @if (log.inputTokens != null || log.outputTokens != null) {
                    {{ log.inputTokens ?? 0 | number }} / {{ log.outputTokens ?? 0 | number }}
                  } @else {
                    —
                  }
                </td>
                <td class="cell-time">
                  @if (log.llmTimeMs != null) {
                    {{ (log.llmTimeMs / 1000).toFixed(1) }}s
                  } @else {
                    —
                  }
                </td>
              </tr>
              @if (expandedLogId() === log.id) {
                <tr class="detail-row">
                  <td colspan="6">
                    <div class="detail-panel">
                      <section class="detail-section">
                        <h3 class="detail-heading">User message</h3>
                        <pre class="detail-pre">{{ log.lastUserMessage || '(empty)' }}</pre>
                      </section>

                      @if (log.warnings?.length) {
                        <section class="detail-section">
                          <h3 class="detail-heading">Warnings</h3>
                          <ul class="detail-list">
                            @for (w of log.warnings; track w) {
                              <li>{{ w }}</li>
                            }
                          </ul>
                        </section>
                      }

                      @if (log.rejectionReason) {
                        <section class="detail-section">
                          <h3 class="detail-heading">Rejection reason</h3>
                          <p class="detail-rejection">{{ log.rejectionReason }}</p>
                        </section>
                      }

                      <section class="detail-section">
                        <h3 class="detail-heading">
                          Edits
                          @if (log.applyResults?.length) {
                            <span class="edit-summary">
                              {{ matchedCount(log) }} matched,
                              {{ unmatchedCount(log) }} unmatched
                            </span>
                          }
                        </h3>
                        @if (log.applyResults?.length) {
                          <div class="edit-list">
                            @for (result of log.applyResults; track result.search) {
                              <div class="edit-item edit-item--{{ result.status }}">
                                <div class="edit-item-header">
                                  <span class="edit-badge edit-badge--{{ result.status }}">{{ result.status }}</span>
                                  <span class="edit-file">{{ result.file }}</span>
                                  <span class="edit-mode">{{ result.mode }}</span>
                                </div>
                                @if (result.search) {
                                  <pre class="edit-search">{{ result.search }}</pre>
                                }
                                @if (result.error) {
                                  <p class="edit-error">{{ result.error }}</p>
                                }
                              </div>
                            }
                          </div>
                        } @else {
                          <p class="detail-none">Apply results not yet recorded.</p>
                        }
                      </section>

                      <section class="detail-section detail-meta">
                        <span>Total: {{ log.totalTimeMs != null ? (log.totalTimeMs / 1000).toFixed(1) + 's' : '—' }}</span>
                        <span>Log ID: <code>{{ log.id }}</code></span>
                      </section>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        @if (hasMore()) {
          <div class="load-more-wrap">
            <button class="load-more-btn" [disabled]="loadingMore()" (click)="onLoadMore()">
              {{ loadingMore() ? 'Loading…' : 'Load more' }}
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .shell {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
      font-family: system-ui, sans-serif;
    }

    .page-header { margin-bottom: 24px; }
    .page-title { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; }
    .page-subtitle { margin: 0; color: #666; font-size: 0.9rem; }

    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .filter-select, .filter-input {
      padding: 6px 10px;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #fff;
    }
    .filter-input { flex: 1; max-width: 280px; }

    .spinner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      gap: 12px;
      color: #888;
    }
    .spinner {
      width: 28px; height: 28px;
      border: 3px solid #e0e0e0;
      border-top-color: #555;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: #888;
      font-size: 0.95rem;
    }

    .logs-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .logs-table th {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 2px solid #e0e0e0;
      color: #555;
      font-weight: 600;
      white-space: nowrap;
    }

    .log-row {
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
    }
    .log-row:hover td { background: #f9f9f9; }
    .log-row--expanded td { background: #f5f5f5; }

    .log-row td {
      padding: 10px 12px;
      vertical-align: middle;
    }

    .cell-date { white-space: nowrap; color: #555; }
    .cell-slug { font-family: monospace; font-size: 0.8rem; }
    .cell-model { font-family: monospace; font-size: 0.8rem; }
    .cell-tokens { font-family: monospace; font-size: 0.8rem; white-space: nowrap; }
    .cell-time { font-family: monospace; font-size: 0.8rem; white-space: nowrap; }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge--applied  { background: #d4edda; color: #155724; }
    .badge--rejected { background: #f8d7da; color: #721c24; }
    .badge--error    { background: #fff3cd; color: #856404; }
    .badge--pending  { background: #e2e3e5; color: #383d41; }

    .detail-row td { padding: 0; }

    .detail-panel {
      padding: 20px 24px;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
    }

    .detail-section { margin-bottom: 20px; }
    .detail-section:last-child { margin-bottom: 0; }

    .detail-heading {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
      margin: 0 0 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .edit-summary {
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      font-size: 0.8rem;
      color: #888;
    }

    .detail-pre {
      background: #f4f4f4;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 10px 12px;
      font-size: 0.8rem;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      max-height: 200px;
      overflow-y: auto;
    }

    .detail-list { margin: 0; padding-left: 20px; font-size: 0.85rem; }
    .detail-rejection { margin: 0; color: #721c24; font-size: 0.85rem; }
    .detail-none { margin: 0; color: #888; font-size: 0.85rem; font-style: italic; }

    .edit-list { display: flex; flex-direction: column; gap: 8px; }

    .edit-item {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #fafafa;
    }
    .edit-item--unmatched { border-color: #f5c6cb; background: #fff5f5; }
    .edit-item--error     { border-color: #ffc107; background: #fffdf0; }
    .edit-item--matched   { border-color: #c3e6cb; background: #f5fff7; }

    .edit-item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .edit-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .edit-badge--matched   { background: #c3e6cb; color: #155724; }
    .edit-badge--unmatched { background: #f5c6cb; color: #721c24; }
    .edit-badge--error     { background: #ffc107; color: #664d03; }

    .edit-file { font-family: monospace; font-size: 0.8rem; color: #555; }
    .edit-mode {
      font-size: 0.7rem;
      background: #e9ecef;
      border-radius: 3px;
      padding: 1px 5px;
      color: #555;
    }

    .edit-search {
      background: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 0.78rem;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 4px 0 0;
      max-height: 120px;
      overflow-y: auto;
    }

    .edit-error {
      margin: 6px 0 0;
      font-size: 0.8rem;
      color: #721c24;
    }

    .detail-meta {
      display: flex;
      gap: 20px;
      font-size: 0.78rem;
      color: #888;
    }
    .detail-meta code {
      font-family: monospace;
      font-size: 0.78rem;
      background: #f0f0f0;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .load-more-wrap { display: flex; justify-content: center; margin-top: 20px; }
    .load-more-btn {
      padding: 8px 24px;
      border: 1px solid #ccc;
      border-radius: 6px;
      background: #fff;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .load-more-btn:hover:not(:disabled) { background: #f5f5f5; }
    .load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class AdminAiLogsComponent implements OnInit {
  private readonly aiLogService = inject(BwaiAiLogService);

  readonly logs = signal<BwaiAiLog[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly expandedLogId = signal<string | null>(null);
  readonly hasMore = signal(false);

  statusFilter = 'all';
  slugFilter = '';

  private lastCreatedAt?: string;
  private slugDebounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    void this.loadLogs();
  }

  onFilterChange(): void {
    void this.loadLogs();
  }

  onSlugFilterChange(): void {
    clearTimeout(this.slugDebounceTimer);
    this.slugDebounceTimer = setTimeout(() => void this.loadLogs(), 300);
  }

  onToggleExpand(id: string): void {
    this.expandedLogId.set(this.expandedLogId() === id ? null : id);
  }

  onLoadMore(): void {
    void this.loadLogs({ append: true });
  }

  matchedCount(log: BwaiAiLog): number {
    return log.applyResults?.filter(r => r.status === 'matched').length ?? 0;
  }

  unmatchedCount(log: BwaiAiLog): number {
    return log.applyResults?.filter(r => r.status !== 'matched').length ?? 0;
  }

  private async loadLogs(options?: { append: boolean }): Promise<void> {
    if (options?.append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
      this.lastCreatedAt = undefined;
    }

    try {
      const result = await this.aiLogService.listLogsAsync({
        status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
        pageSlug: this.slugFilter || undefined,
        before: this.lastCreatedAt,
        limit: 51
      });

      const items = result.items.slice(0, 50);
      this.hasMore.set(result.hasMore);

      if (options?.append) {
        this.logs.update(prev => [...prev, ...items]);
      } else {
        this.logs.set(items);
      }

      if (items.length > 0) {
        this.lastCreatedAt = new Date(items.at(-1)!.createdAt).toISOString();
      }
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }
}
