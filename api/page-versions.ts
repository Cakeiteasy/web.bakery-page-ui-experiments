import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import clientPromise, { dbName } from '../lib/mongodb';

const COLLECTION = 'bwai_page_versions';
const PAGES_COLLECTION = 'bwai_pages';
const MAX_VERSIONS_PER_PAGE = 50;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const col = db.collection(COLLECTION);

    const { pageId, versionId, action } = req.query as Record<string, string>;

    if (!pageId) return res.status(400).json({ error: 'pageId is required' });

    // ── POST ?pageId=xxx&versionId=yyy&action=restore ──────────────────────
    if (req.method === 'POST' && versionId && action === 'restore') {
      const version = await col.findOne({ _id: new ObjectId(versionId), pageId: new ObjectId(pageId) });
      if (!version) return res.status(404).json({ error: 'Version not found' });

      const pagesCol = db.collection(PAGES_COLLECTION);
      await pagesCol.updateOne(
        { _id: new ObjectId(pageId) },
        { $set: { currentFiles: version['files'], updatedAt: new Date() } }
      );
      return res.status(200).json({ ok: true, files: version['files'] });
    }

    // ── GET ?pageId=xxx&versionId=yyy ──────────────────────────────────────
    if (req.method === 'GET' && versionId) {
      const version = await col.findOne({ _id: new ObjectId(versionId), pageId: new ObjectId(pageId) });
      if (!version) return res.status(404).json({ error: 'Version not found' });
      return res.status(200).json(toFull(version));
    }

    // ── GET ?pageId=xxx ────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const versions = await col
        .find({ pageId: new ObjectId(pageId) }, { projection: { files: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
      return res.status(200).json(versions.map(toSummary));
    }

    // ── POST ?pageId=xxx (save new version) ────────────────────────────────
    if (req.method === 'POST') {
      const body = req.body as {
        files: { html: string; css: string; js: string };
        diff?: string;
        status?: 'applied' | 'rejected';
        label?: string;
      };

      if (!body.files) return res.status(400).json({ error: 'files is required' });

      const doc = {
        _id: new ObjectId(),
        pageId: new ObjectId(pageId),
        createdAt: new Date(),
        label: body.label ?? null,
        files: body.files,
        diff: body.diff ?? '',
        status: body.status ?? 'applied'
      };
      await col.insertOne(doc);

      // Prune: keep only MAX_VERSIONS_PER_PAGE newest
      const count = await col.countDocuments({ pageId: new ObjectId(pageId) });
      if (count > MAX_VERSIONS_PER_PAGE) {
        const excess = await col
          .find({ pageId: new ObjectId(pageId) }, { projection: { _id: 1 } })
          .sort({ createdAt: 1 })
          .limit(count - MAX_VERSIONS_PER_PAGE)
          .toArray();
        const ids = excess.map((d) => d['_id']);
        if (ids.length) await col.deleteMany({ _id: { $in: ids } });
      }

      return res.status(201).json(toSummary(doc));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[page-versions]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}

function toSummary(doc: Record<string, unknown>) {
  return {
    id: String(doc['_id']),
    pageId: String(doc['pageId']),
    createdAt: (doc['createdAt'] instanceof Date ? doc['createdAt'] : new Date(doc['createdAt'] as string)).getTime(),
    label: doc['label'] ?? null,
    diff: doc['diff'] ?? '',
    status: doc['status'] ?? 'applied'
  };
}

function toFull(doc: Record<string, unknown>) {
  return {
    ...toSummary(doc),
    files: doc['files']
  };
}
