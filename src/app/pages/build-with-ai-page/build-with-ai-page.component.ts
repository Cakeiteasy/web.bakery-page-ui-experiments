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
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import {
  BuildWithAiAttachment,
  BuildWithAiChatMessage,
  BuildWithAiEditableFiles,
  BuildWithAiErrorCategory,
  BuildWithAiPatchLogEntry
} from '../../models/build-with-ai.model';
import { BuildWithAiApiService } from '../../services/build-with-ai-api.service';
import { BuildWithAiContextMeterService } from '../../services/build-with-ai-context-meter.service';
import { BuildWithAiDiffService } from '../../services/build-with-ai-diff.service';
import { BuildWithAiSessionService } from '../../services/build-with-ai-session.service';
import { BuildWithAiSyntaxValidatorService } from '../../services/build-with-ai-syntax-validator.service';
import {
  BUILD_WITH_AI_FOOTER_HTML,
  BUILD_WITH_AI_HEADER_HTML,
  BUILD_WITH_AI_MODELS,
  BUILD_WITH_AI_STATIC_SHELL_CSS
} from './build-with-ai.constants';

const SIDEBAR_WIDTH_STORAGE_KEY = 'build-with-ai-sidebar-width';
const SIDEBAR_WIDTH_DEFAULT = 360;
const SIDEBAR_WIDTH_MIN = 280;
const SIDEBAR_WIDTH_MAX = 720;
const MOBILE_SIDEBAR_BREAKPOINT = 1100;

export interface SelectedSection {
  sectionSelector: string;
  sectionLabel: string;
  sectionIndex: number;
  totalSections: number;
  sectionOuterHtml: string;
  elementSelector?: string;
  elementLabel?: string;
  elementOuterHtml?: string;
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
  imports: [CommonModule, FormsModule],
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

  @ViewChild('composerTextarea') private composerTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewIframe') private previewIframe?: ElementRef<HTMLIFrameElement>;

  private baselineFiles: BuildWithAiEditableFiles = { html: '', css: '', js: '' };

  readonly selectedModel = computed(() => {
    const selected = this.modelOptions.find((option) => option.key === this.selectedModelKey());
    return selected ?? this.modelOptions[0];
  });

