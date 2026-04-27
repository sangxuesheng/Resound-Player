import { runDesktopBuild } from './desktop-build-utils.mjs';

const target = process.argv[2] || 'dmg';

runDesktopBuild({
  prepareScripts: ['scripts/prepare-mac-icon.mjs'],
  builderArgs: ['--mac', target],
});
