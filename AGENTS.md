# AGENTS.md — Product Context for AI Agents & Developers

## 1. Product Overview

**CakeItEasy Web Shop** is an AI-powered landing page builder for bakeries. Users create and edit landing pages through a conversational AI interface — type what you want, and the AI generates HTML/CSS/JS edits applied in real-time to a live preview.

**Multi-tenant:** Supports multiple bakeries (Rosenborg Bakeri, Maschmanns) with separate product APIs, branding presets, and proxy routes.

**Tech Stack:**
- **Frontend:** Angular 17 (standalone components, signals for state)
- **Backend:** Vercel serverless functions (TypeScript)
- **Database:** MongoDB (collections: `bwai_pages`, `bwai_page_versions`, `bwai_ai_logs`)
- **Image storage:** Cloudflare R2 (S3-compatible)
- **AI providers:** OpenAI (GPT-5.1), Google (Gemini 3 Flash) via Vercel AI SDK

---

## 2. AI Builder — Data Flow

The core feature is the "Build with AI" editor. Here is the end-to-end flow:

```
User types message in chat UI
        │
        ▼
Frontend enriches context:
  - Collects current editable files (HTML, CSS, JS)
  - If a section is selected: injects section HTML snapshot + CSS selector
  - If products-list section: injects products-list context
  - Prepends "[Editing section: ...]" metadata
  - Trims conversation to last 10 messages
        │
        ▼
POST /api/build-with-ai
  Payload: { modelKey, messages, files, systemPromptOverride?, pageId?, pageSlug? }
        │
        ▼
Backend (api/build-with-ai.ts):
  1. Validates model key against registry
  2. Inserts initial log document in MongoDB (before streaming)
  3. Constructs system prompt from SYSTEM_PROMPT + COMPONENT_LIBRARY_PROMPT
     (defined in api/build-with-ai.prompt.ts)
  4. Calls streamText() with selected AI model
  5. Streams response back as plain text
  6. Parses response, extracts __LOGID__xxx__ENDLOGID__ sentinel
  7. Updates log with token counts and timing
        │
        ▼
Frontend receives streamed response:
  1. Extracts logId from sentinel
  2. Parses JSON → { assistantText, edits[], warnings[] }
        │
        ▼
Frontend applies edits (BuildWithAiDiffService):
  - Each edit: { file, mode, search, value }
  - Modes: "replace" (find & replace), "insert" (empty file init), "insertAfter" (append after anchor)
  - Validates against protected CSS patterns (@import, :root, .lp-btn*, .lp-eyebrow*)
  - Returns per-edit match status (matched/unmatched/error)
        │
        ▼
Frontend validates syntax (BuildWithAiSyntaxValidatorService):
  - If invalid → reject patch, update log with rejection reason
        │
        ▼
Preview updated via iframe postMessage (no full reload)
        │
        ▼
Frontend updates log via PUT /api/ai-logs?id=xxx
  Sends: applyResults, applyStatus, afterFileHashes, touchedFiles
```

**Editable files contract:** The AI can only edit 3 files: `content.html`, `content.css`, `content.js`. These are the user's page content — global shell styles (header, footer, design tokens) are off-limits by default.

**Style override:** Protected CSS patterns are blocked unless the user includes `[ALLOW_STYLE_OVERRIDE]` in their message, which sets `allowGlobalStyleOverride: true` on the request.

**Context meter:** Estimates token usage as `(messageChars + fileChars) / 4`. Warns at 80% of model's context limit (`BUILD_WITH_AI_CONTEXT_WARNING_RATIO = 0.8`).

---

## 3. Pages Structure

### Routes (`src/app/app.routes.ts`)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/pages` | `PagesListComponent` | Dashboard listing all AI-generated pages |
| `/pages/:pageId` | `BuildWithAiPageComponent` | The main AI editor |
| `/admin/ai-logs` | `AdminAiLogsComponent` | Admin log viewer |
| `/**` (catch-all) | `DynamicPageViewComponent` | Redirects to `/api/page-renderer?slug=...` |

