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

  async uploadImageAsync(file: File, demoKey?: string): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const base64 = dataUrl.split(',')[1];
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const key = demoKey?.trim();
    if (key) headers['x-demo-key'] = key;

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers,
      body: JSON.stringify({ filename: file.name, mimeType: file.type, data: base64 })
    });

    if (!response.ok) {
      let msg = `Upload failed (${response.status}).`;
      try {
        const body = await response.json();
        if (body.error) msg = String(body.error);
      } catch {}
      throw new Error(msg);
    }

    const { url } = await response.json();
    return String(url);
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
        mode: e?.mode === 'insert' ? 'insert' : 'replace',
        search: String(e?.search ?? ''),
        value: String(e?.value ?? '')
      })),
      warnings: Array.isArray(parsed['warnings'])
        ? parsed['warnings'].map((w: unknown) => String(w))
        : [],
      usage: parsed['usage'] ?? undefined
    };
  }
}
