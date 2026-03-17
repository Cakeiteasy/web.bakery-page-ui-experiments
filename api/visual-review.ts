import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

const VISUAL_REVIEW_PROMPT = `You are a senior UX/frontend designer reviewing a landing page. The user provides the full HTML+CSS source. Your job is to produce a clear, friendly improvement plan.

Structure your response as:

**Overall impression** (1–2 sentences on what works and what the main theme is)

**Improvements to make:**
List each improvement as a numbered item in this format:
1. [Short title] — Plain-English description of what to change and why. Be specific (e.g. "increase hero heading font size", "add padding between sections", "make the CTA button larger and more prominent").

Focus on:
- Visual hierarchy and typography (heading sizes, font weights, spacing)
- Color contrast and readability
- Section spacing and breathing room
- CTA buttons (size, prominence, copy)
- Missing sections that would help conversion (social proof, FAQ, testimonials, etc.)
- Mobile layout issues visible from CSS breakpoints
- Anything that looks broken or inconsistent

Write for a non-technical audience — describe changes in plain English, not in CSS. Aim for 4–8 actionable items.`;

const MODEL_REGISTRY: Record<string, { provider: 'openai' | 'google'; modelId: string }> = {
  'openai:gpt-5.1': { provider: 'openai', modelId: 'gpt-5.1' },
  'google:gemini-3-flash': { provider: 'google', modelId: 'gemini-3-flash' }
};

export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const html: string = String(body?.html ?? '');
    const modelKey: string = String(body?.modelKey ?? 'google:gemini-3-flash');

    if (!html.trim()) {
      res.status(400).json({ error: 'html is required.' });
      return;
    }

    const modelConfig = MODEL_REGISTRY[modelKey] ?? MODEL_REGISTRY['google:gemini-3-flash'];
    const model = resolveModel(modelConfig.provider, modelConfig.modelId);

    const result = await generateText({
      model,
      system: VISUAL_REVIEW_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the full HTML of the landing page:\n\n${html.slice(0, 60_000)}`
        }
      ],
      temperature: 0.3
    });

    res.status(200).json({ review: result.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Visual review failed.';
    res.status(500).json({ error: message });
  }
}

function resolveModel(provider: 'openai' | 'google', modelId: string): any {
  if (provider === 'openai') {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
    return createOpenAI({ apiKey })(modelId);
  }

  const apiKey = process.env['GOOGLE_GENERATIVE_AI_API_KEY'];
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured.');
  return createGoogleGenerativeAI({ apiKey })(modelId);
}