### Key Component Files

| Component | File |
|-----------|------|
| AI Editor (4000+ lines) | `src/app/pages/build-with-ai-page/build-with-ai-page.component.ts` |
| New Page Dialog | `src/app/pages/build-with-ai-page/bwai-new-page-dialog/` |
| Image Picker | `src/app/pages/build-with-ai-page/bwai-image-picker-modal/` |
| Model Selection | `src/app/pages/build-with-ai-page/bwai-generation-settings/` |
| SEO Editor | `src/app/pages/build-with-ai-page/bwai-seo-modal/` |
| Pages List | `src/app/pages/pages-list/` |
| Admin Logs | `src/app/pages/admin-ai-logs/` |
| Published Page Redirect | `src/app/pages/dynamic-page-view/` |

### MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `bwai_pages` | Page documents (HTML, CSS, JS, SEO meta, slug, branding config) |
| `bwai_page_versions` | Version history with diffs |
| `bwai_ai_logs` | Every AI request/response with full metadata |

---

## 4. Rendering: Local vs Remote

### Local — Editor Preview (Client-Side)

The editor renders pages in an **iframe** using `srcdoc`:

1. On load: full HTML document assembled via `buildPublishedDocument()` from `lib/build-preview.ts`
2. On patch: component sends `postMessage('bwai-patch', ...)` to iframe — DOM mutations without reload
3. Section inspection: runtime JS identifies sections by `data-bwai-id`, infers semantic labels (hero, FAQ, CTA, etc.)
4. Screenshots: HTML2Canvas captures section screenshots to attach as AI context

### Remote — Published Pages (Server-Side)

When a user visits `/{slug}`, the catch-all route hits `/api/page-renderer`:

1. Fetches page from MongoDB by slug
2. Calls `buildPublishedDocument()` (same function as editor)
3. Returns complete HTML with SEO meta tags, inlined CSS/JS

### Document Assembly Order (`lib/build-preview.ts`)

1. Static shell CSS (header, footer, reset)
2. User-edited content CSS (`currentFiles.css`)
3. Theme CSS (font family, color tokens from `fontPair` & `accentColor`)
4. Hidden sections CSS (`[data-bwai-id="ID"]{display:none!important}`)
5. User-edited HTML content (inside `<main id="EditableContentRoot">`)
6. Runtime scripts (section-in-view observer, products-list hydration, user JS)

### Section System

- Every top-level section gets a `data-bwai-id` attribute (auto-assigned via `ensureSectionIds()`)
- ID fallback chain: explicit `data-bwai-id` → existing `id` → auto-generated `bwai-XXXX`
- Semantic labels inferred from CSS classes: `hero`, `faq`, `cta`, `testimonial`, `stats`, `features`
- Sections can be hidden (stored in `BwaiPage.hiddenSections[]`) without deletion

---

## 5. Running the Project — Local vs Vercel

### Local Development

```bash
npm start
# Angular dev server at http://localhost:4200
# API requests proxied to http://localhost:3000 via proxy.conf.json
```

**Proxy config** (`proxy.conf.json`):
```json
{
  "/api": "http://localhost:3000",
  "/rosenborg-api": "https://www.rosenborgbakeri.no/shop/api",
  "/maschmanns-api": "https://www.maschmanns.no/shop/api"
}
```

You need a local API server running on port 3000 (e.g., `vercel dev` or a custom Node server) for the backend endpoints.

### Vercel Production

Deployed as static SPA + serverless functions. Routing defined in `vercel.json`:

- `/pages*`, `/admin*`, `/products/*`, `/` → `index.html` (SPA)
- `/api/*` → corresponding `api/*.ts` serverless function
- `/rosenborg-api/*`, `/maschmanns-api/*` → proxied to bakery backends
- `/*` (catch-all) → `api/page-renderer.ts` (published pages)

