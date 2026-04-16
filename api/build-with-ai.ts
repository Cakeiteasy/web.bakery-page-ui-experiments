import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import sharp from 'sharp';
import { ObjectId } from 'mongodb';

import { COMPONENT_LIBRARY_PROMPT, SYSTEM_PROMPT } from './build-with-ai.prompt.js';
import clientPromise, { dbName } from '../lib/mongodb.js';
import { stripTailwindFromCss } from '../lib/tailwind-markers.js';

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
  target?: IncomingMessageTarget;
}

interface IncomingMessageTarget {
  selector: string;
  reference: string;
  label: string;
  bwaiId: string;
  sectionIndex: number;
  totalSections: number;
  outerHtml: string;
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
  systemPromptOverride?: string | null;
  allowGlobalStyleOverride?: boolean;
  pageId?: string;
  pageSlug?: string;
}

interface SearchReplaceEdit {
  file: string;
  mode?: 'replace' | 'insert' | 'insertAfter';
  search: string;
  value: string;
}

interface ParsedModelPayload {
  assistantText: string;
  edits: SearchReplaceEdit[];
  warnings: string[];
}

interface LoggedSelectedTarget {
  messageId: string;
  label: string;
  reference: string;
  selector: string;
  bwaiId: string;
  sectionIndex: number;
  totalSections: number;
  outerHtml: string;
  outerHtmlTruncated: boolean;
}

interface LoggedRequestMeta {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  attachmentCount: number;
  allowGlobalStyleOverride: boolean;
}

interface LoggedFileHashes {
  html: string;
  css: string;
  js: string;
}

