export interface ProcessRequest {
    type: 'process';
    uri: string;
    source: string;
}

export interface RunRequest {
    type: 'run';
    source: string;
}

export interface WorkerInit {
    type: 'init';
}

export interface OutputResponse {
    type: 'output';
    s: string;
}

export interface SemanticTokensLegendRequest {
    type: 'semanticTokensLegend';
}

export interface SemanticTokensLegendResponse {
    type: 'semanticTokensLegend';
    legend: Kast;
}

export type Request = ProcessRequest | RunRequest | SemanticTokensLegendRequest;

export interface RequestTagMap {
    process: ProcessRequest;
    run: RunRequest;
    semanticTokensLegend: SemanticTokensLegendRequest;
}

export type Response = WorkerInit | OutputResponse;

export interface ResponseTagMap {
    init: WorkerInit;
    process: ProcessRequest;
    run: RunRequest;
    output: OutputResponse;
    semanticTokensLegend: SemanticTokensLegendResponse;
}
