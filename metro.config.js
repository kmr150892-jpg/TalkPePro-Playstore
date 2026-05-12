const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Intha line thaan mp4 file-ah recognize panna vaikkum
config.resolver.assetExts.push('mp4'); 

module.exports = config;