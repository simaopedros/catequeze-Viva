import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginRequest,
  endRequest,
  getNetworkActivity,
  resetNetworkActivityForTests,
  subscribeNetworkActivity,
} from '../client/networkActivity';

describe('networkActivity', () => {
  afterEach(() => resetNetworkActivityForTests());

  it('counts in-flight requests and keeps the oldest start', () => {
    const a = beginRequest();
    const first = getNetworkActivity().oldestStartedAt;
    const b = beginRequest();
    expect(getNetworkActivity().pending).toBe(2);
    expect(getNetworkActivity().oldestStartedAt).toBe(first);
    endRequest(a);
    expect(getNetworkActivity().pending).toBe(1);
    endRequest(b);
    expect(getNetworkActivity()).toEqual({ pending: 0, oldestStartedAt: null });
  });

  it('ignores unknown or repeated ids and notifies listeners', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeNetworkActivity(listener);
    const id = beginRequest();
    endRequest(id);
    endRequest(id);
    endRequest(undefined);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
