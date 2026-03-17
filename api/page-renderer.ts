import type { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise, { dbName } from '../lib/mongodb';
import { buildPublishedDocument } from '../lib/build-preview';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract slug from the request URL path (strip leading slash)
  const rawPath = req.url ?? '/';
  const slug = rawPath.replace(/^\//, '').split('?')[0];

  if (!slug) {
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const col = db.collection('bwai_pages');

    const page = await col.findOne({ slug });

    if (!page) {
      res.writeHead(302, { Location: '/' });
      return res.end();
    }

    const files = (page['currentFiles'] as { html: string; css: string; js: string }) ?? {
      html: '',
      css: '',
      js: ''
    };

    const html = buildPublishedDocument(files, {
      title: (page['seoTitle'] as string) || (page['title'] as string) || 'Cake it Easy',
      description: (page['seoDescription'] as string) || '',
      ogTitle: (page['ogTitle'] as string) || (page['seoTitle'] as string) || (page['title'] as string) || '',
      ogDescription: (page['ogDescription'] as string) || (page['seoDescription'] as string) || '',
      ogImageUrl: (page['ogImageUrl'] as string) || ''
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.status(200).send(html);
  } catch (err) {
    console.error('[page-renderer]', err);
    res.writeHead(302, { Location: '/' });
    return res.end();
  }
}
