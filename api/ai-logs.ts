import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import clientPromise, { dbName } from '../lib/mongodb.js';

const COLLECTION = 'bwai_ai_logs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const col = db.collection(COLLECTION);

    // Ensure indexes (idempotent)
    await col.createIndex({ createdAt: -1 }, { background: true });
    await col.createIndex({ applyStatus: 1 }, { background: true });
    await col.createIndex({ pageSlug: 1 }, { background: true });

    const { id, status, pageSlug, before, limit } = req.query as Record<string, string>;

    // ── GET ?id=xxx  (single full document) ───────────────────────────────
    if (req.method === 'GET' && id) {
      const doc = await col.findOne({ _id: new ObjectId(id) });
      if (!doc) return res.status(404).json({ error: 'Log not found' });
      return res.status(200).json(toDoc(doc));
    }

    // ── GET  (list) ────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const filter: Record<string, unknown> = {};
      if (status && status !== 'all') filter['applyStatus'] = status;
      if (pageSlug) filter['pageSlug'] = pageSlug;
      if (before) filter['createdAt'] = { $lt: new Date(before) };

      const pageLimit = Math.min(Number(limit ?? 50), 100);
      const docs = await col
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(pageLimit + 1)
        .toArray();

      const hasMore = docs.length > pageLimit;
      const items = docs.slice(0, pageLimit);

      return res.status(200).json({ items: items.map(toDoc), hasMore });
    }

    // ── PUT ?id=xxx  (update apply results after frontend applies edits) ───
    if (req.method === 'PUT' && id) {
      const body = req.body as Record<string, unknown>;
      const $set: Record<string, unknown> = { updatedAt: new Date() };

      if (body['applyStatus']) $set['applyStatus'] = body['applyStatus'];
      if (Array.isArray(body['applyResults'])) $set['applyResults'] = body['applyResults'];
      if (Array.isArray(body['edits'])) $set['edits'] = normalizeLogEdits(body['edits']);
      if (body['rejectionReason'] !== undefined) $set['rejectionReason'] = body['rejectionReason'] ?? null;
      if (Array.isArray(body['warnings'])) $set['warnings'] = body['warnings'];
      if (body['afterFileHashes'] && typeof body['afterFileHashes'] === 'object') {
        $set['afterFileHashes'] = normalizeFileHashes(body['afterFileHashes']);
      }
      if (Array.isArray(body['touchedFiles'])) {
        $set['touchedFiles'] = body['touchedFiles'].map((file) => String(file));
      }

      await col.updateOne({ _id: new ObjectId(id) }, { $set });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error.';
    return res.status(500).json({ error: message });
  }
}

function toDoc(raw: Record<string, unknown>) {
  return {
    id: String(raw['_id']),
    pageId: raw['pageId'] ? String(raw['pageId']) : null,
    pageSlug: raw['pageSlug'] ?? null,
    modelKey: raw['modelKey'] ?? '',
    provider: raw['provider'] ?? '',
    lastUserMessage: raw['lastUserMessage'] ?? '',
    selectedTargets: normalizeLogSelectedTargets(raw['selectedTargets']),
    requestMeta: normalizeRequestMeta(raw['requestMeta']),
    beforeFileHashes: normalizeFileHashes(raw['beforeFileHashes']),
    afterFileHashes: normalizeFileHashes(raw['afterFileHashes']),
    touchedFiles: Array.isArray(raw['touchedFiles']) ? raw['touchedFiles'].map((file) => String(file)) : [],
    assistantText: raw['assistantText'] != null ? String(raw['assistantText']) : null,
    responseParseError: raw['responseParseError'] != null ? String(raw['responseParseError']) : null,
    edits: raw['edits'] ?? [],
    applyResults: raw['applyResults'] ?? null,
    applyStatus: raw['applyStatus'] ?? null,
    rejectionReason: raw['rejectionReason'] ?? null,
    inputTokens: raw['inputTokens'] ?? null,
    outputTokens: raw['outputTokens'] ?? null,
    llmTimeMs: raw['llmTimeMs'] ?? null,
    totalTimeMs: raw['totalTimeMs'] ?? null,
    warnings: raw['warnings'] ?? [],
    createdAt: raw['createdAt'] instanceof Date
      ? raw['createdAt'].getTime()
      : Number(raw['createdAt'] ?? 0)
  };
}

function normalizeLogEdits(
  rawEdits: unknown[]
): Array<{ file: string; mode?: string; search: string; value?: string }> {
  return rawEdits.map((edit) => {
    const source = edit && typeof edit === 'object'
      ? edit as Record<string, unknown>
      : {};

    return {
      file: String(source['file'] ?? ''),
      mode: source['mode'] != null ? String(source['mode']) : undefined,
      search: String(source['search'] ?? ''),
      value: source['value'] != null ? String(source['value']) : undefined
    };
  });
}

function normalizeLogSelectedTargets(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((target) => !!target && typeof target === 'object')
    .map((target) => {
      const source = target as Record<string, unknown>;
      return {
        messageId: String(source['messageId'] ?? ''),
        label: String(source['label'] ?? ''),
        reference: String(source['reference'] ?? ''),
        selector: String(source['selector'] ?? ''),
        bwaiId: String(source['bwaiId'] ?? ''),
        sectionIndex: Number(source['sectionIndex'] ?? 0),
        totalSections: Number(source['totalSections'] ?? 1),
        outerHtml: String(source['outerHtml'] ?? ''),
        outerHtmlTruncated: source['outerHtmlTruncated'] === true
      };
    });
}

function normalizeRequestMeta(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const source = raw as Record<string, unknown>;
  return {
    messageCount: Number(source['messageCount'] ?? 0),
    userMessageCount: Number(source['userMessageCount'] ?? 0),
    assistantMessageCount: Number(source['assistantMessageCount'] ?? 0),
    attachmentCount: Number(source['attachmentCount'] ?? 0),
    allowGlobalStyleOverride: source['allowGlobalStyleOverride'] === true
  };
}

function normalizeFileHashes(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const source = raw as Record<string, unknown>;
  return {
    html: String(source['html'] ?? ''),
    css: String(source['css'] ?? ''),
    js: String(source['js'] ?? '')
  };
}
