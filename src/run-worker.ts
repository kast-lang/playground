import * as interop from './worker-interop';

const KAST_JS = import.meta.env.PROD
    ? 'https://kast-lang.github.io/kast/kast_js.bc.js'
    : '../public/kast_js.bc.js';
await import(KAST_JS);

console.log('Run worker starting...');

self.onmessage = (event) => {
    console.log('Received:', event.data);
    if (event.data.type === 'run') {
        const data: interop.RunMessage = event.data;
        Kast.setOutput((s) => {
            const message: interop.OutputMessage = {
                type: 'output',
                s,
            };
            self.postMessage(message);
        });
        Kast.run(data.source);
    }
};

const initMessage: interop.WorkerInitMessage = { type: 'init' };
self.postMessage(initMessage);
