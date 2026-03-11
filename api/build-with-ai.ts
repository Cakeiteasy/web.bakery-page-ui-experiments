import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

import { COMPONENT_LIBRARY_PROMPT, SYSTEM_PROMPT } from './build-with-ai.prompt';

interface IncomingAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'data-url' | 'url';
  dataUrl?: string;
  url?: string;
}

interface IncomingMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachments: IncomingAttachment[];
}

interface IncomingFiles {
  html: string;
  css: string;
  js: string;
}

interface IncomingBody {
  modelKey: string;
  messages: IncomingMessage[];
  files: IncomingFiles;
}

interface ParsedModelPayload {
  assistantText: string;
  diff: string;
  warnings: string[];
}

const MODEL_REGISTRY: Record<string, { provider: 'openai' | 'google'; modelId: string }> = {
  'openai:gpt-5.1': {
    provider: 'openai',
    modelId: 'gpt-5.1'
  },
  'google:gemini-3-flash': {
    provider: 'google',
    modelId: 'gemini-3-flash'
  }
};

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  // const expectedDemoKey = process.env.BUILD_WITH_AI_DEMO_KEY?.trim();
  // if (expectedDemoKey) {
  //   const providedDemoKey = String(req.headers['x-demo-key'] ?? '').trim();
  //   if (!providedDemoKey || providedDemoKey !== expectedDemoKey) {
  //     res.status(401).json({ error: 'Unauthorized: missing or invalid demo key.' });
  //     return;
  //   }
  // }

  try {
    const payload = parseIncomingBody(req.body);

    const modelConfig = MODEL_REGISTRY[payload.modelKey];
    if (!modelConfig) {
      res.status(400).json({ error: `Unsupported model key: ${payload.modelKey}` });
      return;
    }

    const model = resolveModel(modelConfig.provider, modelConfig.modelId);

    const contextFileDump = [
      'Current editable files:',
      '--- content.html ---',
      payload.files.html,
      '--- content.css ---',
      payload.files.css,
      '--- content.js ---',
      payload.files.js
    ].join('\n');

    const messages = buildCoreMessages(payload.messages);
    messages.unshift({
      role: 'user',
      content: `\n${contextFileDump}\n\nUse unified diff patching for updates.`
    });

    const result = await generateText({
      model,
      system: `${SYSTEM_PROMPT}\n${COMPONENT_LIBRARY_PROMPT}`,
      messages,
      temperature: 0.2
    });

    const parsed = parseModelPayload(result.text);

    res.status(200).json({
      assistantText: parsed.assistantText,
      diff: parsed.diff,
      warnings: parsed.warnings,
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens
          }
        : undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate patch.';
    res.status(500).json({ error: message });
  }
}

export function parseIncomingBody(raw: unknown): IncomingBody {
  const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid request body.');
  }

  const typedPayload = payload as Partial<IncomingBody>;

  if (!typedPayload.modelKey || typeof typedPayload.modelKey !== 'string') {
    throw new Error('modelKey is required.');
  }

  if (!typedPayload.files || typeof typedPayload.files !== 'object') {
    throw new Error('files are required.');
  }

  if (!Array.isArray(typedPayload.messages)) {
    throw new Error('messages must be an array.');
  }

  const files = typedPayload.files as Partial<IncomingFiles>;

  return {
    modelKey: typedPayload.modelKey,
    files: {
      html: String(files.html ?? ''),
      css: String(files.css ?? ''),
      js: String(files.js ?? '')
    },
    messages: typedPayload.messages.map((message) => ({
      id: String((message as any).id ?? ''),
      role: (message as any).role === 'assistant' ? 'assistant' : 'user',
      text: String((message as any).text ?? ''),
      attachments: Array.isArray((message as any).attachments)
        ? (message as any).attachments.map((attachment: any) => ({
            id: String(attachment?.id ?? ''),
            name: String(attachment?.name ?? 'attachment'),
            mimeType: String(attachment?.mimeType ?? ''),
            sizeBytes: Number(attachment?.sizeBytes ?? 0),
            kind: attachment?.kind === 'url' ? 'url' : 'data-url',
            dataUrl: attachment?.dataUrl ? String(attachment.dataUrl) : undefined,
            url: attachment?.url ? String(attachment.url) : undefined
          }))
        : []
    }))
  };
}

function resolveModel(provider: 'openai' | 'google', modelId: string): any {
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const openai = createOpenAI({ apiKey });
    return openai(modelId);
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured.');
  }

  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId);
}

export function buildCoreMessages(messages: IncomingMessage[]): Array<{ role: 'user' | 'assistant'; content: unknown }> {
  return messages.map((message) => {
    if (message.role === 'assistant') {
      return {
        role: 'assistant',
        content: message.text
      };
    }

    const contentParts: Array<{
      type: 'text' | 'image';
      text?: string;
      image?: string | Uint8Array;
      mediaType?: string;
    }> = [];
    contentParts.push({
      type: 'text',
      text: message.text || 'Update content based on the attachments.'
    });

    for (const attachment of message.attachments) {
      const imagePart = toImagePart(attachment);
      if (!imagePart) {
        continue;
      }

      contentParts.push(imagePart);
    }

    return {
      role: 'user',
      content: contentParts
    };
  });
}

function toImagePart(
  attachment: IncomingAttachment
): { type: 'image'; image: string | Uint8Array; mediaType?: string } | null {
  if (attachment.kind === 'url') {
    const imageUrl = attachment.url?.trim() ?? '';
    if (!imageUrl) {
      return null;
    }

    // Most providers accept remote URLs for images.
    if (/^https?:\/\//i.test(imageUrl)) {
      return {
        type: 'image',
        image: imageUrl
      };
    }

    // If URL field contains a data URL, normalize it into base64 payload.
    const parsedDataUrlFromUrl = splitDataUrl(imageUrl);
    if (parsedDataUrlFromUrl) {
      return {
        type: 'image',
        image: parsedDataUrlFromUrl.base64Content,
        mediaType: attachment.mimeType || parsedDataUrlFromUrl.mediaType || 'image/png'
      };
    }

    return null;
  }

  const dataUrl = attachment.dataUrl?.trim() ?? '';
  if (!dataUrl) {
    return null;
  }

  const parsedDataUrl = splitDataUrl(dataUrl);
  if (!parsedDataUrl) {
    return null;
  }

  return {
    type: 'image',
    image: parsedDataUrl.base64Content,
    mediaType: attachment.mimeType || parsedDataUrl.mediaType || 'image/png'
  };
}

function splitDataUrl(value: string): { mediaType?: string; base64Content: string } | null {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i.exec(value);
  if (!match) {
    return null;
  }

  return {
    mediaType: match[1] || undefined,
    base64Content: match[2]
  };
}

export function parseModelPayload(text: string): ParsedModelPayload {
  const normalized = stripCodeFence(text.trim());

  let parsed: any;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error('Model response is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Model response is invalid.');
  }

  if (!parsed.diff || typeof parsed.diff !== 'string') {
    throw new Error('Model response missing diff string.');
  }

  return {
    assistantText: typeof parsed.assistantText === 'string' ? parsed.assistantText : 'Applied the requested update.',
    diff: parsed.diff,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map((warning) => String(warning)) : []
  };
}

export function stripCodeFence(value: string): string {
  if (!value.startsWith('```')) {
    return value;
  }

  const lines = value.split(/\r?\n/);
  if (lines.length >= 2) {
    lines.shift();
  }

  if (lines.length && lines[lines.length - 1].trim() === '```') {
    lines.pop();
  }

  return lines.join('\n').trim();
}
