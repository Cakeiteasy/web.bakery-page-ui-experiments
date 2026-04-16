import { BuildWithAiModelOption } from '../../models/build-with-ai.model';
export {
  STATIC_SHELL_CSS as BUILD_WITH_AI_STATIC_SHELL_CSS,
  buildBwaiThemeStyleCss as BUILD_WITH_AI_THEME_STYLE_BUILDER,
  resolveBwaiThemeFontHref as BUILD_WITH_AI_THEME_FONT_HREF_RESOLVER,
  HEADER_HTML as BUILD_WITH_AI_HEADER_HTML,
  FOOTER_HTML as BUILD_WITH_AI_FOOTER_HTML,
  SECTION_IN_VIEW_RUNTIME_SCRIPT as BUILD_WITH_AI_SECTION_IN_VIEW_RUNTIME_SCRIPT,
  PRODUCTS_LIST_RUNTIME_SCRIPT as BUILD_WITH_AI_PRODUCTS_LIST_RUNTIME_SCRIPT,
} from '../../../../lib/build-preview';

export const BUILD_WITH_AI_STORAGE_KEY = 'build-with-ai-session-v1';
export const BWAI_UNSPLASH_RECENT_LS_KEY = 'bwai-unsplash-recent';

export interface BuildWithAiFontPair {
  id: string;
  label: string;
  googleFontsUrl: string;
  serifVar: string;
  sansVar: string;
}

export const BUILD_WITH_AI_FONT_PAIRS: BuildWithAiFontPair[] = [
  {
    id: 'playfair-lato',
    label: 'Classic',
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Lato:wght@400;700&display=swap",
    serifVar: 'Playfair Display',
    sansVar: 'Lato'
  },
  {
    id: 'fraunces-dm',
    label: 'Modern',
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,700&family=DM+Sans:wght@400;700&display=swap",
    serifVar: 'Fraunces',
    sansVar: 'DM Sans'
  },
  {
    id: 'cormorant-nunito',
    label: 'Elegant',
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700;1,700&family=Nunito+Sans:wght@400;700&display=swap",
    serifVar: 'Cormorant Garamond',
    sansVar: 'Nunito Sans'
  },
  {
    id: 'baskerville-source',
    label: 'Traditional',
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,700;1,400&family=Source+Sans+3:wght@400;700&display=swap",
    serifVar: 'Libre Baskerville',
    sansVar: 'Source Sans 3'
  },
  {
    id: 'italiana-raleway',
    label: 'Luxury',
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Italiana&family=Raleway:wght@400;700&display=swap",
    serifVar: 'Italiana',
    sansVar: 'Raleway'
  }
];

export const BUILD_WITH_AI_MODELS: BuildWithAiModelOption[] = [
  {
    key: 'google:gemini-3-flash',
    label: 'Gemini 3 Flash',
    provider: 'google',
    modelId: 'gemini-3-flash-preview',
    contextLimit: 1_000_000
  },
  {
    key: 'openai:gpt-5.1',
    label: 'GPT-5.1',
    provider: 'openai',
    modelId: 'gpt-5.1',
    contextLimit: 200_000
  }
];

export const BUILD_WITH_AI_CONTEXT_WARNING_RATIO = 0.8;

export const BUILD_WITH_AI_COMPONENT_LIBRARY_PROMPT = `
Component and style library guidance (hidden from user UI):
- Brand palette anchors via CSS vars: var(--lp-primary) #FF3399, var(--lp-cream) #F9F9F9, var(--lp-warm) #F7F3F0, var(--lp-dark) #333333, var(--lp-muted) #858585, var(--lp-border) #EBEBEB, var(--lp-white) #FFFFFF.
- Typography: use font-[family-name:var(--lp-serif)] for headings, font-[family-name:var(--lp-sans)] for body.
- Use Tailwind CSS utility classes for all styling. Build components with utilities, not custom CSS classes.
- Reusable component patterns (all Tailwind-based):
  1) Hero: py-20 md:py-32 text-center, eyebrow with uppercase tracking-widest text-sm, large heading, CTA row with gap-4.
  2) Feature cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6, each card p-6 rounded-xl shadow-md.
  3) Testimonial quotes: grid or flex, avatar rounded-full, italic quote text.
  4) Metric counters: flex flex-wrap justify-center gap-8 md:gap-16, text-4xl font-bold for numbers.
  5) CTA banner: bg-[var(--lp-primary)] text-white py-16 text-center, prominent rounded button.
  6) FAQ accordion: space-y-4, border rounded-lg items, toggle via content.js.
  7) Logo cloud: flex flex-wrap justify-center items-center gap-8, grayscale opacity-60 hover:opacity-100.
  8) Contact form: max-w-lg mx-auto, inputs with rounded-lg border px-4 py-3 focus:ring-2.
- Components should stay visually unified with consistent spacing, border-radius, and color tokens.
- You are not limited to this library. You may suggest or create additional components if they improve the result.
`;
