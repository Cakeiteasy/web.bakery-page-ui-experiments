export type BwaiAiLogApplyStatus = 'applied' | 'rejected' | 'partial' | 'error';
export type BwaiAiLogEditStatus = 'matched' | 'unmatched' | 'error';

export interface BwaiAiLogEditResult {
  file: string;
  mode: string;
  search: string;
  status: BwaiAiLogEditStatus;
  error?: string;
}

export interface BwaiAiLogEdit {
  file: string;
  mode?: string;
  search: string;
  value?: string;
}

export interface BwaiAiLogSelectedTarget {
  messageId: string;
  label: string;
  reference: string;
  selector: string;
  bwaiId: string;
  sectionIndex: number;
  totalSections: number;
  outerHtml: string;
  outerHtmlTruncated: boolean;
}

export interface BwaiAiLogRequestMeta {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  attachmentCount: number;
  allowGlobalStyleOverride: boolean;
}

export interface BwaiAiLogFileHashes {
  html: string;
  css: string;
  js: string;
}

export interface BwaiAiLog {
  id: string;
  pageId?: string | null;
  pageSlug?: string | null;
  modelKey: string;
  provider: string;
  lastUserMessage: string;
  selectedTargets?: BwaiAiLogSelectedTarget[];
  requestMeta?: BwaiAiLogRequestMeta | null;
  beforeFileHashes?: BwaiAiLogFileHashes | null;
  afterFileHashes?: BwaiAiLogFileHashes | null;
  touchedFiles?: string[];
  assistantText?: string | null;
  responseParseError?: string | null;
  edits: BwaiAiLogEdit[];
  applyResults?: BwaiAiLogEditResult[] | null;
  applyStatus?: BwaiAiLogApplyStatus | null;
  rejectionReason?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  llmTimeMs?: number | null;
  totalTimeMs?: number | null;
  warnings?: string[];
  /** Full system string sent to the LLM (detail fetch only). */
  systemPrompt?: string | null;
  /** Pretty-printed JSON of messages passed to the LLM (detail fetch only). */
  llmRequestMessagesJson?: string | null;
  /** Set when serialization failed or payload exceeded storage limits. */
  llmRequestMessagesError?: string | null;
  /** Raw streamed model text before parsing (detail fetch only). */
  rawModelOutput?: string | null;
  createdAt: number;
}

export interface BwaiAiLogUpdatePayload {
  edits?: BwaiAiLogEdit[];
  applyResults: BwaiAiLogEditResult[];
  applyStatus: BwaiAiLogApplyStatus;
  rejectionReason?: string;
  warnings?: string[];
  afterFileHashes?: BwaiAiLogFileHashes;
  touchedFiles?: string[];
}
