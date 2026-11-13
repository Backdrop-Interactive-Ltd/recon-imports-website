import fs from 'node:fs';
import { resolve, relative, isAbsolute, dirname } from 'node:path';
import { syncBuiltinESMExports } from 'node:module';

// OpenNext recreates Turbopack directory links without specifying their type.
// Windows junctions preserve directory-link semantics without symlink privilege.
// Scope the workaround strictly to generated adapter output in our staging copy.
if (process.platform === 'win32' && process.env.RECON_WORKERS_BUILD === '1') {
  const original = fs.symlinkSync;
  const standalone = resolve('.next/standalone');
  const output = resolve('.open-next');
  function inside(parent, target) {
    const part = relative(parent, target);
    return part !== '' && !part.startsWith('..') && !isAbsolute(part);
  }
  fs.symlinkSync = function (target, destination, type) {
    const source = isAbsolute(target) ? target : resolve(dirname(destination), target);
    if (type === undefined && inside(standalone, source) && inside(output, resolve(destination)) && fs.statSync(source).isDirectory()) {
      return original(source, destination, 'junction');
    }
    return original(target, destination, type);
  };
  syncBuiltinESMExports();
}
