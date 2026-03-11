import { Injectable } from '@angular/core';
import { applyPatch, parsePatch } from 'diff';

import {
  BUILD_WITH_AI_FILE_NAMES,
  BuildWithAiDiffApplyResult,
  BuildWithAiEditableFileName,
  BuildWithAiEditableFiles
} from '../models/build-with-ai.model';

interface ParsedPatch {
  oldFileName?: string;
  newFileName?: string;
  hunks?: Array<{ oldStart?: number; oldLines?: number; newStart?: number; newLines?: number; lines?: string[] }>;
}

interface ParsedHunkHeader {
  oldStart: number;
  newStart: number;
  suffix: string;
}

@Injectable({ providedIn: 'root' })
export class BuildWithAiDiffService {
  private readonly allowedFiles = new Set<BuildWithAiEditableFileName>(BUILD_WITH_AI_FILE_NAMES);

  applyUnifiedDiff(currentFiles: BuildWithAiEditableFiles, rawDiff: string): BuildWithAiDiffApplyResult {
    const normalizedDiff = this.normalizeRawDiff(rawDiff);
    if (!normalizedDiff.trim()) {
      throw new Error('Diff is empty.');
    }

    let parsedPatches: ParsedPatch[];
    try {
      parsedPatches = this.parsePatchesWithRepair(normalizedDiff);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse unified diff.';
      throw new Error(`Malformed unified diff: ${message}`);
    }

    if (!parsedPatches.length) {
      throw new Error('No unified diff blocks found.');
    }

    const nextFiles: BuildWithAiEditableFiles = { ...currentFiles };
    const touchedFiles = new Set<BuildWithAiEditableFileName>();

    for (const patch of parsedPatches) {
      const fileName = this.resolveTargetFileName(patch);
      if (!patch.hunks?.length) {
        throw new Error(`Diff for ${fileName} has no hunks.`);
      }

      const contentKey = this.toContentKey(fileName);
      const currentContent = nextFiles[contentKey];

      const createStyleReplacement = this.tryCreateStyleReplacement(patch, currentContent);
      if (createStyleReplacement !== null) {
        nextFiles[contentKey] = createStyleReplacement;
        touchedFiles.add(fileName);
        continue;
      }

      const applied = applyPatch(currentContent, patch as any, {
        fuzzFactor: 2
      });

      if (applied === false) {
        const forcedReplacement = this.tryForcedReplacement(patch, currentContent);
        if (forcedReplacement === null) {
          throw new Error(`Context mismatch while applying ${fileName}.`);
        }

        nextFiles[contentKey] = forcedReplacement;
      } else {
        nextFiles[contentKey] = applied;
      }

      touchedFiles.add(fileName);
    }

    return {
      files: nextFiles,
      touchedFiles: Array.from(touchedFiles)
    };
  }

  private resolveTargetFileName(patch: ParsedPatch): BuildWithAiEditableFileName {
    const oldPath = this.normalizePath(patch.oldFileName ?? '');
    const newPath = this.normalizePath(patch.newFileName ?? '');

    const selected = newPath === '/dev/null' ? oldPath : newPath;
    if (!this.allowedFiles.has(selected as BuildWithAiEditableFileName)) {
      throw new Error(`Diff attempted to modify unsupported file: ${selected}.`);
    }

    return selected as BuildWithAiEditableFileName;
  }

  private tryCreateStyleReplacement(patch: ParsedPatch, currentContent: string): string | null {
    if (!patch.hunks || patch.hunks.length !== 1) {
      return null;
    }

    const hunk = patch.hunks[0];
    const lines = hunk.lines;
    if (!Array.isArray(lines) || !lines.length) {
      return null;
    }

    const hasOnlyAdditions = lines.every((line) => line.startsWith('+'));
    if (!hasOnlyAdditions) {
      return null;
    }

    // Treat create-style hunks for non-empty files as full replacement to avoid accidental prepend behavior.
    const isCreateStyle = hunk.oldStart === 1 && hunk.oldLines === 0;
    if (!isCreateStyle || !currentContent.trim()) {
      return null;
    }

    return lines.map((line) => line.slice(1)).join('\n');
  }

  private tryForcedReplacement(patch: ParsedPatch, currentContent: string): string | null {
    if (!patch.hunks || patch.hunks.length !== 1) {
      return null;
    }

    const lines = patch.hunks[0].lines;
    if (!Array.isArray(lines) || !lines.length) {
      return null;
    }

    if (lines.some((line) => line.startsWith(' '))) {
      return null;
    }

    const added = lines.filter((line) => line.startsWith('+')).map((line) => line.slice(1));
    const removed = lines.filter((line) => line.startsWith('-')).map((line) => line.slice(1));

    if (!added.length) {
      return null;
    }

    if (!removed.length) {
      // Model produced a create-style hunk (e.g. @@ -0,0 +N). Treat as full replacement.
      return added.join('\n');
    }

    const normalizedCurrent = currentContent.replace(/\r\n/g, '\n').trim();
    const normalizedRemoved = removed.join('\n').trim();

    if (normalizedCurrent === normalizedRemoved) {
      return added.join('\n');
    }

    return null;
  }

