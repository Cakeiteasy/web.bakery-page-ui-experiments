import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env['R2_ACCESS_KEY_ID']!,
    secretAccessKey: process.env['R2_SECRET_ACCESS_KEY']!
  }
});

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const { filename, mimeType, data } = req.body as { filename?: unknown; mimeType?: unknown; data?: unknown };

    if (!filename || !mimeType || !data) {
      res.status(400).json({ error: 'filename, mimeType, and data are required.' });
      return;
    }

    const safeFilename = String(filename).replace(/[^a-z0-9._-]/gi, '_');
    const key = `bwai/${Date.now()}-${safeFilename}`;
    const buffer = Buffer.from(String(data), 'base64');

    await client.send(
      new PutObjectCommand({
        Bucket: process.env['R2_BUCKET_NAME']!,
        Key: key,
        Body: buffer,
        ContentType: String(mimeType),
        CacheControl: 'public, max-age=31536000, immutable'
      })
    );

    res.status(200).json({ url: `${process.env['R2_PUBLIC_URL']}/${key}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.';
    res.status(500).json({ error: message });
  }
}
