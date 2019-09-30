import 'jest-localstorage-mock';
import { autorun, configure } from 'mobx';
import storedObservable, { StoredObservableOptions } from './stored-observable';

configure({ enforceActions: 'observed' });
jest.useFakeTimers();

type StorageEventHandler = (storageEvent: Partial<StorageEvent>) => void;

const localStoreValues = new Map<string, string>();
const sessionStoreValues = new Map<string, string>();

const localStorage = window.localStorage;
const localStorageSetItem = localStorage.setItem as jest.Mock;
const localStorageGetItem = localStorage.getItem as jest.Mock;
const localStorageClear = localStorage.clear as jest.Mock;
localStorageSetItem.mockImplementation((key: string, value: string) => localStoreValues.set(key, value));
localStorageGetItem.mockImplementation((key: string) => localStoreValues.get(key));
localStorageClear.mockImplementation(() => localStoreValues.clear());

const sessionStorage = window.sessionStorage;
const sessionStorageSetItem = sessionStorage.setItem as jest.Mock;
const sessionStorageGetItem = sessionStorage.getItem as jest.Mock;
const sessionStorageClear = sessionStorage.getItem as jest.Mock;
sessionStorageSetItem.mockImplementation((key: string, value: string) => sessionStoreValues.set(key, value));
sessionStorageGetItem.mockImplementation((key: string) => sessionStoreValues.get(key));
sessionStorageClear.mockImplementation(() => sessionStoreValues.clear());

