import { Injectable } from '@angular/core';

import {
  BUILD_WITH_AI_FILE_NAMES,
  BuildWithAiDiffApplyResult,
  BuildWithAiEditableFileName,
  BuildWithAiEditableFiles,
  BuildWithAiEditApplyResult,
  BuildWithAiSearchReplaceEdit
} from '../models/build-with-ai.model';

@Injectable({ providedIn: 'root' })
export class BuildWithAiDiffService {
  private readonly allowedFiles = new Set<BuildWithAiEditableFileName>(BUILD_WITH_AI_FILE_NAMES);

  applyEdits(currentFiles: BuildWithAiEditableFiles, edits: BuildWithAiSearchReplaceEdit[]): BuildWithAiDiffApplyResult {
    if (!edits.length) {
      throw new Error('No edits provided.');
    }

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

      if (edit.mode === 'insert') {
        if (currentContent !== '') {
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
        if (!currentContent.includes(edit.search)) {
          editResults.push({ ...resultBase, status: 'unmatched', error: `Search string not found in ${edit.file}.` });
          continue;
        }
        const anchorEnd = currentContent.indexOf(edit.search) + edit.search.length;
        nextFiles[contentKey] = currentContent.slice(0, anchorEnd) + edit.value + currentContent.slice(anchorEnd);
        touchedFiles.add(edit.file);
        editResults.push({ ...resultBase, status: 'matched' });
        continue;
      }

      if (!edit.search) {
        editResults.push({ ...resultBase, status: 'error', error: `Search string must not be empty (file: ${edit.file}).` });
        continue;
      }

      if (!currentContent.includes(edit.search)) {
        editResults.push({ ...resultBase, status: 'unmatched', error: `Search string not found in ${edit.file}.` });
        continue;
      }

      nextFiles[contentKey] = currentContent.replace(edit.search, edit.value);
      touchedFiles.add(edit.file);
      editResults.push({ ...resultBase, status: 'matched' });
    }

    const ok = editResults.every(r => r.status === 'matched');

    return {
      files: nextFiles,
      touchedFiles: Array.from(touchedFiles),
      editResults,
      ok
    };
  }

  private toContentKey(fileName: BuildWithAiEditableFileName): keyof BuildWithAiEditableFiles {
    if (fileName === 'content.html') return 'html';
    if (fileName === 'content.css') return 'css';
    return 'js';
  }
}
