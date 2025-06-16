import { Module, ModuleInitParams } from '../../types/Module';

import mainScriptUrlOrBlob from './quakespasm.js?url'
import wasm from './quakespasm.wasm?url'
import quakespasm from './quakespasm'

export const ModuleInstance = ({ ENV, reportDownloadProgress, pushMessage, canvas, onExit, ...rest }: ModuleInitParams) => {
  let module: Module;
  return quakespasm(module = <Module>{
    mainScriptUrlOrBlob: `${mainScriptUrlOrBlob}?pthread`,
    print: msg => module.printErr?.(msg),
    printErr: msg => pushMessage?.(msg),
    canvas,
    preInit: [() => {
      Object.assign(module.ENV, ENV)
    }],
    preRun: [
      () => {
        module.addRunDependency('fs-sync')
        module.FS.mkdir(`${ENV.HOME}`);
        module.FS.mount(module.FS.filesystems.IDBFS, { root: '/' }, `${ENV.HOME}`);
        module.FS.syncfs(true, err => {
          if (err) throw err;
          module.removeRunDependency('fs-sync')
        });
      },
    ],
    noInitialRun: true,
    onExit,
    locateFile: (path: string) => {
      if (path.endsWith('wasm')) return wasm;
      throw(`Unknown file[${path}] is requested by vcmiclient.js module; known urls are: ${[wasm]}`);
    },
    setStatus: (status: string | {}) => {
      if (!status) return;
      if (typeof status === 'string') {
        pushMessage(status);
        const dlProgressRE = /(?<progress>\d+)\/(?<total>\d+)/ig;
        if (!dlProgressRE.test(status)) return;
        dlProgressRE.lastIndex = 0;
        const { groups: { progress, total } } = [...status.matchAll(dlProgressRE)][0] as unknown as { groups: { progress: number, total: number } };
        reportDownloadProgress?.(Math.round(progress / total * 100));
      }
    },
    ...rest
  });
}
