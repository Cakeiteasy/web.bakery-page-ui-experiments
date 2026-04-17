import { TestBed } from '@angular/core/testing';

import { BuildWithAiDiffService } from './build-with-ai-diff.service';

describe('BuildWithAiDiffService', () => {
  let service: BuildWithAiDiffService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BuildWithAiDiffService);
  });

  it('applies a simple replacement in html', () => {
    const result = service.applyEdits(
      { html: '<h1>Hello</h1>', css: '.a{color:red;}', js: 'console.log("x")' },
      [{ file: 'content.html', search: '<h1>Hello</h1>', value: '<h1>Hi</h1>' }]
    );

    expect(result.files.html).toBe('<h1>Hi</h1>');
    expect(result.files.css).toBe('.a{color:red;}');
    expect(result.touchedFiles).toEqual(['content.html']);
    expect(result.ok).toBeTrue();
    expect(result.editResults[0].status).toBe('matched');
  });

  it('applies edits to multiple files', () => {
    const result = service.applyEdits(
      { html: '<h1>Hello</h1>', css: '.a{color:red;}', js: '' },
      [
        { file: 'content.html', search: 'Hello', value: 'Hi' },
        { file: 'content.css', search: 'red', value: 'blue' }
      ]
    );

    expect(result.files.html).toBe('<h1>Hi</h1>');
    expect(result.files.css).toBe('.a{color:blue;}');
    expect(result.touchedFiles).toEqual(['content.html', 'content.css']);
    expect(result.ok).toBeTrue();
  });

  it('inserts content by including surrounding context in search', () => {
    const result = service.applyEdits(
      { html: '<article>\n  <h3>Title</h3>\n</article>', css: '', js: '' },
      [{
        file: 'content.html',
        search: '<article>\n  <h3>Title</h3>',
        value: '<article>\n  <img src="img.jpg">\n  <h3>Title</h3>'
      }]
    );

    expect(result.files.html).toBe('<article>\n  <img src="img.jpg">\n  <h3>Title</h3>\n</article>');
  });

  it('applies edits in order', () => {
    const result = service.applyEdits(
      { html: 'aaa', css: '', js: '' },
      [
        { file: 'content.html', search: 'aaa', value: 'bbb' },
        { file: 'content.html', search: 'bbb', value: 'ccc' }
      ]
    );

    expect(result.files.html).toBe('ccc');
  });

  it('throws when edits array is empty', () => {
    expect(() =>
      service.applyEdits({ html: '', css: '', js: '' }, [])
    ).toThrowError(/no edits provided/i);
  });

  it('throws when targeting an unsupported file', () => {
    expect(() =>
      service.applyEdits(
        { html: '', css: '', js: '' },
        [{ file: 'evil.ts' as any, search: 'x', value: 'y' }]
      )
    ).toThrowError(/unsupported file/i);
  });

  it('returns unmatched status when search string is not found', () => {
    const result = service.applyEdits(
      { html: '<p>hello</p>', css: '', js: '' },
      [{ file: 'content.html', search: 'not-present', value: 'x' }]
    );

    expect(result.ok).toBeFalse();
    expect(result.editResults[0].status).toBe('unmatched');
    expect(result.editResults[0].error).toMatch(/not found/i);
    expect(result.files.html).toBe('<p>hello</p>');
  });

  it('returns error status when search string is empty', () => {
    const result = service.applyEdits(
      { html: '<p>x</p>', css: '', js: '' },
      [{ file: 'content.html', search: '', value: '<p>y</p>' }]
    );

    expect(result.ok).toBeFalse();
    expect(result.editResults[0].status).toBe('error');
  });

  it('continues processing all edits even if one fails', () => {
    const result = service.applyEdits(
      { html: '<h1>Hello</h1><p>World</p>', css: '', js: '' },
      [
        { file: 'content.html', search: 'not-found', value: 'x' },
        { file: 'content.html', search: 'World', value: 'Earth' }
      ]
    );

    expect(result.ok).toBeFalse();
    expect(result.editResults[0].status).toBe('unmatched');
    expect(result.editResults[1].status).toBe('matched');
    expect(result.files.html).toBe('<h1>Hello</h1><p>Earth</p>');
  });

  it('inserts into an empty file using mode: insert', () => {
    const result = service.applyEdits(
      { html: '', css: '', js: '' },
      [{ file: 'content.html', mode: 'insert', search: '', value: '<h1>Hello</h1>' }]
    );
    expect(result.files.html).toBe('<h1>Hello</h1>');
    expect(result.touchedFiles).toEqual(['content.html']);
    expect(result.ok).toBeTrue();
  });

  it('returns unmatched when insert mode is used on a non-empty file', () => {
    const result = service.applyEdits(
      { html: '<p>existing</p>', css: '', js: '' },
      [{ file: 'content.html', mode: 'insert', search: '', value: '<h1>Hello</h1>' }]
    );

    expect(result.ok).toBeFalse();
    expect(result.editResults[0].status).toBe('unmatched');
    expect(result.editResults[0].error).toMatch(/insert mode requires an empty file/i);
    expect(result.files.html).toBe('<p>existing</p>');
  });

  it('insertAfter inserts value immediately after the anchor string', () => {
    const result = service.applyEdits(
      { html: '<ul><li>Item 1</li><li>Item 2</li></ul>', css: '', js: '' },
      [{ file: 'content.html', mode: 'insertAfter', search: '<li>Item 2</li>', value: '<li>Item 3</li>' }]
    );
    expect(result.files.html).toBe('<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>');
    expect(result.touchedFiles).toEqual(['content.html']);
    expect(result.ok).toBeTrue();
  });

  it('insertAfter inserts after first occurrence when anchor appears multiple times', () => {
    const result = service.applyEdits(
      { html: '<div class="card">A</div><div class="card">B</div>', css: '', js: '' },
      [{ file: 'content.html', mode: 'insertAfter', search: '<div class="card">A</div>', value: '<div class="card">NEW</div>' }]
    );
    expect(result.files.html).toBe('<div class="card">A</div><div class="card">NEW</div><div class="card">B</div>');
  });

  it('insertAfter does not modify the anchor content', () => {
    const html = '<section><h2>Title</h2></section>';
    const result = service.applyEdits(
      { html, css: '', js: '' },
      [{ file: 'content.html', mode: 'insertAfter', search: '</section>', value: '\n<section><h2>New</h2></section>' }]
    );
    expect(result.files.html).toBe('<section><h2>Title</h2></section>\n<section><h2>New</h2></section>');
  });

  it('returns error when insertAfter search string is empty', () => {
    const result = service.applyEdits(
      { html: '<p>x</p>', css: '', js: '' },
      [{ file: 'content.html', mode: 'insertAfter', search: '', value: '<p>y</p>' }]
    );

    expect(result.ok).toBeFalse();
    expect(result.editResults[0].status).toBe('error');
  });

  it('returns unmatched when insertAfter search string is not found', () => {
    const result = service.applyEdits(
      { html: '<p>hello</p>', css: '', js: '' },
      [{ file: 'content.html', mode: 'insertAfter', search: '<p>missing</p>', value: '<p>new</p>' }]
    );

    expect(result.ok).toBeFalse();
    expect(result.editResults[0].status).toBe('unmatched');
  });

  it('insertAfter tolerates CRLF/LF mismatch in anchor text', () => {
    const result = service.applyEdits(
      { html: '<section>\r\n  <h2>Title</h2>\r\n</section>', css: '', js: '' },
      [{
        file: 'content.html',
        mode: 'insertAfter',
        search: '<section>\n  <h2>Title</h2>\n</section>',
        value: '\n<section><h2>New</h2></section>'
      }]
    );

    expect(result.ok).toBeTrue();
    expect(result.files.html).toBe('<section>\n  <h2>Title</h2>\n</section>\n<section><h2>New</h2></section>');
    expect(result.editResults[0].status).toBe('matched');
  });

  it('insertAfter appends to EOF for css when brace-only anchor is missing', () => {
    const result = service.applyEdits(
      { html: '', css: '.a{color:red;}', js: '' },
      [{
        file: 'content.css',
        mode: 'insertAfter',
        search: '    }\n  }\n}',
        value: '\n.b{color:blue;}'
      }]
    );

    expect(result.ok).toBeTrue();
    expect(result.files.css).toBe('.a{color:red;}\n.b{color:blue;}');
    expect(result.editResults[0].status).toBe('matched');
  });

  it('rejects protected global style edits in content.css by default', () => {
    const result = service.applyEdits(
      { html: '', css: '.lp-btn { color: red; }', js: '' },
      [{
        file: 'content.css',
        search: '.lp-btn { color: red; }',
        value: '.lp-btn { color: blue; }'
      }]
    );

    expect(result.ok).toBeFalse();
    expect(result.files.css).toBe('.lp-btn { color: red; }');
    expect(result.editResults[0].status).toBe('error');
    expect(result.editResults[0].error).toContain('[ALLOW_STYLE_OVERRIDE]');
  });

  it('allows protected global style edits when override flag is true', () => {
    const result = service.applyEdits(
      { html: '', css: '.lp-btn { color: red; }', js: '' },
      [{
        file: 'content.css',
        search: '.lp-btn { color: red; }',
        value: '.lp-btn { color: blue; }'
      }],
      { allowGlobalStyleOverride: true }
    );

    expect(result.ok).toBeTrue();
    expect(result.files.css).toBe('.lp-btn { color: blue; }');
    expect(result.editResults[0].status).toBe('matched');
  });

  it('allows insert mode for content.css when file only has lightweight baseline content', () => {
    const result = service.applyEdits(
      { html: '', css: '/* baseline */\n#EditableContentRoot { position: relative; }', js: '' },
      [{
        file: 'content.css',
        mode: 'insert',
        search: '',
        value: '.page{color:#333;}'
      }]
    );

    expect(result.ok).toBeTrue();
    expect(result.files.css).toBe('.page{color:#333;}');
    expect(result.editResults[0].status).toBe('matched');
  });

  it('does not protect base section selectors like .lp-hero by default', () => {
    const result = service.applyEdits(
      { html: '', css: '.lp-hero { padding: 10px; }', js: '' },
      [{
        file: 'content.css',
        search: '.lp-hero { padding: 10px; }',
        value: '.lp-hero { padding: 20px; }'
      }]
    );

    expect(result.ok).toBeTrue();
    expect(result.files.css).toBe('.lp-hero { padding: 20px; }');
  });

  // --- Replace mode: CRLF normalization fallback ---

  it('replace tolerates CRLF/LF mismatch in search string', () => {
    const result = service.applyEdits(
      { html: '<div>\r\n  <h1>Title</h1>\r\n</div>', css: '', js: '' },
      [{
        file: 'content.html',
        search: '<div>\n  <h1>Title</h1>\n</div>',
        value: '<div>\n  <h1>New Title</h1>\n</div>'
      }]
    );

    expect(result.ok).toBeTrue();
    expect(result.editResults[0].status).toBe('matched');
    expect(result.files.html).toBe('<div>\n  <h1>New Title</h1>\n</div>');
  });

  // --- Replace mode: collapsed-whitespace normalization fallback ---

  it('replace tolerates indentation drift between search and file', () => {
    const result = service.applyEdits(
      { html: '<section>\n    <h2>Title</h2>\n    <p>Text</p>\n</section>', css: '', js: '' },
      [{
        file: 'content.html',
        search: '<section>\n  <h2>Title</h2>\n  <p>Text</p>\n</section>',
        value: '<section>\n  <h2>Updated</h2>\n</section>'
      }]
    );

    expect(result.ok).toBeTrue();
    expect(result.editResults[0].status).toBe('matched');
    expect(result.files.html).toBe('<section>\n  <h2>Updated</h2>\n</section>');
  });

  it('replace tolerates extra whitespace between tags', () => {
    const result = service.applyEdits(
      { html: '<div>  <span>A</span>  <span>B</span>  </div>', css: '', js: '' },
      [{
        file: 'content.html',
        search: '<div> <span>A</span> <span>B</span> </div>',
        value: '<div><span>X</span></div>'
      }]
    );

    expect(result.ok).toBeTrue();
    expect(result.files.html).toBe('<div><span>X</span></div>');
  });

  it('replace does not match when non-whitespace characters differ', () => {
    const result = service.applyEdits(
      { html: '<h1>Hello</h1>', css: '', js: '' },
      [{ file: 'content.html', search: '<h1>Goodbye</h1>', value: '<h1>Hi</h1>' }]
    );

    expect(result.ok).toBeFalse();
    expect(result.editResults[0].status).toBe('unmatched');
  });

  // --- insertAfter: collapsed-whitespace normalization fallback ---

  it('insertAfter tolerates indentation drift in anchor', () => {
    const result = service.applyEdits(
      { html: '<ul>\n    <li>One</li>\n</ul>', css: '', js: '' },
      [{
        file: 'content.html',
        mode: 'insertAfter',
        search: '<ul>\n  <li>One</li>\n</ul>',
        value: '\n<p>After</p>'
      }]
    );

    expect(result.ok).toBeTrue();
    expect(result.editResults[0].status).toBe('matched');
    expect(result.files.html).toContain('</ul>\n<p>After</p>');
  });

  // --- partialOk flag ---

  it('sets partialOk when some edits match and some do not', () => {
    const result = service.applyEdits(
      { html: '<h1>Hello</h1><p>World</p>', css: '', js: '' },
      [
        { file: 'content.html', search: 'not-found', value: 'x' },
        { file: 'content.html', search: 'World', value: 'Earth' }
      ]
    );

    expect(result.ok).toBeFalse();
    expect(result.partialOk).toBeTrue();
    expect(result.files.html).toBe('<h1>Hello</h1><p>Earth</p>');
  });

  it('partialOk is false when all edits match', () => {
    const result = service.applyEdits(
      { html: '<h1>Hello</h1>', css: '', js: '' },
      [{ file: 'content.html', search: 'Hello', value: 'Hi' }]
    );

    expect(result.ok).toBeTrue();
    expect(result.partialOk).toBeFalse();
  });

  it('partialOk is false when no edits match', () => {
    const result = service.applyEdits(
      { html: '<h1>Hello</h1>', css: '', js: '' },
      [{ file: 'content.html', search: 'missing', value: 'x' }]
    );

    expect(result.ok).toBeFalse();
    expect(result.partialOk).toBeFalse();
  });
});
