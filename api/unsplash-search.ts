interface UnsplashApiPhoto {
  id: string;
  urls: { small: string; regular: string };
  description: string | null;
  alt_description: string | null;
  user: {
    name: string;
    links: { html: string };
  };
}

interface UnsplashApiResponse {
  total: number;
  total_pages: number;
  results: UnsplashApiPhoto[];
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const { query, page } = req.query as { query?: string; page?: string };

  if (!query || !query.trim()) {
    res.status(400).json({ error: 'query parameter is required.' });
    return;
  }

  const accessKey = process.env['UNSPLASH_ACCESS_KEY'];
  if (!accessKey) {
    res.status(500).json({ error: 'Unsplash API key not configured.' });
    return;
  }

  try {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query.trim())}&per_page=20&page=${pageNum}`;

    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` }
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(500).json({ error: `Unsplash API error: ${text}` });
      return;
    }

    const data = (await response.json()) as UnsplashApiResponse;

    const results = data.results.map((photo) => ({
      id: photo.id,
      thumbUrl: photo.urls.small,
      regularUrl: photo.urls.regular,
      description: photo.description ?? photo.alt_description ?? '',
      photographerName: photo.user.name,
      photographerUrl: `${photo.user.links.html}?utm_source=cakeiteasy&utm_medium=referral`
    }));

    res.status(200).json({ total: data.total, totalPages: data.total_pages, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed.';
    res.status(500).json({ error: message });
  }
}
