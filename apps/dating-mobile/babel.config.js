module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Reanimated 4 / SDK 54 — must be last (not the deprecated reanimated/plugin).
    plugins: ['react-native-worklets/plugin'],
  };
};
