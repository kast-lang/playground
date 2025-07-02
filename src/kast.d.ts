/// <reference types="monaco-editor" />

namespace Kast {
    declare interface ProcessedFileState { }

    declare interface Lsp {
        format(state: ProcessedFileState): TextEdit[] | null
    }
    declare interface Position {
        line: number;
        character: number;
    }
    declare interface Range {
        start: Position;
        end: Position;
    }
    declare interface TextEdit {
        newText: string;
        range: Range;
    }
}

declare interface Kast {
    lsp: Kast.Lsp;
    semanticTokensProvider: {
        getLegend():
            import('monaco-editor').languages.SemanticTokensLegend;
        provideSemanticTokens(state: Kast.ProcessedFileState):
            import('monaco-editor').languages.SemanticTokens | null;
    },
    setOutput(printString: (s: string) => void);
    run(code: string);
    processFile(uri: string, source: string): Kast.ProcessedFileState;
}

declare const Kast: Kast;