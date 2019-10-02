import noop from 'lodash/noop';
import { autorun, IObservableObject, observable, runInAction } from 'mobx';
import getStorage, { StorageType } from './get-web-storage';
import {
  createInitialValueLoader,
  createOnStorageEventHandler,
  Disposer,
  HandleUpdate,
  LoadInitialValue,
  setStorageItem,
} from './storage-helpers';

export interface StoredObservableOptions<T> {
  key: string;
  initialValue?: T;
  debounce?: number;
  storageType?: StorageType;
  handleUpdateFromStorage?: HandleUpdate<T>;
}

type StoredObservable<T> = {
  value: T & IObservableObject;
  loadInitialValue: LoadInitialValue;
  disposer: Disposer;
};

export function storedObservable<T>(options: StoredObservableOptions<T>): StoredObservable<T> {
  const mergedOptions = { ...defaultOptions(), ...options };
  const { storageType, key, handleUpdateFromStorage, initialValue, debounce } = mergedOptions;
  const storage = getStorage(storageType);

  const obsVal = observable(initialValue);
  if (typeof storage === 'object' && typeof window === 'object' && typeof window.addEventListener === 'function') {

    const loadInitialValueFromStorage = createInitialValueLoader(key, storage, obsVal);

    const stopPersistingChanges = autorun(
      () => {
        setStorageItem(key, obsVal, storage);
      },
      { delay: debounce },
    );
    const eventListenerOpts = false;
    const onStorage = createOnStorageEventHandler(key, storage, handleUpdateFromStorage, obsVal);
    window.addEventListener('storage', onStorage, eventListenerOpts);

    const disposer = () => {
      window.removeEventListener('storage', onStorage, eventListenerOpts);
      stopPersistingChanges();
    };

    return { disposer, value: obsVal, loadInitialValue: loadInitialValueFromStorage };
  }
  return { value: obsVal, loadInitialValue: noop, disposer: noop };
}

function defaultOnUpdate<T>(newValue: T, observable: IObservableObject): void {
  runInAction(() => {
    Object.assign(observable, newValue);
  });
}

const defaultOptions = (): Partial<StoredObservableOptions<any>> => {
  return {
    debounce: 300,
    storageType: 'localStorage',
    initialValue: {},
    handleUpdateFromStorage: defaultOnUpdate,
  };
};

export default storedObservable;
