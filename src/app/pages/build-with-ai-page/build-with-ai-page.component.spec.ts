import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuildWithAiApiService } from '../../services/build-with-ai-api.service';
import { BuildWithAiContextMeterService } from '../../services/build-with-ai-context-meter.service';
import { BuildWithAiDiffService } from '../../services/build-with-ai-diff.service';
import { BuildWithAiSessionService } from '../../services/build-with-ai-session.service';
import { BuildWithAiSyntaxValidatorService } from '../../services/build-with-ai-syntax-validator.service';
import { BuildWithAiPageComponent } from './build-with-ai-page.component';

describe('BuildWithAiPageComponent', () => {
  let fixture: ComponentFixture<BuildWithAiPageComponent>;
  let component: BuildWithAiPageComponent;

  const baseline = {
    html: '<section>Baseline</section>',
    css: '.x { color: red; }',
    js: 'console.log("baseline");'
  };

  let apiServiceStub: {
    requestPatch: jasmine.Spy;
  };

  let sessionServiceStub: {
    loadBaselineFiles: jasmine.Spy;
    readSnapshot: jasmine.Spy;
    saveSnapshot: jasmine.Spy;
    clearSnapshot: jasmine.Spy;
  };

  let diffServiceStub: {
    applyUnifiedDiff: jasmine.Spy;
  };

  let validatorStub: {
    validate: jasmine.Spy;
  };

  let contextMeterStub: {
    estimate: jasmine.Spy;
  };

  beforeEach(async () => {
    apiServiceStub = {
      requestPatch: jasmine.createSpy('requestPatch').and.resolveTo({
        assistantText: 'Applied.',
        diff: '--- content.html\n+++ content.html\n@@ -1 +1 @@\n-<section>Baseline</section>\n+<section>Updated</section>',
        warnings: [],
        usage: { totalTokens: 100 }
      })
    };

    sessionServiceStub = {
      loadBaselineFiles: jasmine.createSpy('loadBaselineFiles').and.resolveTo(baseline),
      readSnapshot: jasmine.createSpy('readSnapshot').and.returnValue(null),
      saveSnapshot: jasmine.createSpy('saveSnapshot'),
      clearSnapshot: jasmine.createSpy('clearSnapshot')
    };

    diffServiceStub = {
      applyUnifiedDiff: jasmine.createSpy('applyUnifiedDiff').and.returnValue({
        files: {
          ...baseline,
          html: '<section>Updated</section>'
        },
        touchedFiles: ['content.html']
      })
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

    await TestBed.configureTestingModule({
      imports: [BuildWithAiPageComponent],
      providers: [
        { provide: BuildWithAiApiService, useValue: apiServiceStub },
        { provide: BuildWithAiSessionService, useValue: sessionServiceStub },
        { provide: BuildWithAiDiffService, useValue: diffServiceStub },
        { provide: BuildWithAiSyntaxValidatorService, useValue: validatorStub },
        { provide: BuildWithAiContextMeterService, useValue: contextMeterStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BuildWithAiPageComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders preview iframe after baseline load', () => {
    const iframe = fixture.nativeElement.querySelector('.preview-frame');
    expect(iframe).not.toBeNull();
  });

  it('does not render Demo API key input', () => {
    const demoKeyInput = fixture.nativeElement.querySelector('input[placeholder="x-demo-key"]');
    expect(demoKeyInput).toBeNull();
  });

  it('renders model selector inside composer actions', () => {
    const modelSelect = fixture.nativeElement.querySelector('.composer__actions .model-select select');
    expect(modelSelect).not.toBeNull();
  });

  it('applies AI patch on send', async () => {
    component.onDraftChanged('Change headline');

    await component.onSend();
    fixture.detectChanges();

    expect(apiServiceStub.requestPatch).toHaveBeenCalled();
    expect(diffServiceStub.applyUnifiedDiff).toHaveBeenCalled();
    expect(component.files().html).toContain('Updated');
    expect(component.patchLogs()[0].status).toBe('applied');
  });

  it('shows validation errors when patch result is invalid', async () => {
    validatorStub.validate.and.returnValue({
      valid: false,
      issues: [{ file: 'content.css', message: 'Unexpected token' }]
    });

    component.onDraftChanged('Break css');

    await component.onSend();
    fixture.detectChanges();

    expect(component.activeError()?.category).toBe('validation');
    expect(component.patchLogs()[0].status).toBe('rejected');
  });

  it('adds pending attachments from file input', async () => {
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      result: string | ArrayBuffer | null = 'data:image/png;base64,ZmFrZQ==';
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;

      readAsDataURL(_file: Blob): void {
        this.onload?.call(this as unknown as FileReader, new ProgressEvent('load') as unknown as ProgressEvent<FileReader>);
      }
    }

    (globalThis as any).FileReader = MockFileReader as any;

    try {
      const file = new File(['image-content'], 'cake.png', { type: 'image/png' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      await component.onFileInputChange({
        target: {
          files: dataTransfer.files,
          value: ''
        }
      } as unknown as Event);

      expect(component.pendingAttachments().length).toBe(1);
      expect(component.pendingAttachments()[0].name).toBe('cake.png');
    } finally {
      (globalThis as any).FileReader = originalFileReader;
    }
  });

  it('submits on Cmd+Enter', async () => {
    const onSendSpy = spyOn(component, 'onSend').and.resolveTo();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea[name="prompt"]');

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true }));

    expect(onSendSpy).toHaveBeenCalledTimes(1);
  });

  it('submits on Ctrl+Enter', async () => {
    const onSendSpy = spyOn(component, 'onSend').and.resolveTo();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea[name="prompt"]');

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));

    expect(onSendSpy).toHaveBeenCalledTimes(1);
  });

  it('auto-grows textarea and caps height', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const maxHeight = Math.max(160, Math.round(window.innerHeight * 0.4));

    try {
      textarea.value = 'Short';
      component.onTextareaInput({ target: textarea } as unknown as Event);
      const shortHeight = parseInt(textarea.style.height, 10);

      textarea.value = Array.from({ length: 120 }, (_value, index) => `Line ${index}`).join('\n');
      component.onTextareaInput({ target: textarea } as unknown as Event);
      const expandedHeight = parseInt(textarea.style.height, 10);

      expect(expandedHeight).toBeGreaterThanOrEqual(shortHeight);
      expect(expandedHeight).toBeLessThanOrEqual(maxHeight);
      expect(['hidden', 'auto']).toContain(textarea.style.overflowY);
    } finally {
      textarea.remove();
    }
  });
});
