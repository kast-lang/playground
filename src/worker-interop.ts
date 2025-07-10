export type ProcessMessage = {
    type: 'process';
    uri: string;
    source: string;
};

export type RunMessage = {
    type: 'run';
    source: string;
};

export type WorkerInitMessage = {
    type: 'init';
};

export type OutputMessage = {
    type: 'output';
    s: string;
};
