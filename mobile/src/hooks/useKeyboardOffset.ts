import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, type KeyboardEvent, Platform } from 'react-native';

function offsetFromKeyboardEvent(event: KeyboardEvent): number {
  const { height, screenY } = event.endCoordinates;
  const screenHeight = Dimensions.get('screen').height;
  const windowHeight = Dimensions.get('window').height;
  const fromScreen = Math.max(0, screenHeight - screenY);
  const fromWindow = Math.max(0, windowHeight - screenY);
  return Math.max(height, fromScreen, fromWindow);
}

/**
 * Distância para elevar um rodapé fixo acima do teclado.
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      setOffset(offsetFromKeyboardEvent(event));
    };
    const onHide = () => setOffset(0);

    const subscriptions = Platform.OS === 'ios'
      ? [
          Keyboard.addListener('keyboardWillShow', onShow),
          Keyboard.addListener('keyboardWillChangeFrame', onShow),
          Keyboard.addListener('keyboardWillHide', onHide),
        ]
      : [
          Keyboard.addListener('keyboardDidShow', onShow),
          Keyboard.addListener('keyboardDidHide', onHide),
        ];

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  return offset;
}
