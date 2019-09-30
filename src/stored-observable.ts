import merge from 'lodash/merge';
import noop from 'lodash/noop';
import { action, autorun, IObservableObject, observable, runInAction, toJS } from 'mobx';
import getStorage, { StorageType } from './get-web-storage';

type OnUpdate<T> = (newValue: T, observable: T) => void;

export interface StoredObservableOptions<T> {
  key: string;
  initialValue?: T;
  debounce?: number;
  storageType?: StorageType;
  onUpdate?: OnUpdate<T>;
}

type StoredObservable<T> = [T, () => void];

export function storedObservable<T>(options: StoredObservableOptions<T>): StoredObservable<T> {
  const mergedOptions = { ...defaultOptions(), ...options };
  const { storageType, key, onUpdate, initialValue, debounce } = mergedOptions;
  const storage = getStorage(storageType);

  const obsVal = observable(initialValue);
  if (typeof storage === 'object' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {

    const loadInitialValueFromStorage = createInitialValueLoader(key, storage, obsVal);

    autorun(
      () => {
        setItem(key, obsVal, storage);
      },
      { delay: debounce },
    );

    window.addEventListener('storage', createOnStorage(key, storage, onUpdate, obsVal), false);

    return [obsVal, loadInitialValueFromStorage];
  }
  return [obsVal, noop];
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
    onUpdate: defaultOnUpdate,
  };
};

function createOnStorage(
  key: string, storage: Storage, onUpdate: OnUpdate<any>, observable: IObservableObject): (event: StorageEvent) => void {
  return (event: StorageEvent) => {
    if (event.storageArea === storage) {
      if (event.key === key && event.newValue !== event.oldValue) {
        let newValue = event.newValue;
        if (!newValue) {
          newValue = '{}';
        }
        onUpdate(JSON.parse(newValue), observable);
      }
    }
  };
}

function createInitialValueLoader<T>(key: string, storage: Storage, value: T): () => void {
  let loaded: boolean = false;
  return action(() => {
    if (!loaded) {
      const loadedValue = getItem<T>(key, storage, toJS(value));
      Object.assign(value, loadedValue);
      loaded = true;
    }
  });
}

function setItem<T>(key: string, value: T, storage: Storage): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log({ storage, key }, `Unable to write to storage: ${error.message}`);
    console.log(error);
  }
}

function customizer(objValue: any, srcValue: any): any {
  if (objValue && !srcValue) {
    return objValue;
  }
  if (srcValue) {
    return srcValue;
  }
}

function getItem<T>(key: string, storage: Storage, currentValue?: T): T {
  try {
    const fromStorageRaw = storage.getItem(key);
    if (fromStorageRaw) {
      const fromStorage = JSON.parse(fromStorageRaw);
      merge(currentValue, fromStorage, customizer);
      return currentValue;
    }
  } catch (error) {
    console.log({ storage, key }, `Unable to read from storage: ${error.message}`);
    console.log(error);
  }
  return currentValue;
}

export default storedObservable;