  private normalizePath(raw: string): string {
    const firstToken = raw.trim().split(/\s+/)[0] ?? '';
    const unquotedToken = firstToken.replace(/^['"]/, '').replace(/['"]$/, '');
    if (unquotedToken === '/dev/null') {
      return '/dev/null';
    }

    return unquotedToken.replace(/^a\//, '').replace(/^b\//, '').replace(/^\.\//, '').replace(/^\//, '');
  }

  private normalizeRawDiff(rawDiff: string): string {
    let text = rawDiff.replace(/\r\n/g, '\n').trim();

    if (text.startsWith('```')) {
      const lines = text.split('\n');
      if (lines.length >= 2) {
        lines.shift();
      }

      if (lines.length && lines[lines.length - 1].trim() === '```') {
        lines.pop();
      }

      text = lines.join('\n');
    }

    return this.normalizePatchEnvelope(text);
  }

  private normalizePatchEnvelope(text: string): string {
    const outputLines: string[] = [];

    for (const line of text.split('\n')) {
      const trimmed = line.trim();

      if (trimmed === '*** Begin Patch' || trimmed === '*** End Patch' || trimmed.startsWith('*** Move to:')) {
        continue;
      }

      const updateFileMatch = /^\*\*\* Update File:\s+(.+)$/.exec(trimmed);
      if (updateFileMatch) {
        const targetFile = this.normalizePath(updateFileMatch[1]);
        outputLines.push(`--- ${targetFile}`);
        outputLines.push(`+++ ${targetFile}`);
        continue;
      }

      const addFileMatch = /^\*\*\* Add File:\s+(.+)$/.exec(trimmed);
      if (addFileMatch) {
        const targetFile = this.normalizePath(addFileMatch[1]);
        outputLines.push('--- /dev/null');
        outputLines.push(`+++ ${targetFile}`);
        continue;
      }

      const deleteFileMatch = /^\*\*\* Delete File:\s+(.+)$/.exec(trimmed);
      if (deleteFileMatch) {
        const targetFile = this.normalizePath(deleteFileMatch[1]);
        outputLines.push(`--- ${targetFile}`);
        outputLines.push('+++ /dev/null');
        continue;
      }

      outputLines.push(line);
    }

    return outputLines.join('\n').trim();
  }

  private parsePatchesWithRepair(diffText: string): ParsedPatch[] {
    try {
      return parsePatch(diffText) as ParsedPatch[];
    } catch (firstError) {
      const repairedDiff = this.repairHunkLineCounts(diffText);
      if (repairedDiff === diffText) {
        throw firstError;
      }

      return parsePatch(repairedDiff) as ParsedPatch[];
    }
  }

  private repairHunkLineCounts(diffText: string): string {
    const lines = diffText.split('\n');
    const repairedLines = [...lines];
    let changed = false;

    for (let index = 0; index < lines.length; index += 1) {
      const header = this.parseHunkHeader(lines[index]);
      if (!header) {
        continue;
      }

      let removedLineCount = 0;
      let addedLineCount = 0;

      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const line = lines[cursor];

        if (line.startsWith('@@')) {
          break;
        }

        if (line.startsWith('--- ') && cursor + 1 < lines.length && lines[cursor + 1].startsWith('+++ ')) {
          break;
        }

        if (line.startsWith('diff --git ')) {
          break;
        }

        if (line.startsWith('\\ No newline at end of file')) {
          continue;
        }

        if (line.startsWith('-')) {
          removedLineCount += 1;
          continue;
        }

        if (line.startsWith('+')) {
          addedLineCount += 1;
          continue;
        }

        if (line.startsWith(' ')) {
          removedLineCount += 1;
          addedLineCount += 1;
          continue;
        }

        break;
      }

      if (!removedLineCount && !addedLineCount) {
        continue;
      }

      const rebuiltHeader = `@@ -${header.oldStart},${removedLineCount} +${header.newStart},${addedLineCount} @@${header.suffix}`;
      if (rebuiltHeader !== lines[index]) {
        repairedLines[index] = rebuiltHeader;
        changed = true;
      }
    }

    return changed ? repairedLines.join('\n') : diffText;
  }

  private parseHunkHeader(line: string): ParsedHunkHeader | null {
    const standardHeader = /^@@\s*-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s*@@(.*)$/.exec(line);
    if (standardHeader) {
      return {
        oldStart: Number(standardHeader[1]),
        newStart: Number(standardHeader[2]),
        suffix: standardHeader[3] ?? ''
      };
    }

    const bareHeader = /^@@(?:\s*(.*))?$/.exec(line);
    if (!bareHeader) {
      return null;
    }

    const suffixText = (bareHeader[1] ?? '').trim();
    return {
      oldStart: 1,
      newStart: 1,
      suffix: suffixText ? ` ${suffixText}` : ''
    };
  }

  private toContentKey(fileName: BuildWithAiEditableFileName): keyof BuildWithAiEditableFiles {
    if (fileName === 'content.html') {
      return 'html';
    }

    if (fileName === 'content.css') {
      return 'css';
    }

    return 'js';
  }
}
