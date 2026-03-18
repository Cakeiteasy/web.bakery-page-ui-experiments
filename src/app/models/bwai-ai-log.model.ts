export type BwaiAiLogApplyStatus = 'applied' | 'rejected' | 'error';
export type BwaiAiLogEditStatus = 'matched' | 'unmatched' | 'error';

export interface BwaiAiLogEditResult {
  file: string;
  mode: string;
  search: string;
  status: BwaiAiLogEditStatus;
  error?: string;
}

export interface BwaiAiLog {
  id: string;
  pageId?: string | null;
  pageSlug?: string | null;
  modelKey: string;
  provider: string;
  lastUserMessage: string;
  edits: Array<{ file: string; mode?: string; search: string }>;
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
  applyResults: BwaiAiLogEditResult[];
  applyStatus: BwaiAiLogApplyStatus;
  rejectionReason?: string;
  warnings?: string[];
}