const MODEL_REGISTRY: Record<string, { provider: 'openai' | 'google'; modelId: string; reasoningModel?: boolean }> = {
  'openai:gpt-5.1': {
    provider: 'openai',
    modelId: 'gpt-5.1',
    reasoningModel: true
  },
  'google:gemini-3-flash': {
    provider: 'google',
    modelId: 'gemini-3-flash-preview'
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
    const t0 = Date.now();
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
      stripTailwindFromCss(payload.files.css),
      '--- content.js ---',
      payload.files.js
    ].join('\n');

    const messages = await buildCoreMessages(payload.messages, modelConfig.provider);
    messages.unshift({
      role: 'user',
      content: `\n${contextFileDump}`
    });

    let systemPrompt = `${SYSTEM_PROMPT}\n${COMPONENT_LIBRARY_PROMPT}`;

    if (payload.systemPromptOverride) {
      systemPrompt = `Extra context to keep in mind: ${payload.systemPromptOverride?.trim()}\n` + systemPrompt;
    }

    const styleOverrideInstruction = payload.allowGlobalStyleOverride
      ? 'This request explicitly allows global style overrides via [ALLOW_STYLE_OVERRIDE]. Protected global styles may be modified if necessary.'
      : 'This request does not allow global style overrides. Do not modify protected global styles in content.css (:root, @import, .lp-btn*, .lp-eyebrow*). Use Tailwind CSS utility classes in content.html for all styling.';
    systemPrompt = `${styleOverrideInstruction}\n${systemPrompt}`;

    const promptChars = systemPrompt.length + messages.reduce((n, m) => n + JSON.stringify(m.content).length, 0);
    console.log(`[bwai] model=${payload.modelKey} promptChars=${promptChars} messages=${payload.messages.length}`);

    // Insert initial log document before streaming starts
    const lastUserMsg = [...payload.messages].reverse().find(m => m.role === 'user');
    const selectedTargets = extractSelectedTargets(payload.messages);
    const requestMeta = buildRequestMeta(payload.messages, payload.allowGlobalStyleOverride === true);
    const beforeFileHashes = buildFileHashes(payload.files);
    const logDocId = new ObjectId();
    const mongoClient = await clientPromise;
    const db = mongoClient.db(dbName);
    const logsCol = db.collection('bwai_ai_logs');
    await logsCol.insertOne({
      _id: logDocId,
      pageId: payload.pageId ? (() => { try { return new ObjectId(payload.pageId); } catch { return null; } })() : null,
      pageSlug: payload.pageSlug ?? null,
      modelKey: payload.modelKey,
      provider: modelConfig.provider,
      lastUserMessage: lastUserMsg?.text ?? '',
      selectedTargets,
      requestMeta,
      beforeFileHashes,
      afterFileHashes: null,
      touchedFiles: [],
      assistantText: null,
      responseParseError: null,
      edits: [],
      applyResults: null,
      applyStatus: null,
      rejectionReason: null,
      inputTokens: null,
      outputTokens: null,
      llmTimeMs: null,
      totalTimeMs: null,
      warnings: [],
      createdAt: new Date()
    });
    const logId = String(logDocId);

    // Stream response so Vercel doesn't kill the function on long LLM calls
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(200);

    const tLlm = Date.now();
    const stream = streamText({
      model,
      system: systemPrompt,
      messages,
      ...(modelConfig.reasoningModel ? {} : { temperature: 0.2 }),
      providerOptions: modelConfig.provider === 'google'
        ? { google: { generationConfig: { responseMimeType: 'application/json' } } }
        : modelConfig.provider === 'openai'
          ? { openai: { response_format: { type: 'json_object' } } }
          : {}
    });

    let rawModelText = '';
    for await (const chunk of stream.textStream) {
      rawModelText += chunk;
      res.write(chunk);
    }

    const usage = await stream.usage;
    const inputTokens = (usage as any)?.inputTokens ?? (usage as any)?.promptTokens ?? null;
    const outputTokens = (usage as any)?.outputTokens ?? (usage as any)?.completionTokens ?? null;
    const llmTimeMs = Date.now() - tLlm;
    const totalTimeMs = Date.now() - t0;
    console.log(`[bwai] llm=${llmTimeMs}ms total=${totalTimeMs}ms inputTokens=${inputTokens} outputTokens=${outputTokens}`);

    let parsedPayload: ParsedModelPayload | null = null;
    let responseParseError: string | null = null;
    try {
      parsedPayload = parseModelPayload(rawModelText);
    } catch (error) {
      responseParseError = error instanceof Error ? error.message : 'Failed to parse streamed model output.';
    }

    // Update log with token/timing + parsed response
    const logSet: Record<string, unknown> = { inputTokens, outputTokens, llmTimeMs, totalTimeMs };
    if (parsedPayload) {
      logSet['assistantText'] = parsedPayload.assistantText;
      logSet['edits'] = parsedPayload.edits;
      logSet['warnings'] = parsedPayload.warnings;
      logSet['responseParseError'] = null;
    } else if (responseParseError) {
      logSet['responseParseError'] = responseParseError;
    }

    await logsCol.updateOne(
      { _id: logDocId },
      { $set: logSet }
    );

    // Write logId sentinel so frontend can extract it without disrupting JSON parsing
    res.write(`\n__LOGID__${logId}__ENDLOGID__`);
    res.end();
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
    systemPromptOverride: typedPayload.systemPromptOverride ?? null,
    allowGlobalStyleOverride: typedPayload.allowGlobalStyleOverride === true,
    pageId: typedPayload.pageId ? String(typedPayload.pageId) : undefined,
    pageSlug: typedPayload.pageSlug ? String(typedPayload.pageSlug) : undefined,
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
        : [],
      target: parseMessageTarget((message as any).target)
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

export async function buildCoreMessages(
  messages: IncomingMessage[],
  provider: 'openai' | 'google'
): Promise<Array<{ role: 'user' | 'assistant'; content: unknown }>> {
  return Promise.all(
    messages.map(async (message) => {
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
        // Placement support: inject URL as text so AI can reference it in generated code
        const displayUrl = attachment.kind === 'url' ? (attachment.url ?? '') : '';
        if (displayUrl) {
          contentParts.push({
            type: 'text',
            text: `[Attached image "${attachment.name}" — URL: ${displayUrl}. Use this URL directly in <img src="..."> or CSS background-image if the user wants to place this image.]`
          });
        }

        // Vision support: pass image as visual content part
        const imagePart = await toImagePart(attachment, provider);
        if (imagePart) {
          contentParts.push(imagePart);
        }
      }

      return {
        role: 'user',
        content: contentParts
      };
    })
  );
}

