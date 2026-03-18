import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { mixHexColors, normalizeHexColor } from '../../utils/color-contrast.util';

import {
  BuildWithAiAttachment,
  BuildWithAiChatMessage,
  BuildWithAiEditableFiles,
  BuildWithAiErrorCategory,
  BuildWithAiPatchLogEntry
} from '../../models/build-with-ai.model';
import { BwaiPage, BwaiPageSummary, BwaiPageVersion } from '../../models/bwai-page.model';
import { BuildWithAiApiService } from '../../services/build-with-ai-api.service';
import { BuildWithAiContextMeterService } from '../../services/build-with-ai-context-meter.service';
import { BuildWithAiDiffService } from '../../services/build-with-ai-diff.service';
import { BuildWithAiSessionService } from '../../services/build-with-ai-session.service';
import { BuildWithAiSyntaxValidatorService } from '../../services/build-with-ai-syntax-validator.service';
import { BwaiPageService } from '../../services/bwai-page.service';
import {
  BUILD_WITH_AI_FONT_PAIRS,
  BUILD_WITH_AI_FOOTER_HTML,
  BUILD_WITH_AI_HEADER_HTML,
  BUILD_WITH_AI_MODELS,
  BUILD_WITH_AI_STATIC_SHELL_CSS,
  BUILD_WITH_AI_STORAGE_KEY
} from './build-with-ai.constants';
import { BwaiSeoModalComponent, BwaiSeoFormValue } from './bwai-seo-modal/bwai-seo-modal.component';
import { BwaiNewPageDialogComponent, NewPageResult } from './bwai-new-page-dialog/bwai-new-page-dialog.component';
import {
  BwaiGenerationSettingsComponent,
  BwaiGenerationSettings,
  BWAI_SYSTEM_PROMPT_LS_KEY,
  BWAI_DEMO_KEY_LS_KEY
} from './bwai-generation-settings/bwai-generation-settings.component';
import {
  BwaiImagePickerModalComponent,
  UnsplashPickerSelection
} from './bwai-image-picker-modal/bwai-image-picker-modal.component';

const SIDEBAR_WIDTH_STORAGE_KEY = 'build-with-ai-sidebar-width';
const SIDEBAR_WIDTH_DEFAULT = 360;
const SIDEBAR_WIDTH_MIN = 280;
const SIDEBAR_WIDTH_MAX = 720;
const MOBILE_SIDEBAR_BREAKPOINT = 1100;

export interface SelectedSection {
  selector: string;
  bwaiId: string;       // data-bwai-id attribute value — unique, stable section identifier
  label: string;
  sectionIndex: number;
  totalSections: number;
  outerHtml: string;
}


