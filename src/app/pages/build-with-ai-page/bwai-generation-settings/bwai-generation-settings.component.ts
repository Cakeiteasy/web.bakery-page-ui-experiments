import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BUILD_WITH_AI_FONT_PAIRS, BUILD_WITH_AI_MODELS, BuildWithAiFontPair } from '../build-with-ai.constants';

export const BWAI_SYSTEM_PROMPT_LS_KEY = 'bwai-system-prompt-override';
export const BWAI_DEMO_KEY_LS_KEY = 'bwai-demo-key';

export interface BwaiGenerationSettings {
  modelKey: string;
  fontPair: string;
  accentColor: string | null;
  systemPromptOverride: string | null;
  demoKey: string | null;
}

@Component({
  selector: 'app-bwai-generation-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bwai-generation-settings.component.html',
  styleUrl: './bwai-generation-settings.component.scss'
})
export class BwaiGenerationSettingsComponent implements OnInit {
  @Input() currentModelKey = '';
  @Input() currentFontPair: string | null = null;
  @Input() currentAccentColor: string | null = null;

  @Output() saved = new EventEmitter<BwaiGenerationSettings>();
  @Output() closed = new EventEmitter<void>();

  readonly models = BUILD_WITH_AI_MODELS;
  readonly fontPairs: BuildWithAiFontPair[] = BUILD_WITH_AI_FONT_PAIRS;

  readonly accentPresets = [
    { label: 'Rose', value: '#ff3399' },
    { label: 'Indigo', value: '#6366f1' },
    { label: 'Teal', value: '#0d9488' },
    { label: 'Amber', value: '#d97706' },
    { label: 'Slate', value: '#475569' }
  ];

  modelKey = '';
  fontPair = 'playfair-lato';
  accentColor: string | null = null;
  systemPromptOverride = '';
  demoKey = '';

  ngOnInit(): void {
    this.modelKey = this.currentModelKey;
    this.fontPair = this.currentFontPair ?? 'playfair-lato';
    this.accentColor = this.currentAccentColor;
    this.systemPromptOverride = localStorage.getItem(BWAI_SYSTEM_PROMPT_LS_KEY) ?? '';
    this.demoKey = localStorage.getItem(BWAI_DEMO_KEY_LS_KEY) ?? '';
  }

  onSave(): void {
    const trimmedPrompt = this.systemPromptOverride.trim();
    if (trimmedPrompt) {
      localStorage.setItem(BWAI_SYSTEM_PROMPT_LS_KEY, trimmedPrompt);
    } else {
      localStorage.removeItem(BWAI_SYSTEM_PROMPT_LS_KEY);
    }
    const trimmedKey = this.demoKey.trim();
    if (trimmedKey) {
      localStorage.setItem(BWAI_DEMO_KEY_LS_KEY, trimmedKey);
    } else {
      localStorage.removeItem(BWAI_DEMO_KEY_LS_KEY);
    }
    this.saved.emit({
      modelKey: this.modelKey,
      fontPair: this.fontPair,
      accentColor: this.accentColor,
      systemPromptOverride: trimmedPrompt || null,
      demoKey: trimmedKey || null
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
