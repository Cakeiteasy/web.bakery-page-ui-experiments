import { BuildWithAiModelOption } from '../../models/build-with-ai.model';
export {
  STATIC_SHELL_CSS as BUILD_WITH_AI_STATIC_SHELL_CSS,
  HEADER_HTML as BUILD_WITH_AI_HEADER_HTML,
  FOOTER_HTML as BUILD_WITH_AI_FOOTER_HTML,
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
- Brand palette anchors: #FF3399, #F9F9F9, #F7F3F0, #333333, #858585, #6D7278, #EBEBEB, #FFFFFF.
- Typography pairing: Recoleta-like heading + Lato-like body (fallback serif/sans allowed).
- Reusable components to prefer when useful:
  1) Hero block with eyebrow, title, subtitle, CTA row.
  2) Feature cards (2-4 columns desktop, 1 column mobile).
  3) Testimonial quotes grid.
  4) Metric counters row.
  5) CTA banner with button pair.
  6) FAQ accordion.
  7) Logo cloud.
  8) Contact form section.
- Components should stay visually unified with shared spacing scale, radius, shadows, and color tokens.
- You are not limited to this library. You may suggest or create additional components if they improve the result.
`;