@Component({
  selector: 'app-build-with-ai-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BwaiSeoModalComponent, BwaiNewPageDialogComponent, BwaiGenerationSettingsComponent, BwaiImagePickerModalComponent],
  templateUrl: './build-with-ai-page.component.html',
  styleUrl: './build-with-ai-page.component.scss'
})
export class BuildWithAiPageComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(BuildWithAiApiService);
  private readonly contextMeterService = inject(BuildWithAiContextMeterService);
  private readonly diffService = inject(BuildWithAiDiffService);
  private readonly sessionService = inject(BuildWithAiSessionService);
  private readonly syntaxValidator = inject(BuildWithAiSyntaxValidatorService);
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly bwaiPageService = inject(BwaiPageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly modelOptions = BUILD_WITH_AI_MODELS;

  readonly loading = signal<boolean>(true);
  readonly processing = signal<boolean>(false);
  readonly draftMessage = signal<string>('');
  readonly files = signal<BuildWithAiEditableFiles>({ html: '', css: '', js: '' });
  readonly messages = signal<BuildWithAiChatMessage[]>([]);
  readonly patchLogs = signal<BuildWithAiPatchLogEntry[]>([]);
  readonly pendingAttachments = signal<BuildWithAiAttachment[]>([]);
  readonly selectedModelKey = signal<string>(this.modelOptions[0].key);
  readonly sidebarWidth = signal<number>(SIDEBAR_WIDTH_DEFAULT);
  readonly sidebarResizing = signal<boolean>(false);
  readonly dragActive = signal<boolean>(false);
  readonly activeError = signal<{ category: BuildWithAiErrorCategory; message: string } | null>(null);

  // Section selection
  readonly selectedSection = signal<SelectedSection | null>(null);
  readonly hiddenSections = signal<string[]>([]);

  // Viewport toggle
  readonly viewportMode = signal<'desktop' | 'mobile'>('desktop');

  // Preview srcdoc (only updated on initial load / new session; patches go via postMessage)
  readonly activeSrcdoc = signal<string>('');
  private iframeReady = false;

  // ── Multi-page management ────────────────────────────────────────────────
  readonly pages = signal<BwaiPageSummary[]>([]);
  readonly currentPage = signal<BwaiPage | null>(null);
  readonly versions = signal<BwaiPageVersion[]>([]);
  readonly showSeoModal = signal<boolean>(false);
  readonly showNewPageDialog = signal<boolean>(false);
  readonly showGenerationSettings = signal<boolean>(false);
  readonly showImagePicker = signal<boolean>(false);
  readonly activeTab = signal<'chat' | 'versions'>('chat');
  readonly copiedToast = signal<boolean>(false);
  readonly uploadingCount = signal<number>(0);
  readonly systemPromptOverride = signal<string | null>(
    localStorage.getItem(BWAI_SYSTEM_PROMPT_LS_KEY) || null
  );
  readonly demoKey = signal<string | null>(
    localStorage.getItem(BWAI_DEMO_KEY_LS_KEY) || null
  );
  readonly reviewingPatchId = signal<string | null>(null);

  @ViewChild('composerTextarea') private composerTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewIframe') private previewIframe?: ElementRef<HTMLIFrameElement>;
  @ViewChild('messagesEl') private messagesEl?: ElementRef<HTMLElement>;

  private baselineFiles: BuildWithAiEditableFiles = { html: '', css: '', js: '' };
  private routeParamSub?: ReturnType<typeof this.route.paramMap.subscribe>;
  private copiedToastTimeout?: ReturnType<typeof setTimeout>;
  private skipNextIframePatch = false;

  readonly selectedModel = computed(() => {
    const selected = this.modelOptions.find((option) => option.key === this.selectedModelKey());
    return selected ?? this.modelOptions[0];
  });

  readonly safePreviewDocument = computed<SafeHtml>(() =>
    this.domSanitizer.bypassSecurityTrustHtml(this.activeSrcdoc())
  );

  readonly contextEstimate = computed(() =>
    this.contextMeterService.estimate(this.selectedModel(), this.files(), this.messages())
  );

  readonly contextWarningText = computed(() => {
    const estimate = this.contextEstimate();
    if (!estimate.nearLimit) {
      return '';
    }

    return `Context is ${(estimate.ratio * 100).toFixed(1)}% full (${estimate.estimatedTokens.toLocaleString()} / ${estimate.limit.toLocaleString()} estimated tokens). Start a new session soon.`;
  });

  readonly canSend = computed(() => {
    if (this.processing()) {
      return false;
    }

    return Boolean(this.draftMessage().trim() || this.pendingAttachments().length);
  });

  readonly isSectionHidden = computed(() => {
    const sel = this.selectedSection();
    return sel ? this.hiddenSections().includes(sel.bwaiId) : false;
  });

  // Expose window to template for slug preview in SEO modal
  readonly window = window;

  constructor() {
    // Live-patch HTML/CSS/JS into iframe without reload when files change
    effect(() => {
      const f = this.files();
      if (!this.iframeReady) return;
      if (this.skipNextIframePatch) { this.skipNextIframePatch = false; return; }
      this.sendToIframe({ type: 'bwai-patch', html: f.html, css: f.css, js: f.js });
    });

    // Live-patch hidden-section visibility when the set changes
    effect(() => {
      const hidden = this.hiddenSections();
      if (!this.iframeReady) return;
      this.sendToIframe({ type: 'bwai-hidden-css', ids: hidden });
    });

    // Auto-scroll chat to bottom when messages change or processing starts
    effect(() => {
      this.messages();
      this.processing();
      setTimeout(() => {
        const el = this.messagesEl?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      }, 0);
    });
  }

  private readonly previewMessageListener = (event: MessageEvent): void => {
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    const payload = event.data as {
      type?: string;
      message?: string;
      selector?: string;
      bwaiId?: string;
      label?: string;
      sectionIndex?: number;
      totalSections?: number;
      outerHtml?: string;
      action?: string;
    };

    if (payload.type === 'build-with-ai-preview-error') {
      if (payload.message) {
        this.setError('preview', payload.message);
      }
      return;
    }

    if (payload.type === 'bwai-selected') {
      this.selectedSection.set({
        selector: payload.selector ?? '',
        bwaiId: payload.bwaiId ?? '',
        label: payload.label ?? '',
        sectionIndex: payload.sectionIndex ?? 0,
        totalSections: payload.totalSections ?? 1,
        outerHtml: payload.outerHtml ?? ''
      });
      return;
    }

    if (payload.type === 'bwai-inline-edit-save') {
      const newHtml = this.normalizeHtml(String((payload as any).html ?? ''));
      const updated = { ...this.files(), html: newHtml };
      const validation = this.syntaxValidator.validate(updated);
      if (validation.valid) {
        this.skipNextIframePatch = true;
        this.files.set(updated);
        void this.persistToMongo({ currentFiles: updated });
      }
      return;
    }

    if (payload.type === 'bwai-insert') {
      this.onInsertSection(String((payload as any).sectionType ?? 'custom'));
      return;
    }

    if (payload.type === 'bwai-action') {
      switch (payload.action) {
        case 'move-up':   this.onMoveSectionUp();    break;
        case 'move-down': this.onMoveSectionDown();   break;
        case 'hide':      this.onToggleHideSection(); break;
        case 'remove':    this.onRemoveSection();     break;
        case 'select': {
          const sel = this.selectedSection();
          if (sel) {
            this.previewIframe?.nativeElement.contentWindow?.postMessage(
              { type: 'bwai-highlight', selector: sel.selector }, '*'
            );
          }
          break;
        }
      }
      return;
    }
  };

  async ngOnInit(): Promise<void> {
    window.addEventListener('message', this.previewMessageListener);
    this.restoreSidebarWidth();

    try {
      this.baselineFiles = await this.sessionService.loadBaselineFiles();
    } catch {
      // baseline load failure is non-fatal
    }

    // Subscribe to route param changes (switching between pages)
    this.routeParamSub = this.route.paramMap.subscribe((params) => {
      const pageId = params.get('pageId');
      if (pageId) {
        void this.loadPage(pageId);
      } else {
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.previewMessageListener);
    this.onSidebarResizePointerUp();
    this.routeParamSub?.unsubscribe();
    if (this.copiedToastTimeout) clearTimeout(this.copiedToastTimeout);
  }

  // ── Page loading ──────────────────────────────────────────────────────────

  private async loadPage(pageId: string): Promise<void> {
    this.loading.set(true);
    this.iframeReady = false;
    this.activeError.set(null);
    this.activeTab.set('chat');
    this.versions.set([]);

    try {
      const [page, allPages] = await Promise.all([
        this.bwaiPageService.getPageAsync(pageId),
        this.bwaiPageService.listPagesAsync()
      ]);

      this.currentPage.set(page);
      this.pages.set(allPages);

      const rawFiles = page.currentFiles ?? { html: '', css: '', js: '' };
      const normalized = this.normalizeHtml(rawFiles.html);
      const { html: htmlWithIds, changed: idsAdded } = this.ensureSectionIds(normalized);
      const files = { ...rawFiles, html: htmlWithIds };
      this.files.set(files);
      if (idsAdded) {
        void this.persistToMongo({ currentFiles: files });
      }
      this.messages.set(page.messages?.length ? page.messages : [
        {
          id: this.createId('assistant'),
          role: 'assistant',
          text: 'Ready. Describe the changes you want and I will apply them.',
          createdAt: Date.now(),
          attachments: []
        }
      ]);
      this.patchLogs.set(page.patchLogs ?? []);
      if (page.currentModelKey) {
        this.selectedModelKey.set(page.currentModelKey);
      }

      // Apply stored font/accent overrides to preview
      if (page.fontPair || page.accentColor) {
        this.applyPageStyleOverrides(page.fontPair ?? null, page.accentColor ?? null);
      }

      this.selectedSection.set(null);
      this.hiddenSections.set(page.hiddenSections ?? []);

      this.activeSrcdoc.set(this.buildPreviewDocument(this.files(), page.hiddenSections ?? []));

      // Auto-send if navigated here with a prompt (e.g. from "AI build" new-page flow)
      const state = window.history.state as Record<string, unknown> | null;
      const autoPrompt = state?.['autoPrompt'] as string | undefined;
      if (autoPrompt) {
        // Clear state so a refresh doesn't re-send
        window.history.replaceState({}, '');
        // Add user message immediately so it's visible before AI responds
        this.messages.update((msgs) => [
          ...msgs,
          {
            id: this.createId('user'),
            role: 'user' as const,
            text: autoPrompt,
            createdAt: Date.now(),
            attachments: []
          }
        ]);
        void this.generateAndApplyPatch();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load page.';
      this.setError('api', message);
    } finally {
      this.loading.set(false);
    }
  }

  // ── Page management ───────────────────────────────────────────────────────

  onSelectPage(pageId: string): void {
    if (pageId === this.currentPage()?.id) return;
    void this.router.navigate(['/pages', pageId]);
  }

  async onDuplicatePage(pageId: string): Promise<void> {
    try {
      const newPage = await this.bwaiPageService.duplicatePageAsync(pageId);
      this.pages.update((ps) => [newPage, ...ps]);
      void this.router.navigate(['/pages', newPage.id]);
    } catch (error) {
      this.setError('api', 'Failed to duplicate page.');
    }
  }

  async onDeletePage(pageId: string): Promise<void> {
    if (!confirm('Delete this page? This cannot be undone.')) return;
    try {
      await this.bwaiPageService.deletePageAsync(pageId);
      this.pages.update((ps) => ps.filter((p) => p.id !== pageId));
      const remaining = this.pages();
      if (remaining.length > 0) {
        void this.router.navigate(['/pages', remaining[0].id]);
      } else {
        this.currentPage.set(null);
        void this.router.navigate(['/pages']);
      }
    } catch (error) {
      this.setError('api', 'Failed to delete page.');
    }
  }

  onCopyPageUrl(slug: string): void {
    const url = `${location.origin}/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copiedToast.set(true);
      if (this.copiedToastTimeout) clearTimeout(this.copiedToastTimeout);
      this.copiedToastTimeout = setTimeout(() => this.copiedToast.set(false), 2000);
    });
  }

  onOpenSeoModal(pageId?: string): void {
    if (pageId && pageId !== this.currentPage()?.id) {
      void this.router.navigate(['/pages', pageId]);
    }
    this.showSeoModal.set(true);
  }

  async onSaveSeoModal(form: BwaiSeoFormValue): Promise<void> {
    const page = this.currentPage();
    if (!page) return;
    try {
      const updated = await this.bwaiPageService.updatePageAsync(page.id, {
        title: form.title,
        slug: form.slug,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        ogTitle: form.ogTitle,
        ogDescription: form.ogDescription,
        ogImageUrl: form.ogImageUrl
      });
      this.currentPage.set(updated);
      this.pages.update((ps) => ps.map((p) => p.id === updated.id ? {
        id: updated.id, slug: updated.slug, title: updated.title, seoTitle: updated.seoTitle, updatedAt: updated.updatedAt
      } : p));
    } catch (error) {
      this.setError('api', 'Failed to save page settings.');
    } finally {
      this.showSeoModal.set(false);
    }
  }

  async onSaveGenerationSettings(settings: BwaiGenerationSettings): Promise<void> {
    this.showGenerationSettings.set(false);
    this.systemPromptOverride.set(settings.systemPromptOverride);
    this.demoKey.set(settings.demoKey);
    this.selectedModelKey.set(settings.modelKey);

    const page = this.currentPage();
    if (!page) return;

    try {
      const updated = await this.bwaiPageService.updatePageAsync(page.id, {
        currentModelKey: settings.modelKey,
        fontPair: settings.fontPair,
        accentColor: settings.accentColor ?? undefined
      });
      this.currentPage.set(updated);

      // Apply font/accent changes to content.css
      this.applyPageStyleOverrides(updated.fontPair ?? null, updated.accentColor ?? null);
    } catch {
      // Settings still applied locally even if persist fails
    }
  }

  private applyPageStyleOverrides(fontPairId: string | null, accentColor: string | null): void {
    let css = this.files().css;
    if (!css) return;

    const pair = fontPairId
      ? BUILD_WITH_AI_FONT_PAIRS.find((p) => p.id === fontPairId)
      : null;

    if (pair && pair.id !== 'playfair-lato') {
      // Replace @import line
      css = css.replace(
        /@import url\([^)]+\);/,
        `@import url('${pair.googleFontsUrl}');`
      );
      // Replace or add --lp-serif
      if (/--lp-serif:/.test(css)) {
        css = css.replace(/--lp-serif:\s*[^;]+;/, `--lp-serif: '${pair.serifVar}', Georgia, serif;`);
      }
      // Replace or add --lp-sans
      if (/--lp-sans:/.test(css)) {
        css = css.replace(/--lp-sans:\s*[^;]+;/, `--lp-sans: '${pair.sansVar}', system-ui, sans-serif;`);
      }
    }

    if (accentColor) {
      const primary = normalizeHexColor(accentColor, '#ff3399');
      const mid   = mixHexColors(primary, '#ffffff', 0.68);
      const soft  = mixHexColors(primary, '#ffffff', 0.17);
      const faint = mixHexColors(primary, '#ffffff', 0.07);
      const r = parseInt(primary.slice(1, 3), 16);
      const g = parseInt(primary.slice(3, 5), 16);
      const b = parseInt(primary.slice(5, 7), 16);
      const shadow = `0 8px 32px rgba(${r},${g},${b},.24)`;

      const replacements: [RegExp, string][] = [
        [/--lp-primary:\s*[^;]+;/, `--lp-primary: ${primary};`],
        [/--lp-primary-mid:\s*[^;]+;/, `--lp-primary-mid: ${mid};`],
        [/--lp-primary-soft:\s*[^;]+;/, `--lp-primary-soft: ${soft};`],
        [/--lp-primary-faint:\s*[^;]+;/, `--lp-primary-faint: ${faint};`],
        [/--lp-shadow-primary:\s*[^;]+;/, `--lp-shadow-primary: ${shadow};`],
      ];

      for (const [pattern, replacement] of replacements) {
        if (pattern.test(css)) {
          css = css.replace(pattern, replacement);
        }
      }
    }

    this.files.update((f) => ({ ...f, css }));
  }

  async onVisualReview(patchId: string): Promise<void> {
    if (this.reviewingPatchId()) return;
    this.reviewingPatchId.set(patchId);
    try {
      const previewHtml = this.buildPreviewDocument(this.files(), []);
      const { review } = await this.apiService.requestVisualReview(previewHtml, this.selectedModel().key);

      // Append review as assistant message
      const reviewMsg: BuildWithAiChatMessage = {
        id: this.createId('assistant'),
        role: 'assistant',
        text: `**Visual Review:**\n\n${review}`,
        createdAt: Date.now(),
        attachments: []
      };
      this.messages.update((msgs) => [...msgs, reviewMsg]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Visual review failed.';
      this.setError('api', message);
    } finally {
      this.reviewingPatchId.set(null);
    }
  }

  async onCreateNewPage(result: NewPageResult): Promise<void> {
    this.showNewPageDialog.set(false);
    try {
      let currentFiles: BuildWithAiEditableFiles;
      if (result.mode === 'ai') {
        try {
          const baseline = await this.sessionService.loadBaselineFiles();
          currentFiles = { html: '', css: baseline.css, js: baseline.js };
        } catch {
          currentFiles = { html: '', css: '', js: '' };
        }
      } else {
        currentFiles = { html: '', css: '', js: '' };
      }

      const page = await this.bwaiPageService.createPageAsync({
        slug: result.slug,
        title: result.title,
        currentFiles,
        currentModelKey: this.selectedModelKey()
      });
      this.pages.update((ps) => [{ id: page.id, slug: page.slug, title: page.title, seoTitle: page.seoTitle, updatedAt: page.updatedAt }, ...ps]);
      void this.router.navigate(['/pages', page.id]);

      // For AI mode: auto-send description as first message
      if (result.mode === 'ai' && result.description) {
        await new Promise<void>((res) => setTimeout(res, 800)); // brief delay for navigation/load
        this.draftMessage.set(
          `Build a complete landing page for: ${result.description}. The lp- design system is already in content.css (tokens, utilities, section classes). Use lp- classes and --lp-* variables. Do NOT re-import fonts or redefine :root. Do NOT add header, nav, or footer — they are already in the shell.`
        );
        void this.onSend();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create page.';
      this.setError('api', message);
    }
  }

  // ── Versions tab ──────────────────────────────────────────────────────────

  async onSwitchTab(tab: 'chat' | 'versions'): Promise<void> {
    this.activeTab.set(tab);
    if (tab === 'versions' && this.versions().length === 0) {
      await this.loadVersions();
    }
  }

  private async loadVersions(): Promise<void> {
    const page = this.currentPage();
    if (!page) return;
    try {
      const versions = await this.bwaiPageService.listVersions(page.id).toPromise();
      this.versions.set(versions ?? []);
    } catch {
      // non-fatal
    }
  }

  async onRestoreVersion(version: BwaiPageVersion): Promise<void> {
    const page = this.currentPage();
    if (!page) return;
    try {
      const restoredFiles = await this.bwaiPageService.restoreVersionAsync(page.id, version.id);
      const { html: restoredHtmlWithIds } = this.ensureSectionIds(this.normalizeHtml(restoredFiles.html));
      const files = { ...restoredFiles, html: restoredHtmlWithIds };
      this.files.set(files);
      this.currentPage.update((p) => p ? { ...p, currentFiles: files } : p);
    } catch {
      this.setError('api', 'Failed to restore version.');
    }
  }

  trackByVersion(_index: number, v: BwaiPageVersion): string {
    return v.id;
  }

  // ── LocalStorage migration ────────────────────────────────────────────────

  async migrateFromLocalStorage(): Promise<BwaiPage | null> {
    try {
      const raw = globalThis.localStorage?.getItem(BUILD_WITH_AI_STORAGE_KEY);
      if (!raw) return null;

      const snapshot = JSON.parse(raw) as {
        files?: BuildWithAiEditableFiles;
        messages?: BuildWithAiChatMessage[];
        patchLogs?: BuildWithAiPatchLogEntry[];
        modelKey?: string;
      };

      if (!snapshot?.files?.html) return null;

      const page = await this.bwaiPageService.createPageAsync({
        slug: 'home',
        title: 'Home',
        currentFiles: snapshot.files,
        messages: snapshot.messages ?? [],
        currentModelKey: snapshot.modelKey ?? ''
      });

      globalThis.localStorage?.removeItem(BUILD_WITH_AI_STORAGE_KEY);
      return page;
    } catch {
      return null;
    }
  }

  // ── Existing methods (unchanged) ─────────────────────────────────────────

  onDraftChanged(value: string): void {
    this.draftMessage.set(value);
  }

  onModelChanged(modelKey: string): void {
    this.selectedModelKey.set(modelKey);
    void this.persistToMongo({ currentModelKey: modelKey });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void this.onSend();
    }
  }

  onSidebarResizeStart(event: PointerEvent): void {
    if (window.innerWidth <= MOBILE_SIDEBAR_BREAKPOINT) {
      return;
    }

    event.preventDefault();
    this.sidebarResizing.set(true);
    this.updateSidebarWidth(event.clientX);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }

  onSidebarResizePointerMove(event: PointerEvent): void {
    if (!this.sidebarResizing()) {
      return;
    }

    event.preventDefault();
    this.updateSidebarWidth(event.clientX);
  }

  onSidebarResizePointerUp(): void {
    if (!this.sidebarResizing()) {
      return;
    }

    this.sidebarResizing.set(false);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    this.writeLocalStorage(SIDEBAR_WIDTH_STORAGE_KEY, String(this.sidebarWidth()));
  }

  @HostListener('window:pointerup')
  @HostListener('window:mouseup')
  @HostListener('window:pointercancel')
  @HostListener('window:blur')
  onGlobalPointerEnd(): void {
    this.onSidebarResizePointerUp();
  }

  @HostListener('window:pointermove', ['$event'])
  @HostListener('window:mousemove', ['$event'])
  onGlobalPointerMove(event: PointerEvent | MouseEvent): void {
    if (!this.sidebarResizing()) {
      return;
    }

    this.updateSidebarWidth(event.clientX);
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.showImagePicker()) {
        this.showImagePicker.set(false);
      } else if (this.showSeoModal()) {
        this.showSeoModal.set(false);
      } else if (this.showNewPageDialog()) {
        this.showNewPageDialog.set(false);
      } else if (this.selectedSection()) {
        this.onDeselectSection();
      }
    }
  }

  onTextareaInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    this.resizeTextarea(target);
  }

  // ── Section selection ──────────────────────────

  onIframeLoad(): void {
    this.iframeReady = true;

    const win = this.previewIframe?.nativeElement.contentWindow;
    if (!win) return;

    const sel = this.selectedSection();
    if (sel) {
      win.postMessage({ type: 'bwai-highlight', selector: sel.selector }, '*');
    }
  }

  setViewportMode(mode: 'desktop' | 'mobile'): void {
    this.viewportMode.set(mode);
  }

  onDeselectSection(): void {
    this.selectedSection.set(null);
    this.previewIframe?.nativeElement.contentWindow?.postMessage(
      { type: 'bwai-highlight', selector: null },
      '*'
    );
  }

  // ── Section reordering ─────────────────────────

  onMoveSectionUp(): void {
    const sel = this.selectedSection();
    if (!sel || sel.sectionIndex <= 0) return;

    this.swapHtmlSections(sel.sectionIndex, sel.sectionIndex - 1);
    this.selectedSection.update((s) => (s ? { ...s, sectionIndex: s.sectionIndex - 1 } : null));
    void this.persistToMongo({ currentFiles: this.files() });
  }

  onMoveSectionDown(): void {
    const sel = this.selectedSection();
    if (!sel || sel.sectionIndex >= sel.totalSections - 1) return;

    this.swapHtmlSections(sel.sectionIndex, sel.sectionIndex + 1);
    this.selectedSection.update((s) => (s ? { ...s, sectionIndex: s.sectionIndex + 1 } : null));
    void this.persistToMongo({ currentFiles: this.files() });
  }

  // ── Section visibility ─────────────────────────

  onToggleHideSection(): void {
    const sel = this.selectedSection();
    if (!sel || !sel.bwaiId) return;

    const isHidden = this.hiddenSections().includes(sel.bwaiId);
    this.hiddenSections.update((hs) =>
      isHidden ? hs.filter((s) => s !== sel.bwaiId) : [...hs, sel.bwaiId]
    );
    void this.persistToMongo({ hiddenSections: this.hiddenSections() });
  }

  onRemoveSection(): void {
    const sel = this.selectedSection();
    if (!sel) return;
    if (!confirm(`Remove the "${sel.label}" section? This cannot be undone.`)) return;
    this.removeHtmlSection(sel.sectionIndex);
    this.selectedSection.set(null);
    void this.persistToMongo({ currentFiles: this.files() });
  }

  // ── Insert section ─────────────────────────────

  onInsertSection(type: string): void {
    const sel = this.selectedSection();
    const afterText = sel
      ? ` after the ${sel.selector} section (index ${sel.sectionIndex})`
      : ' at the end of the page';

    this.draftMessage.set(
      `Insert a "${type}" section${afterText}. Match the existing lp- CSS class naming convention, rose #FF3399 accent, and design tokens.`
    );

    setTimeout(() => {
      const ta = this.composerTextarea?.nativeElement;
      if (ta) {
        ta.focus();
        this.resizeTextarea(ta);
      }
    }, 0);
  }

  // ── Send ───────────────────────────────────────

  async onSend(): Promise<void> {
    if (!this.canSend()) {
      return;
    }

    const userMessage: BuildWithAiChatMessage = {
      id: this.createId('user'),
      role: 'user',
      text: this.draftMessage().trim(),
      createdAt: Date.now(),
      attachments: this.pendingAttachments()
    };

    this.messages.update((messages) => [...messages, userMessage]);
    this.draftMessage.set('');
    this.pendingAttachments.set([]);
    this.activeError.set(null);
    this.resetTextareaHeight();

    await this.generateAndApplyPatch();
  }

  async onStartNewSession(): Promise<void> {
    this.activeError.set(null);
    this.pendingAttachments.set([]);
    this.selectedSection.set(null);

    this.messages.set([
      {
        id: this.createId('assistant'),
        role: 'assistant',
        text: 'Chat history cleared. Current page content is preserved.',
        createdAt: Date.now(),
        attachments: []
      }
    ]);
    this.patchLogs.set([]);

    void this.persistToMongo({ messages: this.messages(), patchLogs: [] });
  }

  async onFileInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files?.length) {
      return;
    }

    await this.appendAttachments(files);
    input.value = '';
  }

  async onImagePickerConfirmed(selections: UnsplashPickerSelection[]): Promise<void> {
    this.showImagePicker.set(false);

    const unsplashAttachments: BuildWithAiAttachment[] = selections
      .filter((s) => s.source === 'unsplash')
      .map((s) => ({
        id: this.createId('att'),
        name: s.description || 'Unsplash image',
        mimeType: 'image/jpeg',
        sizeBytes: 0,
        kind: 'url' as const,
        url: s.url
      }));

    if (unsplashAttachments.length) {
      this.pendingAttachments.update((prev) => [...prev, ...unsplashAttachments]);
    }

    const filePicks = selections.filter((s) => s.source === 'upload' && s.file).map((s) => s.file!);
    if (filePicks.length) {
      await this.appendAttachments(filePicks);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);

    const files = event.dataTransfer?.files;
    if (!files?.length) {
      return;
    }

    void this.appendAttachments(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  removePendingAttachment(attachmentId: string): void {
    this.pendingAttachments.update((attachments) => attachments.filter((attachment) => attachment.id !== attachmentId));
  }

  trackByMessage(_index: number, message: BuildWithAiChatMessage): string {
    return message.id;
  }

  trackByPatchLog(_index: number, log: BuildWithAiPatchLogEntry): string {
    return log.id;
  }

  trackByPage(_index: number, page: BwaiPageSummary): string {
    return page.id;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async generateAndApplyPatch(): Promise<void> {
    this.processing.set(true);
    let lastRawDiff: string | null = null;

    try {
      // Keep only the last 10 messages to avoid unbounded context growth
      const allMessages = this.buildMessagesWithSectionContext();
      const trimmedMessages = allMessages.length > 10
        ? allMessages.slice(-10)
        : allMessages;

      const response = await this.apiService.requestPatch(
        {
          modelKey: this.selectedModel().key,
          messages: trimmedMessages,
          files: this.files(),
          systemPromptOverride: this.systemPromptOverride()
        },
        this.demoKey() ?? undefined
      );

      if (!response.edits?.length) {
        throw new Error('AI response did not include any edits.');
      }

      lastRawDiff = JSON.stringify(response.edits);
      const diffResult = this.diffService.applyEdits(this.files(), response.edits);
      const validation = this.syntaxValidator.validate(diffResult.files);

      if (!validation.valid) {
        const details = validation.issues.map((issue) => `${issue.file}: ${issue.message}`).join(' | ');
        this.pushPatchLog(JSON.stringify(response.edits), 'rejected', details);
        this.setError('validation', `Patch rejected: ${details}`);

        this.messages.update((messages) => [
          ...messages,
          {
            id: this.createId('assistant'),
            role: 'assistant',
            text: response.assistantText || 'Patch failed validation and was not applied.',
            createdAt: Date.now(),
            attachments: [],
            errorCategory: 'validation'
          }
        ]);

        void this.persistToMongo({ messages: this.messages(), patchLogs: this.patchLogs() });
        // Save rejected version
        const page = this.currentPage();
        if (page) {
          void this.bwaiPageService.saveVersionAsync(page.id, { files: this.files(), diff: JSON.stringify(response.edits), status: 'rejected' });
        }
        return;
      }

      const patchedHtml = this.normalizeHtml(diffResult.files.html);
      const { html: patchedHtmlWithIds } = this.ensureSectionIds(patchedHtml);
      this.files.set({ ...diffResult.files, html: patchedHtmlWithIds });
      this.pushPatchLog(JSON.stringify(response.edits), 'applied', `Touched ${diffResult.touchedFiles.join(', ')}`);

      const warningsText = response.warnings.length ? `\n\nWarnings:\n- ${response.warnings.join('\n- ')}` : '';
      this.messages.update((messages) => [
        ...messages,
        {
          id: this.createId('assistant'),
          role: 'assistant',
          text: `${response.assistantText}${warningsText}`.trim(),
          createdAt: Date.now(),
          attachments: []
        }
      ]);

      // Persist to MongoDB and save version in parallel
      const page = this.currentPage();
      if (page) {
        void Promise.all([
          this.persistToMongo({ currentFiles: diffResult.files, messages: this.messages(), patchLogs: this.patchLogs() }),
          this.bwaiPageService.saveVersionAsync(page.id, { files: diffResult.files, diff: JSON.stringify(response.edits), status: 'applied' }).then((v) => {
            this.versions.update((vs) => [v, ...vs]);
          })
        ]);
      }
    } catch (error) {
      if (lastRawDiff) {
        console.error('[BWAI] Raw diff that caused the error:\n', lastRawDiff);
      }
      const message = this.formatApiError(error);
      this.setError('api', message);

      this.messages.update((messages) => [
        ...messages,
        {
          id: this.createId('assistant'),
          role: 'assistant',
          text: message,
          createdAt: Date.now(),
          attachments: [],
          errorCategory: 'api'
        }
      ]);

      if (lastRawDiff) {
        this.pushPatchLog(lastRawDiff, 'rejected', message);
      }
      void this.persistToMongo({ messages: this.messages(), patchLogs: this.patchLogs() });
    } finally {
      this.processing.set(false);
    }
  }

  private buildMessagesWithSectionContext(): BuildWithAiChatMessage[] {
    const messages = this.messages();
    const sel = this.selectedSection();

    if (!sel || messages.length === 0) return messages;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'user') return messages;

    const contextPrefix =
      `[Editing section: ${sel.selector} — index ${sel.sectionIndex} of ${sel.totalSections - 1}]\n` +
      `Section HTML:\n${sel.outerHtml}\n\n` +
      `User request: `;

    return [
      ...messages.slice(0, -1),
      { ...lastMsg, text: `${contextPrefix}${lastMsg.text}` }
    ];
  }

  private normalizeHtml(html: string): string {
    const container = document.createElement('div');
    container.innerHTML = html.trim();
    if (container.children.length === 1 && container.children[0].tagName === 'MAIN') {
      return (container.children[0] as HTMLElement).innerHTML;
    }
    return html;
  }

  private swapHtmlSections(indexA: number, indexB: number): void {
    const container = document.createElement('div');
    container.innerHTML = this.normalizeHtml(this.files().html);
    const children = Array.from(container.children);

    if (indexA >= children.length || indexB >= children.length) return;

    const a = children[indexA];
    const b = children[indexB];

    if (indexA < indexB) {
      container.insertBefore(b, a);
    } else {
      container.insertBefore(a, b);
    }

    this.files.update((f) => ({ ...f, html: container.innerHTML }));
  }

  private removeHtmlSection(index: number): void {
    const container = document.createElement('div');
    container.innerHTML = this.normalizeHtml(this.files().html);
    const children = Array.from(container.children);
    if (index >= children.length) return;
    children[index].remove();
    this.files.update((f) => ({ ...f, html: container.innerHTML }));
  }

  /** Ensures every top-level section has a unique data-bwai-id attribute.
   *  Returns the (possibly modified) HTML and whether any IDs were added. */
  private ensureSectionIds(html: string): { html: string; changed: boolean } {
    const container = document.createElement('div');
    container.innerHTML = this.normalizeHtml(html);
    let changed = false;
    Array.from(container.children).forEach((child) => {
      if (!child.getAttribute('data-bwai-id')) {
        child.setAttribute('data-bwai-id', 'bwai-' + Math.random().toString(36).slice(2, 10));
        changed = true;
      }
    });
    return { html: container.innerHTML, changed };
  }

  private async appendAttachments(fileList: FileList | File[]): Promise<void> {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      this.setError('validation', 'Only image files are supported for drag and drop.');
      return;
    }

    this.uploadingCount.update((n) => n + files.length);
    const uploaded: BuildWithAiAttachment[] = [];
    const failed: string[] = [];

    await Promise.all(
      files.map(async (file) => {
        try {
          const url = await this.apiService.uploadImageAsync(file);
          uploaded.push({
            id: this.createId('att'),
            name: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            kind: 'url',
            url
          });
        } catch {
          failed.push(file.name);
        } finally {
          this.uploadingCount.update((n) => n - 1);
        }
      })
    );

    if (uploaded.length) this.pendingAttachments.update((e) => [...e, ...uploaded]);
    if (failed.length) this.setError('api', `Failed to upload: ${failed.join(', ')}`);
  }


  private sendToIframe(message: object): void {
    this.previewIframe?.nativeElement.contentWindow?.postMessage(message, '*');
  }

  private async persistToMongo(patch: {
    currentFiles?: BuildWithAiEditableFiles;
    messages?: BuildWithAiChatMessage[];
    patchLogs?: BuildWithAiPatchLogEntry[];
    currentModelKey?: string;
    hiddenSections?: string[];
  }): Promise<void> {
    const page = this.currentPage();
    if (!page) return;
    try {
      await this.bwaiPageService.updatePageAsync(page.id, patch);
    } catch (err) {
      console.error('[persistToMongo]', err);
    }
  }

  private buildPreviewDocument(files: BuildWithAiEditableFiles, hiddenSections: string[] = []): string {
    const safeCss = files.css.replace(/<\/style>/gi, '<\\/style>');
    const safeJs = files.js.replace(/<\/script>/gi, '<\\/script>');
    // Hidden sections use the bwai-hidden class (applied via postMessage in the live builder).
    // On initial srcdoc load we apply via data attribute selector so sections are already collapsed.
    const hiddenCss = hiddenSections.length
      ? hiddenSections.map((id) => `[data-bwai-id="${id}"]`).join(',') + '{opacity:0.25!important;max-height:50px!important;overflow:hidden!important;}'
      : '';

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Build with AI preview</title>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
    <style>${BUILD_WITH_AI_STATIC_SHELL_CSS}</style>
    <style id="BuildWithAiContentStyle">${safeCss}</style>${hiddenCss ? `\n    <style id="BuildWithAiHiddenSections">${hiddenCss}</style>` : ''}
  </head>
  <body>
    ${BUILD_WITH_AI_HEADER_HTML}
    <main id="EditableContentRoot">${files.html}</main>
    ${BUILD_WITH_AI_FOOTER_HTML}

    <script>
      (function () {
        window.addEventListener('error', function (event) {
          parent.postMessage({
            type: 'build-with-ai-preview-error',
            message: event && event.message ? event.message : 'Runtime error in preview script.'
          }, '*');
        });

        window.addEventListener('unhandledrejection', function (event) {
          var reason = event && event.reason;
          var text = reason && reason.message ? reason.message : String(reason || 'Unhandled promise rejection in preview script.');
          parent.postMessage({
            type: 'build-with-ai-preview-error',
            message: text
          }, '*');
        });

        document.addEventListener('click', function (event) {
          var target = event.target;
          if (!(target instanceof Element)) {
            return;
          }

          if (target.matches('[data-mobile-menu-open]')) {
            var menuOpen = document.getElementById('buildWithAiMobileMenu');
            if (menuOpen) {
              menuOpen.classList.add('active');
            }
          }

          if (target.matches('[data-mobile-menu-close]')) {
            var menuClose = document.getElementById('buildWithAiMobileMenu');
            if (menuClose) {
              menuClose.classList.remove('active');
            }
          }

          var dropdownToggle = target.closest('[data-mobile-dd-toggle]');
          if (dropdownToggle) {
            var key = dropdownToggle.getAttribute('data-mobile-dd-toggle');
            if (!key) {
              return;
            }

            var dropDown = document.querySelector('[data-mobile-dd="' + key + '"]');
            if (dropDown) {
              dropDown.classList.toggle('active');
            }
          }
        });
      })();
    </script>

    <script>
      /* ---- section toolbar ---- */
      (function () {
        var hoveredEl = null;
        var toolbar = null;
        var toolbarSection = null;
        var toolbarOrigPos = '';
        var insertMenu = null;

        var INSERT_TYPES = ['Hero','Feature Cards','Testimonials','Stats Bar','FAQ','CTA Banner','Logo Cloud','Contact Form'];

        /* ── helpers ── */
        function getCleanOuterHtml(el) {
          var clone = el.cloneNode(true);
          var bwaiEls = clone.querySelectorAll('.bwai-toolbar');
          for (var i = 0; i < bwaiEls.length; i++) bwaiEls[i].remove();
          clone.className = (clone.className || '').replace(/\\bbwai-\\S*/g, '').trim();
          if (clone.className === '') clone.removeAttribute('class');
          return clone.outerHTML;
        }

        function getSection(target) {
          var root = document.getElementById('EditableContentRoot');
          if (!root || !(target instanceof Element)) return null;
          var node = target;
          while (node && node.parentElement !== root) node = node.parentElement;
          return (node && node.parentElement === root) ? node : null;
        }

        function clearClass(cls) {
          var els = document.querySelectorAll('.' + cls);
          for (var i = 0; i < els.length; i++) els[i].classList.remove(cls);
        }

        function getSectionMeta(el) {
          var root = document.getElementById('EditableContentRoot');
          var siblings = root ? Array.from(root.children) : [el];
          var idx = siblings.indexOf(el);
          var rawClasses = (el.className || '').replace(/bwai-\\S*/g, '').trim().split(/\\s+/);
          var firstClass = rawClasses.find(function (c) { return c.length > 0; }) || '';
          var selector = firstClass ? ('.' + firstClass) : ('section:nth-child(' + (idx + 1) + ')');
          var bwaiId = el.getAttribute('data-bwai-id') || '';
          return { idx: idx, total: siblings.length, selector: selector, bwaiId: bwaiId };
        }

        /* ── insert popup ── */
        function hideInsertPopup() {
          if (insertMenu) { insertMenu.remove(); insertMenu = null; }
        }

        function showInsertPopup(anchorBtn) {
          hideInsertPopup();
          var menu = document.createElement('div');
          menu.className = 'bwai-insert-popup';
          INSERT_TYPES.forEach(function(type) {
            var item = document.createElement('button');
            item.textContent = type;
            item.addEventListener('click', function(e) {
              e.stopPropagation();
              hideInsertPopup();
              parent.postMessage({ type: 'bwai-insert', sectionType: type }, '*');
            });
            menu.appendChild(item);
          });
          var sep = document.createElement('div');
          sep.className = 'bwai-insert-sep';
          menu.appendChild(sep);
          var custom = document.createElement('button');
          custom.className = 'bwai-insert-custom';
          custom.textContent = 'Custom\u2026';
          custom.addEventListener('click', function(e) {
            e.stopPropagation();
            hideInsertPopup();
            parent.postMessage({ type: 'bwai-insert', sectionType: 'custom' }, '*');
          });
          menu.appendChild(custom);
          // Position near the anchor button
          document.body.appendChild(menu);
          var ar = anchorBtn.getBoundingClientRect();
          var mr = menu.getBoundingClientRect();
          var top = ar.bottom + 6;
          var left = ar.left;
          if (left + mr.width > window.innerWidth - 8) left = ar.right - mr.width;
          menu.style.top = top + 'px';
          menu.style.left = left + 'px';
          insertMenu = menu;
        }

        document.addEventListener('click', function(e) {
          if (insertMenu && !insertMenu.contains(e.target)) hideInsertPopup();
        }, true);

        /* ── toolbar ── */
        function removeToolbar() {
          if (toolbar && toolbar.parentElement) {
            if (toolbarSection && toolbarOrigPos !== null) {
              toolbarSection.style.position = toolbarOrigPos;
            }
            toolbar.parentElement.removeChild(toolbar);
          }
          toolbar = null;
          toolbarSection = null;
          toolbarOrigPos = '';
        }

        /* ── SVG icon strings ── */
        var IC_UP     = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
        var IC_DOWN   = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>';
        var IC_HIDE   = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
        var IC_SHOW   = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        var IC_TRASH  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
        var IC_INSERT = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        var IC_SELECT = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-7 1-4 7z"/></svg>';
        var IC_COPY   = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        var IC_CHECK  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

        function buildToolbar(el, idx, total) {
          removeToolbar();

          toolbarOrigPos = el.style.position || '';
          var computed = window.getComputedStyle(el).position;
          if (computed === 'static') el.style.position = 'relative';
          toolbarSection = el;

          var t = document.createElement('div');
          t.className = 'bwai-toolbar';

          function grp() {
            var g = document.createElement('div');
            g.className = 'bwai-group';
            return g;
          }
          function btn(action, icon, label, disabled) {
            var b = document.createElement('button');
            b.setAttribute('data-bwai', action);
            b.innerHTML = icon + '<span>' + label + '</span>';
            if (disabled) b.disabled = true;
            return b;
          }

          var isHidden = el.classList.contains('bwai-hidden');

          // Group 1: Move
          var g1 = grp();
          g1.appendChild(btn('move-up',   IC_UP,     'Up',    idx === 0));
          g1.appendChild(btn('move-down', IC_DOWN,   'Down',  idx === total - 1));
          t.appendChild(g1);

          // Group 2: Visibility
          var g2 = grp();
          g2.appendChild(btn('hide', isHidden ? IC_SHOW : IC_HIDE, isHidden ? 'Show' : 'Hide', false));
          t.appendChild(g2);

          // Group 3: Remove
          var g3 = grp();
          var removeBtn = btn('remove', IC_TRASH, 'Remove', false);
          removeBtn.classList.add('bwai-btn--danger');
          g3.appendChild(removeBtn);
          t.appendChild(g3);

          // Group 4: Insert after
          var g4 = grp();
          g4.appendChild(btn('insert', IC_INSERT, 'Insert after', false));
          t.appendChild(g4);

          // Group 5: Select + Copy ID
          var g5 = grp();
          g5.appendChild(btn('select',  IC_SELECT, 'Select',  false));
          g5.appendChild(btn('copy-id', IC_COPY,   'Copy ID', false));
          t.appendChild(g5);

          t.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-bwai]') : null;
            if (!b || b.disabled) return;
            e.stopPropagation();
            e.preventDefault();
            var action = b.getAttribute('data-bwai');

            // Copy ID is handled locally — no postMessage needed
            if (action === 'copy-id') {
              var secId = toolbarSection ? (toolbarSection.getAttribute('data-bwai-id') || '') : '';
              if (navigator.clipboard) { navigator.clipboard.writeText(secId).catch(function() {}); }
              b.innerHTML = IC_CHECK + '<span>Copied!</span>';
              setTimeout(function() { b.innerHTML = IC_COPY + '<span>Copy ID</span>'; }, 1500);
              return;
            }

            // Insert is handled locally — show popup in iframe
            if (action === 'insert') {
              showInsertPopup(b);
              return;
            }

            var m2 = getSectionMeta(toolbarSection);
            var lbl = m2.selector.replace(/^\\.lp-/, '').replace(/-/g, ' ');
            lbl = lbl.charAt(0).toUpperCase() + lbl.slice(1);
            // Update Angular's selectedSection so move/hide/remove handlers target the right section
            parent.postMessage({
              type: 'bwai-selected',
              selector: m2.selector,
              bwaiId: m2.bwaiId,
              label: lbl,
              sectionIndex: m2.idx,
              totalSections: m2.total,
              outerHtml: getCleanOuterHtml(toolbarSection)
            }, '*');
            parent.postMessage({ type: 'bwai-action', action: action }, '*');
          });

          el.insertBefore(t, el.firstChild);
          toolbar = t;
        }

        /* ── message handler ── */
        window.addEventListener('message', function (event) {
          var d = event.data;
          if (!d || typeof d !== 'object') return;

          if (d.type === 'bwai-highlight') {
            clearClass('bwai-selected');
            if (d.selector) {
              var el = document.querySelector(d.selector);
              if (el) {
                el.classList.add('bwai-selected');
                var m = getSectionMeta(el);
                buildToolbar(el, m.idx, m.total);
              }
            }
            // if selector is null, just clear selected — toolbar follows hover
          }

          if (d.type === 'bwai-patch') {
            var styleEl = document.getElementById('BuildWithAiContentStyle');
            if (styleEl && d.css != null) styleEl.textContent = d.css;

            var root2 = document.getElementById('EditableContentRoot');
            if (root2 && d.html != null) root2.innerHTML = d.html;

            var oldScript = document.getElementById('BuildWithAiContentScript');
            var jsContent = d.js != null ? d.js : (oldScript ? oldScript.textContent : '');
            if (oldScript) oldScript.remove();
            if (jsContent) {
              var newScript = document.createElement('script');
              newScript.id = 'BuildWithAiContentScript';
              newScript.textContent = jsContent;
              document.body.appendChild(newScript);
            }
          }

          if (d.type === 'bwai-hidden-css') {
            // Remove bwai-hidden class from all currently hidden sections
            var prevHidden = document.querySelectorAll('.bwai-hidden');
            for (var hi = 0; hi < prevHidden.length; hi++) prevHidden[hi].classList.remove('bwai-hidden');
            // Apply to new set by data-bwai-id
            if (d.ids && d.ids.length) {
              for (var hj = 0; hj < d.ids.length; hj++) {
                var hel = document.querySelector('[data-bwai-id="' + d.ids[hj] + '"]');
                if (hel) hel.classList.add('bwai-hidden');
              }
            }
          }

          if (d.type === 'bwai-update-toolbar') {
            if (toolbar && toolbarSection) {
              var m2 = getSectionMeta(toolbarSection);
              var ups = toolbar.querySelector('[data-bwai="move-up"]');
              var dns = toolbar.querySelector('[data-bwai="move-down"]');
              if (ups) ups.disabled = (m2.idx === 0);
              if (dns) dns.disabled = (m2.idx === m2.total - 1);
            }
          }
        });

        /* ── hover ── */
        document.addEventListener('mousemove', function (event) {
          // Don't react when mouse is over the toolbar itself
          if (toolbar && toolbar.contains(event.target)) return;
          var sec = getSection(event.target);
          if (sec === hoveredEl) return;
          clearClass('bwai-hover');
          hoveredEl = sec;
          if (sec) {
            sec.classList.add('bwai-hover');
            var hm = getSectionMeta(sec);
            buildToolbar(sec, hm.idx, hm.total);
          } else {
            removeToolbar();
          }
        });

        /* ── CSS ── */
        var style = document.createElement('style');
        style.textContent = [
          '.bwai-hover{outline:2px dashed #ff3399!important;outline-offset:-2px}',
          '.bwai-selected{outline:2px solid #ff3399!important;outline-offset:-2px;background-color:rgba(255,51,153,0.04)!important}',
          '.bwai-hidden{opacity:0.25!important;max-height:50px!important;overflow:hidden!important}',
          '.bwai-toolbar{position:absolute;top:10px;left:10px;z-index:99999;display:flex;gap:5px;pointer-events:all}',
          '.bwai-group{display:flex;background:#fff;border:1px solid rgba(0,0,0,0.1);border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.12);overflow:hidden}',
          '.bwai-toolbar button{border:none;border-right:1px solid #f0f0f0;background:#fff;padding:5px 9px;font-size:11px;font-weight:600;cursor:pointer;color:#555;font-family:-apple-system,sans-serif;white-space:nowrap;display:flex;align-items:center;gap:4px;transition:background .1s,color .1s}',
          '.bwai-toolbar button:last-child{border-right:none}',
          '.bwai-toolbar button:hover:not(:disabled){background:#fff0f7;color:#ff3399}',
          '.bwai-toolbar button:disabled{opacity:.3;cursor:not-allowed}',
          '.bwai-btn--danger:hover:not(:disabled){background:#fff5f5!important;color:#e53e3e!important}',
          '.bwai-insert-popup{position:fixed;z-index:100000;background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);padding:4px;min-width:160px}',
          '.bwai-insert-popup button{display:block;width:100%;border:none;background:none;padding:6px 12px;text-align:left;font-size:12px;font-weight:500;cursor:pointer;border-radius:4px;color:#333;font-family:-apple-system,sans-serif}',
          '.bwai-insert-popup button:hover{background:#fff0f7;color:#ff3399}',
          '.bwai-insert-sep{height:1px;background:#f0f0f0;margin:4px 0}',
          '.bwai-insert-custom{color:#888!important;font-style:italic}'
        ].join('');
        document.head.appendChild(style);
      })();
    </script>

    <script>
      /* ---- inline contenteditable editing ---- */
      (function () {
        var root = document.getElementById('EditableContentRoot');

        function getCleanHtml() {
          if (!root) return '';
          var clone = root.cloneNode(true);
          var ces = clone.querySelectorAll('[contenteditable]');
          for (var i = 0; i < ces.length; i++) ces[i].removeAttribute('contenteditable');
          var extras = clone.querySelectorAll('.bwai-inline-popup,.bwai-toolbar,.bwai-link-bar');
          for (var j = 0; j < extras.length; j++) extras[j].remove();
          return clone.innerHTML;
        }

        function save() {
          parent.postMessage({ type: 'bwai-inline-edit-save', html: getCleanHtml() }, '*');
        }

        function showPopup(fields, onConfirm) {
          var existing = document.querySelector('.bwai-inline-popup');
          if (existing) existing.remove();
          var popup = document.createElement('div');
          popup.className = 'bwai-inline-popup';
          popup.style.cssText = 'position:fixed;z-index:999999;background:#fff;border:1px solid #ddd;border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px;box-shadow:0 4px 16px rgba(0,0,0,.18);min-width:260px';
          var inputs = fields.map(function(f) {
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.placeholder = f.placeholder;
            inp.value = f.value;
            inp.style.cssText = 'border:1px solid #ddd;border-radius:4px;padding:5px 8px;font-size:12px;width:100%;box-sizing:border-box;outline:none';
            inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') btn.click(); if (e.key === 'Escape') popup.remove(); });
            popup.appendChild(inp);
            return inp;
          });
          var btn = document.createElement('button');
          btn.textContent = 'Save';
          btn.style.cssText = 'padding:5px 12px;border:1px solid #ff3399;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;background:#ff3399;color:#fff;align-self:flex-end';
          btn.addEventListener('click', function() { onConfirm(inputs.map(function(i) { return i.value; })); popup.remove(); });
          popup.appendChild(btn);
          document.body.appendChild(popup);
          setTimeout(function() {
            inputs[0].focus(); inputs[0].select();
            var vw = window.innerWidth, vh = window.innerHeight;
            var pr = popup.getBoundingClientRect();
            var left = Math.min(popup._anchorX || 20, vw - pr.width - 8);
            var top = Math.min(popup._anchorY || 20, vh - pr.height - 8);
            popup.style.left = Math.max(8, left) + 'px';
            popup.style.top = Math.max(8, top) + 'px';
          }, 0);
          document.addEventListener('mousedown', function closePopup(e) {
            if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('mousedown', closePopup); }
          }, true);
          return popup;
        }

        function showLinkEditBar(anchor) {
          var existing = document.querySelector('.bwai-link-bar');
          if (existing && existing._anchor === anchor) return;
          if (existing) existing.remove();

          var origHref = anchor.getAttribute('href') || '';
          var origTarget = anchor.getAttribute('target') || '';
          var origRel = anchor.getAttribute('rel') || '';

          var bar = document.createElement('div');
          bar.className = 'bwai-inline-popup bwai-link-bar';
          bar._anchor = anchor;
          bar.style.cssText = 'position:fixed;z-index:999999;background:#fff;border:1px solid #ddd;border-radius:8px;padding:8px 10px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,.18);min-width:300px';

          var urlInput = document.createElement('input');
          urlInput.type = 'text';
          urlInput.placeholder = 'URL';
          urlInput.value = origHref;
          urlInput.style.cssText = 'border:1px solid #ddd;border-radius:4px;padding:4px 8px;font-size:12px;flex:1;outline:none;min-width:0';

          var tabLabel = document.createElement('label');
          tabLabel.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;color:#666;flex-shrink:0;cursor:pointer;white-space:nowrap';
          var tabCheck = document.createElement('input');
          tabCheck.type = 'checkbox';
          tabCheck.checked = origTarget === '_blank';
          tabLabel.appendChild(tabCheck);
          tabLabel.appendChild(document.createTextNode(' New tab'));

          var saveBtn = document.createElement('button');
          saveBtn.textContent = '✓';
          saveBtn.title = 'Save';
          saveBtn.style.cssText = 'width:24px;height:24px;border:1px solid #22c55e;border-radius:4px;background:#22c55e;color:#fff;font-size:13px;cursor:pointer;flex-shrink:0;padding:0;line-height:1';

          var cancelBtn = document.createElement('button');
          cancelBtn.textContent = '✕';
          cancelBtn.title = 'Cancel';
          cancelBtn.style.cssText = 'width:24px;height:24px;border:1px solid #111;border-radius:4px;background:#111;color:#fff;font-size:11px;cursor:pointer;flex-shrink:0;padding:0;line-height:1';

          function applyAndClose() {
            var href = urlInput.value.trim();
            if (href) anchor.setAttribute('href', href); else anchor.removeAttribute('href');
            if (tabCheck.checked) { anchor.setAttribute('target', '_blank'); anchor.setAttribute('rel', 'noopener noreferrer'); }
            else { anchor.removeAttribute('target'); anchor.removeAttribute('rel'); }
            save();
            bar.remove();
            document.removeEventListener('focusin', onFocusIn);
          }

          function cancelAndClose() {
            if (origHref) anchor.setAttribute('href', origHref); else anchor.removeAttribute('href');
            if (origTarget) anchor.setAttribute('target', origTarget); else anchor.removeAttribute('target');
            if (origRel) anchor.setAttribute('rel', origRel); else anchor.removeAttribute('rel');
            bar.remove();
            document.removeEventListener('focusin', onFocusIn);
          }

          saveBtn.addEventListener('click', function(e) { e.stopPropagation(); applyAndClose(); });
          cancelBtn.addEventListener('click', function(e) { e.stopPropagation(); cancelAndClose(); });
          urlInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); applyAndClose(); }
            if (e.key === 'Escape') cancelAndClose();
          });
          tabCheck.addEventListener('change', function() {
            if (tabCheck.checked) { anchor.setAttribute('target', '_blank'); anchor.setAttribute('rel', 'noopener noreferrer'); }
            else { anchor.removeAttribute('target'); anchor.removeAttribute('rel'); }
          });

          bar.appendChild(urlInput);
          bar.appendChild(tabLabel);
          bar.appendChild(saveBtn);
          bar.appendChild(cancelBtn);
          document.body.appendChild(bar);

          setTimeout(function() {
            var rect = anchor.getBoundingClientRect();
            var vw = window.innerWidth, vh = window.innerHeight;
            var br = bar.getBoundingClientRect();
            var top = rect.bottom + 4;
            if (top + br.height > vh - 8) top = rect.top - br.height - 4;
            bar.style.left = Math.max(8, Math.min(rect.left, vw - br.width - 8)) + 'px';
            bar.style.top = Math.max(8, top) + 'px';
            urlInput.focus(); urlInput.select();
          }, 0);

          function onFocusIn(e) {
            if (!bar.contains(e.target) && e.target !== anchor) {
              applyAndClose();
            }
          }
          document.addEventListener('focusin', onFocusIn);
        }

        function showImagePopup(img) {
          var rect = img.getBoundingClientRect();
          var popup = showPopup(
            [
              { placeholder: 'Image URL', value: img.getAttribute('src') || '' },
              { placeholder: 'Alt text', value: img.getAttribute('alt') || '' }
            ],
            function(vals) { img.setAttribute('src', vals[0]); img.setAttribute('alt', vals[1]); save(); }
          );
          popup._anchorX = rect.left;
          popup._anchorY = rect.bottom + 4;
        }

        function enableEditing() {
          if (!root) return;
          var textEls = root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,span,button');
          for (var i = 0; i < textEls.length; i++) {
            var el = textEls[i];
            if (el.closest('.bwai-toolbar') || el.closest('.bwai-inline-popup')) continue;
            if (el.contentEditable === 'true') continue;
            el.contentEditable = 'true';
            el.addEventListener('blur', save);
          }
          var links = root.querySelectorAll('a');
          for (var j = 0; j < links.length; j++) {
            var a = links[j];
            if (a.closest('.bwai-toolbar') || a.closest('.bwai-inline-popup') || a.closest('.bwai-link-bar')) continue;
            if (a.dataset.bwaiEditBound) continue;
            a.dataset.bwaiEditBound = '1';
            a.contentEditable = 'true';
            a.addEventListener('blur', save);
            (function(el) {
              el.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                el.focus();
              });
              el.addEventListener('focus', function() { showLinkEditBar(el); });
            })(a);
          }
          var imgs = root.querySelectorAll('img');
          for (var k = 0; k < imgs.length; k++) {
            var img = imgs[k];
            if (img.closest('.bwai-toolbar') || img.closest('.bwai-inline-popup')) continue;
            if (img.dataset.bwaiEditBound) continue;
            img.dataset.bwaiEditBound = '1';
            img.style.cursor = 'pointer';
            img.addEventListener('click', function(e) { e.stopPropagation(); showImagePopup(this); });
          }
        }

        enableEditing();

        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'bwai-patch') {
            setTimeout(enableEditing, 0);
          }
        });
      })();
    </script>

    <script id="BuildWithAiContentScript">${safeJs}</script>
  </body>
