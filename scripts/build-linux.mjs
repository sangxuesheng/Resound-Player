import { runDesktopBuild } from './desktop-build-utils.mjs';

const target = process.argv[2] || 'AppImage';

runDesktopBuild({
  builderArgs: ['--linux', target],
});
