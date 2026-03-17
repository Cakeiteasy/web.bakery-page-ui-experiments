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
  BWAI_SYSTEM_PROMPT_LS_KEY
} from './bwai-generation-settings/bwai-generation-settings.component';

const SIDEBAR_WIDTH_STORAGE_KEY = 'build-with-ai-sidebar-width';
const SIDEBAR_WIDTH_DEFAULT = 360;
const SIDEBAR_WIDTH_MIN = 280;
const SIDEBAR_WIDTH_MAX = 720;
const MOBILE_SIDEBAR_BREAKPOINT = 1100;

export interface SelectedSection {
  selector: string;
  label: string;
  sectionIndex: number;
  totalSections: number;
  outerHtml: string;
}

const INSERT_SECTION_TYPES = [
  'Hero',
  'Feature Cards',
  'Testimonials',
  'Stats Bar',
  'FAQ',
  'CTA Banner',
  'Logo Cloud',
  'Contact Form'
] as const;

@Component({
  selector: 'app-build-with-ai-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BwaiSeoModalComponent, BwaiNewPageDialogComponent, BwaiGenerationSettingsComponent],
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
  readonly insertSectionTypes = INSERT_SECTION_TYPES;

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
  readonly selectionModeActive = signal<boolean>(false);
  readonly selectedSection = signal<SelectedSection | null>(null);
  readonly hiddenSections = signal<string[]>([]);
  readonly showInsertMenu = signal<boolean>(false);

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
  readonly activeTab = signal<'chat' | 'versions'>('chat');
  readonly copiedToast = signal<boolean>(false);
  readonly systemPromptOverride = signal<string | null>(
    localStorage.getItem(BWAI_SYSTEM_PROMPT_LS_KEY) || null
  );
  readonly reviewingPatchId = signal<string | null>(null);

  @ViewChild('composerTextarea') private composerTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewIframe') private previewIframe?: ElementRef<HTMLIFrameElement>;
  @ViewChild('messagesEl') private messagesEl?: ElementRef<HTMLElement>;

  private baselineFiles: BuildWithAiEditableFiles = { html: '', css: '', js: '' };
  private routeParamSub?: ReturnType<typeof this.route.paramMap.subscribe>;
  private copiedToastTimeout?: ReturnType<typeof setTimeout>;

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
    return sel ? this.hiddenSections().includes(sel.selector) : false;
  });

  // Expose window to template for slug preview in SEO modal
  readonly window = window;

  constructor() {
    // Live-patch HTML/CSS/JS into iframe without reload when files change
    effect(() => {
      const f = this.files();
      if (!this.iframeReady) return;
      this.sendToIframe({ type: 'bwai-patch', html: f.html, css: f.css, js: f.js });
    });

    // Live-patch hidden-section CSS when visibility toggles
    effect(() => {
      const hidden = this.hiddenSections();
      if (!this.iframeReady) return;
      const hiddenCss = hidden.map((s) => `${s}{display:none!important}`).join('');
      this.sendToIframe({ type: 'bwai-hidden-css', css: hiddenCss });
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
        label: payload.label ?? '',
        sectionIndex: payload.sectionIndex ?? 0,
        totalSections: payload.totalSections ?? 1,
        outerHtml: payload.outerHtml ?? ''
      });
      return;
    }

    if (payload.type === 'bwai-action') {
      switch (payload.action) {
        case 'move-up':   this.onMoveSectionUp();   break;
        case 'move-down': this.onMoveSectionDown();  break;
        case 'hide':      this.onToggleHideSection(); break;
        case 'insert':    this.showInsertMenu.set(true); break;
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

      const files = page.currentFiles ?? { html: '', css: '', js: '' };
      this.files.set(files);
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
      this.hiddenSections.set([]);
      this.showInsertMenu.set(false);

      this.activeSrcdoc.set(this.buildPreviewDocument(this.files(), []));

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
      if (/--lp-rose:/.test(css)) {
        css = css.replace(/--lp-rose:\s*[^;]+;/, `--lp-rose: ${accentColor};`);
      } else {
        // Inject override at top of :root block if present, else at top of file
        css = css.replace(':root {', `:root {\n  --lp-rose: ${accentColor};`);
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
      const files = await this.bwaiPageService.restoreVersionAsync(page.id, version.id);
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
      if (this.showSeoModal()) {
        this.showSeoModal.set(false);
      } else if (this.showNewPageDialog()) {
        this.showNewPageDialog.set(false);
      } else if (this.showInsertMenu()) {
        this.showInsertMenu.set(false);
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

    if (this.selectionModeActive()) {
      win.postMessage({ type: 'bwai-mode', enabled: true }, '*');
    }

    const sel = this.selectedSection();
    if (sel) {
      win.postMessage({ type: 'bwai-highlight', selector: sel.selector }, '*');
    }
  }

  setViewportMode(mode: 'desktop' | 'mobile'): void {
    this.viewportMode.set(mode);
  }

  onToggleSelectionMode(): void {
    const next = !this.selectionModeActive();
    this.selectionModeActive.set(next);

    const win = this.previewIframe?.nativeElement.contentWindow;
    if (win) {
      win.postMessage({ type: 'bwai-mode', enabled: next }, '*');
    }

    if (!next) {
      this.selectedSection.set(null);
      this.showInsertMenu.set(false);
      win?.postMessage({ type: 'bwai-highlight', selector: null }, '*');
    }
  }

  onDeselectSection(): void {
    this.selectedSection.set(null);
    this.showInsertMenu.set(false);
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
    if (!sel) return;

    const isHidden = this.hiddenSections().includes(sel.selector);
    this.hiddenSections.update((hs) =>
      isHidden ? hs.filter((s) => s !== sel.selector) : [...hs, sel.selector]
    );
  }

  // ── Insert section ─────────────────────────────

  onToggleInsertMenu(): void {
    this.showInsertMenu.update((v) => !v);
  }

  onInsertSection(type: string): void {
    this.showInsertMenu.set(false);

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
    this.showInsertMenu.set(false);
    this.resetTextareaHeight();

    await this.generateAndApplyPatch();
  }

  async onStartNewSession(): Promise<void> {
    this.activeError.set(null);
    this.pendingAttachments.set([]);
    this.selectedSection.set(null);
    this.hiddenSections.set([]);
    this.showInsertMenu.set(false);

    if (this.selectionModeActive()) {
      this.selectionModeActive.set(false);
    }

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
        }
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

      this.files.set(diffResult.files);
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

  private swapHtmlSections(indexA: number, indexB: number): void {
    const container = document.createElement('div');
    container.innerHTML = this.files().html;
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

  private async appendAttachments(fileList: FileList): Promise<void> {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (!files.length) {
      this.setError('validation', 'Only image files are supported for drag and drop.');
      return;
    }

    const attachments: BuildWithAiAttachment[] = [];

    for (const file of files) {
      const dataUrl = await this.readFileAsDataUrl(file);
      attachments.push({
        id: this.createId('att'),
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        kind: 'data-url',
        dataUrl
      });
    }

    this.pendingAttachments.update((existing) => [...existing, ...attachments]);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error(`Failed to read ${file.name}.`));
      };

      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error(`Failed to read ${file.name}.`));
          return;
        }

        resolve(result);
      };

      reader.readAsDataURL(file);
    });
  }

  private sendToIframe(message: object): void {
    this.previewIframe?.nativeElement.contentWindow?.postMessage(message, '*');
  }

  private async persistToMongo(patch: {
    currentFiles?: BuildWithAiEditableFiles;
    messages?: BuildWithAiChatMessage[];
    patchLogs?: BuildWithAiPatchLogEntry[];
    currentModelKey?: string;
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
    const hiddenCss = hiddenSections.length
      ? hiddenSections.map((sel) => `${sel}{display:none!important}`).join('')
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
      /* ---- section selection mode ---- */
      (function () {
        var selActive = false;
        var hoveredEl = null;
        var toolbar = null;
        var toolbarSection = null;
        var toolbarOrigPos = '';

        /* ── helpers ── */
        function getCleanOuterHtml(el) {
          var clone = el.cloneNode(true);
          var bwaiEls = clone.querySelectorAll('.bwai-toolbar');
          for (var i = 0; i < bwaiEls.length; i++) bwaiEls[i].remove();
          clone.className = (clone.className || '').replace(/\\bbwai-\\S*/g, '').trim();
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
          return { idx: idx, total: siblings.length, selector: selector };
        }

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

        function buildToolbar(el, idx, total) {
          removeToolbar();

          toolbarOrigPos = el.style.position || '';
          var computed = window.getComputedStyle(el).position;
          if (computed === 'static') el.style.position = 'relative';
          toolbarSection = el;

          var t = document.createElement('div');
          t.className = 'bwai-toolbar';

          function btn(action, label, disabled) {
            var b = document.createElement('button');
            b.setAttribute('data-bwai', action);
            b.textContent = label;
            if (disabled) b.disabled = true;
            return b;
          }

          t.appendChild(btn('move-up',   '↑ Up',      idx === 0));
          t.appendChild(btn('move-down', '↓ Down',    idx === total - 1));
          t.appendChild(btn('hide',      'Hide',      false));
          t.appendChild(btn('insert',    '+ Insert',  false));

          t.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-bwai]') : null;
            if (!b || b.disabled) return;
            e.stopPropagation();
            e.preventDefault();
            var m2 = getSectionMeta(toolbarSection);
            var lbl = m2.selector.replace(/^\\.lp-/, '').replace(/-/g, ' ');
            lbl = lbl.charAt(0).toUpperCase() + lbl.slice(1);
            // Update Angular's selectedSection so move/hide handlers target the right section
            parent.postMessage({
              type: 'bwai-selected',
              selector: m2.selector,
              label: lbl,
              sectionIndex: m2.idx,
              totalSections: m2.total,
              outerHtml: getCleanOuterHtml(toolbarSection)
            }, '*');
            parent.postMessage({ type: 'bwai-action', action: b.getAttribute('data-bwai') }, '*');
          });

          el.insertBefore(t, el.firstChild);
          toolbar = t;
        }

        /* ── message handler ── */
        window.addEventListener('message', function (event) {
          var d = event.data;
          if (!d || typeof d !== 'object') return;

          if (d.type === 'bwai-mode') {
            selActive = !!d.enabled;
            document.body.style.cursor = selActive ? 'crosshair' : '';
            if (!selActive) {
              clearClass('bwai-hover');
              clearClass('bwai-selected');
              // toolbar stays — it follows hover regardless of selection mode
            }
          }

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
            var hiddenEl = document.getElementById('BuildWithAiHiddenSections');
            if (d.css) {
              if (hiddenEl) {
                hiddenEl.textContent = d.css;
              } else {
                var newHidden = document.createElement('style');
                newHidden.id = 'BuildWithAiHiddenSections';
                newHidden.textContent = d.css;
                document.head.appendChild(newHidden);
              }
            } else if (hiddenEl) {
              hiddenEl.remove();
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
            if (selActive) sec.classList.add('bwai-hover');
            var hm = getSectionMeta(sec);
            buildToolbar(sec, hm.idx, hm.total);
          } else {
            removeToolbar();
          }
        });

        /* ── click to select ── */
        document.addEventListener('click', function (event) {
          if (!selActive) return;
          if (toolbar && toolbar.contains(event.target)) return;
          var sec = getSection(event.target);
          if (!sec) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          clearClass('bwai-hover');
          clearClass('bwai-selected');
          sec.classList.add('bwai-selected');
          hoveredEl = null;

          var m = getSectionMeta(sec);
          buildToolbar(sec, m.idx, m.total);

          var label = m.selector.replace(/^\\.lp-/, '').replace(/-/g, ' ');
          label = label.charAt(0).toUpperCase() + label.slice(1);

          parent.postMessage({
            type: 'bwai-selected',
            selector: m.selector,
            label: label,
            sectionIndex: m.idx,
            totalSections: m.total,
            outerHtml: getCleanOuterHtml(sec)
          }, '*');
        }, true);

        /* ── CSS ── */
        var style = document.createElement('style');
        style.textContent = [
          '.bwai-hover{outline:2px dashed #ff3399!important;outline-offset:-2px;cursor:crosshair!important}',
          '.bwai-selected{outline:2px solid #ff3399!important;outline-offset:-2px;background-color:rgba(255,51,153,0.04)!important}',
          '.bwai-toolbar{position:absolute;top:10px;left:10px;z-index:99999;display:flex;gap:4px;background:#fff;border:1px solid rgba(0,0,0,0.1);border-radius:8px;padding:4px 6px;box-shadow:0 2px 12px rgba(0,0,0,0.14);pointer-events:all}',
          '.bwai-toolbar button{border:1px solid #e5e5e5;background:#fff;padding:3px 9px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;color:#555;font-family:-apple-system,sans-serif;white-space:nowrap;transition:background .1s,color .1s,border-color .1s}',
          '.bwai-toolbar button:hover:not(:disabled){background:#fff0f7;border-color:#ff3399;color:#ff3399}',
          '.bwai-toolbar button:disabled{opacity:.3;cursor:not-allowed}'
        ].join('');
        document.head.appendChild(style);
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
