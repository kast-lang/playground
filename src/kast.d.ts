/// <reference types="monaco-editor" />
/// <reference types="vscode-languageserver-types" />

namespace Kast {
    declare interface ProcessedFileState { }

    declare interface Lsp {
        format(state: ProcessedFileState):
            import('vscode-languageserver-types').TextEdit[] | null
        hover(pos: Position, state: ProcessedFileState):
            import('vscode-languageserver-types').Hover | null
        rename(pos: Position, newName: string, state: ProcessedFileState):
            import('vscode-languageserver-types').WorkspaceEdit | null
        prepareRename(pos: Position, state: ProcessedFileState):
            import('vscode-languageserver-types').Range | null
        findDefinition(pos: Position, state: ProcessedFileState):
            import('vscode-languageserver-types').Location[] | null
        inlayHints(state: ProcessedFileState):
            import('vscode-languageserver-types').InlayHint[] | null
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