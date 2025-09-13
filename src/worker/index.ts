import * as interop from './interop';
import * as lsp_types from 'vscode-languageserver-types';

class FileProcessingState {
    current: Promise<void> | null;
    queued: (() => Promise<void>) | null;
    constructor() {
        this.current = null;
        this.queued = null;
    }
    startProcessingIfNeeded() {
        if (this.current != null) {
            return;
        }
        if (this.queued == null) {
            return;
        }
        const queued = this.queued;
        this.queued = null;
        const queue = async () => {
            await queued();
            this.current = null;
            this.startProcessingIfNeeded();
        };
        this.current = queue();
    }
    async waitForAllProcessing() {
        while (this.current != null) {
            await this.current;
        }
    }
    queue(f: () => Promise<void>) {
        this.queued = f;
        this.startProcessingIfNeeded();
    }
}

export class KastWorker {
    worker: Worker;
    file_processing: FileProcessingState;
    diantostics_handler: (
        uri: string,
        diagnostics: lsp_types.Diagnostic[],
    ) => void;
    private constructor() {
        this.file_processing = new FileProcessingState();
        this.worker = new Worker(new URL('./backend.ts', import.meta.url), {
            type: 'module',
        });
        this.diantostics_handler = () => {};
    }
    static async init(): Promise<KastWorker> {
        const self = new KastWorker();
        await self.waitFor('init');
        return self;
    }
    waitFor<K extends keyof interop.ServerMessageMap>(
        response_type: K,
    ): Promise<interop.ServerMessageMap[K]> {
        return new Promise((resolve) => {
            const listener = (event: MessageEvent) => {
                if (event.data.type === response_type) {
                    resolve(event.data as interop.ServerMessageMap[K]);
                    this.worker.removeEventListener('message', listener);
                }
            };
            this.worker.addEventListener('message', listener);
        });
    }
    send(request: interop.ClientMessage) {
        this.worker.postMessage(request);
    }

    async getSemanticTokensLegend() {
        await this.file_processing.waitForAllProcessing();
        this.send({ type: 'semanticTokensLegend' });
        const response = await this.waitFor('semanticTokensLegend');
        return response.legend;
    }

    async provideSemanticTokens(uri: string) {
        await this.file_processing.waitForAllProcessing();
        this.send({ type: 'semanticTokens', uri });
        const response = await this.waitFor('semanticTokens');
        return response.result;
    }

    updateFile(uri: string, contents: string) {
        this.file_processing.queue(async () => {
            this.send({ type: 'updateFile', uri, contents });
            const response = await this.waitFor('updateFile');
            this.diantostics_handler(uri, response.diagnostics);
        });
    }

    async format(uri: string) {
        await this.file_processing.waitForAllProcessing();
        this.send({ type: 'format', uri });
        const response = await this.waitFor('format');
        return response.result;
    }

    async hover(uri: string, position: lsp_types.Position) {
        await this.file_processing.waitForAllProcessing();
        this.send({ type: 'hover', uri, position });
        const response = await this.waitFor('hover');
        return response.result;
    }

    async complete(uri: string, position: lsp_types.Position) {
        await this.file_processing.waitForAllProcessing();
        this.send({ type: 'complete', uri, position });
        const response = await this.waitFor('complete');
        return response.result;
    }

    async prepareRename(uri: string, position: lsp_types.Position) {
        await this.file_processing.waitForAllProcessing();
        this.send({ type: 'prepareRename', uri, position });
        const response = await this.waitFor('prepareRename');
        return response.result;
    }

    async rename(uri: string, position: lsp_types.Position, newName: string) {
        await this.file_processing.waitForAllProcessing();
        this.send({ type: 'rename', uri, position, newName });
        const response = await this.waitFor('rename');
        return response.result;
    }

    async findDefinition(uri: string, position: lsp_types.Position) {
        await this.file_processing.waitForAllProcessing();
        this.send({ type: 'findDefinition', uri, position });
        const response = await this.waitFor('findDefinition');
        return response.result;
    }

    async inlayHints(uri: string) {
        await this.file_processing.waitForAllProcessing();
        this.send({ type: 'inlayHints', uri });
        const response = await this.waitFor('inlayHints');
        return response.result;
    }

    async run(
        uri: string,
        contents: string,
        output_handler: (s: string) => void,
        input_handler: (s: string) => Promise<string>,
    ) {
        await this.file_processing.waitForAllProcessing();
        const message_handler = async (event: MessageEvent) => {
            const data: interop.ServerMessage = event.data;
            if (data.type === 'output') {
                output_handler(data.s);
            } else if (data.type == 'input') {
                const line = await input_handler(data.s);
                this.send({ type: 'input', line });
            }
        };
        this.worker.addEventListener('message', message_handler);
        this.send({ type: 'run', uri, contents });
        await this.waitFor('run');
        this.worker.removeEventListener('message', message_handler);
    }

    terminate() {
        this.worker.terminate();
    }
}
