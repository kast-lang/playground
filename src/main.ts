import './style.css'

import * as monaco from 'monaco-editor'

const KAST_JS = (import.meta.env.PROD)
    ? "https://kast-lang.github.io/kast/kast_js.bc.js"
    : "../public/kast_js.bc.js";
await import(KAST_JS)

const DEFAULT_SOURCE = [
    // 'use std.*;',
    // '',
    'print "hello, world";'
].join('\n');

function getCodeFromUrl() {
    const codeParam = new URLSearchParams(window.location.search).get('code');
    return codeParam ?
        decodeURIComponent(codeParam).replace(/\\([nrtbfv'"\\])/g, (match, escapeChar: string) => ({
            'n': '\n',
            'r': '\r',
            't': '\t',
            'b': '\b',
            'f': '\f',
            'v': '\v',
            "'": "'",
            '"': '"',
            '\\': '\\'
        })[escapeChar] || match) :
        DEFAULT_SOURCE;
}

monaco.languages.register({
    id: "kast",
    extensions: [".ks"],
    filenames: undefined,
    filenamePatterns: undefined,
    firstLine: undefined,
    aliases: [
        "Kast",
        "kast"
    ],
    mimetypes: undefined,
});

// let configuration;
// {
//     const response = await fetch("https://raw.githubusercontent.com/kast-lang/vscode-ext/refs/heads/main/language-configuration.json");
//     configuration = await response.json();
// }
monaco.languages.setLanguageConfiguration('kast',
    {
        "comments": {
            // symbol used for single line comment. Remove this entry if your language does not support line comments
            "lineComment": "#",
            // symbols used for start and end a block comment. Remove this entry if your language does not support block comments
            "blockComment": [
                "(#",
                "#)"
            ]
        },
        // symbols used as brackets
        "brackets": [
            [
                "{",
                "}"
            ],
            [
                "[",
                "]"
            ],
            [
                "(",
                ")"
            ]
        ],
        // symbols that are auto closed when typing
        "autoClosingPairs": [
            {
                "open": "{",
                "close": "}",
                "notIn": [
                    "string",
                    "comment"
                ],
            },
            {
                "open": "[",
                "close": "]",
                "notIn": [
                    "string",
                    "comment"
                ],
            },
            {
                "open": "(",
                "close": ")",
                "notIn": [
                    "string",
                    "comment"
                ],
            }
        ],
        // symbols that can be used to surround a selection
        "surroundingPairs": [
            {
                open: "{",
                close: "}",
            },
            {
                open: "[",
                close: "]",
            },
            {
                open: "(",
                close: ")",
            },
            {
                open: "\"",
                close: "\"",
            },
            {
                open: "'",
                close: "'",
            },
        ],
    }
);

// monaco.languages.setMonarchTokensProvider('kast', {
//     tokenizer: {
//         root: [
//             [/[a-z_$][\w$]*/, 'identifier'],
//             [/\d+/, 'number'],
//             [/".*?"/, 'string'],
//             [/[{}()\[\]]/, '@brackets'],
//             [/\/\/.*/, 'comment'],
//         ],
//     },
// });

const originalSource = getCodeFromUrl();

function process(source: string): Kast.ProcessedFileState {
    return Kast.processFile("file", source);
}

let state: Kast.ProcessedFileState = process(originalSource);
function updateState(source: string) {
    state = process(source);
}

monaco.languages.registerDocumentSemanticTokensProvider(
    'kast',
    {
        getLegend() {
            return Kast.semanticTokensProvider.getLegend();
        },
        provideDocumentSemanticTokens(model, lastResultId, token) {
            return Kast.semanticTokensProvider.provideSemanticTokens(state);
        },
        releaseDocumentSemanticTokens(resultId) {

        },
    });

function to_kast_position(pos: monaco.Position): Kast.Position {
    return { line: pos.lineNumber - 1, character: pos.column - 1 }
}

function from_kast_range(range: Kast.Range): monaco.IRange {
    return {
        startLineNumber: range.start.line + 1,
        startColumn: range.start.character + 1,
        endLineNumber: range.end.line + 1,
        endColumn: range.end.character + 1,
    };
}

monaco.languages.registerDocumentFormattingEditProvider(
    'kast',
    {
        provideDocumentFormattingEdits(model, options, token) {
            const result = Kast.lsp.format(state);
            if (result == null) return null;
            return result.map(({ newText, range }) => ({
                range: from_kast_range(range),
                text: newText,
            }));
        },
    }
);

monaco.languages.registerHoverProvider('kast',
    {
        provideHover(model, position, token, context) {
            const result = Kast.lsp.hover(to_kast_position(position), state);
            if (result == null) return null;
            return {
                contents: [{ value: result.contents }],
                range: from_kast_range(result.range),
            }
        },
    }
)

const editor = monaco.editor.create(document.getElementById('editor')!, {
    value: originalSource,
    language: 'kast',
    "semanticHighlighting.enabled": true,
    hover: { enabled: true },
});
editor.getModel()?.onDidChangeContent(function (event) {
    updateState(editor.getValue());
});

document.getElementById("format-button")?.addEventListener("click", function () {
    editor.getAction('editor.action.formatDocument')!.run();
});

const output = document.getElementById("output")!;
Kast.setOutput(function (s) {
    output.innerText += s;
});

function run() {
    output.innerText = "";
    Kast.run(editor.getValue());
}

function shareCode() {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('code', editor.getValue());
    const shareUrl = currentUrl.toString();

    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => alert('Copied to clipboard')).catch(err => {
        console.error(err);
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Copied to clipboard');
    });
    window.history.pushState({}, '', currentUrl);
}

document.getElementById("share-button")!.addEventListener("click", shareCode);
document.getElementById("run-button")!.addEventListener("click", run);