import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BuildWithAiApiRequest, BuildWithAiApiResponse, BuildWithAiSearchReplaceEdit } from '../models/build-with-ai.model';

@Injectable({ providedIn: 'root' })
export class BuildWithAiApiService {
  private readonly http = inject(HttpClient);

  async requestPatch(payload: BuildWithAiApiRequest, demoKey?: string): Promise<BuildWithAiApiResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const key = demoKey?.trim();
    if (key) headers['x-demo-key'] = key;

    const response = await fetch('/api/build-with-ai', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = `API request failed (${response.status}).`;
      try {
        const body = await response.json();
        if (body.error) errorMsg = String(body.error);
      } catch {}
      throw new Error(errorMsg);
    }

    // Response is streamed plain text — the LLM output is the JSON payload.
    const rawText = await response.text();
    return this.parseStreamedPayload(rawText);
  }

  async requestVisualReview(html: string, modelKey: string): Promise<{ review: string }> {
    return firstValueFrom(
      this.http.post<{ review: string }>('/api/visual-review', { html, modelKey })
    );
  }

  private parseStreamedPayload(rawText: string): BuildWithAiApiResponse {
    let text = rawText.trim();

    // Strip code fence if the model wrapped its JSON in ```
    if (text.startsWith('```')) {
      const lines = text.split('\n');
      lines.shift();
      if (lines.at(-1)?.trim() === '```') lines.pop();
      text = lines.join('\n').trim();
    }

    const parsed = JSON.parse(text);

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed['edits'])) {
      throw new Error('Model response missing edits array.');
    }

    return {
      assistantText: typeof parsed['assistantText'] === 'string'
        ? parsed['assistantText']
        : 'Applied the requested update.',
      edits: parsed['edits'].map((e: any) => ({
        file: String(e?.file ?? '') as BuildWithAiSearchReplaceEdit['file'],
        search: String(e?.search ?? ''),
        replace: String(e?.replace ?? '')
      })),
      warnings: Array.isArray(parsed['warnings'])
        ? parsed['warnings'].map((w: unknown) => String(w))
        : [],
      usage: parsed['usage'] ?? undefined
    };
  }
}
