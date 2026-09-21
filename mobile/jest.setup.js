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
