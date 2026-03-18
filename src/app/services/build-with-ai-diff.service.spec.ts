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

  it('throws when search string is not found', () => {
    expect(() =>
      service.applyEdits(
        { html: '<p>hello</p>', css: '', js: '' },
        [{ file: 'content.html', search: 'not-present', value: 'x' }]
      )
    ).toThrowError(/not found/i);
  });

  it('throws when search string is empty', () => {
    expect(() =>
      service.applyEdits(
        { html: '<p>x</p>', css: '', js: '' },
        [{ file: 'content.html', search: '', value: '<p>y</p>' }]
      )
    ).toThrowError(/must not be empty/i);
  });

  it('inserts into an empty file using mode: insert', () => {
    const result = service.applyEdits(
      { html: '', css: '', js: '' },
      [{ file: 'content.html', mode: 'insert', search: '', value: '<h1>Hello</h1>' }]
    );
    expect(result.files.html).toBe('<h1>Hello</h1>');
    expect(result.touchedFiles).toEqual(['content.html']);
  });

  it('throws when insert mode is used on a non-empty file', () => {
    expect(() =>
      service.applyEdits(
        { html: '<p>existing</p>', css: '', js: '' },
        [{ file: 'content.html', mode: 'insert', search: '', value: '<h1>Hello</h1>' }]
      )
    ).toThrowError(/insert mode requires an empty file/i);
  });

  it('insertAfter inserts value immediately after the anchor string', () => {
    const result = service.applyEdits(
      { html: '<ul><li>Item 1</li><li>Item 2</li></ul>', css: '', js: '' },
      [{ file: 'content.html', mode: 'insertAfter', search: '<li>Item 2</li>', value: '<li>Item 3</li>' }]
    );
    expect(result.files.html).toBe('<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>');
    expect(result.touchedFiles).toEqual(['content.html']);
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

  it('throws when insertAfter search string is empty', () => {
    expect(() =>
      service.applyEdits(
        { html: '<p>x</p>', css: '', js: '' },
        [{ file: 'content.html', mode: 'insertAfter', search: '', value: '<p>y</p>' }]
      )
    ).toThrowError(/must not be empty/i);
  });

  it('throws when insertAfter search string is not found', () => {
    expect(() =>
      service.applyEdits(
        { html: '<p>hello</p>', css: '', js: '' },
        [{ file: 'content.html', mode: 'insertAfter', search: '<p>missing</p>', value: '<p>new</p>' }]
      )
    ).toThrowError(/not found/i);
  });
});
