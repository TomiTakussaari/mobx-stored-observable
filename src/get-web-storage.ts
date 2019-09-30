export type StorageType = 'localStorage' | 'sessionStorage';

// from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
function storageAvailable(type: StorageType): boolean {
  if ((process as any).browser === false || typeof window !== 'object') {
    return false;
  }
  const x = '__storage_test__';
  let storage: Storage | string = '';
  try {
    storage = window[type] as Storage;
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return e instanceof DOMException && (
      e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
      storage.length !== 0;
  }
}

function getStorage(name: StorageType): Storage {
  if (storageAvailable(name)) {
    return window[name];
  }
  return null;
}

type StorageCallback = (storage: Storage) => any;
type NoStorageCallback = () => any;

export function withStorage(name: StorageType, callback: StorageCallback, noStorageCallback?: NoStorageCallback): Storage {
  if (storageAvailable(name)) {
    return callback(window[name]);
  }
  return typeof noStorageCallback === 'function' ? noStorageCallback() : null;
}

export default getStorage;
