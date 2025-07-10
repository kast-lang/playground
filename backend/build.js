// build.js
const esbuild = require('esbuild');

esbuild
    .build({
        entryPoints: ['./src/server.ts'],
        outfile: './dist/server.js',
        bundle: true,
        platform: 'node',
        target: 'node18',
        external: [], // put native modules like 'pg-native' here if needed
        sourcemap: false,
        minify: false,
    })
    .catch(() => process.exit(1));
