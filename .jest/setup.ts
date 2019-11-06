import { configure as configureEnzyme } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import 'jest-localstorage-mock';
import { configure } from 'mobx';

configure({ enforceActions: 'observed' });
configureEnzyme({ adapter: new Adapter() });

/**
 * jest-localstorage-mock does not seem to handle all cases as of now, so lets do it ourselves...
 */
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
