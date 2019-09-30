# Mobx-stored-observable
[![Build Status](https://travis-ci.org/TomiTakussaari/mobx-stored-observable.svg?branch=master)](https://travis-ci.org/TomiTakussaari/mobx-stored-observable)
[![NPM Version](https://img.shields.io/npm/v/mobx-stored-observable)]()
[![Size](https://img.shields.io/bundlephobia/minzip/mobx-stored-observable)]()


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

    // stop persiting changes to localstorage, and tracking changes
    this.disposer();
  }
  

  @computed
  public get sessionData(): SessionData {
    return this._sessionData;
  }
```

### Compatibility

Should work in modern browsers. LocalStorage might be disabled/unusable in private browsing modes in certain browsers.

If web storage is not usable, observables returned by this library work normally, just without local storage.

NOTE: this library uses JSON.stringify and JSON.parse to persist data to web storage, so any objects you use, should work with those.
