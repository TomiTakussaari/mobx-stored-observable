import 'jest-localstorage-mock';
import getStorage, { withStorage } from './get-web-storage';

afterEach(() => {
  jest.clearAllMocks();
});

beforeEach(() => {
  delete (process as any).browser;
});

it('returns localStorage', () => {
  const storage = getStorage('localStorage');
  expect(storage).toBe(localStorage);
});

it('runs with localStorage', () => {
  const callback = jest.fn();
  callback.mockReturnValue('42');
  const value = withStorage('localStorage', callback);
  expect(value).toBe('42');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith(localStorage);
});

it('returns sessionStorage', () => {
  const storage = getStorage('sessionStorage');
  expect(storage).toBe(sessionStorage);
});

it('runs with sessionStorage', () => {
  const callback = jest.fn();
  callback.mockReturnValue('42');
  const value = withStorage('sessionStorage', callback);
  expect(value).toBe('42');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith(sessionStorage);
});

it('does not return storage if setItem fails', () => {
  (sessionStorage.setItem as jest.Mock).mockImplementation(() => { throw new Error('testing'); });
  const storage = getStorage('sessionStorage');
  expect(storage).toBeNull();
});

it('calls noStorage callback when using withStorage but there is no storage', () => {
  (sessionStorage.setItem as jest.Mock).mockImplementation(() => { throw new Error('testing'); });
  const callback = jest.fn();
  const noStorageCallback = jest.fn();
  noStorageCallback.mockReturnValue(442);
  const value = withStorage('sessionStorage', callback, noStorageCallback);
  expect(value).toEqual(442);
  expect(callback).toHaveBeenCalledTimes(0);
  expect(noStorageCallback).toHaveBeenCalledTimes(1);
});

it('does not return storage when process.browser is false', () => {
  (process as any).browser = false;
  const storage = getStorage('sessionStorage');
  expect(storage).toBeNull();
});
