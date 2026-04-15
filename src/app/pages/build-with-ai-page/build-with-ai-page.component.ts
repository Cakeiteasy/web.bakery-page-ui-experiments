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
  BuildWithAiSearchReplaceEdit,
  BuildWithAiErrorCategory,
  BuildWithAiMessageTarget,
  BuildWithAiPatchLogEntry
} from '../../models/build-with-ai.model';
import { BwaiAiLogFileHashes, BwaiAiLogUpdatePayload } from '../../models/bwai-ai-log.model';
import { BwaiPage, BwaiPageSummary, BwaiPageVersion } from '../../models/bwai-page.model';
import { BuildWithAiApiService } from '../../services/build-with-ai-api.service';
import { BuildWithAiContextMeterService } from '../../services/build-with-ai-context-meter.service';
import { BuildWithAiDiffService } from '../../services/build-with-ai-diff.service';
import { BuildWithAiSessionService } from '../../services/build-with-ai-session.service';
import { BuildWithAiSyntaxValidatorService } from '../../services/build-with-ai-syntax-validator.service';
import { BwaiAiLogService } from '../../services/bwai-ai-log.service';
import { BwaiPageService } from '../../services/bwai-page.service';
import {
  BUILD_WITH_AI_FOOTER_HTML,
  BUILD_WITH_AI_HEADER_HTML,
  BUILD_WITH_AI_MODELS,
  BUILD_WITH_AI_PRODUCTS_LIST_RUNTIME_SCRIPT,
  BUILD_WITH_AI_SECTION_IN_VIEW_RUNTIME_SCRIPT,
  BUILD_WITH_AI_STATIC_SHELL_CSS,
  BUILD_WITH_AI_THEME_FONT_HREF_RESOLVER,
  BUILD_WITH_AI_THEME_STYLE_BUILDER,
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
const SECTION_CAPTURE_PADDING_PX = 70;
const SECTION_CAPTURE_TIMEOUT_MS = 20_000;
const SECTION_CAPTURE_PREPARE_DEBOUNCE_MS = 180;
const SECTION_CAPTURE_WAIT_ON_SEND_MS = 1_500;
const SECTION_CAPTURE_MAX_UPLOAD_WIDTH_PX = 1440;
const SECTION_CAPTURE_JPEG_AREA_THRESHOLD = 2_200_000;
const STYLE_EDITOR_DEFAULT_TEXT_COLOR = '#2a2018';
const STYLE_EDITOR_DEFAULT_BG_COLOR = '#ffffff';
const STYLE_EDITOR_DEFAULT_DRAFT: BwaiStyleDraft = {
  textColor: STYLE_EDITOR_DEFAULT_TEXT_COLOR,
  backgroundColor: STYLE_EDITOR_DEFAULT_BG_COLOR,
  fontSizePx: null,
  fontWeight: '',
  display: '',
  textAlign: '',
  justifyContent: '',
  alignItems: '',
  paddingPx: null,
  marginPx: null,
  borderRadiusPx: null
};

export interface SelectedSection {
  selector: string;     // precise selector for runtime DOM targeting (data-bwai-id based)
  reference: string;    // human-readable selector hint (e.g. .lp-hero)
  bwaiId: string;       // data-bwai-id attribute value — unique, stable section identifier
  label: string;
  sectionIndex: number;
  totalSections: number;
  outerHtml: string;
}

interface BwaiSectionCaptureResult {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
}

type BwaiSectionCaptureFailureReason =
  | 'timeout'
  | 'renderer-not-loaded'
  | 'section-not-found'
  | 'tainted-canvas'
  | 'render-failed';

interface BwaiPreparedSectionCapture {
  status: 'idle' | 'preparing' | 'ready' | 'failed';
  bwaiId: string | null;
  revision: number;
  dataUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  reason?: BwaiSectionCaptureFailureReason;
  errorMessage?: string;
  updatedAt: number;
}

interface BwaiSectionCapturePendingRequest {
  resolve: (result: BwaiSectionCaptureResult) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
  section?: SelectedSection | null;
}

interface BwaiStyleEditorTarget {
  styleId: string;
  kind: BwaiStyleTargetKind;
  tag: string;
  label: string;
  sectionLabel: string;
  reference: string;
}

type BwaiStyleTargetKind = 'generic' | 'link' | 'image';

interface BwaiStyleDraft {
  textColor: string;
  backgroundColor: string;
  fontSizePx: number | null;
  fontWeight: string;
  display: string;
  textAlign: string;
  justifyContent: string;
  alignItems: string;
  paddingPx: number | null;
  marginPx: number | null;
  borderRadiusPx: number | null;
}

interface BwaiLinkDraft {
  href: string;
  openInNewTab: boolean;
}

interface BwaiImageDraft {
  src: string;
  alt: string;
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
  private readonly aiLogService = inject(BwaiAiLogService);
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
  readonly showStyleEditor = signal<boolean>(false);
  readonly styleEditorTarget = signal<BwaiStyleEditorTarget | null>(null);
  readonly styleBaselineDraft = signal<BwaiStyleDraft>({ ...STYLE_EDITOR_DEFAULT_DRAFT });
  readonly styleDraft = signal<BwaiStyleDraft>({ ...STYLE_EDITOR_DEFAULT_DRAFT });
  readonly styleDirtyFields = signal<Partial<Record<keyof BwaiStyleDraft, true>>>({});
  readonly styleLinkBaseline = signal<BwaiLinkDraft | null>(null);
  readonly styleLinkDraft = signal<BwaiLinkDraft | null>(null);
  readonly styleLinkDirtyFields = signal<Partial<Record<keyof BwaiLinkDraft, true>>>({});
  readonly styleImageBaseline = signal<BwaiImageDraft | null>(null);
  readonly styleImageDraft = signal<BwaiImageDraft | null>(null);
  readonly styleImageDirtyFields = signal<Partial<Record<keyof BwaiImageDraft, true>>>({});
  readonly copiedToast = signal<boolean>(false);
  readonly uploadingCount = signal<number>(0);
  readonly preparedSectionCapture = signal<BwaiPreparedSectionCapture>({
    status: 'idle',
    bwaiId: null,
    revision: 0,
    updatedAt: Date.now()
  });
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
  private readonly sectionCaptureContentRevision = signal<number>(0);
  private readonly pendingSectionCaptureRequests = new Map<string, BwaiSectionCapturePendingRequest>();
  private sectionCapturePrepareDebounceTimer?: ReturnType<typeof setTimeout>;
  private sectionCapturePrepareInFlight: { bwaiId: string; revision: number } | null = null;

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

  readonly styleDisplayOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'Default' },
    { value: 'block', label: 'Block' },
    { value: 'inline-block', label: 'Inline Block' },
    { value: 'inline', label: 'Inline' },
    { value: 'flex', label: 'Flex' },
    { value: 'grid', label: 'Grid' },
    { value: 'none', label: 'None' }
  ];

  readonly styleTextAlignOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'Default' },
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
    { value: 'justify', label: 'Justify' }
  ];

  readonly styleFontWeightOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'Default' },
    { value: '300', label: '300' },
    { value: '400', label: '400' },
    { value: '500', label: '500' },
    { value: '600', label: '600' },
    { value: '700', label: '700' },
    { value: '800', label: '800' },
    { value: '900', label: '900' }
  ];

  readonly styleJustifyOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'Default' },
    { value: 'flex-start', label: 'Start' },
    { value: 'center', label: 'Center' },
    { value: 'flex-end', label: 'End' },
    { value: 'space-between', label: 'Space Between' },
    { value: 'space-around', label: 'Space Around' },
    { value: 'space-evenly', label: 'Space Evenly' }
  ];

  readonly styleAlignItemsOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'Default' },
    { value: 'stretch', label: 'Stretch' },
    { value: 'flex-start', label: 'Start' },
    { value: 'center', label: 'Center' },
    { value: 'flex-end', label: 'End' },
    { value: 'baseline', label: 'Baseline' }
  ];

  readonly styleAlignmentControlsEnabled = computed(() =>
    this.isFlexOrGridDisplay(this.styleDraft().display)
  );

  // Expose window to template for slug preview in SEO modal
  readonly window = window;

  constructor() {
    // Live-patch HTML/CSS/JS into iframe without reload when files change
    effect(() => {
      const f = this.files();
      const page = this.currentPage();
      if (!this.iframeReady) return;
      if (this.skipNextIframePatch) { this.skipNextIframePatch = false; return; }
      this.sendToIframe({
        type: 'bwai-patch',
        html: f.html,
        css: f.css,
        js: f.js,
        themeCss: this.buildThemeStyleCss(page),
        themeFontHref: this.buildThemeFontHref(page),
        productsRuntime: BUILD_WITH_AI_PRODUCTS_LIST_RUNTIME_SCRIPT
      });
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

    // Prepare section captures ahead of send to avoid synchronous wait/failure in the send path.
    effect(
      () => {
        const selected = this.selectedSection();
        const revision = this.sectionCaptureContentRevision();

        this.cancelPreparedSectionCaptureDebounce();
        if (!selected) {
          this.preparedSectionCapture.set({
            status: 'idle',
            bwaiId: null,
            revision,
            updatedAt: Date.now()
          });
          return;
        }

        this.preparedSectionCapture.set({
          status: 'idle',
          bwaiId: selected.bwaiId || null,
          revision,
          updatedAt: Date.now()
        });

        if (!this.iframeReady) {
          return;
        }

        this.schedulePreparedSectionCapture(selected, revision, 'selection-or-revision');
      },
      { allowSignalWrites: true }
    );
  }

  private readonly previewMessageListener = (event: MessageEvent): void => {
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    const payload = event.data as {
      type?: string;
      message?: string;
      selector?: string;
      reference?: string;
      bwaiId?: string;
      label?: string;
      styleId?: string;
      tag?: string;
      sectionLabel?: string;
      sectionIndex?: number;
      totalSections?: number;
      outerHtml?: string;
      action?: string;
      html?: string;
      sectionType?: string;
      styles?: Record<string, unknown>;
      kind?: string;
      link?: Record<string, unknown>;
      image?: Record<string, unknown>;
      requestId?: string;
      success?: boolean;
      dataUrl?: string;
      mimeType?: string;
      width?: number;
      height?: number;
      reason?: string;
      error?: string;
    };

    if (payload.type === 'bwai-capture-result') {
      const requestId = payload.requestId ?? '';
      const pending = this.pendingSectionCaptureRequests.get(requestId);
      if (!pending) {
        return;
      }

      clearTimeout(pending.timeoutId);
      this.pendingSectionCaptureRequests.delete(requestId);

      if (payload.success && payload.dataUrl) {
        pending.resolve({
          dataUrl: payload.dataUrl,
          mimeType: payload.mimeType ?? 'image/png',
          width: Number(payload.width ?? 0),
          height: Number(payload.height ?? 0)
        });
        this.downloadCapture(payload.dataUrl, pending.section);
      } else {
        pending.reject(
          this.createSectionCaptureError(
            this.normalizeSectionCaptureReason(payload.reason, payload.error),
            payload.error ?? 'Section image capture failed.'
          )
        );
      }
      return;
    }

    if (payload.type === 'build-with-ai-preview-error') {
      if (payload.message) {
        this.setError('preview', payload.message);
      }
      return;
    }

    if (payload.type === 'bwai-style-editor-open') {
      this.openStyleEditor(payload);
      return;
    }

    if (payload.type === 'bwai-style-editor-invalidated') {
      if (this.showStyleEditor()) {
        this.resetStyleEditor();
      }
      this.setError('preview', payload.message || 'Style target changed. Please select an element again.');
      return;
    }

    if (payload.type === 'bwai-selected') {
      this.selectedSection.set({
        selector: payload.selector ?? '',
        reference: payload.reference ?? payload.selector ?? '',
        bwaiId: payload.bwaiId ?? '',
        label: payload.label ?? '',
        sectionIndex: payload.sectionIndex ?? 0,
        totalSections: payload.totalSections ?? 1,
        outerHtml: payload.outerHtml ?? ''
      });
      return;
    }

    if (payload.type === 'bwai-inline-edit-save') {
      const newHtml = this.normalizeHtml(String(payload.html ?? ''));
      const { html: htmlWithIds } = this.ensureSectionIds(newHtml);
      const updated = { ...this.files(), html: htmlWithIds };
      const validation = this.syntaxValidator.validate(updated);
      if (validation.valid) {
        this.skipNextIframePatch = true;
        this.files.set(updated);
        this.markSectionCaptureContentChanged('inline-edit-save');
        void this.persistToMongo({ currentFiles: updated });
      }
      return;
    }

    if (payload.type === 'bwai-insert') {
      this.onInsertSection(String(payload.sectionType ?? 'custom'));
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
              { type: 'bwai-highlight', selector: sel.selector, bwaiId: sel.bwaiId }, '*'
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
    this.rejectPendingSectionCaptureRequests('Section capture was interrupted.');
    this.cancelPreparedSectionCaptureDebounce();
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
    this.resetStyleEditor();

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
      this.markSectionCaptureContentChanged('page-loaded');
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

      this.selectedSection.set(null);
      this.hiddenSections.set(page.hiddenSections ?? []);

      this.activeSrcdoc.set(this.buildPreviewDocument(this.files(), page.hiddenSections ?? [], page));

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
    } catch {
      // Non-fatal: keep current editor state unchanged when settings save fails.
    }
  }

  async onVisualReview(patchId: string): Promise<void> {
    if (this.reviewingPatchId()) return;
    this.reviewingPatchId.set(patchId);
    try {
      const previewHtml = this.buildPreviewDocument(this.files(), [], this.currentPage());
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
          `Build a complete landing page for: ${result.description}. The lp- design system is already in the shell styles (tokens, utilities, section classes). Use lp- classes and --lp-* variables. Keep content.css additive for custom page styling. Do NOT add header, nav, or footer — they are already in the shell.`
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
      this.markSectionCaptureContentChanged('version-restored');
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
      } else if (this.showStyleEditor()) {
        this.onCancelStyleEditor();
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
    this.markSectionCaptureContentChanged('iframe-loaded');

    const win = this.previewIframe?.nativeElement.contentWindow;
    if (!win) return;

    const files = this.files();
    win.postMessage({
      type: 'bwai-patch',
      html: files.html,
      css: files.css,
      js: files.js,
      productsRuntime: BUILD_WITH_AI_PRODUCTS_LIST_RUNTIME_SCRIPT
    }, '*');
    win.postMessage({ type: 'bwai-hidden-css', ids: this.hiddenSections() }, '*');

    const sel = this.selectedSection();
    if (sel) {
      win.postMessage({ type: 'bwai-highlight', selector: sel.selector, bwaiId: sel.bwaiId }, '*');
    }
  }

  setViewportMode(mode: 'desktop' | 'mobile'): void {
    this.viewportMode.set(mode);
  }

  onDeselectSection(): void {
    if (this.showStyleEditor()) {
      this.onCancelStyleEditor();
    }
    this.selectedSection.set(null);
    this.previewIframe?.nativeElement.contentWindow?.postMessage(
      { type: 'bwai-highlight', selector: null, bwaiId: null },
      '*'
    );
  }

  onStyleFieldChange(field: keyof BwaiStyleDraft, rawValue: unknown): void {
    if (!this.styleEditorTarget()) {
      return;
    }

    const next = { ...this.styleDraft() };

    if (
      field === 'fontSizePx' ||
      field === 'paddingPx' ||
      field === 'marginPx' ||
      field === 'borderRadiusPx'
    ) {
      (next as any)[field] = this.parsePxValue(rawValue);
    } else if (field === 'textColor' || field === 'backgroundColor') {
      const fallback = field === 'textColor' ? STYLE_EDITOR_DEFAULT_TEXT_COLOR : STYLE_EDITOR_DEFAULT_BG_COLOR;
      (next as any)[field] = this.normalizeColorInput(rawValue, fallback);
    } else {
      (next as any)[field] = String(rawValue ?? '').trim();
    }

    const sanitized = this.sanitizeStyleDraft(next);
    this.styleDraft.set(sanitized);
    this.syncStyleDirtyField(field, sanitized);
    if (field === 'display') {
      this.syncStyleDirtyField('justifyContent', sanitized);
      this.syncStyleDirtyField('alignItems', sanitized);
    }
    this.sendStylePreview();
  }

  onStyleLinkFieldChange(field: keyof BwaiLinkDraft, rawValue: unknown): void {
    const current = this.styleLinkDraft();
    if (!current) {
      return;
    }

    const next: BwaiLinkDraft = { ...current };
    if (field === 'openInNewTab') {
      next.openInNewTab = this.parseBoolean(rawValue);
    } else {
      next.href = String(rawValue ?? '').trim();
    }
    const sanitized = this.sanitizeLinkDraft(next);
    this.styleLinkDraft.set(sanitized);
    this.syncStyleLinkDirtyField(field, sanitized);
    this.sendStylePreview();
  }

  onStyleImageFieldChange(field: keyof BwaiImageDraft, rawValue: unknown): void {
    const current = this.styleImageDraft();
    if (!current) {
      return;
    }

    const next: BwaiImageDraft = {
      ...current,
      [field]: String(rawValue ?? '').trim()
    };
    const sanitized = this.sanitizeImageDraft(next);
    this.styleImageDraft.set(sanitized);
    this.syncStyleImageDirtyField(field, sanitized);
    this.sendStylePreview();
  }

  onSaveStyleEditor(): void {
    const target = this.styleEditorTarget();
    if (!target) {
      this.resetStyleEditor();
      return;
    }

    this.sendToIframe({
      type: 'bwai-style-commit',
      styleId: target.styleId,
      ...this.buildStyleEditorPatchPayload()
    });
    this.resetStyleEditor();
  }

  onCancelStyleEditor(): void {
    const target = this.styleEditorTarget();
    if (target) {
      this.sendToIframe({ type: 'bwai-style-revert', styleId: target.styleId });
    }
    this.resetStyleEditor();
  }

  private openStyleEditor(payload: {
    styleId?: string;
    kind?: string;
    tag?: string;
    label?: string;
    sectionLabel?: string;
    reference?: string;
    styles?: Record<string, unknown>;
    link?: Record<string, unknown>;
    image?: Record<string, unknown>;
  }): void {
    if (!payload.styleId) {
      return;
    }

    const existingTarget = this.styleEditorTarget();
    if (existingTarget && existingTarget.styleId !== payload.styleId) {
      this.sendToIframe({ type: 'bwai-style-revert', styleId: existingTarget.styleId });
    }

    const styles = payload.styles ?? {};
    const styleBaseline = this.sanitizeStyleDraft({
      textColor: this.normalizeColorInput(styles['textColor'], STYLE_EDITOR_DEFAULT_TEXT_COLOR),
      backgroundColor: this.normalizeColorInput(styles['backgroundColor'], STYLE_EDITOR_DEFAULT_BG_COLOR),
      fontSizePx: this.parsePxValue(styles['fontSizePx']),
      fontWeight: String(styles['fontWeight'] ?? '').trim(),
      display: String(styles['display'] ?? '').trim(),
      textAlign: String(styles['textAlign'] ?? '').trim(),
      justifyContent: String(styles['justifyContent'] ?? '').trim(),
      alignItems: String(styles['alignItems'] ?? '').trim(),
      paddingPx: this.parsePxValue(styles['paddingPx']),
      marginPx: this.parsePxValue(styles['marginPx']),
      borderRadiusPx: this.parsePxValue(styles['borderRadiusPx'])
    });
    const kind = this.normalizeStyleTargetKind(payload.kind, payload.tag);
    const linkSource = payload.link ?? {};
    const linkBaseline = kind === 'link'
      ? this.sanitizeLinkDraft({
        href: String(linkSource['href'] ?? ''),
        openInNewTab: this.parseBoolean(linkSource['openInNewTab']) || String(linkSource['target'] ?? '').trim() === '_blank'
      })
      : null;
    const imageSource = payload.image ?? {};
    const imageBaseline = kind === 'image'
      ? this.sanitizeImageDraft({
        src: String(imageSource['src'] ?? ''),
        alt: String(imageSource['alt'] ?? '')
      })
      : null;

    this.styleEditorTarget.set({
      styleId: payload.styleId,
      kind,
      tag: (payload.tag ?? 'element').toLowerCase(),
      label: payload.label ?? 'Selected element',
      sectionLabel: payload.sectionLabel ?? '',
      reference: payload.reference ?? ''
    });
    this.styleBaselineDraft.set(styleBaseline);
    this.styleDraft.set(styleBaseline);
    this.styleDirtyFields.set({});
    this.styleLinkBaseline.set(linkBaseline);
    this.styleLinkDraft.set(linkBaseline);
    this.styleLinkDirtyFields.set({});
    this.styleImageBaseline.set(imageBaseline);
    this.styleImageDraft.set(imageBaseline);
    this.styleImageDirtyFields.set({});
    this.showStyleEditor.set(true);
    this.activeError.set(null);
  }

  private sendStylePreview(): void {
    const target = this.styleEditorTarget();
    if (!target) {
      return;
    }

    this.sendToIframe({
      type: 'bwai-style-preview',
      styleId: target.styleId,
      ...this.buildStyleEditorPatchPayload()
    });
  }

  private buildStyleEditorPatchPayload(): {
    styles?: Record<string, unknown>;
    link?: Record<string, unknown>;
    image?: Record<string, unknown>;
  } {
    const payload: {
      styles?: Record<string, unknown>;
      link?: Record<string, unknown>;
      image?: Record<string, unknown>;
    } = {};
    const stylePatch = this.buildDirtyStylePatch();
    if (Object.keys(stylePatch).length) {
      payload.styles = stylePatch;
    }
    const linkPatch = this.buildDirtyLinkPatch();
    if (linkPatch && Object.keys(linkPatch).length) {
      payload.link = linkPatch;
    }
    const imagePatch = this.buildDirtyImagePatch();
    if (imagePatch && Object.keys(imagePatch).length) {
      payload.image = imagePatch;
    }
    return payload;
  }

  private buildDirtyStylePatch(): Record<string, unknown> {
    const dirty = this.styleDirtyFields();
    const draft = this.sanitizeStyleDraft(this.styleDraft());
    const patch: Record<string, unknown> = {};
    const addIfDirty = (field: keyof BwaiStyleDraft): void => {
      if (!dirty[field]) {
        return;
      }
      patch[field] = this.toIframeStyleFieldValue(field, draft[field]);
    };

    addIfDirty('textColor');
    addIfDirty('backgroundColor');
    addIfDirty('fontSizePx');
    addIfDirty('fontWeight');
    addIfDirty('display');
    addIfDirty('textAlign');
    addIfDirty('justifyContent');
    addIfDirty('alignItems');
    addIfDirty('paddingPx');
    addIfDirty('marginPx');
    addIfDirty('borderRadiusPx');

    return patch;
  }

  private toIframeStyleFieldValue(field: keyof BwaiStyleDraft, value: BwaiStyleDraft[keyof BwaiStyleDraft]): unknown {
    if (
      field === 'fontSizePx' ||
      field === 'paddingPx' ||
      field === 'marginPx' ||
      field === 'borderRadiusPx'
    ) {
      return this.parsePxValue(value);
    }

    if (field === 'textColor') {
      return this.normalizeColorInput(value, STYLE_EDITOR_DEFAULT_TEXT_COLOR);
    }

    if (field === 'backgroundColor') {
      return this.normalizeColorInput(value, STYLE_EDITOR_DEFAULT_BG_COLOR);
    }

    const stringValue = String(value ?? '').trim();
    return stringValue || null;
  }

  private buildDirtyLinkPatch(): Record<string, unknown> | null {
    const draft = this.styleLinkDraft();
    if (!draft) {
      return null;
    }

    const dirty = this.styleLinkDirtyFields();
    const patch: Record<string, unknown> = {};
    if (dirty.href) {
      patch['href'] = draft.href;
    }
    if (dirty.openInNewTab) {
      patch['openInNewTab'] = draft.openInNewTab;
    }
    return patch;
  }

  private buildDirtyImagePatch(): Record<string, unknown> | null {
    const draft = this.styleImageDraft();
    if (!draft) {
      return null;
    }

    const dirty = this.styleImageDirtyFields();
    const patch: Record<string, unknown> = {};
    if (dirty.src) {
      patch['src'] = draft.src;
    }
    if (dirty.alt) {
      patch['alt'] = draft.alt;
    }
    return patch;
  }

  private syncStyleDirtyField(field: keyof BwaiStyleDraft, nextDraft: BwaiStyleDraft): void {
    const baseline = this.styleBaselineDraft();
    const isDirty = nextDraft[field] !== baseline[field];
    this.styleDirtyFields.update((prev) => {
      const next = { ...prev };
      if (isDirty) {
        next[field] = true;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  private syncStyleLinkDirtyField(field: keyof BwaiLinkDraft, nextDraft: BwaiLinkDraft): void {
    const baseline = this.styleLinkBaseline();
    const baselineValue = baseline ? baseline[field] : field === 'openInNewTab' ? false : '';
    const isDirty = nextDraft[field] !== baselineValue;
    this.styleLinkDirtyFields.update((prev) => {
      const next = { ...prev };
      if (isDirty) {
        next[field] = true;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  private syncStyleImageDirtyField(field: keyof BwaiImageDraft, nextDraft: BwaiImageDraft): void {
    const baseline = this.styleImageBaseline();
    const baselineValue = baseline ? baseline[field] : '';
    const isDirty = nextDraft[field] !== baselineValue;
    this.styleImageDirtyFields.update((prev) => {
      const next = { ...prev };
      if (isDirty) {
        next[field] = true;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  private sanitizeLinkDraft(draft: BwaiLinkDraft): BwaiLinkDraft {
    return {
      href: String(draft.href ?? '').trim(),
      openInNewTab: Boolean(draft.openInNewTab)
    };
  }

  private sanitizeImageDraft(draft: BwaiImageDraft): BwaiImageDraft {
    return {
      src: String(draft.src ?? '').trim(),
      alt: String(draft.alt ?? '').trim()
    };
  }

  private normalizeStyleTargetKind(kind: unknown, tag: unknown): BwaiStyleTargetKind {
    const normalizedKind = String(kind ?? '').trim().toLowerCase();
    if (normalizedKind === 'generic' || normalizedKind === 'link' || normalizedKind === 'image') {
      return normalizedKind;
    }
    const normalizedTag = String(tag ?? '').trim().toLowerCase();
    if (normalizedTag === 'a') {
      return 'link';
    }
    if (normalizedTag === 'img') {
      return 'image';
    }
    return 'generic';
  }

  private sanitizeStyleDraft(draft: BwaiStyleDraft): BwaiStyleDraft {
    const normalized: BwaiStyleDraft = {
      textColor: this.normalizeColorInput(draft.textColor, STYLE_EDITOR_DEFAULT_TEXT_COLOR),
      backgroundColor: this.normalizeColorInput(draft.backgroundColor, STYLE_EDITOR_DEFAULT_BG_COLOR),
      fontSizePx: this.parsePxValue(draft.fontSizePx),
      fontWeight: String(draft.fontWeight ?? '').trim(),
      display: String(draft.display ?? '').trim(),
      textAlign: String(draft.textAlign ?? '').trim(),
      justifyContent: String(draft.justifyContent ?? '').trim(),
      alignItems: String(draft.alignItems ?? '').trim(),
      paddingPx: this.parsePxValue(draft.paddingPx),
      marginPx: this.parsePxValue(draft.marginPx),
      borderRadiusPx: this.parsePxValue(draft.borderRadiusPx)
    };

    if (!this.isFlexOrGridDisplay(normalized.display)) {
      normalized.justifyContent = '';
      normalized.alignItems = '';
    }

    return normalized;
  }

  private isFlexOrGridDisplay(display: string): boolean {
    return display === 'flex' || display === 'grid' || display === 'inline-flex' || display === 'inline-grid';
  }

  private parsePxValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return Math.max(0, Math.round(numeric * 100) / 100);
  }

  private parseBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }

  private normalizeColorInput(value: unknown, fallback: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return fallback;
    }

    const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const normalized = hexMatch[1].length === 3
        ? hexMatch[1].split('').map((char) => char + char).join('')
        : hexMatch[1];
      return `#${normalized.toLowerCase()}`;
    }

    const rgbMatch = raw.match(
      /^rgba?\(\s*([0-9]{1,3})\s*[, ]\s*([0-9]{1,3})\s*[, ]\s*([0-9]{1,3})(?:\s*[,/]\s*([0-9.]+)\s*)?\)$/i
    );

    if (!rgbMatch) {
      return fallback;
    }

    const rgb = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map((part) => Number(part));
    if (rgb.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
      return fallback;
    }
    if (rgbMatch[4] !== undefined) {
      const alpha = Number(rgbMatch[4]);
      if (Number.isFinite(alpha) && alpha <= 0) {
        return fallback;
      }
    }

    const [r, g, b] = rgb;
    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  }

  private resetStyleEditor(): void {
    this.showStyleEditor.set(false);
    this.styleEditorTarget.set(null);
    this.styleBaselineDraft.set({ ...STYLE_EDITOR_DEFAULT_DRAFT });
    this.styleDraft.set({ ...STYLE_EDITOR_DEFAULT_DRAFT });
    this.styleDirtyFields.set({});
    this.styleLinkBaseline.set(null);
    this.styleLinkDraft.set(null);
    this.styleLinkDirtyFields.set({});
    this.styleImageBaseline.set(null);
    this.styleImageDraft.set(null);
    this.styleImageDirtyFields.set({});
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
      ? ` after the "${sel.label}" section (${sel.reference}, position ${sel.sectionIndex + 1} of ${sel.totalSections})`
      : ' at the end of the page';

    let prompt = `Insert a "${type}" section${afterText}. Match the existing lp- CSS class naming convention, primary accent (--lp-primary), and design tokens.`;

    if (type === 'Products List (Request)') {
      prompt = [
        `Insert a "Products List (Request)" section${afterText}.`,
        'Use a contract-based section root exactly like this:',
        '<section class="lp-products-list" data-cie-component="products-list" data-cie-mode="request" data-cie-ref-type="city" data-cie-country="NO" data-cie-lang="no" data-cie-show-search="true" data-cie-predefined-category="" data-cie-allergen-ids="" data-cie-group-ids="" data-cie-motive="any"><div data-cie-products-list-mount></div></section>',
        'Do not write custom API fetching code in content.js for this section. The runtime handles requests and sends x-source-header=MARKETPLACE.',
        'Use data-cie-limit only when the user explicitly asks to cap product count; otherwise omit it for unlimited results.'
      ].join('\n');
    } else if (type === 'Products List (Preset)') {
      prompt = [
        `Insert a "Products List (Preset)" section${afterText}.`,
        'Use a contract-based section root exactly like this:',
        '<section class="lp-products-list" data-cie-component="products-list" data-cie-mode="preset" data-cie-ref-type="bakery" data-cie-ref-name="rosenborg-bakeri" data-cie-category-id="1" data-cie-show-search="false" data-cie-predefined-category="" data-cie-allergen-ids="" data-cie-group-ids="" data-cie-motive="any" data-cie-country="NO" data-cie-lang="no"><div data-cie-products-list-mount></div></section>',
        'Keep optional filter attributes even when empty. Do not add custom fetch logic in content.js for this section.',
        'data-cie-category-id is optional only when data-cie-predefined-category is provided.'
      ].join('\n');
    }

    this.draftMessage.set(prompt);

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

    const selectedTarget = this.selectedSection();
    const manualAttachments = [...this.pendingAttachments()];
    let attachments = manualAttachments;
    let sectionCaptureWarning: string | undefined;
    this.activeError.set(null);

    if (selectedTarget) {
      const sectionCapture = await this.captureSelectedSectionAttachment(selectedTarget);
      if (sectionCapture.attachment) {
        attachments = [...manualAttachments, sectionCapture.attachment];
      }
      if (sectionCapture.warning) {
        sectionCaptureWarning = sectionCapture.warning;
      }
    }

    const userMessage: BuildWithAiChatMessage = {
      id: this.createId('user'),
      role: 'user',
      text: this.draftMessage().trim(),
      createdAt: Date.now(),
      attachments,
      ...(selectedTarget ? { target: this.toMessageTarget(selectedTarget) } : {}),
      ...(sectionCaptureWarning ? { sectionCaptureWarning } : {})
    };

    this.messages.update((messages) => [...messages, userMessage]);
    this.draftMessage.set('');
    this.pendingAttachments.set([]);
    this.resetTextareaHeight();

    await this.generateAndApplyPatch();
  }

  async onStartNewSession(): Promise<void> {
    this.activeError.set(null);
    this.pendingAttachments.set([]);
    this.selectedSection.set(null);
    this.resetStyleEditor();

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

  private toMessageTarget(section: SelectedSection): BuildWithAiMessageTarget {
    return {
      selector: section.selector,
      reference: section.reference,
      label: section.label,
      bwaiId: section.bwaiId,
      sectionIndex: section.sectionIndex,
      totalSections: section.totalSections,
      outerHtml: section.outerHtml
    };
  }

  private async generateAndApplyPatch(): Promise<void> {
    this.processing.set(true);
    let lastRawDiff: string | null = null;
    let logId: string | undefined;
    let lastEdits: BuildWithAiSearchReplaceEdit[] = [];
    let lastWarnings: string[] = [];
    let lastApplyResults: BwaiAiLogUpdatePayload['applyResults'] = [];
    let lastTouchedFiles: string[] = [];

    try {
      const allowGlobalStyleOverride =
        this.isGlobalStyleOverrideAllowedForRequest() ||
        this.isInitialBuildRequest();

      // Keep only the last 10 messages to avoid unbounded context growth
      const allMessages = this.buildMessagesWithSectionContext();
      const trimmedMessages = allMessages.length > 10
        ? allMessages.slice(-10)
        : allMessages;

      const page = this.currentPage();
      const beforeFiles = this.files();
      const response = await this.apiService.requestPatch(
        {
          modelKey: this.selectedModel().key,
          messages: trimmedMessages,
          files: beforeFiles,
          systemPromptOverride: this.systemPromptOverride(),
          allowGlobalStyleOverride,
          pageId: page?.id,
          pageSlug: page?.slug
        },
        this.demoKey() ?? undefined
      );

      logId = response.logId;
      lastEdits = response.edits;
      lastWarnings = response.warnings ?? [];

      if (!response.edits?.length) {
        throw new Error('AI response did not include any edits.');
      }

      lastRawDiff = JSON.stringify(response.edits);
      const diffResult = this.diffService.applyEdits(beforeFiles, response.edits, {
        allowGlobalStyleOverride
      });
      lastApplyResults = diffResult.editResults;
      lastTouchedFiles = [...diffResult.touchedFiles];

      // Check for unmatched edits before syntax validation
      if (!diffResult.ok) {
        const unmatchedDetails = diffResult.editResults
          .filter(r => r.status !== 'matched')
          .map(r => `${r.file}: ${r.error ?? r.status}`)
          .join(' | ');
        const hasStyleOverrideHint = unmatchedDetails.includes('[ALLOW_STYLE_OVERRIDE]');
        const assistantRejectionText = [
          response.assistantText || 'Patch could not be applied — some edits did not match the current file content.',
          hasStyleOverrideHint ? 'Hint: add [ALLOW_STYLE_OVERRIDE] to your latest message if this global style change is intentional.' : ''
        ]
          .filter(Boolean)
          .join('\n\n');
        this.pushPatchLog(JSON.stringify(response.edits), 'rejected', `Unmatched edits: ${unmatchedDetails}`);
        this.setError('patch', `Patch rejected: ${unmatchedDetails}`);

        this.messages.update((messages) => [
          ...messages,
          {
            id: this.createId('assistant'),
            role: 'assistant',
            text: assistantRejectionText,
            createdAt: Date.now(),
            attachments: [],
            errorCategory: 'patch'
          }
        ]);

        if (logId) {
          this.updateLogWithRetry(logId, {
            edits: response.edits,
            applyResults: diffResult.editResults,
            applyStatus: 'rejected',
            rejectionReason: `Unmatched edits: ${unmatchedDetails}`,
            warnings: response.warnings,
            afterFileHashes: this.buildFileHashes(this.files()),
            touchedFiles: diffResult.touchedFiles
          });
        }

        void this.persistToMongo({ messages: this.messages(), patchLogs: this.patchLogs() });
        if (page) {
          void this.bwaiPageService.saveVersionAsync(page.id, { files: this.files(), diff: JSON.stringify(response.edits), status: 'rejected' });
        }
        return;
      }

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

        if (logId) {
          this.updateLogWithRetry(logId, {
            edits: response.edits,
            applyResults: diffResult.editResults,
            applyStatus: 'rejected',
            rejectionReason: `Syntax validation: ${details}`,
            warnings: response.warnings,
            afterFileHashes: this.buildFileHashes(this.files()),
            touchedFiles: diffResult.touchedFiles
          });
        }

        void this.persistToMongo({ messages: this.messages(), patchLogs: this.patchLogs() });
        if (page) {
          void this.bwaiPageService.saveVersionAsync(page.id, { files: this.files(), diff: JSON.stringify(response.edits), status: 'rejected' });
        }
        return;
      }

      const patchedHtml = this.normalizeHtml(diffResult.files.html);
      const { html: patchedHtmlWithIds } = this.ensureSectionIds(patchedHtml);
      const nextFiles = { ...diffResult.files, html: patchedHtmlWithIds };
      this.files.set(nextFiles);
      this.markSectionCaptureContentChanged('patch-applied');
      this.pushPatchLog(JSON.stringify(response.edits), 'applied', `Touched ${diffResult.touchedFiles.join(', ')}`);

      if (logId) {
        this.updateLogWithRetry(logId, {
          edits: response.edits,
          applyResults: diffResult.editResults,
          applyStatus: 'applied',
          warnings: response.warnings,
          afterFileHashes: this.buildFileHashes(nextFiles),
          touchedFiles: diffResult.touchedFiles
        });
      }

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
      if (page) {
        void Promise.all([
          this.persistToMongo({ currentFiles: nextFiles, messages: this.messages(), patchLogs: this.patchLogs() }),
          this.bwaiPageService.saveVersionAsync(page.id, { files: nextFiles, diff: JSON.stringify(response.edits), status: 'applied' }).then((v) => {
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
      if (logId) {
        const errorPayload: BwaiAiLogUpdatePayload = {
          applyResults: lastApplyResults,
          applyStatus: 'error',
          rejectionReason: message,
          warnings: lastWarnings,
          afterFileHashes: this.buildFileHashes(this.files()),
          touchedFiles: lastTouchedFiles
        };
        if (lastEdits.length) {
          errorPayload.edits = lastEdits;
        }
        this.updateLogWithRetry(logId, errorPayload);
      }
      void this.persistToMongo({ messages: this.messages(), patchLogs: this.patchLogs() });
    } finally {
      this.processing.set(false);
    }
  }

  private updateLogWithRetry(logId: string, payload: BwaiAiLogUpdatePayload): void {
    const retryDelaysMs = [200, 600, 1500];
    const maxAttempts = 3;

    void (async () => {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (attempt > 1) {
          const delayMs = retryDelaysMs[Math.min(attempt - 2, retryDelaysMs.length - 1)];
          await this.sleep(delayMs);
        }

        try {
          await this.aiLogService.updateLogAsync(logId, payload);
          return;
        } catch (error) {
          if (attempt === maxAttempts) {
            console.error(`[BWAI] Failed to update log ${logId} after ${maxAttempts} attempts.`, error);
          }
        }
      }
    })();
  }

  private buildFileHashes(files: BuildWithAiEditableFiles): BwaiAiLogFileHashes {
    return {
      html: this.hashDeterministic(files.html),
      css: this.hashDeterministic(files.css),
      js: this.hashDeterministic(files.js)
    };
  }

  private hashDeterministic(value: string): string {
    // Lightweight deterministic hash for debug correlation, not cryptographic integrity.
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private buildMessagesWithSectionContext(): BuildWithAiChatMessage[] {
    const messages = this.messages();
    if (messages.length === 0) return messages;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'user') return messages;
    if (!lastMsg.target) return messages;

    const target = lastMsg.target;
    const safePosition = `${target.sectionIndex + 1} of ${target.totalSections}`;
    const reference = target.reference || target.selector || '(unknown selector)';
    const label = target.label || 'Selected section';
    const productsListContext = this.buildProductsListContextSuffix(target.outerHtml);

    const contextPrefix =
      `[Editing section: ${label} (${reference}, position ${safePosition})]\n` +
      `[Exact selector: ${target.selector}]\n` +
      `Section HTML:\n${target.outerHtml}${productsListContext}\n\n` +
      `User request: `;

    return [
      ...messages.slice(0, -1),
      { ...lastMsg, text: `${contextPrefix}${lastMsg.text}` }
    ];
  }

  private buildProductsListContextSuffix(sectionHtml: string): string {
    if (!this.isProductsListSectionHtml(sectionHtml)) {
      return '';
    }

    return [
      '',
      '',
      '[Products List section context]',
      '- Use data attributes on the section root (no custom fetching in content.js):',
      '  - data-cie-component="products-list"',
      '  - data-cie-mode="request" or "preset"',
      '  - data-cie-ref-type="city" or "bakery"',
      '  - data-cie-ref-name OR data-cie-bakery-id',
      '  - data-cie-category-id (optional when data-cie-predefined-category is set)',
      '  - optional: data-cie-show-search, data-cie-predefined-category, data-cie-allergen-ids, data-cie-group-ids, data-cie-motive, data-cie-limit, data-cie-country, data-cie-lang',
      '- Runtime behavior:',
      '  - data-cie-predefined-category locks category and hides tabs.',
      '  - Missing predefined-category match shows no products (no hard runtime error).',
      '  - Omit data-cie-limit for unlimited products; include it only when an explicit cap is needed.',
      '- Runtime layout hooks:',
      '  - classes: .cie-products-list-shell, .cie-products-list, .cie-products-list__search-area, .cie-products-list__tabs, .cie-products-list__grid, .cie-products-list__card, .cie-products-list__empty, .cie-products-list__status',
      '  - vars: --ciepl-surface, --ciepl-surface-soft, --ciepl-surface-muted, --ciepl-border, --ciepl-text, --ciepl-muted, --ciepl-accent, --ciepl-accent-soft, --ciepl-accent-faint'
    ].join('\n');
  }

  private isProductsListSectionHtml(sectionHtml: string): boolean {
    return /data-cie-component\s*=\s*["']products-list["']/i.test(sectionHtml);
  }

  private isGlobalStyleOverrideAllowedForRequest(): boolean {
    const latestUserMessage = [...this.messages()].reverse().find((message) => message.role === 'user');
    if (!latestUserMessage) return false;
    return latestUserMessage.text.includes('[ALLOW_STYLE_OVERRIDE]');
  }

  private isInitialBuildRequest(): boolean {
    return !this.files().html.trim();
  }

  private resolveThemeConfig(
    theme: { fontPair?: string | null; accentColor?: string | null } | null = this.currentPage()
  ): { fontPair?: string | null; accentColor?: string | null } {
    return {
      fontPair: theme?.fontPair ?? null,
      accentColor: theme?.accentColor ?? null
    };
  }

  private buildThemeStyleCss(
    theme: { fontPair?: string | null; accentColor?: string | null } | null = this.currentPage()
  ): string {
    return BUILD_WITH_AI_THEME_STYLE_BUILDER(this.resolveThemeConfig(theme));
  }

  private buildThemeFontHref(
    theme: { fontPair?: string | null; accentColor?: string | null } | null = this.currentPage()
  ): string {
    return BUILD_WITH_AI_THEME_FONT_HREF_RESOLVER(this.resolveThemeConfig(theme));
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
    this.markSectionCaptureContentChanged('sections-swapped');
  }

  private removeHtmlSection(index: number): void {
    const container = document.createElement('div');
    container.innerHTML = this.normalizeHtml(this.files().html);
    const children = Array.from(container.children);
    if (index >= children.length) return;
    children[index].remove();
    this.files.update((f) => ({ ...f, html: container.innerHTML }));
    this.markSectionCaptureContentChanged('section-removed');
  }

  /** Ensures every top-level section has a unique data-bwai-id attribute.
   *  Returns the (possibly modified) HTML and whether any IDs were added. */
  private ensureSectionIds(html: string): { html: string; changed: boolean } {
    const container = document.createElement('div');
    container.innerHTML = this.normalizeHtml(html);
    let changed = false;
    const usedIds = new Set<string>();

    const createUniqueId = (): string => {
      let id = '';
      do {
        id = 'bwai-' + Math.random().toString(36).slice(2, 10);
      } while (usedIds.has(id));
      usedIds.add(id);
      return id;
    };

    Array.from(container.children).forEach((child) => {
      const existingDataId = (child.getAttribute('data-bwai-id') ?? '').trim();
      const existingHtmlId = (child.getAttribute('id') ?? '').trim();

      let bwaiId = existingDataId || existingHtmlId;
      if (!bwaiId || usedIds.has(bwaiId)) {
        bwaiId = createUniqueId();
      } else {
        usedIds.add(bwaiId);
      }

      if (existingDataId !== bwaiId) {
        child.setAttribute('data-bwai-id', bwaiId);
        changed = true;
      }

      if (!existingHtmlId) {
        child.setAttribute('id', bwaiId);
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

  private markSectionCaptureContentChanged(_trigger: string): void {
    this.sectionCapturePrepareInFlight = null;
    this.sectionCaptureContentRevision.update((current) => current + 1);
  }

  private cancelPreparedSectionCaptureDebounce(): void {
    if (this.sectionCapturePrepareDebounceTimer) {
      clearTimeout(this.sectionCapturePrepareDebounceTimer);
      this.sectionCapturePrepareDebounceTimer = undefined;
    }
  }

  private schedulePreparedSectionCapture(
    section: SelectedSection,
    revision: number,
    trigger: string
  ): void {
    if (!section.bwaiId) {
      return;
    }

    this.cancelPreparedSectionCaptureDebounce();
    this.sectionCapturePrepareDebounceTimer = setTimeout(() => {
      this.sectionCapturePrepareDebounceTimer = undefined;
      void this.prepareSectionCapture(section, revision, trigger);
    }, SECTION_CAPTURE_PREPARE_DEBOUNCE_MS);
  }

  private isSectionCaptureCurrent(section: SelectedSection, revision: number): boolean {
    const selected = this.selectedSection();
    return Boolean(selected && selected.bwaiId === section.bwaiId && this.sectionCaptureContentRevision() === revision);
  }

  private captureFromPreparedState(
    prepared: BwaiPreparedSectionCapture,
    section: SelectedSection,
    revision: number
  ): BwaiSectionCaptureResult | null {
    if (
      prepared.status !== 'ready' ||
      !prepared.dataUrl ||
      prepared.bwaiId !== section.bwaiId ||
      prepared.revision !== revision
    ) {
      return null;
    }

    return {
      dataUrl: prepared.dataUrl,
      mimeType: prepared.mimeType ?? 'image/png',
      width: Number(prepared.width ?? 0),
      height: Number(prepared.height ?? 0)
    };
  }

  private async waitForPreparedSectionCapture(
    section: SelectedSection,
    revision: number,
    timeoutMs: number
  ): Promise<BwaiSectionCaptureResult | null> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const prepared = this.preparedSectionCapture();
      if (prepared.bwaiId !== section.bwaiId || prepared.revision !== revision) {
        return null;
      }

      const readyCapture = this.captureFromPreparedState(prepared, section, revision);
      if (readyCapture) {
        return readyCapture;
      }

      if (prepared.status === 'failed') {
        return null;
      }

      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    return null;
  }

  private async prepareSectionCapture(
    section: SelectedSection,
    revision: number,
    trigger: string
  ): Promise<void> {
    if (!this.iframeReady || !section.bwaiId || !this.isSectionCaptureCurrent(section, revision)) {
      return;
    }

    if (
      this.sectionCapturePrepareInFlight &&
      this.sectionCapturePrepareInFlight.bwaiId === section.bwaiId &&
      this.sectionCapturePrepareInFlight.revision === revision
    ) {
      return;
    }

    this.sectionCapturePrepareInFlight = { bwaiId: section.bwaiId, revision };
    this.preparedSectionCapture.set({
      status: 'preparing',
      bwaiId: section.bwaiId,
      revision,
      updatedAt: Date.now()
    });

    try {
      const rawCapture = await this.requestSectionCapture(section);
      const normalizedCapture = await this.normalizeCaptureForUpload(rawCapture);
      if (!this.isSectionCaptureCurrent(section, revision)) {
        return;
      }

      this.preparedSectionCapture.set({
        status: 'ready',
        bwaiId: section.bwaiId,
        revision,
        dataUrl: normalizedCapture.dataUrl,
        mimeType: normalizedCapture.mimeType,
        width: normalizedCapture.width,
        height: normalizedCapture.height,
        sizeBytes: this.estimateDataUrlSizeBytes(normalizedCapture.dataUrl),
        updatedAt: Date.now()
      });
    } catch (error) {
      const details = this.toSectionCaptureErrorDetails(error);
      if (!this.isSectionCaptureCurrent(section, revision)) {
        return;
      }

      console.warn('[BWAI] Section capture pre-prepare failed.', {
        reason: details.reason,
        message: details.message,
        trigger,
        bwaiId: section.bwaiId,
        revision
      });

      this.preparedSectionCapture.set({
        status: 'failed',
        bwaiId: section.bwaiId,
        revision,
        reason: details.reason,
        errorMessage: details.message,
        updatedAt: Date.now()
      });
    } finally {
      if (
        this.sectionCapturePrepareInFlight &&
        this.sectionCapturePrepareInFlight.bwaiId === section.bwaiId &&
        this.sectionCapturePrepareInFlight.revision === revision
      ) {
        this.sectionCapturePrepareInFlight = null;
      }
    }
  }

  private async resolveSectionCaptureForSend(
    section: SelectedSection
  ): Promise<{ capture?: BwaiSectionCaptureResult; reason?: BwaiSectionCaptureFailureReason; message?: string }> {
    const revision = this.sectionCaptureContentRevision();
    const prepared = this.preparedSectionCapture();
    const preparedCapture = this.captureFromPreparedState(prepared, section, revision);
    if (preparedCapture) {
      return { capture: preparedCapture };
    }

    const preparedMatches = prepared.bwaiId === section.bwaiId && prepared.revision === revision;
    if (preparedMatches && this.iframeReady) {
      if (prepared.status === 'idle' || prepared.status === 'failed') {
        void this.prepareSectionCapture(section, revision, 'send-path');
      }

      if (prepared.status === 'idle' || prepared.status === 'preparing' || prepared.status === 'failed') {
        const waitedCapture = await this.waitForPreparedSectionCapture(
          section,
          revision,
          SECTION_CAPTURE_WAIT_ON_SEND_MS
        );
        if (waitedCapture) {
          return { capture: waitedCapture };
        }
      }
    }

    try {
      const fallbackCapture = await this.requestSectionCapture(section);
      const normalizedFallbackCapture = await this.normalizeCaptureForUpload(fallbackCapture);
      return { capture: normalizedFallbackCapture };
    } catch (error) {
      const details = this.toSectionCaptureErrorDetails(error);
      return { reason: details.reason, message: details.message };
    }
  }

  private async captureSelectedSectionAttachment(
    section: SelectedSection
  ): Promise<{ attachment?: BuildWithAiAttachment; warning?: string }> {
    const resolved = await this.resolveSectionCaptureForSend(section);
    if (!resolved.capture) {
      const reason = resolved.reason ?? 'render-failed';
      console.warn('[BWAI] Failed to capture section context image.', {
        reason,
        message: resolved.message ?? 'Section image capture failed before upload.'
      });
      return {
        warning: this.buildSectionCaptureWarning(reason)
      };
    }

    try {
      const filename = this.buildSectionCaptureFileName(section, resolved.capture.mimeType);
      const file = this.dataUrlToFile(resolved.capture.dataUrl, filename, resolved.capture.mimeType);
      const url = await this.apiService.uploadImageAsync(file);

      return {
        attachment: {
          id: this.createId('att'),
          name: filename,
          mimeType: file.type || resolved.capture.mimeType || 'image/png',
          sizeBytes: file.size,
          kind: 'url',
          url
        }
      };
    } catch (error) {
      const details = this.toSectionCaptureErrorDetails(error);
      console.warn('[BWAI] Failed to upload captured section context image.', {
        reason: details.reason,
        message: details.message
      });
      return {
        warning: this.buildSectionCaptureWarning(details.reason)
      };
    }
  }

  private downloadCapture(dataUrl: string, section: SelectedSection | null | undefined): void {
    const slug = (section?.label ?? 'section').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `screenshot-${slug}-${Date.now()}.png`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private requestSectionCapture(section: SelectedSection): Promise<BwaiSectionCaptureResult> {
    const win = this.previewIframe?.nativeElement.contentWindow;
    if (!this.iframeReady || !win) {
      return Promise.reject(
        this.createSectionCaptureError('renderer-not-loaded', 'Preview is not ready for section capture.')
      );
    }

    const requestId = this.createId('capture');

    return new Promise<BwaiSectionCaptureResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingSectionCaptureRequests.delete(requestId);
        reject(this.createSectionCaptureError('timeout', 'Section image capture timed out.'));
      }, SECTION_CAPTURE_TIMEOUT_MS);

      this.pendingSectionCaptureRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
        section
      });

      try {
        win.postMessage(
          {
            type: 'bwai-capture-section',
            requestId,
            selector: section.selector,
            bwaiId: section.bwaiId,
            paddingTop: SECTION_CAPTURE_PADDING_PX,
            paddingBottom: SECTION_CAPTURE_PADDING_PX
          },
          '*'
        );
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingSectionCaptureRequests.delete(requestId);
        const message = error instanceof Error ? error.message : 'Section image capture failed to start.';
        reject(this.createSectionCaptureError('render-failed', message));
      }
    });
  }

  private rejectPendingSectionCaptureRequests(reason: string): void {
    const normalizedReason = this.normalizeSectionCaptureReason(undefined, reason);
    for (const [requestId, pending] of this.pendingSectionCaptureRequests.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(this.createSectionCaptureError(normalizedReason, reason));
      this.pendingSectionCaptureRequests.delete(requestId);
    }
  }

  private async normalizeCaptureForUpload(capture: BwaiSectionCaptureResult): Promise<BwaiSectionCaptureResult> {
    let sourceWidth = Math.max(0, Math.round(Number(capture.width ?? 0)));
    let sourceHeight = Math.max(0, Math.round(Number(capture.height ?? 0)));
    let sourceImage: HTMLImageElement | null = null;

    if (sourceWidth <= 0 || sourceHeight <= 0 || sourceWidth > SECTION_CAPTURE_MAX_UPLOAD_WIDTH_PX) {
      sourceImage = await this.loadImageFromDataUrl(capture.dataUrl);
      if (sourceWidth <= 0) sourceWidth = sourceImage.naturalWidth;
      if (sourceHeight <= 0) sourceHeight = sourceImage.naturalHeight;
    }

    if (sourceWidth <= SECTION_CAPTURE_MAX_UPLOAD_WIDTH_PX) {
      return {
        dataUrl: capture.dataUrl,
        mimeType: capture.mimeType || 'image/png',
        width: sourceWidth,
        height: sourceHeight
      };
    }

    const image = sourceImage ?? (await this.loadImageFromDataUrl(capture.dataUrl));
    const scale = SECTION_CAPTURE_MAX_UPLOAD_WIDTH_PX / sourceWidth;
    const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw this.createSectionCaptureError('render-failed', 'Section image downscale context is unavailable.');
    }

    context.drawImage(image, 0, 0, outputWidth, outputHeight);

    // Deterministic codec rule: use JPEG for very large captures after downscale, otherwise keep PNG.
    const sourceArea = sourceWidth * sourceHeight;
    const outputMimeType =
      sourceArea > SECTION_CAPTURE_JPEG_AREA_THRESHOLD ? 'image/jpeg' : 'image/png';

    let outputDataUrl = '';
    try {
      outputDataUrl =
        outputMimeType === 'image/jpeg'
          ? canvas.toDataURL(outputMimeType, 0.88)
          : canvas.toDataURL(outputMimeType);
    } catch (error) {
      const reason =
        error instanceof DOMException && error.name === 'SecurityError'
          ? 'tainted-canvas'
          : 'render-failed';
      throw this.createSectionCaptureError(reason, 'Section image downscale failed.');
    }

    return {
      dataUrl: outputDataUrl,
      mimeType: outputMimeType,
      width: outputWidth,
      height: outputHeight
    };
  }

  private loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        reject(this.createSectionCaptureError('render-failed', 'Section image payload could not be decoded.'));
      };
      image.src = dataUrl;
    });
  }

  private estimateDataUrlSizeBytes(dataUrl: string): number {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex < 0) return 0;

    const header = dataUrl.slice(0, commaIndex);
    const body = dataUrl.slice(commaIndex + 1);
    if (/;base64/i.test(header)) {
      const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
      return Math.max(0, Math.floor((body.length * 3) / 4) - padding);
    }

    return new Blob([decodeURIComponent(body)]).size;
  }

  private normalizeSectionCaptureReason(
    reason?: string,
    message?: string
  ): BwaiSectionCaptureFailureReason {
    const normalized = String(reason || '').trim().toLowerCase();
    if (
      normalized === 'timeout' ||
      normalized === 'renderer-not-loaded' ||
      normalized === 'section-not-found' ||
      normalized === 'tainted-canvas' ||
      normalized === 'render-failed'
    ) {
      return normalized;
    }

    const haystack = `${normalized} ${String(message || '').toLowerCase()}`;
    if (haystack.includes('timeout')) return 'timeout';
    if (
      haystack.includes('renderer') ||
      haystack.includes('htmltoimage') ||
      haystack.includes('not loaded')
    ) {
      return 'renderer-not-loaded';
    }
    if (haystack.includes('section') && haystack.includes('not found')) return 'section-not-found';
    if (haystack.includes('not found')) return 'section-not-found';
    if (
      haystack.includes('tainted') ||
      haystack.includes('cross-origin') ||
      haystack.includes('securityerror')
    ) {
      return 'tainted-canvas';
    }
    return 'render-failed';
  }

  private createSectionCaptureError(
    reason: BwaiSectionCaptureFailureReason,
    message: string
  ): Error & { reason: BwaiSectionCaptureFailureReason } {
    const error = new Error(message) as Error & { reason: BwaiSectionCaptureFailureReason };
    error.name = 'BwaiSectionCaptureError';
    error.reason = reason;
    return error;
  }

  private toSectionCaptureErrorDetails(error: unknown): {
    reason: BwaiSectionCaptureFailureReason;
    message: string;
  } {
    if (error && typeof error === 'object') {
      const payload = error as { reason?: unknown; message?: unknown };
      const message =
        typeof payload.message === 'string' && payload.message.trim().length
          ? payload.message
          : 'Section image capture failed.';
      const reason = this.normalizeSectionCaptureReason(
        typeof payload.reason === 'string' ? payload.reason : undefined,
        message
      );
      return { reason, message };
    }

    const fallbackMessage = typeof error === 'string' && error.trim() ? error : 'Section image capture failed.';
    return {
      reason: this.normalizeSectionCaptureReason(undefined, fallbackMessage),
      message: fallbackMessage
    };
  }

  private buildSectionCaptureWarning(_reason: BwaiSectionCaptureFailureReason): string {
    return 'Section image context could not be captured. Sent without image.';
  }

  private buildSectionCaptureFileName(section: SelectedSection, mimeType = 'image/png'): string {
    const labelToken = section.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    const fallback = `section-${section.sectionIndex + 1}`;
    const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    return `${labelToken || fallback}-context.${extension}`;
  }

  private dataUrlToFile(dataUrl: string, fileName: string, fallbackMimeType = 'image/png'): File {
    const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i.exec(dataUrl.trim());
    if (!match || !match[2]) {
      throw this.createSectionCaptureError('render-failed', 'Invalid captured image payload.');
    }

    const mimeType = match[1] || fallbackMimeType;
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new File([bytes], fileName, { type: mimeType });
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

  private buildPreviewDocument(
    files: BuildWithAiEditableFiles,
    hiddenSections: string[] = [],
    theme: { fontPair?: string | null; accentColor?: string | null } | null = null
  ): string {
    const safeCss = files.css.replace(/<\/style>/gi, '<\\/style>');
    const safeJs = files.js.replace(/<\/script>/gi, '<\\/script>');
    const themeCss = this.buildThemeStyleCss(theme).replace(/<\/style>/gi, '<\\/style>');
    const themeFontHref = this.buildThemeFontHref(theme);
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
    <link id="BuildWithAiThemeFonts" href="${themeFontHref}" rel="stylesheet" />
    <style>${BUILD_WITH_AI_STATIC_SHELL_CSS}</style>
    <style id="BuildWithAiContentStyle">${safeCss}</style>
    <style id="BuildWithAiThemeStyle">${themeCss}</style>${hiddenCss ? `\n    <style id="BuildWithAiHiddenSections">${hiddenCss}</style>` : ''}
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

    <script src="/assets/vendor/html-to-image.js"></script>
    <script>
      /* ---- section toolbar ---- */
      (function () {
        var hoveredEl = null;
        var toolbar = null;
        var toolbarSection = null;
        var toolbarOrigPos = '';
        var insertMenu = null;
        var styleEditorState = null;
        var lastStyleTarget = null;

        var INSERT_TYPES = ['Hero','Feature Cards','Testimonials','Stats Bar','FAQ','CTA Banner','Logo Cloud','Contact Form','Products List (Request)','Products List (Preset)'];

        /* ── helpers ── */
        function getCleanOuterHtml(el) {
          var clone = el.cloneNode(true);
          var bwaiEls = clone.querySelectorAll('.bwai-toolbar');
          for (var i = 0; i < bwaiEls.length; i++) bwaiEls[i].remove();
          clone.className = (clone.className || '').replace(/\\bbwai-\\S*/g, '').trim();
          if (clone.className === '') clone.removeAttribute('class');
          return clone.outerHTML;
        }

        function getCleanHtmlForSave() {
          var root = document.getElementById('EditableContentRoot');
          if (!root) return '';
          var clone = root.cloneNode(true);
          var ces = clone.querySelectorAll('[contenteditable]');
          for (var i = 0; i < ces.length; i++) ces[i].removeAttribute('contenteditable');
          var bound = clone.querySelectorAll('[data-bwai-edit-bound]');
          for (var bi = 0; bi < bound.length; bi++) bound[bi].removeAttribute('data-bwai-edit-bound');
          var styleTargets = clone.querySelectorAll('.bwai-style-target');
          for (var si = 0; si < styleTargets.length; si++) styleTargets[si].classList.remove('bwai-style-target');
          var styleIds = clone.querySelectorAll('[data-bwai-style-id]');
          for (var di = 0; di < styleIds.length; di++) styleIds[di].removeAttribute('data-bwai-style-id');
          var extras = clone.querySelectorAll('.bwai-toolbar');
          for (var j = 0; j < extras.length; j++) extras[j].remove();
          return clone.innerHTML;
        }

        function getSection(target) {
          var root = document.getElementById('EditableContentRoot');
          if (!root || !(target instanceof Element)) return null;
          var node = target;
          while (node && node.parentElement !== root) node = node.parentElement;
          return (node && node.parentElement === root) ? node : null;
        }

        function randomBwaiId() {
          return 'bwai-' + Math.random().toString(36).slice(2, 10);
        }

        function ensureSectionId(el) {
          if (!el || !(el instanceof Element)) return '';
          var existingData = (el.getAttribute('data-bwai-id') || '').trim();
          var existingId = (el.getAttribute('id') || '').trim();
          var chosen = existingData || existingId;

          if (!chosen) {
            do {
              chosen = randomBwaiId();
            } while (document.querySelector('[data-bwai-id="' + chosen + '"]') || document.getElementById(chosen));
          }

          if (el.getAttribute('data-bwai-id') !== chosen) {
            el.setAttribute('data-bwai-id', chosen);
          }
          if (!el.getAttribute('id')) {
            el.setAttribute('id', chosen);
          }

          return chosen;
        }

        function ensureAllSectionIds() {
          var root = document.getElementById('EditableContentRoot');
          if (!root) return;
          var children = root.children || [];
          for (var i = 0; i < children.length; i++) {
            ensureSectionId(children[i]);
          }
        }

        function randomStyleId() {
          return 'bwai-style-' + Math.random().toString(36).slice(2, 10);
        }

        function ensureStyleTargetId(el) {
          if (!el || !(el instanceof Element)) return '';
          var current = (el.getAttribute('data-bwai-style-id') || '').trim();
          if (current) return current;
          var next = '';
          do {
            next = randomStyleId();
          } while (document.querySelector('[data-bwai-style-id="' + next + '"]'));
          el.setAttribute('data-bwai-style-id', next);
          return next;
        }

        function readUniformPx(computed, prefix) {
          var top = parseFloat(computed[prefix + 'Top']);
          var right = parseFloat(computed[prefix + 'Right']);
          var bottom = parseFloat(computed[prefix + 'Bottom']);
          var left = parseFloat(computed[prefix + 'Left']);
          if ([top, right, bottom, left].some(function(v) { return !isFinite(v); })) return null;
          if (Math.abs(top - right) > 0.1 || Math.abs(top - bottom) > 0.1 || Math.abs(top - left) > 0.1) return null;
          return Math.round(top * 100) / 100;
        }

        function getStyleSnapshot(el) {
          if (!el) return {};
          var computed = window.getComputedStyle(el);
          return {
            textColor: computed.color || '',
            backgroundColor: computed.backgroundColor || '',
            fontSizePx: parseFloat(computed.fontSize) || null,
            fontWeight: computed.fontWeight || '',
            display: computed.display || '',
            textAlign: computed.textAlign || '',
            justifyContent: computed.justifyContent || '',
            alignItems: computed.alignItems || '',
            paddingPx: readUniformPx(computed, 'padding'),
            marginPx: readUniformPx(computed, 'margin'),
            borderRadiusPx: parseFloat(computed.borderTopLeftRadius) || null
          };
        }

        function resolveStyleTarget() {
          if (!toolbarSection) return null;
          var selectionTarget = getSelectionStyleTarget();
          if (selectionTarget && toolbarSection.contains(selectionTarget)) {
            return selectionTarget;
          }
          if (lastStyleTarget && document.contains(lastStyleTarget) && toolbarSection.contains(lastStyleTarget)) {
            return lastStyleTarget;
          }
          var active = document.activeElement;
          var activeTarget = getClosestStyleTarget(active);
          if (activeTarget && activeTarget !== toolbarSection) {
            return activeTarget;
          }
          return toolbarSection;
        }

        function getElementFromNode(node) {
          if (!node) return null;
          if (node instanceof Element) return node;
          if (node.nodeType === Node.TEXT_NODE) return node.parentElement;
          return null;
        }

        function isEditorUiElement(el) {
          return !!(el && el.closest && el.closest('.bwai-toolbar,.bwai-insert-popup'));
        }

        function canUseStyleTarget(el) {
          if (!el || !(el instanceof Element)) return false;
          if (!toolbarSection || !toolbarSection.contains(el)) return false;
          if (isEditorUiElement(el)) return false;

          var tag = (el.tagName || '').toLowerCase();
          if (!tag) return false;
          if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link' || tag === 'head' || tag === 'html' || tag === 'body') {
            return false;
          }

          return true;
        }

        function getClosestStyleTarget(node) {
          var el = getElementFromNode(node);
          if (!el) return null;

          if (canUseStyleTarget(el)) {
            return el;
          }

          var cursor = el.parentElement;
          while (cursor && cursor !== toolbarSection) {
            if (canUseStyleTarget(cursor)) {
              return cursor;
            }
            cursor = cursor.parentElement;
          }

          return canUseStyleTarget(toolbarSection) ? toolbarSection : null;
        }

        function getSelectionStyleTarget() {
          if (typeof window.getSelection !== 'function') return null;
          var selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return null;
          var anchor = selection.anchorNode || selection.focusNode;
          if (!anchor) return null;
          return getClosestStyleTarget(anchor);
        }

        function rememberStyleTarget(node) {
          var target = getClosestStyleTarget(node);
          if (!target) return;
          if (toolbarSection && toolbarSection.contains(target)) {
            lastStyleTarget = target;
          }
        }

        function clearClass(cls) {
          var els = document.querySelectorAll('.' + cls);
          for (var i = 0; i < els.length; i++) els[i].classList.remove(cls);
        }

        function normalizeText(value) {
          return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function truncateText(value, maxLen) {
          if (!value || value.length <= maxLen) return value;
          return value.slice(0, maxLen - 1).trimEnd() + '…';
        }

        function toTitleCase(value) {
          var cleaned = normalizeText(value).replace(/[_-]+/g, ' ');
          if (!cleaned) return '';
          var acronymMap = { faq: 'FAQ', cta: 'CTA', ux: 'UX', ui: 'UI' };
          return cleaned
            .split(' ')
            .filter(function (part) { return part.length > 0; })
            .map(function (part) {
              var lower = part.toLowerCase();
              if (acronymMap[lower]) return acronymMap[lower];
              return lower.charAt(0).toUpperCase() + lower.slice(1);
            })
            .join(' ');
        }

        function getSectionClasses(el) {
          if (!el || !el.classList) return [];
          return Array.from(el.classList).filter(function (cls) {
            return cls && !/^bwai-/.test(cls);
          });
        }

        function getSectionReference(classes, idx) {
          var preferred = classes.find(function (cls) { return /^lp-/.test(cls); }) || classes[0] || '';
          return preferred ? ('.' + preferred) : ('section:nth-child(' + (idx + 1) + ')');
        }

        function escapeCssIdent(value) {
          var text = String(value || '');
          if (!text) return '';
          if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(text);
          }
          return text
            .split('')
            .map(function (ch, idx) {
              var isAlpha = /[a-zA-Z]/.test(ch);
              var isDigit = /[0-9]/.test(ch);
              var isDashOrUnderscore = ch === '-' || ch === '_';
              var isSafe = isAlpha || isDigit || isDashOrUnderscore;

              if (isSafe && !(idx === 0 && isDigit)) {
                return ch;
              }

              var hex = ch.charCodeAt(0).toString(16).toUpperCase();
              return '\\\\' + hex + ' ';
            })
            .join('');
        }

        function inferSemanticLabel(classes) {
          if (!classes.length) return '';

          var tokens = classes
            .join(' ')
            .replace(/[^a-z0-9]+/gi, ' ')
            .toLowerCase();

          var rules = [
            { re: /\bhero\b/, label: 'Hero' },
            { re: /\bfaq\b/, label: 'FAQ' },
            { re: /\bcta\b/, label: 'CTA' },
            { re: /\b(testimonial|testimonials|review|reviews|proof)\b/, label: 'Testimonials' },
            { re: /\b(stat|stats|metric|metrics|numbers|kpi)\b/, label: 'Stats' },
            { re: /\b(feature|features|benefit|benefits|props|how)\b/, label: 'Features' },
            { re: /\b(portfolio|showcase|gallery)\b/, label: 'Showcase' },
            { re: /\b(product|products|catalog|shop)\b/, label: 'Products' },
            { re: /\b(contact|form)\b/, label: 'Contact' },
            { re: /\b(logo|logos|trust|partner|partners)\b/, label: 'Trust' },
            { re: /\babout\b/, label: 'About' },
            { re: /\b(pricing|price)\b/, label: 'Pricing' }
          ];

          for (var i = 0; i < rules.length; i++) {
            if (rules[i].re.test(tokens)) return rules[i].label;
          }
          return '';
        }

        function inferSectionLabel(el, classes, idx) {
          var explicit = normalizeText(el.getAttribute('data-bwai-label'));
          if (explicit) return truncateText(explicit, 48);

          var component = normalizeText(el.getAttribute('data-cie-component')).toLowerCase();
          if (component === 'products-list') {
            var mode = normalizeText(el.getAttribute('data-cie-mode')).toLowerCase();
            if (mode === 'request') return 'Products List (Request)';
            if (mode === 'preset') return 'Products List (Preset)';
            return 'Products List';
          }

          var semantic = inferSemanticLabel(classes);
          var headingEl = el.querySelector('h1,h2,h3,h4,h5,h6');
          var heading = headingEl ? normalizeText(headingEl.textContent) : '';

          if (semantic && heading && heading.length <= 42) {
            var semanticLower = semantic.toLowerCase();
            if (heading.toLowerCase().indexOf(semanticLower) === -1) {
              return truncateText(semantic + ': ' + heading, 48);
            }
          }

          if (semantic) return semantic;
          if (heading) return truncateText(heading, 48);

          var clsFallback = classes[0] ? classes[0].replace(/^lp-/, '') : '';
          if (clsFallback) return toTitleCase(clsFallback);

          return 'Section ' + (idx + 1);
        }

        function getSectionMeta(el) {
          var root = document.getElementById('EditableContentRoot');
          var siblings = root ? Array.from(root.children) : [el];
          var idx = siblings.indexOf(el);
          var classes = getSectionClasses(el);
          var bwaiId = ensureSectionId(el);
          var selector = '#' + escapeCssIdent(bwaiId);
          var reference = getSectionReference(classes, idx);
          var label = inferSectionLabel(el, classes, idx);
          return {
            idx: idx,
            total: siblings.length,
            selector: selector,
            reference: reference,
            label: label,
            bwaiId: bwaiId
          };
        }

        function setStyleValue(style, prop, value, transform) {
          if (value === null || value === undefined || value === '') {
            style.removeProperty(prop);
            return;
          }

          var nextValue = transform ? transform(value) : value;
          if (nextValue === null || nextValue === undefined || nextValue === '') {
            style.removeProperty(prop);
            return;
          }
          style.setProperty(prop, String(nextValue));
        }

        function hasOwn(obj, key) {
          return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
        }

        function getStyleTargetKind(el) {
          if (!el || !el.tagName) return 'generic';
          var tag = el.tagName.toLowerCase();
          if (tag === 'a') return 'link';
          if (tag === 'img') return 'image';
          return 'generic';
        }

        function getLinkSnapshot(el) {
          if (!el || !el.tagName || el.tagName.toLowerCase() !== 'a') return null;
          return {
            href: el.getAttribute('href') || '',
            target: el.getAttribute('target') || '',
            rel: el.getAttribute('rel') || '',
            openInNewTab: (el.getAttribute('target') || '') === '_blank'
          };
        }

        function getImageSnapshot(el) {
          if (!el || !el.tagName || el.tagName.toLowerCase() !== 'img') return null;
          return {
            src: el.getAttribute('src') || '',
            alt: el.getAttribute('alt') || ''
          };
        }

        function clearStyleTargetIndicator() {
          var nodes = document.querySelectorAll('.bwai-style-target');
          for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('bwai-style-target');
        }

        function markStyleTarget(el) {
          clearStyleTargetIndicator();
          if (el && el.classList) {
            el.classList.add('bwai-style-target');
          }
        }

        function createStyleEditorState(styleId, target) {
          var tag = target && target.tagName ? target.tagName.toLowerCase() : '';
          return {
            styleId: styleId,
            tag: tag,
            originalStyle: target ? target.getAttribute('style') : null,
            originalHref: tag === 'a' ? target.getAttribute('href') : null,
            originalTarget: tag === 'a' ? target.getAttribute('target') : null,
            originalRel: tag === 'a' ? target.getAttribute('rel') : null,
            originalSrc: tag === 'img' ? target.getAttribute('src') : null,
            originalAlt: tag === 'img' ? target.getAttribute('alt') : null
          };
        }

        function restoreStyleEditorState(target, state) {
          if (!target || !state) return;

          if (state.originalStyle !== null && state.originalStyle !== undefined) {
            target.setAttribute('style', state.originalStyle);
          } else {
            target.removeAttribute('style');
          }

          var tag = target.tagName ? target.tagName.toLowerCase() : '';
          if (tag === 'a') {
            if (state.originalHref !== null && state.originalHref !== undefined) target.setAttribute('href', state.originalHref);
            else target.removeAttribute('href');
            if (state.originalTarget !== null && state.originalTarget !== undefined) target.setAttribute('target', state.originalTarget);
            else target.removeAttribute('target');
            if (state.originalRel !== null && state.originalRel !== undefined) target.setAttribute('rel', state.originalRel);
            else target.removeAttribute('rel');
          }

          if (tag === 'img') {
            if (state.originalSrc !== null && state.originalSrc !== undefined) target.setAttribute('src', state.originalSrc);
            else target.removeAttribute('src');
            if (state.originalAlt !== null && state.originalAlt !== undefined) target.setAttribute('alt', state.originalAlt);
            else target.removeAttribute('alt');
          }
        }

        function applyStylePatch(el, styles) {
          if (!el || !styles || typeof styles !== 'object') return;
          var style = el.style;
          var hasDisplay = hasOwn(styles, 'display');
          var display = hasDisplay ? String(styles.display || '').trim() : '';
          var isLayoutDisplay = display === 'flex' || display === 'grid' || display === 'inline-flex' || display === 'inline-grid';
          var toPx = function(value) {
            var numeric = Number(value);
            if (!isFinite(numeric)) return null;
            return numeric + 'px';
          };

          if (hasOwn(styles, 'textColor')) setStyleValue(style, 'color', styles.textColor);
          if (hasOwn(styles, 'backgroundColor')) setStyleValue(style, 'background-color', styles.backgroundColor);
          if (hasOwn(styles, 'fontWeight')) setStyleValue(style, 'font-weight', styles.fontWeight);
          if (hasDisplay) setStyleValue(style, 'display', display);
          if (hasOwn(styles, 'textAlign')) setStyleValue(style, 'text-align', styles.textAlign);
          if (hasOwn(styles, 'paddingPx')) setStyleValue(style, 'padding', styles.paddingPx, toPx);
          if (hasOwn(styles, 'marginPx')) setStyleValue(style, 'margin', styles.marginPx, toPx);
          if (hasOwn(styles, 'borderRadiusPx')) setStyleValue(style, 'border-radius', styles.borderRadiusPx, toPx);
          if (hasOwn(styles, 'fontSizePx')) setStyleValue(style, 'font-size', styles.fontSizePx, toPx);

          if (hasOwn(styles, 'justifyContent')) setStyleValue(style, 'justify-content', styles.justifyContent);
          if (hasOwn(styles, 'alignItems')) setStyleValue(style, 'align-items', styles.alignItems);
          if (hasDisplay && !isLayoutDisplay) {
            style.removeProperty('justify-content');
            style.removeProperty('align-items');
          }
        }

        function applyLinkPatch(el, linkPatch) {
          if (!el || !linkPatch || typeof linkPatch !== 'object') return;
          if (!el.tagName || el.tagName.toLowerCase() !== 'a') return;

          if (hasOwn(linkPatch, 'href')) {
            var href = String(linkPatch.href || '').trim();
            if (href) el.setAttribute('href', href);
            else el.removeAttribute('href');
          }

          if (hasOwn(linkPatch, 'openInNewTab')) {
            if (Boolean(linkPatch.openInNewTab)) {
              el.setAttribute('target', '_blank');
              el.setAttribute('rel', 'noopener noreferrer');
            } else {
              el.removeAttribute('target');
              el.removeAttribute('rel');
            }
          }
        }

        function applyImagePatch(el, imagePatch) {
          if (!el || !imagePatch || typeof imagePatch !== 'object') return;
          if (!el.tagName || el.tagName.toLowerCase() !== 'img') return;

          if (hasOwn(imagePatch, 'src')) {
            var src = String(imagePatch.src || '').trim();
            if (src) el.setAttribute('src', src);
            else el.removeAttribute('src');
          }

          if (hasOwn(imagePatch, 'alt')) {
            el.setAttribute('alt', String(imagePatch.alt || ''));
          }
        }

        function applyStyleEditorPatch(target, state, payload) {
          restoreStyleEditorState(target, state);
          if (!payload || typeof payload !== 'object') return;
          applyStylePatch(target, payload.styles || {});
          applyLinkPatch(target, payload.link || {});
          applyImagePatch(target, payload.image || {});
        }

        function openStyleEditorForTarget(rawTarget) {
          var source = getElementFromNode(rawTarget);
          if (!source) return;
          var section = getSection(source);
          if (!section) return;
          toolbarSection = section;
          var target = getClosestStyleTarget(source) || section;
          rememberStyleTarget(target);

          var sectionMeta = getSectionMeta(section);
          var styleId = ensureStyleTargetId(target);
          if (!styleEditorState || styleEditorState.styleId !== styleId) {
            styleEditorState = createStyleEditorState(styleId, target);
          }
          markStyleTarget(target);
          var targetKind = getStyleTargetKind(target);

          parent.postMessage({
            type: 'bwai-selected',
            selector: sectionMeta.selector,
            reference: sectionMeta.reference,
            bwaiId: sectionMeta.bwaiId,
            label: sectionMeta.label,
            sectionIndex: sectionMeta.idx,
            totalSections: sectionMeta.total,
            outerHtml: getCleanOuterHtml(section)
          }, '*');

          parent.postMessage({
            type: 'bwai-style-editor-open',
            styleId: styleId,
            kind: targetKind,
            tag: target.tagName.toLowerCase(),
            label: target === section ? sectionMeta.label : sectionMeta.label + ' / ' + target.tagName.toLowerCase(),
            sectionLabel: sectionMeta.label,
            reference: sectionMeta.reference,
            styles: getStyleSnapshot(target),
            link: targetKind === 'link' ? getLinkSnapshot(target) : null,
            image: targetKind === 'image' ? getImageSnapshot(target) : null
          }, '*');
        }

        function createCaptureError(reason, message) {
          var err = new Error(message || 'Section capture failed.');
          err.bwaiReason = reason || 'render-failed';
          return err;
        }

        function normalizeCaptureReason(reason, message) {
          var normalized = String(reason || '').trim().toLowerCase();
          if (
            normalized === 'timeout' ||
            normalized === 'renderer-not-loaded' ||
            normalized === 'section-not-found' ||
            normalized === 'tainted-canvas' ||
            normalized === 'render-failed'
          ) {
            return normalized;
          }

          var haystack = (normalized + ' ' + String(message || '').toLowerCase()).trim();
          if (haystack.indexOf('timeout') !== -1) return 'timeout';
          if (
            haystack.indexOf('renderer') !== -1 ||
            haystack.indexOf('htmltoimage') !== -1 ||
            haystack.indexOf('not loaded') !== -1
          ) {
            return 'renderer-not-loaded';
          }
          if (haystack.indexOf('section') !== -1 && haystack.indexOf('not found') !== -1) return 'section-not-found';
          if (haystack.indexOf('not found') !== -1) return 'section-not-found';
          if (
            haystack.indexOf('tainted') !== -1 ||
            haystack.indexOf('cross-origin') !== -1 ||
            haystack.indexOf('securityerror') !== -1
          ) {
            return 'tainted-canvas';
          }
          return 'render-failed';
        }

        function postCaptureFailure(requestId, reason, message) {
          var text = message || 'Section capture failed.';
          parent.postMessage(
            {
              type: 'bwai-capture-result',
              requestId: requestId,
              success: false,
              reason: normalizeCaptureReason(reason, text),
              error: text
            },
            '*'
          );
        }

        async function captureSectionContext(request) {
          var requestId = request && request.requestId ? String(request.requestId) : '';
          if (!requestId) return;

          try {
            var target = null;
            if (request.bwaiId) target = document.getElementById(String(request.bwaiId));
            if (!target && request.selector) target = document.querySelector(String(request.selector));
            if (!target) throw createCaptureError('section-not-found', 'Selected section was not found.');

            if (typeof window.htmlToImage !== 'object' || typeof window.htmlToImage.toPng !== 'function') {
              throw createCaptureError('renderer-not-loaded', 'Capture renderer is not loaded yet.');
            }

            var rect = target.getBoundingClientRect();
            var captureWidth = Math.max(1, Math.ceil(rect.width));
            var captureHeight = Math.max(1, Math.ceil(rect.height));

            document.documentElement.classList.add('bwai-capturing');
            try {
              var dataUrl = await window.htmlToImage.toPng(target, {
                backgroundColor: '#ffffff',
                pixelRatio: 1,
                skipFonts: false
              });

              parent.postMessage(
                {
                  type: 'bwai-capture-result',
                  requestId: requestId,
                  success: true,
                  dataUrl: dataUrl,
                  mimeType: 'image/png',
                  width: captureWidth,
                  height: captureHeight
                },
                '*'
              );
            } finally {
              document.documentElement.classList.remove('bwai-capturing');
            }
          } catch (error) {
            document.documentElement.classList.remove('bwai-capturing');
            var message = error && error.message ? error.message : String(error || 'Section capture failed.');
            var reason = normalizeCaptureReason(error && error.bwaiReason ? error.bwaiReason : '', message);
            postCaptureFailure(requestId, reason, message);
          }
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

        document.addEventListener('pointerdown', function(event) {
          if (isEditorUiElement(event.target)) return;
          var sec = getSection(event.target);
          if (!sec || !toolbarSection || sec !== toolbarSection) return;
          rememberStyleTarget(event.target);
        }, true);

        document.addEventListener('focusin', function(event) {
          if (isEditorUiElement(event.target)) return;
          rememberStyleTarget(event.target);
          var focusTarget = event.target;
          if (focusTarget && focusTarget.tagName && focusTarget.tagName.toLowerCase() === 'a') {
            openStyleEditorForTarget(focusTarget);
          }
        }, true);

        document.addEventListener('click', function(event) {
          if (isEditorUiElement(event.target)) return;
          var clickTarget = event.target;
          var img = clickTarget && clickTarget.closest ? clickTarget.closest('img') : null;
          if (!img) return;
          var sec = getSection(img);
          if (!sec) return;
          event.preventDefault();
          event.stopPropagation();
          openStyleEditorForTarget(img);
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
        var IC_STYLE  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 9-5 5-9-9z"/><path d="M8 7l9 9"/><path d="M4 20h7"/></svg>';

        function buildToolbar(el, idx, total) {
          removeToolbar();

          toolbarOrigPos = el.style.position || '';
          var computed = window.getComputedStyle(el).position;
          if (computed === 'static') el.style.position = 'relative';
          toolbarSection = el;
          if (!lastStyleTarget || !toolbarSection.contains(lastStyleTarget)) {
            lastStyleTarget = null;
          }

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

          // Group 6: Style editor
          var g6 = grp();
          g6.appendChild(btn('style', IC_STYLE, 'Style', false));
          t.appendChild(g6);

          t.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-bwai]') : null;
            if (!b || b.disabled) return;
            e.stopPropagation();
            e.preventDefault();
            var action = b.getAttribute('data-bwai');

            // Copy ID is handled locally — no postMessage needed
            if (action === 'copy-id') {
              var secId = toolbarSection ? ensureSectionId(toolbarSection) : '';
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

            if (action === 'style') {
              openStyleEditorForTarget(resolveStyleTarget());
              return;
            }

            var m2 = getSectionMeta(toolbarSection);
            // Update Angular's selectedSection so move/hide/remove handlers target the right section
            parent.postMessage({
              type: 'bwai-selected',
              selector: m2.selector,
              reference: m2.reference,
              bwaiId: m2.bwaiId,
              label: m2.label,
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

          if (d.type === 'bwai-style-preview' || d.type === 'bwai-style-commit' || d.type === 'bwai-style-revert') {
            var styleId = d.styleId ? String(d.styleId) : '';
            if (!styleId) return;
            var styleTarget = document.querySelector('[data-bwai-style-id="' + styleId + '"]');
            if (!styleTarget) {
              parent.postMessage({
                type: 'bwai-style-editor-invalidated',
                message: 'Styled element is no longer available.'
              }, '*');
              styleEditorState = null;
              clearStyleTargetIndicator();
              return;
            }

            if (!styleEditorState || styleEditorState.styleId !== styleId) {
              styleEditorState = createStyleEditorState(styleId, styleTarget);
            }

            if (d.type === 'bwai-style-revert') {
              restoreStyleEditorState(styleTarget, styleEditorState);
              styleEditorState = null;
              clearStyleTargetIndicator();
              return;
            }

            applyStyleEditorPatch(styleTarget, styleEditorState, d);
            markStyleTarget(styleTarget);

            if (d.type === 'bwai-style-commit') {
              styleEditorState = null;
              clearStyleTargetIndicator();
              parent.postMessage({ type: 'bwai-inline-edit-save', html: getCleanHtmlForSave() }, '*');
            }
            return;
          }

          if (d.type === 'bwai-highlight') {
            clearClass('bwai-selected');
            if (d.selector || d.bwaiId) {
              var el = null;
              if (d.bwaiId) {
                el = document.getElementById(String(d.bwaiId));
              }
              if (!el && d.selector) {
                el = document.querySelector(d.selector);
              }
              if (el) {
                el.classList.add('bwai-selected');
                var m = getSectionMeta(el);
                buildToolbar(el, m.idx, m.total);
              }
            }
            // if selector is null, just clear selected — toolbar follows hover
          }

          if (d.type === 'bwai-patch') {
            if (d.productsRuntime != null) {
              var runtimeText = String(d.productsRuntime);
              var runtimeScript = document.getElementById('CieProductsListRuntime');
              var runtimeChanged = !runtimeScript || runtimeScript.textContent !== runtimeText;
              if (runtimeChanged) {
                if (runtimeScript) runtimeScript.remove();
                runtimeScript = document.createElement('script');
                runtimeScript.id = 'CieProductsListRuntime';
                runtimeScript.textContent = runtimeText;
                document.body.appendChild(runtimeScript);
              }
            }

            var styleEl = document.getElementById('BuildWithAiContentStyle');
            if (styleEl && d.css != null) styleEl.textContent = d.css;

            var themeStyleEl = document.getElementById('BuildWithAiThemeStyle');
            if (themeStyleEl && d.themeCss != null) themeStyleEl.textContent = String(d.themeCss);

            var themeFontLink = document.getElementById('BuildWithAiThemeFonts');
            if (themeFontLink && d.themeFontHref != null && themeFontLink.tagName === 'LINK') {
              themeFontLink.setAttribute('href', String(d.themeFontHref));
            }

            var root2 = document.getElementById('EditableContentRoot');
            if (root2 && d.html != null) {
              root2.innerHTML = d.html;
              ensureAllSectionIds();
            }

            if (styleEditorState && styleEditorState.styleId) {
              var stillExists = document.querySelector('[data-bwai-style-id="' + styleEditorState.styleId + '"]');
              if (!stillExists) {
                styleEditorState = null;
                clearStyleTargetIndicator();
                parent.postMessage({
                  type: 'bwai-style-editor-invalidated',
                  message: 'Styled element was replaced by the latest patch.'
                }, '*');
              }
            }

            if (window.CIESectionInViewRuntime && typeof window.CIESectionInViewRuntime.hydrate === 'function') {
              window.CIESectionInViewRuntime.hydrate(document);
            }

            var oldScript = document.getElementById('BuildWithAiContentScript');
            var jsContent = d.js != null ? d.js : (oldScript ? oldScript.textContent : '');
            if (oldScript) oldScript.remove();
            if (jsContent) {
              var newScript = document.createElement('script');
              newScript.id = 'BuildWithAiContentScript';
              newScript.textContent = jsContent;
              document.body.appendChild(newScript);
            }

            if (window.CIEProductsListRuntime && typeof window.CIEProductsListRuntime.hydrate === 'function') {
              window.CIEProductsListRuntime.hydrate(document);
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

          if (d.type === 'bwai-capture-section') {
            captureSectionContext(d);
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
          '.bwai-selected{outline:2px solid #ff3399!important;outline-offset:-2px;}',
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
          '.bwai-insert-custom{color:#888!important;font-style:italic}',
          '.bwai-style-target{outline:2px solid #1d9bf0!important;outline-offset:1px;box-shadow:0 0 0 2px rgba(29,155,240,0.18)!important}',
          '.bwai-capturing .bwai-hover,.bwai-capturing .bwai-selected{outline:none!important;}',
          '.bwai-capturing .bwai-style-target{outline:none!important;box-shadow:none!important}',
          '.bwai-capturing .bwai-toolbar,.bwai-capturing .bwai-insert-popup{display:none!important}'
        ].join('');
        document.head.appendChild(style);

        ensureAllSectionIds();
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
          var bound = clone.querySelectorAll('[data-bwai-edit-bound]');
          for (var i = 0; i < bound.length; i++) bound[i].removeAttribute('data-bwai-edit-bound');
          var styleTargets = clone.querySelectorAll('.bwai-style-target');
          for (var si = 0; si < styleTargets.length; si++) styleTargets[si].classList.remove('bwai-style-target');
          var styleIds = clone.querySelectorAll('[data-bwai-style-id]');
          for (var di = 0; di < styleIds.length; di++) styleIds[di].removeAttribute('data-bwai-style-id');
          var extras = clone.querySelectorAll('.bwai-toolbar');
          for (var j = 0; j < extras.length; j++) extras[j].remove();
          return clone.innerHTML;
        }

        function save() {
          parent.postMessage({ type: 'bwai-inline-edit-save', html: getCleanHtml() }, '*');
        }

        function enableEditing() {
          if (!root) return;
          var textEls = root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,span,button');
          for (var i = 0; i < textEls.length; i++) {
            var el = textEls[i];
            if (el.closest('.bwai-toolbar')) continue;
            if (el.contentEditable === 'true') continue;
            el.contentEditable = 'true';
            el.addEventListener('blur', save);
          }
          var links = root.querySelectorAll('a');
          for (var j = 0; j < links.length; j++) {
            var a = links[j];
            if (a.closest('.bwai-toolbar')) continue;
            if (a.dataset.bwaiEditBound) continue;
            a.dataset.bwaiEditBound = '1';
            a.contentEditable = 'true';
            a.addEventListener('blur', save);
            (function(el) {
              el.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
              });
              el.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                el.focus({ preventScroll: true });
              });
            })(a);
          }
          var imgs = root.querySelectorAll('img');
          for (var k = 0; k < imgs.length; k++) {
            var img = imgs[k];
            if (img.closest('.bwai-toolbar')) continue;
            if (img.dataset.bwaiEditBound) continue;
            img.dataset.bwaiEditBound = '1';
            img.style.cursor = 'pointer';
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

    <script id="CieSectionInViewRuntime">${BUILD_WITH_AI_SECTION_IN_VIEW_RUNTIME_SCRIPT}</script>
    <script id="CieProductsListRuntime">${BUILD_WITH_AI_PRODUCTS_LIST_RUNTIME_SCRIPT}</script>
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
