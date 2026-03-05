import { PresetKey } from './ui-config.model';

export type BakeryKey = 'rosenborg' | 'maschmanns';

export interface BakeryApiProfile {
  proxyBase: '/rosenborg-api' | '/maschmanns-api';
  bakeryId: number;
  webShopKey: string;
  categoriesLocale?: string;
  fallbackCategories?: Array<{
    id: number;
    name: string;
  }>;
}

export interface IBakeryOption {
  key: BakeryKey;
  name: string;
  defaultPreset: PresetKey;
  api: BakeryApiProfile;
}
