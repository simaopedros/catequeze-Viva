jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: jest.fn(() => Promise.resolve()),
  processFontFamily: (name) => name,
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@expo-google-fonts/inter', () => ({
  useFonts: () => [true],
  Inter_400Regular: 'Inter_400Regular',
  Inter_500Medium: 'Inter_500Medium',
  Inter_600SemiBold: 'Inter_600SemiBold',
  Inter_700Bold: 'Inter_700Bold',
}));

jest.mock('@expo-google-fonts/cormorant-garamond', () => ({
  useFonts: () => [true],
  CormorantGaramond_600SemiBold: 'CormorantGaramond_600SemiBold',
  CormorantGaramond_700Bold: 'CormorantGaramond_700Bold',
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component) => Component,
      call: () => undefined,
    },
    View,
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    Easing: {},
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (value) => value,
    withSpring: (value) => value,
  };
  Mock.default.View = View;
  return Mock;
});