**Build:** `npm run build` → output in `dist/web-shop-expo/browser/`

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB_NAME` | Database name (dev: `cakeiteasy-ai-dev`) |
| `OPENAI_API_KEY` | OpenAI API key for GPT models |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google API key for Gemini models |
| `R2_ACCOUNT_ID` | Cloudflare R2 account |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | R2 public URL for serving uploaded images |
| `UNSPLASH_ACCESS_KEY` | Unsplash image search API |
| `BUILD_WITH_AI_DEMO_KEY` | (optional) Demo mode authorization key |

---

## 6. Frontend & Backend Logic

### Frontend Services (`src/app/services/`)

| Service | File | Purpose |
|---------|------|---------|
| `BwaiPageService` | `bwai-page.service.ts` | CRUD for pages (calls `/api/pages`) |
| `BuildWithAiApiService` | `build-with-ai-api.service.ts` | Streams AI responses, uploads images, triggers visual review |
| `BuildWithAiSessionService` | `build-with-ai-session.service.ts` | Persists editor state to localStorage |
| `BuildWithAiDiffService` | `build-with-ai-diff.service.ts` | Applies search/replace edits to files |
| `BuildWithAiSyntaxValidatorService` | `build-with-ai-syntax-validator.service.ts` | Validates HTML/CSS/JS after patching |
| `BuildWithAiContextMeterService` | `build-with-ai-context-meter.service.ts` | Estimates token usage vs model limit |
| `BwaiAiLogService` | `bwai-ai-log.service.ts` | Fetches and updates AI logs |
| `BakeryBrandingService` | `bakery-branding.service.ts` | Loads bakery-specific branding |
| `ProductsService` | `products.service.ts` | Fetches product catalog |
| `UiConfigService` | `ui-config.service.ts` | Manages theme presets |

### Backend Endpoints (`api/`)

| Endpoint | File | Methods | Purpose |
|----------|------|---------|---------|
| `/api/pages` | `pages.ts` | GET, POST, PUT, DELETE | Page CRUD |
| `/api/build-with-ai` | `build-with-ai.ts` | POST | Streaming AI generation |
| `/api/page-renderer` | `page-renderer.ts` | GET | Renders published page HTML |
| `/api/page-versions` | `page-versions.ts` | GET, POST | Version history |
| `/api/ai-logs` | `ai-logs.ts` | GET, PUT | AI log retrieval & updates |
| `/api/upload-image` | `upload-image.ts` | POST | Image upload to Cloudflare R2 |
| `/api/unsplash-search` | `unsplash-search.ts` | GET | Unsplash image search proxy |
| `/api/visual-review` | `visual-review.ts` | POST | AI design improvement suggestions |

### State Management

Angular signals — no external state library. Key signals in `BuildWithAiPageComponent`:

- `files` — current editable HTML/CSS/JS
- `messages` — chat conversation history
- `patchLogs` — history of applied/rejected patches
- `selectedSection` — currently inspected section (selector, bwaiId, label)
- `hiddenSections` — array of hidden section IDs
- `currentPage` — active page document
- `styleDraft` / `styleDirtyFields` — style editor working state

**Persistence:** Session snapshots (model, files, messages, patchLogs) saved to localStorage key `'build-with-ai-session-v1'` via `BuildWithAiSessionService`.

### Products Integration

Sections with `data-cie-component="products-list"` auto-hydrate at runtime:
- Runtime script in `lib/build-preview.ts` detects the attribute
- Fetches products from bakery API (`/api/store`)
- Renders product cards with configurable grid layout, image handling, category filters, and motion
- Configuration via `ChooseCakeUIConfig` model (`src/app/models/ui-config.model.ts`)

---

## 7. AI Usage & Logs

### Supported Models (`src/app/pages/build-with-ai-page/build-with-ai.constants.ts`)

| Model Key | Provider | Model ID | Context Limit |
|-----------|----------|----------|---------------|
| `google:gemini-3-flash` | Google | `gemini-3-flash-preview` | 1,000,000 tokens |
| `openai:gpt-5.1` | OpenAI | `gpt-5.1` | 200,000 tokens |

### AI SDK

Uses the Vercel `ai` package (`ai@^6.x`) with provider adapters:
- `@ai-sdk/openai` — OpenAI models
- `@ai-sdk/google` — Google Gemini models
- `streamText()` for streaming generation (main builder)
- `generateText()` for one-shot calls (visual review)

### Log Model (`src/app/models/bwai-ai-log.model.ts`)

Each AI interaction creates a log document with:

| Field | Description |
|-------|-------------|
| `modelKey` / `provider` | Which model was used |
| `lastUserMessage` | The user's message text |
| `selectedTargets` | DOM elements the user targeted (selector, outerHtml) |
| `requestMeta` | Message counts, attachment count, style override flag |
| `beforeFileHashes` / `afterFileHashes` | Content hashes before/after edit |
| `touchedFiles` | Which files were modified |
| `assistantText` | AI's conversational response |
| `edits` | Array of proposed search/replace operations |
| `applyResults` | Per-edit match status after frontend applies them |
| `applyStatus` | Overall result: `applied`, `rejected`, or `error` |
| `rejectionReason` | Why the patch was rejected (if applicable) |
| `responseParseError` | JSON parse error (if AI output was malformed) |
| `inputTokens` / `outputTokens` | Token usage |
| `llmTimeMs` / `totalTimeMs` | Timing |
| `warnings` | AI-generated warnings about the edits |

### Admin Dashboard

Route: `/admin/ai-logs` — `AdminAiLogsComponent`

Features:
- Table of all AI requests with date, page slug, model, status, tokens, timing
- Filter by apply status (`applied` / `rejected` / `error`) and page slug
- Expandable rows showing full request/response details, proposed edits with diff preview, patch results, selected elements, and warnings
- Pagination with "Load more"

---

## 8. AI Calls Debugging

### Log Lifecycle

```
1. Backend inserts log BEFORE streaming (captures request context)
2. Backend streams AI response to frontend
3. Backend parses response, updates log with tokens + timing
4. Frontend applies edits, updates log with applyResults + applyStatus
```

This means a log always exists even if streaming fails — check for logs with missing `applyStatus` to find interrupted requests.

### Key Debugging Fields

| Field | What to look for |
|-------|------------------|
| `responseParseError` | Non-null means AI returned malformed JSON — check `assistantText` for raw output |
| `applyResults` | Array of `{ editIndex, status }` — find which specific edit failed to match |
| `rejectionReason` | Why the entire patch was rejected (syntax error, protected pattern, etc.) |
| `warnings` | AI's own warnings about what it generated |
| `beforeFileHashes` / `afterFileHashes` | If equal, no actual change was made despite "applied" status |

### Common Failure Modes

1. **Parse error:** AI wrapped JSON in markdown code fences or returned conversational text — backend strips ``` but may fail on other wrappers
2. **Edit unmatched:** The `search` string in a replace edit doesn't exist in the current file — often caused by stale context (previous edit changed the file)
3. **Protected pattern violation:** Edit tries to modify `:root`, `@import`, or `.lp-btn*` without `allowGlobalStyleOverride`
4. **Context overflow:** Message history exceeds model's context limit — context meter warns at 80%

### Visual Review

`POST /api/visual-review` — one-shot `generateText()` call that takes page HTML and returns markdown with UX/design improvement suggestions. Useful for automated page quality checks.

### Useful Queries

To debug a specific page's AI history:
```
GET /api/ai-logs?pageSlug=my-page&limit=50
```

To find failed patches:
```
GET /api/ai-logs?status=rejected&limit=20
GET /api/ai-logs?status=error&limit=20
```
