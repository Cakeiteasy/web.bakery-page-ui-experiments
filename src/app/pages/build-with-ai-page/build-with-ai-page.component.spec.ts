import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { BuildWithAiAttachment } from '../../models/build-with-ai.model';
import { BwaiAiLogService } from '../../services/bwai-ai-log.service';
import { BuildWithAiApiService } from '../../services/build-with-ai-api.service';
import { BuildWithAiContextMeterService } from '../../services/build-with-ai-context-meter.service';
import { BuildWithAiDiffService } from '../../services/build-with-ai-diff.service';
import { BwaiPageService } from '../../services/bwai-page.service';
import { BuildWithAiSessionService } from '../../services/build-with-ai-session.service';
import { BuildWithAiSyntaxValidatorService } from '../../services/build-with-ai-syntax-validator.service';
import { BuildWithAiPageComponent, SelectedSection } from './build-with-ai-page.component';

describe('BuildWithAiPageComponent', () => {
  let fixture: ComponentFixture<BuildWithAiPageComponent>;
  let component: BuildWithAiPageComponent;

  const onePixelPngDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7s5tQAAAAASUVORK5CYII=';

  const selectedSection: SelectedSection = {
    selector: '#bwai-hero',
    reference: '.lp-hero',
    bwaiId: 'bwai-hero',
    label: 'Hero',
    sectionIndex: 0,
    totalSections: 3,
    outerHtml: '<section id="bwai-hero" data-bwai-id="bwai-hero"><h1>Hero</h1></section>'
  };

  let apiServiceStub: {
    requestPatch: jasmine.Spy;
    uploadImageAsync: jasmine.Spy;
    requestVisualReview: jasmine.Spy;
  };

  let sessionServiceStub: {
    loadBaselineFiles: jasmine.Spy;
    readSnapshot: jasmine.Spy;
    saveSnapshot: jasmine.Spy;
    clearSnapshot: jasmine.Spy;
  };

  let diffServiceStub: {
    applyEdits: jasmine.Spy;
  };

  let validatorStub: {
    validate: jasmine.Spy;
  };

  let contextMeterStub: {
    estimate: jasmine.Spy;
  };

  let pageServiceStub: {
    listPagesAsync: jasmine.Spy;
    getPageAsync: jasmine.Spy;
    createPageAsync: jasmine.Spy;
    updatePageAsync: jasmine.Spy;
    deletePageAsync: jasmine.Spy;
    duplicatePageAsync: jasmine.Spy;
    listVersionsAsync: jasmine.Spy;
    saveVersionAsync: jasmine.Spy;
    restoreVersionAsync: jasmine.Spy;
  };

  let aiLogServiceStub: {
    updateLogAsync: jasmine.Spy;
  };

  let routerStub: {
    navigate: jasmine.Spy;
  };

  beforeEach(async () => {
    apiServiceStub = {
      requestPatch: jasmine.createSpy('requestPatch').and.resolveTo({
        assistantText: 'Applied.',
        edits: [{ file: 'content.html', mode: 'replace', search: '', value: '<section>Updated</section>' }],
        warnings: []
      }),
      uploadImageAsync: jasmine.createSpy('uploadImageAsync').and.resolveTo('https://cdn.test/auto-section.png'),
      requestVisualReview: jasmine.createSpy('requestVisualReview').and.resolveTo({ review: 'Looks good.' })
    };

    sessionServiceStub = {
      loadBaselineFiles: jasmine.createSpy('loadBaselineFiles').and.resolveTo({ html: '', css: '', js: '' }),
      readSnapshot: jasmine.createSpy('readSnapshot').and.returnValue(null),
      saveSnapshot: jasmine.createSpy('saveSnapshot'),
      clearSnapshot: jasmine.createSpy('clearSnapshot')
    };

    diffServiceStub = {
      applyEdits: jasmine.createSpy('applyEdits').and.callFake((files: any) => ({
        files: { ...files, html: '<section>Updated</section>' },
        touchedFiles: ['content.html'],
        editResults: [{ file: 'content.html', mode: 'replace', search: '', status: 'matched' }],
        ok: true
      }))
    };

    validatorStub = {
      validate: jasmine.createSpy('validate').and.returnValue({
        valid: true,
        issues: []
      })
    };

    contextMeterStub = {
      estimate: jasmine.createSpy('estimate').and.returnValue({
        estimatedTokens: 100,
        limit: 200000,
        ratio: 0.0005,
        nearLimit: false
      })
    };

    pageServiceStub = {
      listPagesAsync: jasmine.createSpy('listPagesAsync').and.resolveTo([]),
      getPageAsync: jasmine.createSpy('getPageAsync'),
      createPageAsync: jasmine.createSpy('createPageAsync'),
      updatePageAsync: jasmine.createSpy('updatePageAsync'),
      deletePageAsync: jasmine.createSpy('deletePageAsync'),
      duplicatePageAsync: jasmine.createSpy('duplicatePageAsync'),
      listVersionsAsync: jasmine.createSpy('listVersionsAsync').and.resolveTo([]),
      saveVersionAsync: jasmine.createSpy('saveVersionAsync'),
      restoreVersionAsync: jasmine.createSpy('restoreVersionAsync')
    };

    aiLogServiceStub = {
      updateLogAsync: jasmine.createSpy('updateLogAsync').and.resolveTo(undefined)
    };

    routerStub = {
      navigate: jasmine.createSpy('navigate').and.resolveTo(true)
    };

    await TestBed.configureTestingModule({
      imports: [BuildWithAiPageComponent],
      providers: [
        { provide: BuildWithAiApiService, useValue: apiServiceStub },
        { provide: BuildWithAiSessionService, useValue: sessionServiceStub },
        { provide: BuildWithAiDiffService, useValue: diffServiceStub },
        { provide: BuildWithAiSyntaxValidatorService, useValue: validatorStub },
        { provide: BuildWithAiContextMeterService, useValue: contextMeterStub },
        { provide: BwaiPageService, useValue: pageServiceStub },
        { provide: BwaiAiLogService, useValue: aiLogServiceStub },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({})) }
        },
        { provide: Router, useValue: routerStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BuildWithAiPageComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function setupIframeBridge(): jasmine.Spy {
    const postMessageSpy = jasmine.createSpy('postMessage');
    (component as any).iframeReady = true;
    (component as any).previewIframe = {
      nativeElement: {
        contentWindow: {
          postMessage: postMessageSpy
        }
      }
    };
    return postMessageSpy;
  }

  function captureRequests(postMessageSpy: jasmine.Spy): Array<{ requestId: string; payload: any }> {
    return postMessageSpy.calls
      .all()
      .filter((item) => item.args[0] && item.args[0].type === 'bwai-capture-section')
      .map((item) => ({
        requestId: String(item.args[0].requestId),
        payload: item.args[0]
      }));
  }

  function getCaptureRequest(
    postMessageSpy: jasmine.Spy,
    index = 0
  ): { requestId: string; payload: any } {
    const requests = captureRequests(postMessageSpy);
    expect(requests.length).toBeGreaterThan(index);
    return requests[index];
  }

  function emitCaptureResult(options: {
    requestId: string;
    success: boolean;
    dataUrl?: string;
    error?: string;
    reason?: string;
  }): void {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'bwai-capture-result',
          requestId: options.requestId,
          success: options.success,
          dataUrl: options.dataUrl,
          mimeType: 'image/png',
          width: 100,
          height: 240,
          reason: options.reason,
          error: options.error
        }
      })
    );
  }

  function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function latestUserPayloadMessage(): any {
    const payload = apiServiceStub.requestPatch.calls.mostRecent().args[0];
    return [...payload.messages].reverse().find((message: any) => message.role === 'user');
  }

  function latestUserChatMessage() {
    return [...component.messages()].reverse().find((message) => message.role === 'user');
  }

  it('starts section pre-capture on selection with exact 70px context padding', async () => {
    const postMessageSpy = setupIframeBridge();
    component.selectedSection.set(selectedSection);

    await waitMs(240);

    const captureRequest = getCaptureRequest(postMessageSpy);
    expect(captureRequest.payload.paddingTop).toBe(70);
    expect(captureRequest.payload.paddingBottom).toBe(70);
  });

  it('uses prepared section capture on send without issuing another capture request', async () => {
    const postMessageSpy = setupIframeBridge();
    component.selectedSection.set(selectedSection);

    await waitMs(240);
    const preparedCaptureRequest = getCaptureRequest(postMessageSpy);
    emitCaptureResult({
      requestId: preparedCaptureRequest.requestId,
      success: true,
      dataUrl: onePixelPngDataUrl
    });
    await Promise.resolve();

    component.onDraftChanged('Update hero section');
    await component.onSend();

    expect(captureRequests(postMessageSpy).length).toBe(1);
    expect(apiServiceStub.uploadImageAsync).toHaveBeenCalledTimes(1);

    const userPayloadMessage = latestUserPayloadMessage();
    expect(userPayloadMessage.attachments.length).toBe(1);
    expect(userPayloadMessage.attachments[0].url).toBe('https://cdn.test/auto-section.png');
    expect(userPayloadMessage.sectionCaptureWarning).toBeUndefined();
  });

  it('waits briefly for in-flight prepared capture during send and uses it when it arrives', async () => {
    const postMessageSpy = setupIframeBridge();
    component.selectedSection.set(selectedSection);

    await waitMs(240);
    const preparedCaptureRequest = getCaptureRequest(postMessageSpy);

    component.onDraftChanged('Update hero section');
    const sendPromise = component.onSend();
    await waitMs(120);

    emitCaptureResult({
      requestId: preparedCaptureRequest.requestId,
      success: true,
      dataUrl: onePixelPngDataUrl
    });

    await sendPromise;

    expect(captureRequests(postMessageSpy).length).toBe(1);
    expect(apiServiceStub.uploadImageAsync).toHaveBeenCalledTimes(1);
    const userPayloadMessage = latestUserPayloadMessage();
    expect(userPayloadMessage.attachments.length).toBe(1);
  });

  it('sends without image on capture failure and logs stable reason code', async () => {
    const postMessageSpy = setupIframeBridge();
    const warnSpy = spyOn(console, 'warn');

    component.selectedSection.set(selectedSection);
    await waitMs(240);

    const preCaptureRequest = getCaptureRequest(postMessageSpy, 0);
    emitCaptureResult({
      requestId: preCaptureRequest.requestId,
      success: false,
      reason: 'renderer-not-loaded',
      error: 'Capture renderer is not loaded yet.'
    });
    await Promise.resolve();

    component.onDraftChanged('Update hero section');
    const sendPromise = component.onSend();
    await Promise.resolve();

    const fallbackRequest = getCaptureRequest(postMessageSpy, 1);
    emitCaptureResult({
      requestId: fallbackRequest.requestId,
      success: false,
      reason: 'section-not-found',
      error: 'Selected section was not found.'
    });

    await sendPromise;

    expect(apiServiceStub.uploadImageAsync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(
      warnSpy.calls.all().some((call) => {
        const payload = call.args[1] as { reason?: string } | undefined;
        return payload?.reason === 'renderer-not-loaded' || payload?.reason === 'section-not-found';
      })
    ).toBeTrue();

    const userPayloadMessage = latestUserPayloadMessage();
    expect(userPayloadMessage.attachments.length).toBe(0);
    expect(userPayloadMessage.sectionCaptureWarning).toContain('could not be captured');
    const userChatMessage = latestUserChatMessage();
    expect(userChatMessage?.sectionCaptureWarning).toContain('could not be captured');
  });

  it('keeps existing behavior when no section is selected', async () => {
    const postMessageSpy = setupIframeBridge();
    component.onDraftChanged('Update CTA');

    await component.onSend();

    expect(captureRequests(postMessageSpy).length).toBe(0);
    expect(apiServiceStub.uploadImageAsync).not.toHaveBeenCalled();

    const userPayloadMessage = latestUserPayloadMessage();
    expect(userPayloadMessage.attachments.length).toBe(0);
  });

  it('preserves manual attachments and appends prepared auto-captured section image', async () => {
    const postMessageSpy = setupIframeBridge();

    const manualAttachment: BuildWithAiAttachment = {
      id: 'att-manual',
      name: 'manual-reference.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 0,
      kind: 'url',
      url: 'https://cdn.test/manual-reference.jpg'
    };

    component.pendingAttachments.set([manualAttachment]);
    component.selectedSection.set(selectedSection);
    await waitMs(240);

    const captureRequest = getCaptureRequest(postMessageSpy);
    emitCaptureResult({
      requestId: captureRequest.requestId,
      success: true,
      dataUrl: onePixelPngDataUrl
    });
    await Promise.resolve();

    component.onDraftChanged('Blend this with section style');
    await component.onSend();

    const userPayloadMessage = latestUserPayloadMessage();
    expect(userPayloadMessage.attachments.length).toBe(2);
    expect(userPayloadMessage.attachments[0].url).toBe('https://cdn.test/manual-reference.jpg');
    expect(userPayloadMessage.attachments[1].url).toBe('https://cdn.test/auto-section.png');
  });

  it('opens style editor from preview message without sending preview automatically', () => {
    const sendSpy = spyOn<any>(component, 'sendToIframe');

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'bwai-style-editor-open',
          styleId: 'bwai-style-1',
          kind: 'generic',
          tag: 'p',
          label: 'Hero / p',
          reference: '.lp-hero',
          sectionLabel: 'Hero',
          styles: {
            textColor: 'rgb(255, 51, 153)',
            backgroundColor: '#ffffff',
            display: 'block',
            justifyContent: 'center',
            alignItems: 'center'
          }
        }
      })
    );

    expect(component.showStyleEditor()).toBeTrue();
    expect(component.styleEditorTarget()?.styleId).toBe('bwai-style-1');
    expect(component.styleEditorTarget()?.kind).toBe('generic');
    expect(component.styleDraft().textColor).toBe('#ff3399');
    expect(component.styleDraft().justifyContent).toBe('');
    expect(component.styleDraft().alignItems).toBe('');
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('sends sparse style preview payload when one style control changes', () => {
    const sendSpy = spyOn<any>(component, 'sendToIframe');

    component.styleEditorTarget.set({
      styleId: 'bwai-style-2',
      kind: 'generic',
      tag: 'div',
      label: 'Section',
      sectionLabel: 'Section',
      reference: '.lp-section'
    });
    component.styleBaselineDraft.set({
      ...component.styleDraft(),
      display: ''
    });
    component.showStyleEditor.set(true);

    component.onStyleFieldChange('display', 'flex');

    const lastCall = sendSpy.calls.mostRecent().args[0] as { type: string; styleId: string; styles: Record<string, unknown> };
    expect(lastCall.type).toBe('bwai-style-preview');
    expect(lastCall.styleId).toBe('bwai-style-2');
    expect(lastCall.styles).toEqual({ display: 'flex' });
  });

  it('sends sparse link payload when link fields change', () => {
    const sendSpy = spyOn<any>(component, 'sendToIframe');

    component.styleEditorTarget.set({
      styleId: 'bwai-style-link',
      kind: 'link',
      tag: 'a',
      label: 'Hero / a',
      sectionLabel: 'Hero',
      reference: '.lp-hero'
    });
    component.styleLinkBaseline.set({ href: '/old', openInNewTab: false });
    component.styleLinkDraft.set({ href: '/old', openInNewTab: false });
    component.showStyleEditor.set(true);

    component.onStyleLinkFieldChange('href', 'https://example.com/new');

    const lastCall = sendSpy.calls.mostRecent().args[0] as { type: string; styleId: string; link: Record<string, unknown> };
    expect(lastCall.type).toBe('bwai-style-preview');
    expect(lastCall.styleId).toBe('bwai-style-link');
    expect(lastCall.link).toEqual({ href: 'https://example.com/new' });
  });

  it('sends sparse image payload when image fields change', () => {
    const sendSpy = spyOn<any>(component, 'sendToIframe');

    component.styleEditorTarget.set({
      styleId: 'bwai-style-image',
      kind: 'image',
      tag: 'img',
      label: 'Hero / img',
      sectionLabel: 'Hero',
      reference: '.lp-hero'
    });
    component.styleImageBaseline.set({ src: '/old.jpg', alt: 'old' });
    component.styleImageDraft.set({ src: '/old.jpg', alt: 'old' });
    component.showStyleEditor.set(true);

    component.onStyleImageFieldChange('alt', 'new alt');

    const lastCall = sendSpy.calls.mostRecent().args[0] as { type: string; styleId: string; image: Record<string, unknown> };
    expect(lastCall.type).toBe('bwai-style-preview');
    expect(lastCall.styleId).toBe('bwai-style-image');
    expect(lastCall.image).toEqual({ alt: 'new alt' });
  });

  it('commits sparse style changes and closes style editor panel', () => {
    const sendSpy = spyOn<any>(component, 'sendToIframe');

    component.styleEditorTarget.set({
      styleId: 'bwai-style-3',
      kind: 'generic',
      tag: 'h2',
      label: 'Heading',
      sectionLabel: 'Hero',
      reference: '.lp-hero'
    });
    component.styleBaselineDraft.set({
      ...component.styleDraft(),
      textAlign: ''
    });
    component.showStyleEditor.set(true);
    component.onStyleFieldChange('textAlign', 'center');

    component.onSaveStyleEditor();

    const lastCall = sendSpy.calls.mostRecent().args[0] as { type: string; styleId: string; styles: Record<string, unknown> };
    expect(lastCall.type).toBe('bwai-style-commit');
    expect(lastCall.styleId).toBe('bwai-style-3');
    expect(lastCall.styles).toEqual({ textAlign: 'center' });
    expect(component.showStyleEditor()).toBeFalse();
    expect(component.styleEditorTarget()).toBeNull();
  });

  it('reverts style changes when style editor is canceled', () => {
    const sendSpy = spyOn<any>(component, 'sendToIframe');

    component.styleEditorTarget.set({
      styleId: 'bwai-style-4',
      kind: 'generic',
      tag: 'span',
      label: 'Badge',
      sectionLabel: 'Features',
      reference: '.lp-features'
    });
    component.showStyleEditor.set(true);

    component.onCancelStyleEditor();

    const lastCall = sendSpy.calls.mostRecent().args[0] as { type: string; styleId: string };
    expect(lastCall.type).toBe('bwai-style-revert');
    expect(lastCall.styleId).toBe('bwai-style-4');
    expect(component.showStyleEditor()).toBeFalse();
    expect(component.styleEditorTarget()).toBeNull();
  });
});
