const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Expo SDK 54+ configures monorepo + pnpm resolution automatically.
// Manual watchFolders / nodeModulesPaths / disableHierarchicalLookup break pnpm transitive deps.
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
