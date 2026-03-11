import { TestBed } from '@angular/core/testing';

import { BuildWithAiSyntaxValidatorService } from './build-with-ai-syntax-validator.service';

describe('BuildWithAiSyntaxValidatorService', () => {
  let service: BuildWithAiSyntaxValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BuildWithAiSyntaxValidatorService);
  });

  it('returns valid for syntactically correct html/css/js', () => {
    const result = service.validate({
      html: '<section><h1>Title</h1></section>',
      css: '.x { color: #333; }',
      js: 'const a = 1;'
    });

    expect(result.valid).toBeTrue();
    expect(result.issues.length).toBe(0);
  });

  it('reports invalid html syntax', () => {
    const result = service.validate({
      html: '<section><h1>Title</section>',
      css: '.x { color: #333; }',
      js: 'const a = 1;'
    });

    expect(result.valid).toBeFalse();
    expect(result.issues.some((issue) => issue.file === 'content.html')).toBeTrue();
  });

  it('reports invalid javascript syntax', () => {
    const result = service.validate({
      html: '<section></section>',
      css: '.x { color: #333; }',
      js: 'function () {'
    });

    expect(result.valid).toBeFalse();
    expect(result.issues.some((issue) => issue.file === 'content.js')).toBeTrue();
  });
});
