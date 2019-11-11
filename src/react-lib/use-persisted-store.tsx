import { IObservableObject } from 'mobx';
import { useLocalStore } from 'mobx-react-lite';
import { useEffect } from 'react';
import { StorageType } from '../get-web-storage';
import storedObservable from '../stored-observable';

export interface UseStoredObservableOptions<T> {
  key: string;
  getInitialValue: () => T;
  debounce?: number;
  storageType?: StorageType;
}

export default function usePersistedStore<T>(options: UseStoredObservableOptions<T>): T & IObservableObject {
  const { getInitialValue, ...otherOptions } = options;
  const localStore = useLocalStore<T>(getInitialValue);
  const modifiedOptions = { ...otherOptions, initialValue: localStore };
  const stored = storedObservable(modifiedOptions);
  const useEffectDeps = [options.key, options.storageType];
  useEffect(() => {
    stored.loadInitialValue();
    return () => stored.disposer();
  },        useEffectDeps);
  return stored.value;
}
