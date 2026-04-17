import { Injectable } from '@angular/core';

import {
  BUILD_WITH_AI_FILE_NAMES,
  BuildWithAiDiffApplyResult,
  BuildWithAiEditableFileName,
  BuildWithAiEditableFiles,
  BuildWithAiEditApplyResult,
  BuildWithAiSearchReplaceEdit
} from '../models/build-with-ai.model';
import { TW_START_MARKER, TW_END_MARKER } from '../../../lib/tailwind-markers';

interface BuildWithAiDiffApplyOptions {
  allowGlobalStyleOverride?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BuildWithAiDiffService {
  private readonly allowedFiles = new Set<BuildWithAiEditableFileName>(BUILD_WITH_AI_FILE_NAMES);
  private readonly protectedCssSurfacePatterns: RegExp[] = [
    /@import\b/i,
    /(^|[\s,{;]):root\b/,
    /\.lp-btn(?:\b|[-_])/,
    /\.lp-eyebrow(?:\b|[-_])/
  ];

  applyEdits(
    currentFiles: BuildWithAiEditableFiles,
    edits: BuildWithAiSearchReplaceEdit[],
    options: BuildWithAiDiffApplyOptions = {}
  ): BuildWithAiDiffApplyResult {
    if (!edits.length) {
      throw new Error('No edits provided.');
    }

    const allowGlobalStyleOverride = options.allowGlobalStyleOverride === true;
    const nextFiles: BuildWithAiEditableFiles = { ...currentFiles };
    const touchedFiles = new Set<BuildWithAiEditableFileName>();
    const editResults: BuildWithAiEditApplyResult[] = [];

    for (const edit of edits) {
      if (!this.allowedFiles.has(edit.file)) {
        throw new Error(`Edit attempted to modify unsupported file: ${edit.file}.`);
      }

      const contentKey = this.toContentKey(edit.file);
      const currentContent = nextFiles[contentKey];
      const resultBase = { file: edit.file, mode: edit.mode ?? 'replace', search: edit.search ?? '' };

      if (
        edit.file === 'content.css' &&
        !allowGlobalStyleOverride &&
        this.touchesProtectedCssSurface(edit.search ?? '', edit.value ?? '')
      ) {
        editResults.push({
          ...resultBase,
          status: 'error',
          error: 'Protected global styles cannot be changed by default. Add [ALLOW_STYLE_OVERRIDE] to your latest message if this change is intentional.'
        });
        continue;
      }

      if (edit.file === 'content.css' && this.touchesTailwindMarkers(edit.search ?? '', edit.value ?? '')) {
        editResults.push({
          ...resultBase,
          status: 'error',
          error: 'Cannot edit the compiled Tailwind CSS block. Tailwind styles are auto-generated from HTML classes.'
        });
        continue;
      }

      if (edit.mode === 'insert') {
        if (currentContent !== '') {
          if (edit.file === 'content.css' && this.isLightweightCssBaseline(currentContent)) {
            nextFiles[contentKey] = edit.value;
            touchedFiles.add(edit.file);
            editResults.push({ ...resultBase, status: 'matched' });
            continue;
          }
          editResults.push({ ...resultBase, status: 'unmatched', error: `Insert mode requires an empty file, but ${edit.file} already has content.` });
          continue;
        }
        nextFiles[contentKey] = edit.value;
        touchedFiles.add(edit.file);
        editResults.push({ ...resultBase, status: 'matched' });
        continue;
      }

      if (edit.mode === 'insertAfter') {
        if (!edit.search) {
          editResults.push({ ...resultBase, status: 'error', error: `Search string must not be empty for insertAfter mode (file: ${edit.file}).` });
          continue;
        }

        const exactIndex = currentContent.indexOf(edit.search);
        let anchorEnd = -1;

        if (exactIndex >= 0) {
          anchorEnd = exactIndex + edit.search.length;
        } else {
          const normalizedCurrent = currentContent.replace(/\r\n/g, '\n');
          const normalizedSearch = edit.search.replace(/\r\n/g, '\n');
          const normalizedIndex = normalizedCurrent.indexOf(normalizedSearch);

          if (normalizedIndex >= 0) {
            // Apply on normalized content to avoid CRLF/LF anchor mismatches.
            nextFiles[contentKey] =
              normalizedCurrent.slice(0, normalizedIndex + normalizedSearch.length) +
              edit.value +
              normalizedCurrent.slice(normalizedIndex + normalizedSearch.length);
            touchedFiles.add(edit.file);
            editResults.push({ ...resultBase, status: 'matched' });
            continue;
          }

          // Stage 2: collapsed-whitespace fallback
          const { text: collapsedCurrent, map: currentMap } = this.collapseWhitespace(normalizedCurrent);
          const { text: collapsedAnchor } = this.collapseWhitespace(normalizedSearch);
          if (collapsedAnchor) {
            const collapsedIdx = collapsedCurrent.indexOf(collapsedAnchor);
            if (collapsedIdx >= 0) {
              const origEnd = currentMap[collapsedIdx + collapsedAnchor.length - 1] + 1;
              nextFiles[contentKey] =
                normalizedCurrent.slice(0, origEnd) +
                edit.value +
                normalizedCurrent.slice(origEnd);
              touchedFiles.add(edit.file);
              editResults.push({ ...resultBase, status: 'matched' });
              continue;
            }
          }

          if (
            edit.file === 'content.css' &&
            this.isBraceOnlySearch(edit.search)
          ) {
            anchorEnd = currentContent.length;
          }
        }

        if (anchorEnd < 0) {
          editResults.push({ ...resultBase, status: 'unmatched', error: `Search string not found in ${edit.file}.` });
          continue;
        }

        nextFiles[contentKey] = currentContent.slice(0, anchorEnd) + edit.value + currentContent.slice(anchorEnd);
        touchedFiles.add(edit.file);
        editResults.push({ ...resultBase, status: 'matched' });
        continue;
      }

      if (!edit.search) {
        editResults.push({ ...resultBase, status: 'error', error: `Search string must not be empty (file: ${edit.file}).` });
        continue;
      }

      const replaceResult = this.findAndReplace(currentContent, edit.search, edit.value);
      if (replaceResult === null) {
        editResults.push({ ...resultBase, status: 'unmatched', error: `Search string not found in ${edit.file}.` });
        continue;
      }

      nextFiles[contentKey] = replaceResult;
      touchedFiles.add(edit.file);
      editResults.push({ ...resultBase, status: 'matched' });
    }

    const ok = editResults.every(r => r.status === 'matched');
    const partialOk = !ok && editResults.some(r => r.status === 'matched');

    return {
      files: nextFiles,
      touchedFiles: Array.from(touchedFiles),
      editResults,
      ok,
      partialOk
    };
  }

  /**
   * Cascading search-and-replace: exact → CRLF-normalized → whitespace-collapsed.
   * Returns the new content string on match, or null when no stage matches.
   */
  private findAndReplace(content: string, search: string, value: string): string | null {
    // Stage 0: exact match
    const exactIdx = content.indexOf(search);
    if (exactIdx >= 0) {
      return content.slice(0, exactIdx) + value + content.slice(exactIdx + search.length);
    }

    // Stage 1: CRLF → LF normalization
    const normContent = content.replace(/\r\n/g, '\n');
    const normSearch = search.replace(/\r\n/g, '\n');
    const crlfIdx = normContent.indexOf(normSearch);
    if (crlfIdx >= 0) {
      return normContent.slice(0, crlfIdx) + value + normContent.slice(crlfIdx + normSearch.length);
    }

    // Stage 2: collapse whitespace runs (space/tab/newline → single space, trimmed lines)
    const { text: collapsedContent, map: contentMap } = this.collapseWhitespace(normContent);
    const { text: collapsedSearch } = this.collapseWhitespace(normSearch);

    if (!collapsedSearch) return null;

    const collapsedIdx = collapsedContent.indexOf(collapsedSearch);
    if (collapsedIdx < 0) return null;

    const origStart = contentMap[collapsedIdx];
    const origEnd = contentMap[collapsedIdx + collapsedSearch.length - 1] + 1;
    return normContent.slice(0, origStart) + value + normContent.slice(origEnd);
  }

  /**
   * Collapses all whitespace runs to a single space and returns a character-index
   * map from each position in the collapsed string back to its original position.
   */
  private collapseWhitespace(input: string): { text: string; map: number[] } {
    const chars: string[] = [];
    const map: number[] = [];
    let prevWasSpace = true; // treat start as if preceded by space to trim leading ws
    for (let i = 0; i < input.length; i++) {
      if (/\s/.test(input[i])) {
        prevWasSpace = true;
      } else {
        if (!prevWasSpace || chars.length === 0) {
          // nothing — just append the char below
        } else if (chars.length > 0) {
          chars.push(' ');
          map.push(i);
        }
        chars.push(input[i]);
        map.push(i);
        prevWasSpace = false;
      }
    }
    return { text: chars.join(''), map };
  }

  private toContentKey(fileName: BuildWithAiEditableFileName): keyof BuildWithAiEditableFiles {
    if (fileName === 'content.html') return 'html';
    if (fileName === 'content.css') return 'css';
    return 'js';
  }

  private isBraceOnlySearch(value: string): boolean {
    const compact = value.replace(/\s/g, '');
    return compact.length >= 2 && /^}+$/.test(compact);
  }

  private touchesTailwindMarkers(search: string, value: string): boolean {
    const combined = `${search}\n${value}`;
    return combined.includes(TW_START_MARKER) || combined.includes(TW_END_MARKER);
  }

  private touchesProtectedCssSurface(search: string, value: string): boolean {
    const candidate = `${search}\n${value}`;
    return this.protectedCssSurfacePatterns.some((pattern) => pattern.test(candidate));
  }

  private isLightweightCssBaseline(content: string): boolean {
    const withoutBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, '');
    const compact = withoutBlockComments.replace(/\s/g, '');
    if (!compact) return true;
    return compact === '#EditableContentRoot{position:relative;}';
  }
}
