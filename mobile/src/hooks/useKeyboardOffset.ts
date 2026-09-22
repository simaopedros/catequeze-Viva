import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, type KeyboardEvent, Platform } from 'react-native';

function offsetFromKeyboardEvent(event: KeyboardEvent): number {
  const windowHeight = Dimensions.get('window').height;
  const { screenY } = event.endCoordinates;
  return Math.max(0, windowHeight - screenY);
}

/**
 * Distância entre a base da janela e o topo do teclado (útil para barras fixas no rodapé).
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      setOffset(offsetFromKeyboardEvent(event));
    };
    const onHide = () => setOffset(0);

    const subscriptions = [Keyboard.addListener(showEvent, onShow), Keyboard.addListener(hideEvent, onHide)];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  return offset;
}
