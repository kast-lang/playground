import * as interop from './worker-interop';

const KAST_JS = import.meta.env.PROD
    ? 'https://kast-lang.github.io/kast/kast_js.bc.js'
    : '../public/kast_js.bc.js';
await import(KAST_JS);

console.log('Worker starting...');

self.onmessage = (message) => {
    console.log('worker received:', message);
    if (message.data.type === 'process') {
        const data = message.data as interop.ProcessMessage;
        const reply = Kast.processFile(data.uri, data.source);
        console.log('worker reply:', reply);
        self.postMessage(reply);
    }
};
