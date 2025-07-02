import './style.css'

import * as monaco from 'monaco-editor'
import * as lsp from 'vscode-languageserver-types'

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

function process(uri: monaco.Uri, source: string): Kast.ProcessedFileState {
    return Kast.processFile(uri.toString(), source);
}

let uri_from_str: { [index: string]: monaco.Uri } = {};
let singleFileUri: monaco.Uri | null = null;

function find_uri(_uri: string): monaco.Uri {
    return singleFileUri!;
}

let file_states: { [index: string]: Kast.ProcessedFileState } = {}
function updateState(model: monaco.editor.ITextModel) {
    const uri = model.uri;
    singleFileUri = uri;
    uri_from_str[uri.toString()] = uri;
    file_states[uri.toString()] = process(uri, model.getValue());
}

function find_state(model: monaco.editor.ITextModel): Kast.ProcessedFileState {
    const result = file_states[model.uri.toString()];
    return result;
}

monaco.languages.registerDocumentSemanticTokensProvider(
    'kast',
    {
        getLegend() {
            return Kast.semanticTokensProvider.getLegend();
        },
        provideDocumentSemanticTokens(model, _lastResultId, _token) {
            return Kast.semanticTokensProvider.provideSemanticTokens(
                find_state(model));
        },
        releaseDocumentSemanticTokens(_resultId) {

        },
    });

function to_kast_position(pos: monaco.Position): lsp.Position {
    return { line: pos.lineNumber - 1, character: pos.column - 1 };
}
function from_kast_position(pos: lsp.Position): monaco.IPosition {
    return { lineNumber: pos.line + 1, column: pos.character + 1 };
}

function from_kast_range(range: lsp.Range): monaco.IRange {
    return {
        startLineNumber: range.start.line + 1,
        startColumn: range.start.character + 1,
        endLineNumber: range.end.line + 1,
        endColumn: range.end.character + 1,
    };
}

function from_kast_text_edit({ newText, range }: lsp.TextEdit): monaco.languages.TextEdit {
    return {
        range: from_kast_range(range),
        text: newText,
    };
}

function from_kast_location({ uri, range }: lsp.Location): monaco.languages.Location {
    return {
        uri: find_uri(uri),
        range: from_kast_range(range),
    }
}

function from_kast_workspace_edit(edit: lsp.WorkspaceEdit): monaco.languages.WorkspaceEdit {
    const result = {
        edits: Object.keys(edit.changes!).flatMap(uri => {
            const resource = find_uri(uri);
            return edit.changes![uri].map(edit => ({
                resource,
                textEdit: from_kast_text_edit(edit),
                versionId: undefined,
            }));
        }
        )
    };
    console.log(result);
    return result;
}

function from_kast_inlay_hint(hint: lsp.InlayHint): monaco.languages.InlayHint {
    let label;
    if (typeof hint.label === "string") {
        label = hint.label;
    } else {
        throw "todo"
    }
    return {
        label,
        position: from_kast_position(hint.position),
        paddingLeft: hint.paddingLeft,
        paddingRight: hint.paddingRight,
        // TODO other fields
    }
}

monaco.languages.registerDocumentFormattingEditProvider(
    'kast',
    {
        provideDocumentFormattingEdits(model, _options, _token) {
            const result = Kast.lsp.format(find_state(model));
            if (result == null) return null;
            return result.map(from_kast_text_edit);
        },
    }
);

monaco.languages.registerHoverProvider('kast',
    {
        provideHover(model, position, _token, _context): monaco.languages.Hover | null {
            const result = Kast.lsp.hover(to_kast_position(position), find_state(model));
            if (result == null) return null;
            let value;
            if (typeof result.contents === "string") {
                value = result.contents
            } else { throw "todo" }
            return {
                contents: [{ value }],
                range: from_kast_range(result.range!),
            };
        },
    }
);

monaco.languages.registerRenameProvider('kast', {
    provideRenameEdits(model, position, newName, _token) {
        const result = Kast.lsp.rename(to_kast_position(position), newName, find_state(model));
        console.log(result);
        if (result == null) return null;
        return from_kast_workspace_edit(result);
    },
    resolveRenameLocation(model, position, _token): monaco.languages.RenameLocation | null {
        const result = Kast.lsp.prepareRename(to_kast_position(position), find_state(model));
        console.log(result);
        if (result == null) throw "not renamable";
        const range = from_kast_range(result);
        const text = model.getValueInRange(range);
        return {
            range,
            text,
        }
    },
});

monaco.languages.registerDefinitionProvider('kast',
    {
        provideDefinition(model, position, _token): monaco.languages.Definition | monaco.languages.LocationLink[] | null {
            const result = Kast.lsp.findDefinition(to_kast_position(position), find_state(model));
            if (result == null) return null;
            return result.map(from_kast_location);
        },
    }
);

monaco.languages.registerInlayHintsProvider('kast',
    {
        provideInlayHints(model, _range, _token): monaco.languages.InlayHintList | null {
            const result = Kast.lsp.inlayHints(find_state(model));
            if (result == null) return null;
            return {
                hints: result.map(from_kast_inlay_hint),
                dispose() {
                    // TODO maybe
                }
            };
        },
    }
);

const editor = monaco.editor.create(document.getElementById('editor')!, {
    value: originalSource,
    language: 'kast',
    "semanticHighlighting.enabled": true,
    hover: { enabled: true },
});

updateState(editor.getModel()!);
editor.getModel()?.onDidChangeContent(function (_event) {
    updateState(editor.getModel()!);
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