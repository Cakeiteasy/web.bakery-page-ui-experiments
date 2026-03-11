import { TestBed } from '@angular/core/testing';

import { BuildWithAiDiffService } from './build-with-ai-diff.service';

describe('BuildWithAiDiffService', () => {
  let service: BuildWithAiDiffService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BuildWithAiDiffService);
  });

  it('applies valid unified diff to supported files', () => {
    const result = service.applyUnifiedDiff(
      {
        html: '<h1>Hello</h1>',
        css: '.a{color:red;}',
        js: 'console.log("x")'
      },
      [
        '--- content.html',
        '+++ content.html',
        '@@ -1 +1 @@',
        '-<h1>Hello</h1>',
        '+<h1>Hi</h1>',
        '--- content.css',
        '+++ content.css',
        '@@ -1 +1 @@',
        '-.a{color:red;}',
        '+.a{color:blue;}'
      ].join('\n')
    );

    expect(result.files.html).toBe('<h1>Hi</h1>');
    expect(result.files.css).toBe('.a{color:blue;}');
    expect(result.touchedFiles).toEqual(['content.html', 'content.css']);
  });

  it('rejects diff attempts to unknown files', () => {
    expect(() =>
      service.applyUnifiedDiff(
        {
          html: '',
          css: '',
          js: ''
        },
        ['--- evil.ts', '+++ evil.ts', '@@ -0,0 +1 @@', '+oops'].join('\n')
      )
    ).toThrowError(/unsupported file/i);
  });

  it('rejects malformed hunks', () => {
    expect(() =>
      service.applyUnifiedDiff(
        {
          html: '<p>x</p>',
          css: '',
          js: ''
        },
        ['--- content.html', '+++ content.html', 'not-a-hunk'].join('\n')
      )
    ).toThrowError(/malformed unified diff/i);
  });

  it('accepts create-style full replacement hunks for existing files', () => {
    const result = service.applyUnifiedDiff(
      {
        html: '<p>old</p>',
        css: '',
        js: ''
      },
      ['--- content.html', '+++ content.html', '@@ -0,0 +1 @@', '+<p>new</p>'].join('\n')
    );

    expect(result.files.html).toBe('<p>new</p>');
    expect(result.touchedFiles).toEqual(['content.html']);
  });

  it('accepts patches wrapped with codex begin/end markers', () => {
    const result = service.applyUnifiedDiff(
      {
        html: '<h1>Hello</h1>',
        css: '',
        js: ''
      },
      [
        '*** Begin Patch',
        '--- content.html',
        '+++ content.html',
        '@@ -1 +1 @@',
        '-<h1>Hello</h1>',
        '+<h1>Hi</h1>',
        '*** End Patch'
      ].join('\n')
    );

    expect(result.files.html).toBe('<h1>Hi</h1>');
    expect(result.touchedFiles).toEqual(['content.html']);
  });

  it('accepts codex update-file patch envelope format', () => {
    const result = service.applyUnifiedDiff(
      {
        html: '<h1>Hello</h1>',
        css: '',
        js: ''
      },
      [
        '*** Begin Patch',
        '*** Update File: content.html',
        '@@',
        '-<h1>Hello</h1>',
        '+<h1>Hi</h1>',
        '*** End Patch'
      ].join('\n')
    );

    expect(result.files.html).toBe('<h1>Hi</h1>');
    expect(result.touchedFiles).toEqual(['content.html']);
  });

  it('repairs malformed hunk line counts before parsing', () => {
    const result = service.applyUnifiedDiff(
      {
        html: '<h1>Hello</h1>',
        css: '',
        js: ''
      },
      [
        '--- content.html',
        '+++ content.html',
        '@@ -1,4 +1,4 @@',
        '-<h1>Hello</h1>',
        '+<h1>Hi</h1>'
      ].join('\n')
    );

    expect(result.files.html).toBe('<h1>Hi</h1>');
    expect(result.touchedFiles).toEqual(['content.html']);
  });
});
