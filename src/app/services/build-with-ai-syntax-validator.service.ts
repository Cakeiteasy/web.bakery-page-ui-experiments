import { Injectable } from '@angular/core';

import { BuildWithAiEditableFiles, BuildWithAiValidationIssue, BuildWithAiValidationResult } from '../models/build-with-ai.model';

@Injectable({ providedIn: 'root' })
export class BuildWithAiSyntaxValidatorService {
  validate(files: BuildWithAiEditableFiles): BuildWithAiValidationResult {
    const issues: BuildWithAiValidationIssue[] = [];

    issues.push(...this.validateHtml(files.html));
    issues.push(...this.validateCss(files.css));
    issues.push(...this.validateJs(files.js));

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private validateHtml(html: string): BuildWithAiValidationIssue[] {
    if (!html.trim()) return [];

    // Use DOMParser so that `@` characters (social handles, emails, CSS at-rules
    // inside <style> tags) are never misread as Angular template block syntax.
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const err = doc.querySelector('parsererror');
      if (err) {
        return [{ file: 'content.html', message: err.textContent ?? 'Invalid HTML' }];
      }
    } catch (error) {
      return [{ file: 'content.html', message: error instanceof Error ? error.message : 'Invalid HTML syntax.' }];
    }

    return [];
  }

  private validateCss(css: string): BuildWithAiValidationIssue[] {
    if (!css.trim()) {
      return [];
    }

    try {
      if (typeof CSSStyleSheet !== 'undefined') {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        return [];
      }

      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      style.remove();
      return [];
    } catch (error) {
      return [
        {
          file: 'content.css',
          message: error instanceof Error ? error.message : 'Invalid CSS syntax.'
        }
      ];
    }
  }

  private validateJs(js: string): BuildWithAiValidationIssue[] {
    if (!js.trim()) {
      return [];
    }

    try {
      // Parse only. This does not execute the script body.
      // eslint-disable-next-line no-new-func
      new Function(js);
      return [];
    } catch (error) {
      return [
        {
          file: 'content.js',
          message: error instanceof Error ? error.message : 'Invalid JavaScript syntax.'
        }
      ];
    }
  }
}
