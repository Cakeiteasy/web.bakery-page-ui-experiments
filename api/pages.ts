import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from 'mongodb';
import clientPromise, { dbName } from '../lib/mongodb.js';
import { compileTailwindForPage, mergeTailwindIntoCss, stripTailwindFromCss } from '../lib/tailwind-compiler.js';

const COLLECTION = 'bwai_pages';

function slugValid(slug: string): boolean {
  return /^[a-z0-9][a-z0-9\-/]*[a-z0-9]$|^[a-z0-9]$/.test(slug) && !/\/\//.test(slug);
}

function randSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const col = db.collection(COLLECTION);

    const { id, action, slug: slugParam } = req.query as Record<string, string>;

    // ── POST ?id=xxx&action=duplicate ──────────────────────────────────────
    if (req.method === 'POST' && id && action === 'duplicate') {
      const original = await col.findOne({ _id: new ObjectId(id) });
      if (!original) return res.status(404).json({ error: 'Page not found' });

      const newSlug = `${original['slug']}-${randSuffix()}`;
      const now = new Date();
      const doc = {
        ...original,
        _id: new ObjectId(),
        slug: newSlug,
        title: `${original['title']} (copy)`,
        createdAt: now,
        updatedAt: now
      };
      await col.insertOne(doc);
      return res.status(201).json(toSummary(doc));
    }

    // ── GET (list all) ─────────────────────────────────────────────────────
    if (req.method === 'GET' && !id) {
      const pages = await col
        .find({}, { projection: { currentFiles: 0, messages: 0, patchLogs: 0 } })
        .sort({ updatedAt: -1 })
        .toArray();
      return res.status(200).json(pages.map(toSummary));
    }

    // ── GET ?id=xxx ────────────────────────────────────────────────────────
    if (req.method === 'GET' && id) {
      const page = await col.findOne({ _id: new ObjectId(id) });
      if (!page) return res.status(404).json({ error: 'Page not found' });
      return res.status(200).json(toFull(page));
    }

    // ── GET ?slug=xxx ──────────────────────────────────────────────────────
    if (req.method === 'GET' && slugParam) {
      const page = await col.findOne({ slug: slugParam });
      if (!page) return res.status(404).json({ error: 'Page not found' });
      return res.status(200).json(toFull(page));
    }

    // ── POST (create) ──────────────────────────────────────────────────────
    if (req.method === 'POST' && !id) {
      const body = req.body as {
        slug?: string;
        title?: string;
        currentFiles?: { html: string; css: string; js: string };
        messages?: unknown[];
        currentModelKey?: string;
      };

      const slug = (body.slug ?? '').trim().toLowerCase();
      if (!slug || !slugValid(slug)) {
        return res.status(400).json({ error: 'Invalid slug. Use lowercase alphanumeric and hyphens, no leading/trailing special chars.' });
      }

      const existing = await col.findOne({ slug });
      if (existing) return res.status(409).json({ error: 'Slug already in use' });

      const now = new Date();
      const doc = {
        _id: new ObjectId(),
        slug,
        title: (body.title ?? slug).trim(),
        seoTitle: '',
        seoDescription: '',
        ogTitle: '',
        ogDescription: '',
        ogImageUrl: '',
        currentFiles: body.currentFiles ?? { html: '', css: '', js: '' },
        currentModelKey: body.currentModelKey ?? '',
        messages: body.messages ?? [],
        patchLogs: [],
        createdAt: now,
        updatedAt: now
      };
      await col.insertOne(doc);
      return res.status(201).json(toFull(doc));
    }

    // ── PUT ?id=xxx ────────────────────────────────────────────────────────
    if (req.method === 'PUT' && id) {
      const body = req.body as Record<string, unknown>;

      // Validate slug if provided
      if (body['slug'] !== undefined) {
        const slug = String(body['slug']).trim().toLowerCase();
        if (!slugValid(slug)) return res.status(400).json({ error: 'Invalid slug' });
        const existing = await col.findOne({ slug, _id: { $ne: new ObjectId(id) } });
        if (existing) return res.status(409).json({ error: 'Slug already in use' });
        body['slug'] = slug;
      }

      const allowedFields = [
        'slug', 'title', 'seoTitle', 'seoDescription', 'ogTitle', 'ogDescription', 'ogImageUrl',
        'currentFiles', 'currentModelKey', 'messages', 'patchLogs', 'fontPair', 'accentColor',
        'hiddenSections'
      ];
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      for (const key of allowedFields) {
        if (body[key] !== undefined) patch[key] = body[key];
      }

      if (patch['currentFiles']) {
        const files = patch['currentFiles'] as { html: string; css: string; js: string };
        if (files.html?.trim()) {
          try {
            const customCss = stripTailwindFromCss(files.css ?? '');
            const tailwindCss = await compileTailwindForPage(files.html);
            files.css = mergeTailwindIntoCss(tailwindCss, customCss);
            patch['currentFiles'] = files;
          } catch (err) {
            console.error('[pages] Tailwind compilation failed, saving without compiled Tailwind:', err);
          }
        }
      }

      const result = await col.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: patch },
        { returnDocument: 'after' }
      );
      if (!result) return res.status(404).json({ error: 'Page not found' });
      return res.status(200).json(toFull(result));
    }

    // ── DELETE ?id=xxx ─────────────────────────────────────────────────────
    if (req.method === 'DELETE' && id) {
      await col.deleteOne({ _id: new ObjectId(id) });
      // Also delete all versions
      const versionsCol = db.collection('bwai_page_versions');
      await versionsCol.deleteMany({ pageId: new ObjectId(id) });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[pages]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}

function toSummary(doc: Record<string, unknown>) {
  return {
    id: String(doc['_id']),
    slug: doc['slug'],
    title: doc['title'],
    seoTitle: doc['seoTitle'] ?? '',
    updatedAt: (doc['updatedAt'] instanceof Date ? doc['updatedAt'] : new Date(doc['updatedAt'] as string)).getTime()
  };
}

function toFull(doc: Record<string, unknown>) {
  return {
    id: String(doc['_id']),
    slug: doc['slug'],
    title: doc['title'],
    seoTitle: doc['seoTitle'] ?? '',
    seoDescription: doc['seoDescription'] ?? '',
    ogTitle: doc['ogTitle'] ?? '',
    ogDescription: doc['ogDescription'] ?? '',
    ogImageUrl: doc['ogImageUrl'] ?? '',
    currentFiles: doc['currentFiles'] ?? { html: '', css: '', js: '' },
    currentModelKey: doc['currentModelKey'] ?? '',
    messages: doc['messages'] ?? [],
    patchLogs: doc['patchLogs'] ?? [],
    fontPair: doc['fontPair'] ?? null,
    accentColor: doc['accentColor'] ?? null,
    createdAt: (doc['createdAt'] instanceof Date ? doc['createdAt'] : new Date(doc['createdAt'] as string)).getTime(),
    updatedAt: (doc['updatedAt'] instanceof Date ? doc['updatedAt'] : new Date(doc['updatedAt'] as string)).getTime()
  };
}
