import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

// Execute the real TS modules with only external boundaries replaced. No test packages.
export function createHarness(overrides = {}, globals = {}) {
  const context = vm.createContext({ console, Buffer, FormData, File, URL, process, setTimeout, clearTimeout, ...globals });
  const cache = new Map();
  function synthetic(identifier, exports) {
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context, identifier });
  }
  async function load(identifier) {
    if (cache.has(identifier)) return cache.get(identifier);
    const promise = (async () => {
      if (Object.hasOwn(overrides, identifier)) return synthetic(identifier, overrides[identifier]);
      if (!path.isAbsolute(identifier)) return synthetic(identifier, await import(identifier));
      const source = await fs.readFile(identifier, 'utf8');
      const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
      const module = new vm.SourceTextModule(output.outputText, { context, identifier });
      await module.link(async (specifier, parent) => {
        let target = specifier;
        if (specifier.startsWith('.')) {
          target = path.resolve(path.dirname(parent.identifier), specifier);
          if (!path.extname(target)) {
            try { await fs.access(`${target}.ts`); target += '.ts'; }
            catch { target += '.tsx'; }
          }
        }
        return load(target);
      });
      return module;
    })();
    cache.set(identifier, promise);
    return promise;
  }
  return async (filename) => {
    const module = await load(path.resolve(filename));
    if (module.status !== 'evaluated') await module.evaluate();
    return module.namespace;
  };
}
