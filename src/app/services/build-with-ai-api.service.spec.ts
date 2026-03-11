import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BuildWithAiApiService } from './build-with-ai-api.service';

describe('BuildWithAiApiService', () => {
  let service: BuildWithAiApiService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(BuildWithAiApiService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('sends x-demo-key header and parses structured response', async () => {
    const promise = service.requestPatch(
      {
        modelKey: 'openai:gpt-5.1',
        messages: [],
        files: {
          html: '<section></section>',
          css: '.x{}',
          js: 'console.log(1);'
        }
      },
      'secret-key'
    );

    const req = httpController.expectOne('/api/build-with-ai');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('x-demo-key')).toBe('secret-key');

    req.flush({
      assistantText: 'Done',
      diff: '--- content.html\n+++ content.html\n@@ -1 +1 @@\n-<section></section>\n+<section>Updated</section>',
      warnings: ['sample'],
      usage: {
        totalTokens: 10
      }
    });

    const response = await promise;
    expect(response.assistantText).toBe('Done');
    expect(response.diff).toContain('content.html');
    expect(response.warnings).toEqual(['sample']);
  });

  it('does not send x-demo-key header when demo key is omitted', async () => {
    const promise = service.requestPatch(
      {
        modelKey: 'openai:gpt-5.1',
        messages: [],
        files: {
          html: '<section></section>',
          css: '.x{}',
          js: 'console.log(1);'
        }
      }
    );

    const req = httpController.expectOne('/api/build-with-ai');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('x-demo-key')).toBeFalse();

    req.flush({
      assistantText: 'Done',
      diff: '--- content.html\n+++ content.html\n@@ -1 +1 @@\n-<section></section>\n+<section>Updated</section>',
      warnings: []
    });

    const response = await promise;
    expect(response.assistantText).toBe('Done');
    expect(response.warnings).toEqual([]);
  });
});
