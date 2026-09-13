jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VideoView: (props) => React.createElement(View, { testID: props.testID || 'short-video' }),
    useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn(), loop: true, muted: true }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 12, bottom: 12, left: 0, right: 0 }),
  };
});