describe('storedObservable function', () => {
  let addEventListener: jest.Mock;

  beforeEach(() => {
    addEventListener = window.addEventListener = jest.fn();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('returns observable defaultValue when no window.eventListener', () => {
    window.addEventListener = undefined;
    const defaultVal = { foo: 'bar' };
    const options: StoredObservableOptions<any> =  {
      key: 'key', initialValue: defaultVal, debounce: 500, onUpdate: jest.fn(), storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
  });

  it('returns observable defaultValue when storage is null', () => {
    window.addEventListener = undefined;
    const defaultVal = { foo: 'bar' };
    const options: StoredObservableOptions<any> =  {
      key: 'key', initialValue: defaultVal, debounce: 500, onUpdate: jest.fn(), storageType: null as any,
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
  });

  it('registers storage listener when window.eventListener exists', () => {
    const defaultVal = { foo: 'bar' };
    const options: StoredObservableOptions<any> =  {
      key: 'key', initialValue: defaultVal, debounce: 500, onUpdate: jest.fn(), storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
    expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function), false);
  });

  it('loadInitialValue merges current value from storage with defaults, overriding default properties', () => {
    localStorage.setItem('key', JSON.stringify({ fromStorage: true, overrided: 'from-storage' }));
    const defaultVal = { overrided: 'from-default-val', fromDefault: true };
    const options: StoredObservableOptions<any> =  {
      key: 'key', initialValue: defaultVal, debounce: 500, onUpdate: jest.fn(), storageType: 'localStorage',
    };
    const [value, loadInitialValue] = storedObservable(options);
    loadInitialValue();
    expect(value).toEqual({ overrided: 'from-storage', fromDefault: true, fromStorage: true });
  });

  it('loadInitialValue loads data from dom-storage only once', () => {
    localStorage.setItem('key', JSON.stringify({ val: 'store' }));
    const defaultVal = { val: 'default' };
    const options: StoredObservableOptions<any> =  {
      key: 'key', initialValue: defaultVal, debounce: 500, onUpdate: jest.fn(), storageType: 'localStorage',
    };
    const [value, loadInitialValue] = storedObservable(options);
    loadInitialValue();
    expect(value).toEqual({ val: 'store' });
    localStorage.setItem('key', JSON.stringify({ val: 'new' }));
    loadInitialValue();
    expect(value).toEqual({ val: 'store' });
  });

  it('calls on-update callback when on dom storage event happens for same key', () => {
    const defaultVal = { foo: 'bar' };
    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
    const storageEventHandler: StorageEventHandler = addEventListener.mock.calls[0][1] as StorageEventHandler;
    storageEventHandler(
      { storageArea: localStorage, key: 'key', newValue: JSON.stringify({ foo: 'bar2' }) },
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ foo: 'bar2' }, value);
  });

  it('updates observable directly if onUpdate is omitted from options', async () => {
    const defaultVal = { foo: 'bar' };
    const options: StoredObservableOptions<any> =  {
      key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
    const storageEventHandler: StorageEventHandler = addEventListener.mock.calls[0][1] as StorageEventHandler;
    storageEventHandler(
      { storageArea: localStorage, key: 'key', newValue: JSON.stringify({ foo: 'bar2' }) },
    );
    expect(value).toEqual({ foo: 'bar2' });
  });

  it('returned observable can be subscribed to', async () => {
    const defaultVal = { foo: 'bar' };
    const options: StoredObservableOptions<any> =  {
      key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    let fooValue: string = 'initial';
    autorun(
      () => {
        fooValue = value.foo;
      },
    );
    expect(fooValue).toEqual('bar');
    const storageEventHandler: StorageEventHandler = addEventListener.mock.calls[0][1] as StorageEventHandler;
    storageEventHandler(
      { storageArea: localStorage, key: 'key', newValue: JSON.stringify({ foo: 'bar2' }) },
    );
    expect(fooValue).toEqual('bar2');
  });

  it('does not call on-update callback when on dom storage event has different key', () => {
    const defaultVal = { foo: 'bar' };
    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
    const storageEventHandler: StorageEventHandler = addEventListener.mock.calls[0][1] as StorageEventHandler;
    storageEventHandler(
      { storageArea: localStorage, key: 'another key', newValue: JSON.stringify({ foo: 'bar2' }) },
    );
    expect(onUpdate).toHaveBeenCalledTimes(0);
  });

  it('does not call on-update callback when on dom storage event has different storageArea', () => {
    const defaultVal = { foo: 'bar' };

    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
    const storageEventHandler: StorageEventHandler = addEventListener.mock.calls[0][1] as StorageEventHandler;
    storageEventHandler(
      { storageArea: sessionStorage, key: 'key', newValue: JSON.stringify({ foo: 'bar2' }) },
    );
    expect(onUpdate).toHaveBeenCalledTimes(0);
  });

  it('does not call on-update callback when on new value is same as old value', () => {
    const defaultVal = { foo: 'bar' };
    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
    const storageEventHandler: StorageEventHandler = addEventListener.mock.calls[0][1] as StorageEventHandler;
    const stringVal = JSON.stringify({ foo: 'bar2' });
    storageEventHandler(
      { storageArea: localStorage, key: 'another key', newValue: value, oldValue: stringVal },
    );
    expect(onUpdate).toHaveBeenCalledTimes(0);
  });

  it('calls on-update callback when on new value is not same as old value', () => {
    const defaultVal = { foo: 'bar' };
    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
    const storageEventHandler: StorageEventHandler = addEventListener.mock.calls[0][1] as StorageEventHandler;
    const newValue = JSON.stringify({ foo: 'bar2' });
    storageEventHandler(
      { newValue, storageArea: localStorage, key: 'key', oldValue: JSON.stringify(defaultVal) },
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('calls on-update callback with empty object if localstorage.event.newValue is not defined', () => {
    const defaultVal = { foo: 'bar' };
    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
    const storageEventHandler: StorageEventHandler = addEventListener.mock.calls[0][1] as StorageEventHandler;
    storageEventHandler({ storageArea: localStorage, key: 'key', oldValue: JSON.stringify(defaultVal) });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({}, value);
  });

  it('calls on-update callback with empty object if localstorage.event.newValue is null', () => {
    const defaultVal = { foo: 'bar' };
    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [value] = storedObservable(options);
    expect(value).toEqual(defaultVal);
    const storageEventHandler: StorageEventHandler = addEventListener.mock.calls[0][1] as StorageEventHandler;
    storageEventHandler(
      { storageArea: localStorage, key: 'key', newValue: null, oldValue: JSON.stringify(defaultVal) },
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({}, value);
  });

  it('syncs values between two storedObservables using same key and storage', () => {
    const defaultVal = { foo: 'bar' };
    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [obsOne] = storedObservable(options);
    expect(obsOne).toEqual(defaultVal);
    obsOne.foo = 'updated';
    jest.runOnlyPendingTimers();
    const [obsTwo, loadInitialValue] = storedObservable(options);
    expect(obsTwo.foo).toEqual('bar');
    loadInitialValue();
    expect(obsTwo.foo).toEqual('updated');
  });

  it('does not sync values between two storedObservables using different key but same storage', () => {
    const defaultVal = { foo: 'bar' };
    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key1', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [obsOne] = storedObservable(options);
    expect(obsOne).toEqual(defaultVal);
    obsOne.foo = 'updated';
    jest.runOnlyPendingTimers();
    const optionsTwo: StoredObservableOptions<any> =  {
      onUpdate, key: 'key2', initialValue: defaultVal, debounce: 500, storageType: 'localStorage',
    };
    const [obsTwo, loadInitialValue] = storedObservable(optionsTwo);
    expect(obsTwo.foo).toEqual('bar');
    loadInitialValue();
    expect(obsTwo.foo).toEqual('bar');
  });

  it('does not sync values between two storedObservables using same key but different storage', () => {
    const defaultVal = { foo: 'bar' };
    const onUpdate = jest.fn();
    const options: StoredObservableOptions<any> =  {
      onUpdate, key: 'key1', initialValue: defaultVal, debounce: 500, storageType: 'sessionStorage',
    };
    const [obsOne] = storedObservable(options);
    expect(obsOne).toEqual(defaultVal);
    obsOne.foo = 'updated';
    jest.runOnlyPendingTimers();
    const [obsTwo, loadInitialValue] = storedObservable({ ...options, storageType: 'localStorage' });
    expect(obsTwo.foo).toEqual('bar');
    loadInitialValue();
    expect(obsTwo.foo).toEqual('bar');
  });
});
