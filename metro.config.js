const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'tflite', 'bin'],
    extraNodeModules: {
      pako: require.resolve('pako/dist/pako.min.js'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
