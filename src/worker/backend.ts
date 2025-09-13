import * as interop from './interop';

const KAST_JS = import.meta.env.PROD
    ? 'https://kast-lang.github.io/kast/kast_js.bc.js'
    : '../../public/kast_js.bc.js';
await import(KAST_JS);

console.log('Worker starting...');

function respond(response: interop.ServerMessage) {
    self.postMessage(response);
}

const file_states: { [index: string]: Kast.ProcessedFileState } = {};

function find_state(uri: string): Kast.ProcessedFileState {
    return file_states[uri];
}

let currentInputResolve: ((s: string) => void) | null = null;

self.onmessage = async (event) => {
    const data: interop.ClientMessage = event.data;
    console.log('worker received:', data);
    switch (data.type) {
        case 'semanticTokensLegend': {
            respond({
                type: 'semanticTokensLegend',
                legend: Kast.semanticTokensProvider.getLegend(),
            });
            break;
        }
        case 'semanticTokens': {
            const result = Kast.semanticTokensProvider.provideSemanticTokens(
                find_state(data.uri),
            );
            respond({ type: 'semanticTokens', result });
            break;
        }
        case 'updateFile': {
            const processed = Kast.processFile(data.uri, data.contents);
            file_states[data.uri] = processed;
            const diagnostics = Kast.lsp.diagnostics(processed);
            respond({ type: 'updateFile', diagnostics });
            break;
        }
        case 'format': {
            const result = Kast.lsp.format(find_state(data.uri));
            respond({ type: 'format', result });
            break;
        }
        case 'hover': {
            const result = Kast.lsp.hover(data.position, find_state(data.uri));
            respond({ type: 'hover', result });
            break;
        }
        case 'prepareRename': {
            const result = Kast.lsp.prepareRename(
                data.position,
                find_state(data.uri),
            );
            respond({ type: 'prepareRename', result });
            break;
        }
        case 'rename': {
            const result = Kast.lsp.rename(
                data.position,
                data.newName,
                find_state(data.uri),
            );
            respond({ type: 'rename', result });
            break;
        }
        case 'findDefinition': {
            const result = Kast.lsp.findDefinition(
                data.position,
                find_state(data.uri),
            );
            respond({ type: 'findDefinition', result });
            break;
        }
        case 'inlayHints': {
            const result = Kast.lsp.inlayHints(find_state(data.uri));
            respond({ type: 'inlayHints', result });
            break;
        }
        case 'run': {
            Kast.setOutput((s) => {
                respond({ type: 'output', s });
            });
            Kast.setInput((s) => {
                respond({ type: 'input', s });
                return new Promise((resolve) => {
                    currentInputResolve = resolve;
                });
            });
            await Kast.run(data.contents);
            respond({ type: 'run' });
            break;
        }
        case 'input':
            currentInputResolve!(data.line);
            break;
        case 'complete': {
            const result = Kast.lsp.complete(
                data.position,
                find_state(data.uri),
            );
            respond({ type: 'complete', result });
            break;
        }
        default: {
            console.log('Unsupported request:', data satisfies never);
        }
    }
};

respond({ type: 'init' });
