import { PresetKey, ChooseCakeUIConfig } from '../models/ui-config.model';
import { BLUSH_PATISSERIE_PRESET } from './blush-patisserie.preset';
import { DARK_LUXURY_PRESET } from './dark-luxury.preset';
import { MASCHMANNS_MARKET_PRESET } from './maschmanns-market.preset';
import { MONO_BRUTAL_PRESET } from './mono-brutal.preset';
import { NEOBRUTAL_PRESET } from './neobrutal.preset';
import { ROSENBORGBAKERI_PRESET } from './rosenborgbakeri.preset';
import { SCANDI_CLEAN_PRESET } from './scandi-clean.preset';

export const PRESETS: Record<PresetKey, ChooseCakeUIConfig> = {
  rosenborgbakeri: ROSENBORGBAKERI_PRESET,
  maschmanns_market: MASCHMANNS_MARKET_PRESET,
  neobrutal: NEOBRUTAL_PRESET,
  mono_brutal: MONO_BRUTAL_PRESET,
  dark_luxury: DARK_LUXURY_PRESET,
  scandi_clean: SCANDI_CLEAN_PRESET,
  blush_patisserie: BLUSH_PATISSERIE_PRESET
};

export const PRESET_OPTIONS: Array<{ key: PresetKey; label: string }> = [
  { key: 'rosenborgbakeri', label: 'Rosenborg' },
  { key: 'maschmanns_market', label: 'Maschmanns' },
  { key: 'neobrutal', label: 'Neo Brutal' },
  { key: 'mono_brutal', label: 'Mono Brutal' },
  { key: 'dark_luxury', label: 'Dark Luxury' },
  { key: 'scandi_clean', label: 'Scandi Clean' },
  { key: 'blush_patisserie', label: 'Blush Patisserie' }
];
