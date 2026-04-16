export type BuildWithAiEditableFileName = 'content.html' | 'content.css' | 'content.js';

export interface BuildWithAiEditableFiles {
  html: string;
  css: string;
  js: string;
}

export type BuildWithAiProvider = 'openai' | 'google';

export interface BuildWithAiModelOption {
  key: string;
  label: string;
  provider: BuildWithAiProvider;
  modelId: string;
  contextLimit: number;
}

export interface BuildWithAiAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'data-url' | 'url';
  dataUrl?: string;
  url?: string;
}

export interface BuildWithAiMessageTarget {
  selector: string;
  reference: string;
  label: string;
  bwaiId: string;
  sectionIndex: number;
  totalSections: number;
  outerHtml: string;
}

export interface BuildWithAiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  attachments: BuildWithAiAttachment[];
  target?: BuildWithAiMessageTarget;
  sectionCaptureWarning?: string;
  errorCategory?: BuildWithAiErrorCategory;
}

export type BuildWithAiErrorCategory = 'api' | 'patch' | 'validation' | 'preview';

export interface BuildWithAiPatchLogEntry {
  id: string;
  createdAt: number;
  diff: string;
  status: 'applied' | 'rejected' | 'partial';
  details: string;
}

export interface BuildWithAiSessionSnapshot {
  modelKey: string;
  files: BuildWithAiEditableFiles;
  messages: BuildWithAiChatMessage[];
  patchLogs: BuildWithAiPatchLogEntry[];
  updatedAt: number;
}

export interface BuildWithAiApiRequest {
  modelKey: string;
  messages: BuildWithAiChatMessage[];
  files: BuildWithAiEditableFiles;
  systemPromptOverride?: string | null;
  allowGlobalStyleOverride?: boolean;
  pageId?: string;
  pageSlug?: string;
}

export interface BuildWithAiUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface BuildWithAiSearchReplaceEdit {
  file: BuildWithAiEditableFileName;
  mode?: 'replace' | 'insert' | 'insertAfter';
  search: string;
  value: string;
}

export interface BuildWithAiApiResponse {
  assistantText: string;
  edits: BuildWithAiSearchReplaceEdit[];
  warnings: string[];
  usage?: BuildWithAiUsage;
  logId?: string;
}

export interface BuildWithAiValidationIssue {
  file: BuildWithAiEditableFileName;
  message: string;
}

export interface BuildWithAiValidationResult {
  valid: boolean;
  issues: BuildWithAiValidationIssue[];
}

export interface BuildWithAiContextEstimate {
  estimatedTokens: number;
  limit: number;
  ratio: number;
  nearLimit: boolean;
}

export interface BuildWithAiEditApplyResult {
  file: string;
  mode: string;
  search: string;
  status: 'matched' | 'unmatched' | 'error';
  error?: string;
}

export interface BuildWithAiDiffApplyResult {
  files: BuildWithAiEditableFiles;
  touchedFiles: BuildWithAiEditableFileName[];
  editResults: BuildWithAiEditApplyResult[];
  ok: boolean;
  partialOk: boolean;
}

export const BUILD_WITH_AI_FILE_NAMES: BuildWithAiEditableFileName[] = [
  'content.html',
  'content.css',
  'content.js'
];
