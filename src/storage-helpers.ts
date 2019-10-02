import merge from 'lodash/merge';
import { action, IObservableObject, toJS } from 'mobx';

export type HandleUpdate<T> = (newValue: T, observable: T & IObservableObject) => void;
export type LoadInitialValue = () => void;
export type Disposer = () => void;

export function createOnStorageEventHandler(
  key: string, storage: Storage, onUpdate: HandleUpdate<any>, observable: IObservableObject): (event: StorageEvent) => void {
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

export function createInitialValueLoader<T>(key: string, storage: Storage, value: T): () => void {
  let loaded: boolean = false;
  return action(() => {
    if (!loaded) {
      const loadedValue = getStorageItem<T>(key, storage, toJS(value));
      Object.assign(value, loadedValue);
      loaded = true;
    }
  });
}

export function setStorageItem<T>(key: string, value: T, storage: Storage): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log({ storage, key }, `Unable to write to storage: ${error.message}`);
    console.log(error);
  }
}

function mergeValuePicker(objValue: any, srcValue: any): any {
  if (objValue && !srcValue) {
    return objValue;
  }
  if (srcValue) {
    return srcValue;
  }
}

export function getStorageItem<T>(key: string, storage: Storage, currentValue?: T): T {
  try {
    const fromStorageRaw = storage.getItem(key);
    if (fromStorageRaw) {
      const fromStorage = JSON.parse(fromStorageRaw);
      merge(currentValue, fromStorage, mergeValuePicker);
      return currentValue;
    }
  } catch (error) {
    console.log({ storage, key }, `Unable to read from storage: ${error.message}`);
    console.log(error);
  }
  return currentValue;
}
