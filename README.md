# Mobx-stored-observable
[![Build Status](https://travis-ci.org/TomiTakussaari/mobx-stored-observable.svg?branch=master)](https://travis-ci.org/TomiTakussaari/mobx-stored-observable)
[![NPM Version](https://img.shields.io/npm/v/mobx-stored-observable)](https://www.npmjs.com/package/mobx-stored-observable)
[![Size](https://img.shields.io/bundlephobia/minzip/mobx-stored-observable)](https://bundlephobia.com/result?p=mobx-stored-observable)


Mobx Observables that are persisted in web storage (local or session storage).

Observables persisted in localStorage are synced between different browser tabs using storage events.


### Why? Examples
- Persist state between tabs (uses localStorage & storage events)
- Make state survive page refresh

### How

Example of Mobx store for session data.

It persists session state to localStorage, so browser tabs can share it.

```typescript 
import { storedObservable } from 'mobx-stored-observable';

interface StoredObservableOptions<T> {
  key: string; // key in local/sessionStorage
  initialValue?: T; // initial value
  debounce?: number; // how often is data saved to storage
  storageType?: 'localStorage' | 'sessionStorage';
  // provide if you want to handle storage update events by yourself.
  // if given, observable state is not automatically updated based on storage events 
  handleUpdateFromStorage?: (newValue: T, observable: T & IObservableObject) => void;
}

class SessionStore {

  private readonly _sessionData: SessionData;
  private readonly loadInitialValue: () => void;
  private readonly disposer: () => void;
  private readonly sessionService = new SessionService();

  constructor() {
    super();
    const initialValue: SessionData = {
      name: null,
      userId: null,
      username: null,
    };
    const storedObservableOptions: StoredObservableOptions<SessionData = { 
      initialValue, key: 'session', storageType: 'localStorage'
   };
    const { value, loadInitialValue, disposer } = storedObservable<SessionData>(
        { initialValue, key: 'session', storageType: 'localStorage'},
    );
    this._sessionData = observableValue;
    this.loadInitialValue = loadInitialValue;
    this.resolveSessionData = this.resolveSessionData.bind(this);
    this.logout = this.logout.bind(this);
    this.disposer = disposer;
  }

  public async resolveSessionStatus(): Promise<SessionData> {
    // read persisted data from storage (when app starts) if needed
    this.loadInitialValue();
    // read session from server when app starts
    const newSessionData = await this.authenticationService.getSessionData();
    this.setSessionData(newSessionData);
    return this.sessionData;
  }

  @action.bound
  private setSessionData(newData: SessionData): void {
    Object.assign(this._sessionData, newData);
  }

  public async logout(): Promise<void> {
    await sessionService.logout();
    // clear local userinfo state. Other browser tabs will logout user too. 
    this.setSessionData({ name: null, userId: null, username: null });

    // stop persiting changes to localstorage and stop listening localStorage changes
    this.disposer();
  }
  

  @computed
  public get sessionData(): SessionData {
    return this._sessionData;
  }
```

#### React
```typescript
import { runInAction } from 'mobx';
import { useObserver } from 'mobx-react-lite';
import { usePersistedStore } from 'mobx-stored-observable/react';

const TodoComponent: React.FunctionComponent<{ storageKey: string }> = ({ storageKey }) => {
  const todo = usePersistedStore({
    key: storageKey, // what key to use in DOM storage
    debounce: 1, // milliseconds, how often to persist changes to DOM storage
    storageType: 'localStorage', // or sessionStorage
    getInitialValue: () => ({
      title: 'Click to toggle',
      done: false,
      toggle(): void {
        runInAction(() => {
          this.done = this.done !== true;
        });
      },
      get isDone(): string {
        return this.done ? 'YES' : 'NO';
      },
    }),
  });
  return useObserver(() => (
    <div>
      <h3 onClick={todo.toggle}>
        {todo.title}
      </h3>
      <p>Toggled: {todo.isDone}</p>
    </div>
  ));
};

```

### Compatibility

Should work in modern browsers. LocalStorage might be disabled/unusable in private browsing modes in certain browsers.

If web storage is not usable, observables returned by this library work normally, just without local storage.

NOTE: this library uses JSON.stringify and JSON.parse to persist data to web storage, so any objects you use, should work with those.
