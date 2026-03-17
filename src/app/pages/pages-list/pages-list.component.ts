import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import {
  BwaiNewPageDialogComponent,
  NewPageResult
} from '../build-with-ai-page/bwai-new-page-dialog/bwai-new-page-dialog.component';
import { BwaiPageService } from '../../services/bwai-page.service';
import { BuildWithAiSessionService } from '../../services/build-with-ai-session.service';

@Component({
  selector: 'app-pages-list',
  standalone: true,
  imports: [CommonModule, BwaiNewPageDialogComponent],
  template: `
    <div class="shell">
      <div class="spinner-wrap" *ngIf="loading()">
        <div class="spinner"></div>
        <p class="spinner-label">Loading pages…</p>
      </div>

      <div class="cta-card" *ngIf="!loading() && !showDialog()">
        <div class="cta-icon">✦</div>
        <h1 class="cta-title">No pages yet</h1>
        <p class="cta-subtitle">Create your first AI-powered landing page and publish it instantly.</p>
        <button class="cta-btn" (click)="showDialog.set(true)">+ Create a page</button>
      </div>

      <app-bwai-new-page-dialog
        *ngIf="showDialog()"
        (created)="onPageCreated($event)"
        (closed)="showDialog.set(false)"
      />
    </div>
  `,
  styles: [`
    :host { display: block; }

    .shell {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #fafafa;
      padding: 2rem;
    }

    /* ── Spinner ── */
    .spinner-wrap { text-align: center; }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #eee;
      border-top-color: #ff3399;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 0 auto 12px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .spinner-label { color: #888; font-size: 0.875rem; margin: 0; }

    /* ── CTA card ── */
    .cta-card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 32px rgba(0, 0, 0, 0.08);
      padding: 3rem 2.5rem;
      text-align: center;
      max-width: 420px;
      width: 100%;
    }

    .cta-icon { font-size: 2rem; color: #ff3399; margin-bottom: 1rem; line-height: 1; }

    .cta-title { font-size: 1.5rem; font-weight: 700; color: #111; margin: 0 0 0.5rem; }

    .cta-subtitle { font-size: 0.9rem; color: #777; margin: 0 0 1.75rem; line-height: 1.5; }

    .cta-btn {
      display: inline-block;
      padding: 0.65rem 1.5rem;
      background: #ff3399;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;

      &:hover { background: #e0006e; }
    }
  `]
})
export class PagesListComponent implements OnInit {
  private readonly pageService = inject(BwaiPageService);
  private readonly sessionService = inject(BuildWithAiSessionService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly showDialog = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('List pages timed out.')), 10_000)
      );
      const pages = await Promise.race([this.pageService.listPagesAsync(), timeout]);
      if (pages.length > 0) {
        void this.router.navigate(['/pages', pages[0].id], { replaceUrl: true });
        return;
      }
    } catch {
      // fall through to show CTA
    } finally {
      this.loading.set(false);
    }
  }

  async onPageCreated(result: NewPageResult): Promise<void> {
    this.showDialog.set(false);
    this.loading.set(true);

    try {
      const snapshot = this.sessionService.readSnapshot();

      let currentFiles: { html: string; css: string; js: string };
      if (result.mode === 'ai') {
        try {
          // Pre-populate with design system CSS/JS so AI can use lp- tokens and animations
          const baseline = await this.sessionService.loadBaselineFiles();
          currentFiles = { html: '', css: baseline.css, js: baseline.js };
        } catch {
          currentFiles = { html: '', css: '', js: '' };
        }
      } else if (result.mode === 'blank' && snapshot) {
        currentFiles = snapshot.files;
      } else {
        currentFiles = { html: '', css: '', js: '' };
      }

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Page creation timed out. Check API / DB connection.')), 15_000)
      );
      const page = await Promise.race([this.pageService.createPageAsync({
        slug: result.slug,
        title: result.title,
        currentFiles,
        currentModelKey: result.mode === 'blank' && snapshot ? snapshot.modelKey : undefined,
        messages: result.mode === 'blank' && snapshot ? snapshot.messages : []
      }), timeout]);
      if (snapshot) this.sessionService.clearSnapshot();
      void this.router.navigate(['/pages', page.id], {
        state: result.mode === 'ai' && result.description
          ? { autoPrompt: result.description }
          : {}
      });
    } catch (err) {
      console.error('Failed to create page', err);
      this.loading.set(false);
    }
  }
}
