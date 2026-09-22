jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: () => ({}),
    VideoView: () => React.createElement(View, { testID: 'video-view' }),
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { WebView: () => React.createElement(View, { testID: 'webview' }) };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  UIImagePickerControllerQualityType: { Medium: 1 },
}));

jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    KeyboardProvider: ({ children }) => children,
    KeyboardAvoidingView: ({ children, style }) => React.createElement(View, { style }, children),
    KeyboardStickyView: ({ children, style }) => React.createElement(View, { style }, children),
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockIcon = () => React.createElement(View, { testID: 'lucide-icon' });
  return new Proxy(
    {},
    {
      get: () => MockIcon,
    },
  );
});
