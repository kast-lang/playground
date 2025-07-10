import * as lsp_types from 'vscode-languageserver-types';

export interface WorkerInitNotification {
    type: 'init';
}

export interface SemanticTokensLegendRequest {
    type: 'semanticTokensLegend';
}

export interface SemanticTokensLegendResponse {
    type: 'semanticTokensLegend';
    legend: lsp_types.SemanticTokensLegend;
}

export interface SemanticTokensRequest {
    type: 'semanticTokens';
    uri: string;
}

export interface SemanticTokensResponse {
    type: 'semanticTokens';
    result: lsp_types.SemanticTokens | null;
}

export interface InlayHintsRequest {
    type: 'inlayHints';
    uri: string;
}

export interface InlayHintsResponse {
    type: 'inlayHints';
    result: lsp_types.InlayHint[] | null;
}

export interface FormatRequest {
    type: 'format';
    uri: string;
}

export interface FormatResponse {
    type: 'format';
    result: lsp_types.TextEdit[] | null;
}

export interface HoverRequest {
    type: 'hover';
    uri: string;
    position: lsp_types.Position;
}

export interface HoverResponse {
    type: 'hover';
    result: lsp_types.Hover | null;
}

export interface PrepareRenameRequest {
    type: 'prepareRename';
    uri: string;
    position: lsp_types.Position;
}

export interface PrepareRenameResponse {
    type: 'prepareRename';
    result: lsp_types.Range | null;
}

export interface RenameRequest {
    type: 'rename';
    uri: string;
    position: lsp_types.Position;
    newName: string;
}

export interface RenameResponse {
    type: 'rename';
    result: lsp_types.WorkspaceEdit | null;
}

export interface FindDefinitionRequest {
    type: 'findDefinition';
    uri: string;
    position: lsp_types.Position;
}

export interface FindDefinitionResponse {
    type: 'findDefinition';
    result: lsp_types.Location[] | null;
}

export interface UpdateFileRequest {
    type: 'updateFile';
    uri: string;
    contents: string;
}

export interface UpdateFileResponse {
    type: 'updateFile';
    diagnostics: lsp_types.Diagnostic[];
}

export interface RunRequest {
    type: 'run';
    uri: string;
    contents: string;
}

export interface OutputNotification {
    type: 'output';
    s: string;
}

export interface RunResponse {
    type: 'run';
}

export type ClientMessage =
    | SemanticTokensLegendRequest
    | SemanticTokensRequest
    | UpdateFileRequest
    | FormatRequest
    | HoverRequest
    | PrepareRenameRequest
    | RenameRequest
    | FindDefinitionRequest
    | InlayHintsRequest
    | RunRequest;

export interface ClientMessageMap {
    semanticTokensLegend: SemanticTokensLegendRequest;
    semanticTokens: SemanticTokensResponse;
    updateFile: UpdateFileRequest;
    format: FormatRequest;
    hover: HoverRequest;
    prepareRename: PrepareRenameRequest;
    rename: RenameRequest;
    findDefinition: FindDefinitionRequest;
    inlayHints: InlayHintsRequest;
    run: RunRequest;
}

export type ServerMessage =
    | WorkerInitNotification
    | SemanticTokensLegendResponse
    | SemanticTokensResponse
    | UpdateFileResponse
    | FormatResponse
    | HoverResponse
    | PrepareRenameResponse
    | RenameResponse
    | FindDefinitionResponse
    | InlayHintsResponse
    | RunResponse
    | OutputNotification;

export interface ServerMessageMap {
    init: WorkerInitNotification;
    semanticTokensLegend: SemanticTokensLegendResponse;
    semanticTokens: SemanticTokensResponse;
    updateFile: UpdateFileResponse;
    format: FormatResponse;
    hover: HoverResponse;
    prepareRename: PrepareRenameResponse;
    rename: RenameResponse;
    findDefinition: FindDefinitionResponse;
    inlayHints: InlayHintsResponse;
    run: RunResponse;
    output: OutputNotification;
}
