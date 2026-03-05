import {
  ACTIVE_BAKERY_STORAGE_KEY,
  DEFAULT_BAKERY_KEY,
  isBakeryKey,
  resolveBakeryOption
} from '../config/bakeries.config';
import { BakeryKey, IBakeryOption } from '../models/bakery.model';

function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function getStoredBakeryKey(): BakeryKey {
  const storage = getLocalStorage();
  const stored = storage?.getItem(ACTIVE_BAKERY_STORAGE_KEY);

  if (isBakeryKey(stored)) {
    return stored;
  }

  return DEFAULT_BAKERY_KEY;
}

export function setStoredBakeryKey(key: BakeryKey): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(ACTIVE_BAKERY_STORAGE_KEY, key);
}

export function getActiveBakeryOption(): IBakeryOption {
  return resolveBakeryOption(getStoredBakeryKey());
}