async function toImagePart(
  attachment: IncomingAttachment,
  provider: 'openai' | 'google'
): Promise<{ type: 'image'; image: string | Uint8Array; mediaType?: string } | null> {
  if (attachment.kind === 'url') {
    const imageUrl = attachment.url?.trim() ?? '';
    if (!imageUrl) {
      return null;
    }

    if (/^https?:\/\//i.test(imageUrl)) {
      if (provider === 'google') {
        // Gemini requires base64 — fetch server-side, resize, and encode
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) return null;
          const buffer = Buffer.from(await response.arrayBuffer());
          const resized = await sharp(buffer)
            .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
            .toBuffer();
          const base64 = resized.toString('base64');
          const mimeType = attachment.mimeType || 'image/jpeg';
          return { type: 'image', image: base64, mediaType: mimeType };
        } catch {
          return null;
        }
      }

      // OpenAI supports remote URLs directly
      return { type: 'image', image: imageUrl };
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

function parseMessageTarget(raw: unknown): IncomingMessageTarget | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const source = raw as Record<string, unknown>;

  return {
    selector: String(source['selector'] ?? ''),
    reference: String(source['reference'] ?? ''),
    label: String(source['label'] ?? ''),
    bwaiId: String(source['bwaiId'] ?? ''),
    sectionIndex: normalizeInteger(source['sectionIndex']),
    totalSections: Math.max(1, normalizeInteger(source['totalSections'], 1)),
    outerHtml: String(source['outerHtml'] ?? '')
  };
}

function normalizeInteger(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.floor(parsed);
}

function extractSelectedTargets(messages: IncomingMessage[]): LoggedSelectedTarget[] {
  const maxOuterHtmlLength = 8_000;

  return messages
    .filter((message): message is IncomingMessage & { target: IncomingMessageTarget } =>
      message.role === 'user' && !!message.target
    )
    .map((message) => {
      const outerHtml = message.target.outerHtml ?? '';
      const outerHtmlTruncated = outerHtml.length > maxOuterHtmlLength;

      return {
        messageId: message.id || '',
        label: message.target.label || '',
        reference: message.target.reference || '',
        selector: message.target.selector || '',
        bwaiId: message.target.bwaiId || '',
        sectionIndex: message.target.sectionIndex,
        totalSections: message.target.totalSections,
        outerHtml: outerHtmlTruncated ? outerHtml.slice(0, maxOuterHtmlLength) : outerHtml,
        outerHtmlTruncated
      };
    });
}

function buildRequestMeta(messages: IncomingMessage[], allowGlobalStyleOverride: boolean): LoggedRequestMeta {
  const userMessageCount = messages.filter((message) => message.role === 'user').length;
  const assistantMessageCount = messages.length - userMessageCount;
  const attachmentCount = messages.reduce(
    (total, message) => total + (Array.isArray(message.attachments) ? message.attachments.length : 0),
    0
  );

  return {
    messageCount: messages.length,
    userMessageCount,
    assistantMessageCount,
    attachmentCount,
    allowGlobalStyleOverride
  };
}

function buildFileHashes(files: IncomingFiles): LoggedFileHashes {
  return {
    html: hashDeterministic(files.html),
    css: hashDeterministic(files.css),
    js: hashDeterministic(files.js)
  };
}

function hashDeterministic(value: string): string {
  // Lightweight deterministic hash for debug correlation, not cryptographic integrity.
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function parseModelPayload(text: string): ParsedModelPayload {
  let normalized = stripCodeFence(text.trim());
  const start = normalized.indexOf('{');
  const end = normalized.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    normalized = normalized.slice(start, end + 1);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error('Model response is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Model response is invalid.');
  }

  if (!Array.isArray(parsed.edits)) {
    throw new Error('Model response missing edits array.');
  }

  return {
    assistantText: typeof parsed.assistantText === 'string' ? parsed.assistantText : 'Applied the requested update.',
    edits: parsed.edits.map((e: any) => ({
      file: String(e?.file ?? ''),
      mode: e?.mode === 'insert' ? 'insert' : e?.mode === 'insertAfter' ? 'insertAfter' : 'replace',
      search: e?.search != null ? String(e.search) : '',
      value: e?.value != null ? String(e.value) : ''
    })),
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
