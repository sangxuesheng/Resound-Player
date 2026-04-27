import { runDesktopBuild } from './desktop-build-utils.mjs';

const target = process.argv[2] || 'nsis';

runDesktopBuild({
  prepareScripts: ['scripts/prepare-win-icon.mjs'],
  builderArgs: ['--win', target],
});
