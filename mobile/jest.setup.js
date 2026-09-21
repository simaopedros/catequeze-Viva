jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  UIImagePickerControllerQualityType: { Medium: 1 },
}));

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
