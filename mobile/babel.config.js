module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Alinhado ao Expo Go SDK 57 — evita mismatch do plugin worklets no dispositivo.
          expoUi: false,
          worklets: false,
          reanimated: false,
        },
      ],
    ],
  };
};
