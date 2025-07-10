/// <reference types="monaco-editor" />
/// <reference types="vscode-languageserver-types" />

namespace Kast {
    declare interface ProcessedFileState {}

    declare interface Lsp {
        format(
            state: ProcessedFileState,
        ): import('vscode-languageserver-types').TextEdit[] | null;
        hover(
            pos: Position,
            state: ProcessedFileState,
        ): import('vscode-languageserver-types').Hover | null;
        rename(
            pos: Position,
            newName: string,
            state: ProcessedFileState,
        ): import('vscode-languageserver-types').WorkspaceEdit | null;
        prepareRename(
            pos: Position,
            state: ProcessedFileState,
        ): import('vscode-languageserver-types').Range | null;
        findDefinition(
            pos: Position,
            state: ProcessedFileState,
        ): import('vscode-languageserver-types').Location[] | null;
        inlayHints(
            state: ProcessedFileState,
        ): import('vscode-languageserver-types').InlayHint[] | null;
        diagnostics(
            state: ProcessedFileState,
        ): import('vscode-languageserver-types').Diagnostic[];
    }
}

declare interface Kast {
    lsp: Kast.Lsp;
    semanticTokensProvider: {
        getLegend(): import('vscode-languageserver-types').SemanticTokensLegend;
        provideSemanticTokens(
            state: Kast.ProcessedFileState,
        ): import('vscode-languageserver-types').SemanticTokens | null;
    };
    setOutput(printString: (s: string) => void);
    run(code: string);
    processFile(uri: string, source: string): Kast.ProcessedFileState;
}

declare const Kast: Kast;
