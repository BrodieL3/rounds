const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@': path.resolve(__dirname),
};

// @posthog/core ships a webpack-bundled CJS build (dist/**/index.js) whose
// error-tracking/index.js does require("./coercers/index.js"). With Metro package
// exports, the dev server resolves that CJS ("require") condition and fails on the
// internal subpath, breaking iOS bundling in Expo Go. The ESM (.mjs) build imports
// "./coercers/index.mjs" cleanly. posthog-react-native imports only two bare
// specifiers — "@posthog/core" and "@posthog/core/surveys" — so pin those to their
// ESM entry; the rest of the chain is relative .mjs imports that resolve themselves.
// (Production `expo export` already resolved ESM, which is why only the dev server broke.)
const POSTHOG_CORE_ESM = {
  '@posthog/core': path.resolve(__dirname, 'node_modules/@posthog/core/dist/index.mjs'),
  '@posthog/core/surveys': path.resolve(
    __dirname,
    'node_modules/@posthog/core/dist/surveys/index.mjs'
  ),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const esmTarget = POSTHOG_CORE_ESM[moduleName];
  if (esmTarget) {
    return { type: 'sourceFile', filePath: esmTarget };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
