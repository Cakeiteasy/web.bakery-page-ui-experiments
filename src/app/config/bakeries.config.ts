import { BakeryKey, IBakeryOption } from '../models/bakery.model';

export const DEFAULT_BAKERY_KEY: BakeryKey = 'rosenborg';
export const ACTIVE_BAKERY_STORAGE_KEY = 'web-shop-expo-active-bakery';

export const BAKERY_OPTIONS: IBakeryOption[] = [
  {
    key: 'rosenborg',
    name: 'Rosenborg',
    defaultPreset: 'rosenborgbakeri',
    api: {
      proxyBase: '/rosenborg-api',
      bakeryId: 113,
      webShopKey: 'rosenborg',
    }
  },
  {
    key: 'maschmanns',
    name: 'Maschmanns',
    defaultPreset: 'maschmanns_market',
    api: {
      proxyBase: '/maschmanns-api',
      bakeryId: 531,
      webShopKey: 'maschmanns',
      categoriesLocale: 'no',
      fallbackCategories: [
        { id: 5517, name: 'Maschmanns Selection' }
      ]
    }
  }
];

export function resolveBakeryOption(key: BakeryKey): IBakeryOption {
  return BAKERY_OPTIONS.find((option) => option.key === key) ?? BAKERY_OPTIONS[0];
}

export function isBakeryKey(value: string | null | undefined): value is BakeryKey {
  if (!value) {
    return false;
  }

  return BAKERY_OPTIONS.some((option) => option.key === value);
}
