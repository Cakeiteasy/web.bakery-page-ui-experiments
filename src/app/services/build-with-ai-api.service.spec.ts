import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { BuildWithAiApiService } from './build-with-ai-api.service';

function mockFetch(text: string, status = 200): void {
  spyOn(window, 'fetch').and.returnValue(
    Promise.resolve(
      new Response(text, {
        status,
        headers: { 'Content-Type': 'text/plain' }
      })
    )
  );
}

describe('BuildWithAiApiService', () => {
  let service: BuildWithAiApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(BuildWithAiApiService);
  });

  it('sends x-demo-key header and parses edits response', async () => {
    const payload = JSON.stringify({
      assistantText: 'Done',
      edits: [{ file: 'content.html', search: '<section></section>', replace: '<section>Updated</section>' }],
      warnings: ['sample']
    });
    mockFetch(payload);

    const response = await service.requestPatch(
      {
        modelKey: 'openai:gpt-5.1',
        messages: [],
        files: { html: '<section></section>', css: '.x{}', js: 'console.log(1);' }
      },
      'secret-key'
    );

    const fetchCall = (window.fetch as jasmine.Spy).calls.mostRecent();
    expect(fetchCall.args[1].headers['x-demo-key']).toBe('secret-key');

    expect(response.assistantText).toBe('Done');
    expect(response.edits.length).toBe(1);
    expect(response.edits[0].file).toBe('content.html');
    expect(response.warnings).toEqual(['sample']);
  });

  it('does not send x-demo-key header when demo key is omitted', async () => {
    const payload = JSON.stringify({
      assistantText: 'Done',
      edits: [],
      warnings: []
    });
    mockFetch(payload);

    await service.requestPatch({
      modelKey: 'openai:gpt-5.1',
      messages: [],
      files: { html: '<section></section>', css: '.x{}', js: 'console.log(1);' }
    });

    const fetchCall = (window.fetch as jasmine.Spy).calls.mostRecent();
    expect(fetchCall.args[1].headers['x-demo-key']).toBeUndefined();
  });

  it('throws when API returns non-ok status', async () => {
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );

    await expectAsync(
      service.requestPatch({
        modelKey: 'openai:gpt-5.1',
        messages: [],
        files: { html: '', css: '', js: '' }
      })
    ).toBeRejectedWithError(/Unauthorized/);
  });

  it('throws when response has no edits array', async () => {
    mockFetch(JSON.stringify({ assistantText: 'Oops' }));

    await expectAsync(
      service.requestPatch({
        modelKey: 'openai:gpt-5.1',
        messages: [],
        files: { html: '', css: '', js: '' }
      })
    ).toBeRejectedWithError(/edits/);
  });
});
