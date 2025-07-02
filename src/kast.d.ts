
declare interface Kast {
    setOutput(printString: (s: string) => void);
    run(code: string);
}

declare const Kast: Kast; 