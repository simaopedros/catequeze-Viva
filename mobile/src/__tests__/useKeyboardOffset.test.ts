import { act, renderHook } from '@testing-library/react-native';
import { Dimensions, Keyboard } from 'react-native';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';

describe('useKeyboardOffset', () => {
  beforeEach(() => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 390, height: 844, scale: 2, fontScale: 1 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns distance from window bottom to keyboard top on show, zero on hide', () => {
    const listeners: Record<string, (event: { endCoordinates: { screenY: number; height: number } }) => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, handler) => {
      listeners[event] = handler as (event: { endCoordinates: { screenY: number; height: number } }) => void;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useKeyboardOffset());
    expect(result.current).toBe(0);

    act(() => {
      listeners.keyboardWillChangeFrame?.({ endCoordinates: { screenY: 544, height: 300 } });
    });
    expect(result.current).toBe(300);

    act(() => {
      listeners.keyboardWillHide?.({ endCoordinates: { screenY: 844, height: 0 } });
    });
    expect(result.current).toBe(0);
  });
});
