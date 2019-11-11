import { mount } from 'enzyme';
import { runInAction } from 'mobx';
import { useObserver } from 'mobx-react-lite';
import React from 'react';
import { usePersistedStore } from './';

const TestingComponent: React.FunctionComponent<{ storageKey: string }> = ({ storageKey }) => {
  const todo = usePersistedStore({
    key: storageKey,
    debounce: 1,
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

let addEventListener: jest.Mock;
let removeEventListener: jest.Mock;

beforeEach(() => {
  addEventListener = window.addEventListener = jest.fn();
  removeEventListener = window.removeEventListener = jest.fn();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  jest.clearAllMocks();
});

it('renders component and modifies state', () => {
  const wrapper = mount(<TestingComponent storageKey="foobar"/>);
  expect(wrapper.find('h3').text()).toEqual('Click to toggle');
  expect(wrapper.find('p').text()).toEqual('Toggled: NO');
  wrapper.find('h3').simulate('click');
  expect(wrapper.find('p').text()).toEqual('Toggled: YES');
  wrapper.find('h3').simulate('click');
  expect(wrapper.find('p').text()).toEqual('Toggled: NO');
});

it('shares state between multiple components with same key', async () => {
  const wrapperOne = mount(<TestingComponent storageKey="barfoo"/>);
  expect(wrapperOne.find('p').text()).toEqual('Toggled: NO');
  wrapperOne.find('h3').simulate('click');
  expect(wrapperOne.find('p').text()).toEqual('Toggled: YES');
  await waitForLocalStorageUpdates();
  const wrapperTwo = mount(<TestingComponent storageKey="barfoo"/>);
  expect(wrapperTwo.find('p').text()).toEqual('Toggled: YES');
});

it('does not share state between multiple components with different key', async () => {
  const wrapperOne = mount(<TestingComponent storageKey="keyOne"/>);
  expect(wrapperOne.find('p').text()).toEqual('Toggled: NO');
  wrapperOne.find('h3').simulate('click');
  expect(wrapperOne.find('p').text()).toEqual('Toggled: YES');
  await waitForLocalStorageUpdates();
  const wrapperTwo = mount(<TestingComponent storageKey="keyTwo"/>);
  expect(wrapperTwo.find('p').text()).toEqual('Toggled: NO');
});

it('creates storage event listener on mount and removes it on unmount', async () => {
  const wrapper = mount(<TestingComponent storageKey="keyOne"/>);
  expect(addEventListener).toHaveBeenCalledWith('storage', expect.any(Function), false);
  expect(removeEventListener).not.toHaveBeenCalledWith('storage', expect.any(Function), expect.anything());
  wrapper.unmount();
  expect(removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function), false);
});

async function waitForLocalStorageUpdates(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 10));
}
