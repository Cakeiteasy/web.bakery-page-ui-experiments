import { TestBed } from '@angular/core/testing';

import { BuildWithAiContextMeterService } from './build-with-ai-context-meter.service';

describe('BuildWithAiContextMeterService', () => {
  let service: BuildWithAiContextMeterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BuildWithAiContextMeterService);
  });

  it('estimates usage below warning threshold', () => {
    const result = service.estimate(
      {
        key: 'openai:gpt-5.1',
        label: 'GPT-5.1',
        provider: 'openai',
        modelId: 'gpt-5.1',
        contextLimit: 200_000
      },
      {
        html: '<section>hello</section>',
        css: '.x { color: red; }',
        js: 'console.log(1);'
      },
      []
    );

    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.nearLimit).toBeFalse();
  });

  it('marks near-limit when ratio crosses threshold', () => {
    const hugeText = 'a'.repeat(9_000);

    const result = service.estimate(
      {
        key: 'openai:gpt-5.1',
        label: 'GPT-5.1',
        provider: 'openai',
        modelId: 'gpt-5.1',
        contextLimit: 2_000
      },
      {
        html: hugeText,
        css: hugeText,
        js: hugeText
      },
      [
        {
          id: 'msg-1',
          role: 'user',
          text: hugeText,
          createdAt: Date.now(),
          attachments: []
        }
      ]
    );

    expect(result.nearLimit).toBeTrue();
    expect(result.ratio).toBeGreaterThan(0.8);
  });
});
