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
