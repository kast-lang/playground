/// <reference types="monaco-editor" />

declare interface ProcessedFileState { }

declare interface Kast {
    semanticTokensProvider: {
        getLegend():
            import('monaco-editor').languages.SemanticTokensLegend;
        provideSemanticTokens(state: ProcessedFileState):
            import('monaco-editor').languages.SemanticTokens | null;
    },
    setOutput(printString: (s: string) => void);
    run(code: string);
    processFile(uri: string, source: string): ProcessedFileState;
}

declare const Kast: Kast;