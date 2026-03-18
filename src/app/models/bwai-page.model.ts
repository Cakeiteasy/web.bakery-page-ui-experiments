import { BuildWithAiChatMessage, BuildWithAiEditableFiles, BuildWithAiPatchLogEntry } from './build-with-ai.model';

export interface BwaiPageSummary {
  id: string;
  slug: string;
  title: string;
  seoTitle: string;
  updatedAt: number;
}

export interface BwaiPage extends BwaiPageSummary {
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  currentFiles: BuildWithAiEditableFiles;
  currentModelKey: string;
  messages: BuildWithAiChatMessage[];
  patchLogs: BuildWithAiPatchLogEntry[];
  fontPair?: string;
  accentColor?: string;
  hiddenSections?: string[];    // data-bwai-id values of hidden sections
  createdAt: number;
}

export interface BwaiPageVersion {
  id: string;
  pageId: string;
  createdAt: number;
  label: string | null;
  diff: string;
  status: 'applied' | 'rejected';
  files?: BuildWithAiEditableFiles;
}

export interface BwaiPageCreatePayload {
  slug: string;
  title: string;
  currentFiles?: BuildWithAiEditableFiles;
  messages?: BuildWithAiChatMessage[];
  currentModelKey?: string;
}

export interface BwaiPageUpdatePayload {
  slug?: string;
  title?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  currentFiles?: BuildWithAiEditableFiles;
  currentModelKey?: string;
  messages?: BuildWithAiChatMessage[];
  patchLogs?: BuildWithAiPatchLogEntry[];
  fontPair?: string;
  accentColor?: string;
  hiddenSections?: string[];
}
