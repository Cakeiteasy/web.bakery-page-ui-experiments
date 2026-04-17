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

export const INITIAL_PAGE_GUIDELINES = `
If you add any of the sections below, use these guidelines:
- Hero section. Bold, creative, and engaging. Use complex creative beautiful gradient background and partially colored title unless asked otherwise.
- Feature card grid.
- Metrics/stats row.
- FAQ accordion.
- Testimonial cards. For avatars, use a placeholder images.
- CTA banner.
- Contact form.
- Products List section using data-cie-component="products-list" contract. DO NOT STYLE THIS SECTION. IT IS STYLED BY THE RUNTIME.
Each section should be unique and stand out. Be creative with your designs.

Molecules:
- Cta button: inline-block px-8 py-3 bg-[var(--lp-primary)] text-white rounded-full font-semibold hover:opacity-90 transition-opacity
- Card: no shadows.

Design principles:
- Be creative and tasteful. Use gradient backgrounds, partially colored titles, subtle animations, dark sections, etc. Don't overdo it. Don't do it if the user explicitly asks for a specific design.
- Don't make the page look too techy unless user explicitly asks for it. The point of the page is to sell a product or service — it should feel warm, inviting, and premium.
- Give the page generous whitespace. Sections need breathing room — don't cram content. err on the side of more padding, not less.
- Create visual rhythm between sections. Alternate between light backgrounds, dark/colored backgrounds, and image-heavy sections so the page has flow and contrast. Not every section should be white-on-white.
- Establish clear typography hierarchy. Headings should feel large and intentional. Body text should be comfortable to read. Don't let sizes blur together.
- Cards should be subtle by modern standards — soft shadows and muted backgrounds, not bright colored boxes. Unless user explicitly asks otherwise.
- Use images where they add emotional value (hero backgrounds, product showcases, lifestyle shots). Don't add them just to fill space.
- Be consistent — spacing scale, border-radius, color palette, and typography should feel unified across all sections.

Common mistakes to avoid:
- Buttons must always have whitespace-nowrap, otherwise they break across lines.
- Buttons and interactive elements must always have cursor: pointer.
- All text must be readable. When placing text over images, always add a dark overlay or text shadow for contrast.
- When choosing placeholder images, be specific and evocative — not generic stock-photo keywords.
- Don't over-decorate. If a section already has a gradient background, it probably doesn't also need drop shadows on every card, colored borders, and animated icons.
- Make sure everything looks good on all screen sizes. On small, medium, and large screens.
- Images can have any size or aspect ratio. Make sure any image is displayed in a way that looks good.
- Make sure that in the hero section, left and right parts (or top and bottom on smaller screens) always have enough space between them and don't stick together.
- Make sure bullet list decorators are always good. They are often misaligned and/or sqeezed. Avoid that.
`;

export const BUILD_WITH_AI_COMPONENT_LIBRARY_PROMPT = `
Component and style library guidance (hidden from user UI):
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
