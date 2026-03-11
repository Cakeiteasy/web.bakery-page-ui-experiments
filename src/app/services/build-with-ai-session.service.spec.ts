import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { BuildWithAiSessionService } from './build-with-ai-session.service';

describe('BuildWithAiSessionService', () => {
  let service: BuildWithAiSessionService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('build-with-ai-session-v1');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(BuildWithAiSessionService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('loads baseline files from assets', async () => {
    const promise = service.loadBaselineFiles();

    httpController.expectOne('/assets/build-with-ai/content.html').flush('<main>html</main>');
    httpController.expectOne('/assets/build-with-ai/content.css').flush('.x{}');
    httpController.expectOne('/assets/build-with-ai/content.js').flush('console.log(1);');

    const result = await promise;

    expect(result.html).toContain('<main>html</main>');
    expect(result.css).toContain('.x{}');
    expect(result.js).toContain('console.log(1);');
  });

  it('persists and restores snapshot in local storage', () => {
    service.saveSnapshot({
      modelKey: 'openai:gpt-5.1',
      files: { html: '<p>x</p>', css: '.x{}', js: 'console.log(1);' },
      messages: [],
      patchLogs: [],
      updatedAt: Date.now()
    });

    const snapshot = service.readSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.modelKey).toBe('openai:gpt-5.1');
  });
});
