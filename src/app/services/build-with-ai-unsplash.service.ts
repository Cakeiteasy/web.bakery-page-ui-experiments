import { Injectable } from '@angular/core';

import { BuildWithAiSearchReplaceEdit } from '../models/build-with-ai.model';

interface UnsplashSearchResult {
  regularUrl: string;
  description: string;
}

interface PlaceholderMatch {
  url: string;
  query: string;
}

const PLACEHOLDER_RE = /https:\/\/placehold\.co\/[^\s"')]+/g;
const SEARCH_TIMEOUT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class BuildWithAiUnsplashService {

  async replacePlaceholders(edits: BuildWithAiSearchReplaceEdit[]): Promise<BuildWithAiSearchReplaceEdit[]> {
    const placeholders = this.extractPlaceholders(edits);
    if (placeholders.length === 0) return edits;

    const replacements = await this.fetchReplacements(placeholders);
    if (replacements.size === 0) return edits;

    return this.replaceInEdits(edits, replacements);
  }

  private extractPlaceholders(edits: BuildWithAiSearchReplaceEdit[]): PlaceholderMatch[] {
    const seen = new Set<string>();
    const results: PlaceholderMatch[] = [];

    for (const edit of edits) {
      const strings = [edit.value, edit.search].filter(Boolean);
      for (const str of strings) {
        const matches = str.matchAll(PLACEHOLDER_RE);
        for (const match of matches) {
          const rawUrl = match[0];
          if (seen.has(rawUrl)) continue;
          seen.add(rawUrl);

          const query = this.extractQuery(rawUrl);
          if (query) {
            results.push({ url: rawUrl, query });
          }
        }
      }
    }

    return results;
  }

  private extractQuery(rawUrl: string): string | null {
    try {
      const url = new URL(rawUrl);
      const text = url.searchParams.get('text');
      return text ? text.replace(/\+/g, ' ') : null;
    } catch {
      return null;
    }
  }

  private async fetchReplacements(placeholders: PlaceholderMatch[]): Promise<Map<string, string>> {
    const replacements = new Map<string, string>();

    const queryGroups = new Map<string, string[]>();
    for (const p of placeholders) {
      const urls = queryGroups.get(p.query) ?? [];
      urls.push(p.url);
      queryGroups.set(p.query, urls);
    }

    const entries = Array.from(queryGroups.entries());
    const results = await Promise.allSettled(
      entries.map(([query]) => this.searchWithTimeout(query))
    );

    for (let i = 0; i < entries.length; i++) {
      const result = results[i];
      if (result.status !== 'fulfilled' || result.value.length === 0) continue;

      const photos = result.value;
      const urls = entries[i][1];
      for (let j = 0; j < urls.length; j++) {
        replacements.set(urls[j], photos[j % photos.length].regularUrl);
      }
    }

    return replacements;
  }

  private async searchWithTimeout(query: string): Promise<UnsplashSearchResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
      const response = await fetch(
        `/api/unsplash-search?query=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );
      if (!response.ok) return [];

      const data = await response.json() as {
        total: number;
        totalPages: number;
        results: Array<{ regularUrl: string; description: string }>;
      };
      return data.results.slice(0, 5);
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private replaceInEdits(
    edits: BuildWithAiSearchReplaceEdit[],
    replacements: Map<string, string>
  ): BuildWithAiSearchReplaceEdit[] {
    return edits.map(edit => ({
      ...edit,
      search: this.replaceAll(edit.search, replacements),
      value: this.replaceAll(edit.value, replacements)
    }));
  }

  private replaceAll(str: string, replacements: Map<string, string>): string {
    if (!str) return str;
    let result = str;
    for (const [placeholder, unsplashUrl] of replacements) {
      while (result.includes(placeholder)) {
        result = result.replace(placeholder, unsplashUrl);
      }
    }
    return result;
  }
}