  readonly previewDocument = computed(() =>
    this.buildPreviewDocument(this.files(), this.hiddenSections())
  );
  readonly safePreviewDocument = computed<SafeHtml>(() =>
    this.domSanitizer.bypassSecurityTrustHtml(this.previewDocument())
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
    return sel ? this.hiddenSections().includes(sel.sectionSelector) : false;
  });

  private readonly previewMessageListener = (event: MessageEvent): void => {
    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    const payload = event.data as {
      type?: string;
      message?: string;
      sectionSelector?: string;
      sectionLabel?: string;
      sectionIndex?: number;
      totalSections?: number;
      sectionOuterHtml?: string;
      elementSelector?: string;
      elementLabel?: string;
      elementOuterHtml?: string;
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
        sectionSelector: payload.sectionSelector ?? '',
        sectionLabel: payload.sectionLabel ?? '',
        sectionIndex: payload.sectionIndex ?? 0,
        totalSections: payload.totalSections ?? 1,
        sectionOuterHtml: payload.sectionOuterHtml ?? '',
        elementSelector: payload.elementSelector,
        elementLabel: payload.elementLabel,
        elementOuterHtml: payload.elementOuterHtml
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
      const persisted = this.sessionService.readSnapshot();

      if (persisted) {
        this.files.set(persisted.files);
        this.messages.set(persisted.messages);
        this.patchLogs.set(persisted.patchLogs);
        this.selectedModelKey.set(persisted.modelKey);
      } else {
        this.files.set(this.baselineFiles);
        this.messages.set([
          {
            id: this.createId('assistant'),
            role: 'assistant',
            text: 'Ready. Ask for changes to the middle content and I will return/apply diffs.',
            createdAt: Date.now(),
            attachments: []
          }
        ]);
        this.persistSession();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load baseline files.';
      this.setError('api', message);
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.previewMessageListener);
    this.onSidebarResizePointerUp();
  }

  onDraftChanged(value: string): void {
    this.draftMessage.set(value);
  }

  onModelChanged(modelKey: string): void {
    this.selectedModelKey.set(modelKey);
    this.persistSession();
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
      if (this.showInsertMenu()) {
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
    const win = this.previewIframe?.nativeElement.contentWindow;
    if (!win) return;

    if (this.selectionModeActive()) {
      win.postMessage({ type: 'bwai-mode', enabled: true }, '*');
    }

    const sel = this.selectedSection();
    if (sel) {
      win.postMessage({ type: 'bwai-highlight', sectionSelector: sel.sectionSelector, elementSelector: sel.elementSelector }, '*');
    }
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
      win?.postMessage({ type: 'bwai-highlight', sectionSelector: null, elementSelector: null }, '*');
    }
  }

  onDeselectSection(): void {
    this.selectedSection.set(null);
    this.showInsertMenu.set(false);
    this.previewIframe?.nativeElement.contentWindow?.postMessage(
      { type: 'bwai-highlight', sectionSelector: null, elementSelector: null },
      '*'
    );
  }

  // ── Section reordering ─────────────────────────

  onMoveSectionUp(): void {
    const sel = this.selectedSection();
    if (!sel || sel.sectionIndex <= 0) return;

    this.swapHtmlSections(sel.sectionIndex, sel.sectionIndex - 1);
    this.selectedSection.update((s) => (s ? { ...s, sectionIndex: s.sectionIndex - 1 } : null));
    this.persistSession();
  }

  onMoveSectionDown(): void {
    const sel = this.selectedSection();
    if (!sel || sel.sectionIndex >= sel.totalSections - 1) return;

    this.swapHtmlSections(sel.sectionIndex, sel.sectionIndex + 1);
    this.selectedSection.update((s) => (s ? { ...s, sectionIndex: s.sectionIndex + 1 } : null));
    this.persistSession();
  }

  // ── Section visibility ─────────────────────────

  onToggleHideSection(): void {
    const sel = this.selectedSection();
    if (!sel) return;

    const isHidden = this.hiddenSections().includes(sel.sectionSelector);
    this.hiddenSections.update((hs) =>
      isHidden ? hs.filter((s) => s !== sel.sectionSelector) : [...hs, sel.sectionSelector]
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
      ? ` after the ${sel.sectionSelector} section (index ${sel.sectionIndex})`
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
    this.persistSession();

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

    this.files.set(this.baselineFiles);
    this.messages.set([
      {
        id: this.createId('assistant'),
        role: 'assistant',
        text: 'Started a fresh session from baseline files.',
        createdAt: Date.now(),
        attachments: []
      }
    ]);
    this.patchLogs.set([]);

    this.persistSession();
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

  private async generateAndApplyPatch(): Promise<void> {
    this.processing.set(true);

    try {
      const response = await this.apiService.requestPatch(
        {
          modelKey: this.selectedModel().key,
          messages: this.buildMessagesWithSectionContext(),
          files: this.files()
        }
      );

      if (!response.diff?.trim()) {
        throw new Error('AI response did not include a diff.');
      }

      const diffResult = this.diffService.applyUnifiedDiff(this.files(), response.diff);
      const validation = this.syntaxValidator.validate(diffResult.files);

      if (!validation.valid) {
        const details = validation.issues.map((issue) => `${issue.file}: ${issue.message}`).join(' | ');
        this.pushPatchLog(response.diff, 'rejected', details);
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

        this.persistSession();
        return;
      }

      this.files.set(diffResult.files);
      this.pushPatchLog(response.diff, 'applied', `Touched ${diffResult.touchedFiles.join(', ')}`);

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

      this.persistSession();
    } catch (error) {
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

      this.persistSession();
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

    let contextPrefix =
      `[Section context: ${sel.sectionSelector}, index ${sel.sectionIndex} of ${sel.totalSections - 1}]\n` +
      `Section HTML:\n${sel.sectionOuterHtml}\n\n`;

    if (sel.elementSelector && sel.elementOuterHtml) {
      contextPrefix +=
        `[Element context: ${sel.elementSelector}]\n` +
        `Element HTML:\n${sel.elementOuterHtml}\n\n` +
        `Focus your changes on this element (${sel.elementSelector}) inside the ${sel.sectionSelector} section unless the user explicitly asks otherwise.\n\n` +
        `User request: `;
    } else {
      contextPrefix +=
        `Focus your changes on this section unless the user explicitly asks otherwise.\n\n` +
        `User request: `;
    }

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
        var hoveredSection = null;
        var toolbar = null;
        var toolbarSection = null;
        var toolbarOrigPos = '';

        /* ── helpers ── */
        function getSection(target) {
          var root = document.getElementById('EditableContentRoot');
          if (!root || !(target instanceof Element)) return null;
          var node = target;
          while (node && node.parentElement !== root) {
            if (node === root) return null;
            node = node.parentElement;
          }
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
          var rawCls = (el.className || '').replace(/bwai-\\S*/g, '').trim().split(/\\s+/);
          var firstClass = rawCls.find(function (c) { return c.length > 0; }) || '';
          var selector = firstClass ? ('.' + firstClass) : ('section:nth-child(' + (idx + 1) + ')');
          var labelRaw = firstClass.replace(/^lp-/, '').replace(/-/g, ' ');
          var label = labelRaw ? (labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1)) : ('Section ' + (idx + 1));
          return { idx: idx, total: siblings.length, selector: selector, label: label };
        }

        function getElementMeta(el) {
          var tag = el.tagName.toLowerCase();
          var rawCls = (el.className || '').replace(/bwai-\\S*/g, '').trim().split(/\\s+/);
          var firstClass = rawCls.find(function (c) { return c.length > 0; }) || '';
          var selector = tag + (firstClass ? ('.' + firstClass) : '');
          return { selector: selector, label: selector };
        }

        function getCleanOuterHtml(el) {
          var clone = el.cloneNode(true);
          var bwaiEls = clone.querySelectorAll('.bwai-toolbar, .bwai-handle');
          for (var i = bwaiEls.length - 1; i >= 0; i--) {
            if (bwaiEls[i].parentNode) bwaiEls[i].parentNode.removeChild(bwaiEls[i]);
          }
          clone.className = (clone.className || '').replace(/bwai-\\S*/g, '').trim();
          var allEls = clone.querySelectorAll('[class]');
          for (var j = 0; j < allEls.length; j++) {
            allEls[j].className = allEls[j].className.replace(/bwai-\\S*/g, '').trim();
          }
          return clone.outerHTML;
        }

        /* ── section handle badges ── */
        function injectHandles() {
          var root = document.getElementById('EditableContentRoot');
          if (!root) return;
          Array.from(root.children).forEach(function (el) {
            if (el.querySelector('.bwai-handle')) return;
            var computed = window.getComputedStyle(el).position;
            if (computed === 'static') el.style.position = 'relative';
            var m = getSectionMeta(el);
            var handle = document.createElement('button');
            handle.className = 'bwai-handle';
            handle.setAttribute('data-bwai-handle', '');
            handle.textContent = '\\u2261 ' + m.label;
            el.insertBefore(handle, el.firstChild);
          });
        }

        function showHandles(show) {
          var handles = document.querySelectorAll('.bwai-handle');
          for (var i = 0; i < handles.length; i++) {
            handles[i].style.display = show ? '' : 'none';
          }
        }

        /* ── toolbar ── */
        function removeToolbar() {
          if (toolbar && toolbar.parentElement) {
            toolbar.parentElement.removeChild(toolbar);
          }
          if (toolbarSection) {
            toolbarSection.style.position = toolbarOrigPos;
          }
          toolbar = null;
          toolbarSection = null;
          toolbarOrigPos = '';
        }

        function buildToolbar(el, idx, total) {
          if (toolbarSection === el) {
            if (toolbar) {
              var u = toolbar.querySelector('[data-bwai="move-up"]');
              var d = toolbar.querySelector('[data-bwai="move-down"]');
              if (u) u.disabled = (idx === 0);
              if (d) d.disabled = (idx === total - 1);
            }
            return;
          }
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

          t.appendChild(btn('move-up',   '\\u2191 Up',     idx === 0));
          t.appendChild(btn('move-down', '\\u2193 Down',   idx === total - 1));
          t.appendChild(btn('hide',      'Hide',           false));
          t.appendChild(btn('insert',    '+ Insert',       false));

          t.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-bwai]') : null;
            if (!b || b.disabled) return;
            e.stopPropagation();
            e.preventDefault();
            parent.postMessage({ type: 'bwai-action', action: b.getAttribute('data-bwai') }, '*');
          });

          el.appendChild(t);
          toolbar = t;
        }

        /* ── message handler ── */
        window.addEventListener('message', function (event) {
          var d = event.data;
          if (!d || typeof d !== 'object') return;

          if (d.type === 'bwai-mode') {
            selActive = !!d.enabled;
            document.body.style.cursor = selActive ? 'crosshair' : '';
            if (selActive) {
              injectHandles();
              showHandles(true);
            } else {
              clearClass('bwai-hover');
              clearClass('bwai-selected');
              clearClass('bwai-elem-hover');
              clearClass('bwai-elem-selected');
              removeToolbar();
              showHandles(false);
            }
          }

          if (d.type === 'bwai-highlight') {
            clearClass('bwai-selected');
            clearClass('bwai-elem-selected');
            removeToolbar();
            if (d.sectionSelector) {
              var sEl = document.querySelector(d.sectionSelector);
              if (sEl) {
                sEl.classList.add('bwai-selected');
                var m = getSectionMeta(sEl);
                buildToolbar(sEl, m.idx, m.total);
              }
            }
            if (d.elementSelector) {
              var scope = d.sectionSelector ? document.querySelector(d.sectionSelector) : document;
              var eEl = scope ? scope.querySelector(d.elementSelector) : null;
              if (eEl) eEl.classList.add('bwai-elem-selected');
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
          if (!selActive) return;
          var target = event.target;
          if (!(target instanceof Element)) return;
          if (target.hasAttribute('data-bwai-handle') || target.closest('.bwai-toolbar')) return;

          var sec = getSection(target);

          if (sec !== hoveredSection) {
            clearClass('bwai-hover');
            clearClass('bwai-elem-hover');
            hoveredSection = sec;
            if (sec) {
              if (!sec.classList.contains('bwai-selected')) sec.classList.add('bwai-hover');
              var m = getSectionMeta(sec);
              buildToolbar(sec, m.idx, m.total);
            } else {
              removeToolbar();
            }
          }

          clearClass('bwai-elem-hover');
          if (sec && target !== sec) target.classList.add('bwai-elem-hover');
        });

        /* ── click to select ── */
        document.addEventListener('click', function (event) {
          if (!selActive) return;
          if (toolbar && toolbar.contains(event.target)) return;
          var target = event.target;
          if (!(target instanceof Element)) return;

          var sec = getSection(target);
          if (!sec) return;
          event.preventDefault();
          event.stopImmediatePropagation();

          clearClass('bwai-hover');
          clearClass('bwai-selected');
          clearClass('bwai-elem-hover');
          clearClass('bwai-elem-selected');
          sec.classList.add('bwai-selected');
          hoveredSection = null;

          var m = getSectionMeta(sec);
          buildToolbar(sec, m.idx, m.total);

          var isHandle = target.hasAttribute('data-bwai-handle') ||
            !!(target.closest && target.closest('[data-bwai-handle]'));

          var msg = {
            type: 'bwai-selected',
            sectionSelector: m.selector,
            sectionLabel: m.label,
            sectionIndex: m.idx,
            totalSections: m.total,
            sectionOuterHtml: getCleanOuterHtml(sec)
          };

          if (!isHandle && target !== sec) {
            target.classList.add('bwai-elem-selected');
            var em = getElementMeta(target);
            msg.elementSelector = em.selector;
            msg.elementLabel = em.label;
            msg.elementOuterHtml = target.outerHTML;
          }

          parent.postMessage(msg, '*');
        }, true);

        /* ── CSS ── */
        var style = document.createElement('style');
        style.textContent = [
          '.bwai-hover{outline:2px dashed #ff3399!important;outline-offset:-2px;cursor:crosshair!important}',
          '.bwai-selected{outline:2px solid #ff3399!important;outline-offset:-2px;background-color:rgba(255,51,153,0.04)!important}',
          '.bwai-elem-hover{outline:2px dashed #3b82f6!important;outline-offset:-1px;cursor:pointer!important}',
          '.bwai-elem-selected{outline:2px solid #3b82f6!important;outline-offset:-1px;background-color:rgba(59,130,246,0.06)!important}',
          '.bwai-handle{position:absolute;top:8px;left:8px;z-index:99999;display:none;background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer;color:#555;font-family:-apple-system,sans-serif;white-space:nowrap;box-shadow:0 1px 6px rgba(0,0,0,0.1);pointer-events:all;line-height:1.4}',
          '.bwai-handle:hover{background:#fff0f7;border-color:#ff3399;color:#ff3399}',
          '.bwai-toolbar{position:absolute;top:8px;right:8px;z-index:99999;display:flex;gap:4px;background:#fff;border:1px solid rgba(0,0,0,0.1);border-radius:8px;padding:4px 6px;box-shadow:0 2px 12px rgba(0,0,0,0.14);pointer-events:all}',
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

  private persistSession(): void {
    this.sessionService.saveSnapshot({
      modelKey: this.selectedModel().key,
      files: this.files(),
      messages: this.messages(),
      patchLogs: this.patchLogs(),
      updatedAt: Date.now()
    });
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
