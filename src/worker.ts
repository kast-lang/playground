console.log('hi from worker');

const KAST_JS = import.meta.env.PROD
    ? 'https://kast-lang.github.io/kast/kast_js.bc.js'
    : '../public/kast_js.bc.js';
await import(KAST_JS);
