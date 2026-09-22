module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Evita plugins extra do @expo/ui que puxam worklets com versão diferente no Expo Go.
          expoUi: false,
        },
      ],
    ],
  };
};