</html>`;
  }

  private createId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private restoreSidebarWidth(): void {
    const rawValue = this.readLocalStorage(SIDEBAR_WIDTH_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    this.sidebarWidth.set(this.clampSidebarWidth(parsed));
  }

  private clampSidebarWidth(width: number): number {
    return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)));
  }

  private updateSidebarWidth(pointerX: number): void {
    const nextWidth = this.clampSidebarWidth(window.innerWidth - pointerX);
    this.sidebarWidth.set(nextWidth);
  }

  private resizeTextarea(textarea: HTMLTextAreaElement): void {
    const maxHeight = Math.max(160, Math.round(window.innerHeight * 0.4));
    textarea.style.height = 'auto';
    const targetHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${targetHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  private resetTextareaHeight(): void {
    const textarea = this.composerTextarea?.nativeElement;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';
  }

  private pushPatchLog(diff: string, status: BuildWithAiPatchLogEntry['status'], details: string): void {
    this.patchLogs.update((logs) => [
      {
        id: this.createId('patch'),
        createdAt: Date.now(),
        diff,
        status,
        details
      },
      ...logs
    ]);
  }

  private setError(category: BuildWithAiErrorCategory, message: string): void {
    this.activeError.set({ category, message });
  }

  private formatApiError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      if (error.error?.error) {
        return String(error.error.error);
      }

      return `API request failed (${error.status || 'network'}).`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to process AI request.';
  }

  private readLocalStorage(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private writeLocalStorage(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // no-op when storage is unavailable
    }
  }
}
