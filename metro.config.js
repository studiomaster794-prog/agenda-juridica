const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite usa WebAssembly no navegador.
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer, usado pelo SQLite web, requer isolamento entre origens.
config.server.enhanceMiddleware = (middleware) => {
  return (request, response, next) => {
    response.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(request, response, next);
  };
};

module.exports = config;
