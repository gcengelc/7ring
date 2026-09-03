// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

// server/ Node üzerinde çalışan ayrı bir servistir; node:crypto gibi çekirdek
// modüller kullandığı için mobil paketleyicinin onu hiç görmemesi gerekir.
const serverDir = path.resolve(__dirname, 'server');
config.resolver.blockList = [new RegExp(`^${escapeRegExp(serverDir)}/.*$`)];
config.watchFolders = [];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = config;
