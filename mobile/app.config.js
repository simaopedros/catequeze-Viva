const appJson = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      extra: {
        ...appJson.expo.extra,
        apiUrl,
      },
    },
  };
};
