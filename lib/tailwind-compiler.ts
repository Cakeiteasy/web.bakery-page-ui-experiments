import { compile } from 'tailwindcss';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

export { stripTailwindFromCss, mergeTailwindIntoCss, TW_START_MARKER, TW_END_MARKER } from './tailwind-markers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const esmRequire = createRequire(import.meta.url);

let tailwindStylesheet: string | null = null;

function loadTailwindStylesheet(): string {
  if (tailwindStylesheet) return tailwindStylesheet;

  try {
    tailwindStylesheet = readFileSync(
      esmRequire.resolve('tailwindcss/index.css'),
      'utf-8'
    );
  } catch {
    const fallbackPath = join(__dirname, '..', 'node_modules', 'tailwindcss', 'index.css');
    tailwindStylesheet = readFileSync(fallbackPath, 'utf-8');
  }

  return tailwindStylesheet;
}

let cachedCompiler: { build: (candidates: string[]) => string } | null = null;

async function getCompiler(): Promise<{ build: (candidates: string[]) => string }> {
  if (cachedCompiler) return cachedCompiler;

  const stylesheet = loadTailwindStylesheet();
  cachedCompiler = await compile('@import "tailwindcss";', {
    loadStylesheet: async (id: string, base: string) => {
      if (id === 'tailwindcss') {
        return { path: 'virtual:tailwindcss/index.css', base, content: stylesheet };
      }
      throw new Error(`Cannot load stylesheet: ${id}`);
    }
  });

  return cachedCompiler;
}

/**
 * Extracts candidate Tailwind class names from HTML content by parsing
 * class attributes and common framework patterns.
 */
export function extractCandidates(html: string): string[] {
  const candidates = new Set<string>();

  const classAttrRegex = /class\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match: RegExpExecArray | null;
  while ((match = classAttrRegex.exec(html)) !== null) {
    const classString = match[1] ?? match[2] ?? '';
    for (const cls of classString.split(/\s+/)) {
      if (cls) candidates.add(cls);
    }
  }

  return Array.from(candidates);
}

/**
 * Compiles Tailwind CSS from HTML content, producing only the utilities
 * actually referenced in the markup.
 */
export async function compileTailwindForPage(html: string): Promise<string> {
  if (!html.trim()) return '';

  const compiler = await getCompiler();
  const candidates = extractCandidates(html);
  if (candidates.length === 0) return '';

  return compiler.build(candidates);
}

