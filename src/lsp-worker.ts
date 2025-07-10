import * as interop from './worker-interop';

const KAST_JS = import.meta.env.PROD
    ? 'https://kast-lang.github.io/kast/kast_js.bc.js'
    : '../public/kast_js.bc.js';
await import(KAST_JS);

console.log('Worker starting...');

self.onmessage = (event) => {
    console.log('worker received:', event.data);
    if (event.data.type === 'process') {
        const data = event.data as interop.ProcessMessage;
        const reply = Kast.processFile(data.uri, data.source);
        console.log('worker reply:', reply);
        self.postMessage(reply);
    }
};

const initMessage: interop.WorkerInitMessage = { type: 'init' };
self.postMessage(initMessage);
