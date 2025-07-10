import './style.css';

import * as monaco from 'monaco-editor';
import * as lsp from 'vscode-languageserver-types';
import * as interop from './worker-interop';
import { KastWorker } from './worker';

const kastWorker = await KastWorker.init();

import defaultSource from './default-source.ks?raw';

function getCodeFromUrl() {
    const codeParam = new URLSearchParams(window.location.search).get('code');
    return codeParam
        ? decodeURIComponent(codeParam).replace(
              /\\([nrtbfv'"\\])/g,
              (match, escapeChar: string) =>
                  ({
                      n: '\n',
                      r: '\r',
                      t: '\t',
                      b: '\b',
                      f: '\f',
                      v: '\v',
                      "'": "'",
                      '"': '"',
                      '\\': '\\',
                  })[escapeChar] || match,
          )
        : defaultSource;
}

monaco.languages.register({
    id: 'kast',
    extensions: ['.ks'],
    filenames: undefined,
    filenamePatterns: undefined,
    firstLine: undefined,
    aliases: ['Kast', 'kast'],
    mimetypes: undefined,
});

// let configuration;
// {
//     const response = await fetch("https://raw.githubusercontent.com/kast-lang/vscode-ext/refs/heads/main/language-configuration.json");
//     configuration = await response.json();
// }
monaco.languages.setLanguageConfiguration('kast', {
    comments: {
        // symbol used for single line comment. Remove this entry if your language does not support line comments
        lineComment: '#',
        // symbols used for start and end a block comment. Remove this entry if your language does not support block comments
        blockComment: ['(#', '#)'],
    },
    // symbols used as brackets
    brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
    ],
    // symbols that are auto closed when typing
    autoClosingPairs: [
        {
            open: '{',
            close: '}',
            notIn: ['string', 'comment'],
        },
        {
            open: '[',
            close: ']',
            notIn: ['string', 'comment'],
        },
        {
            open: '(',
            close: ')',
            notIn: ['string', 'comment'],
        },
    ],
    // symbols that can be used to surround a selection
    surroundingPairs: [
        {
            open: '{',
            close: '}',
        },
        {
            open: '[',
            close: ']',
        },
        {
            open: '(',
            close: ')',
        },
        {
            open: '"',
            close: '"',
        },
        {
            open: "'",
            close: "'",
        },
    ],
});

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

const semanticTokensLegend = await kastWorker.getSemanticTokensLegend();

monaco.languages.registerDocumentSemanticTokensProvider('kast', {
    getLegend() {
        return semanticTokensLegend;
    },
    async provideDocumentSemanticTokens(model, _lastResultId, _token) {
        const result = await kastWorker.provideSemanticTokens(
            model.uri.toString(),
        );
        return result as monaco.languages.SemanticTokens | null;
    },
    releaseDocumentSemanticTokens(_resultId) {},
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

function from_kast_text_edit({
    newText,
    range,
}: lsp.TextEdit): monaco.languages.TextEdit {
    return {
        range: from_kast_range(range),
        text: newText,
    };
}

function from_kast_location({
    uri,
    range,
}: lsp.Location): monaco.languages.Location {
    return {
        uri: monaco.Uri.parse(uri),
        range: from_kast_range(range),
    };
}

function from_kast_workspace_edit(
    edit: lsp.WorkspaceEdit,
): monaco.languages.WorkspaceEdit {
    const result = {
        edits: Object.keys(edit.changes!).flatMap((uri) => {
            const resource = monaco.Uri.parse(uri);
            return edit.changes![uri].map((edit) => ({
                resource,
                textEdit: from_kast_text_edit(edit),
                versionId: undefined,
            }));
        }),
    };
    console.log(result);
    return result;
}

function from_kast_inlay_hint(hint: lsp.InlayHint): monaco.languages.InlayHint {
    let label;
    if (typeof hint.label === 'string') {
        label = hint.label;
    } else {
        throw 'todo';
    }
    return {
        label,
        position: from_kast_position(hint.position),
        paddingLeft: hint.paddingLeft,
        paddingRight: hint.paddingRight,
        // TODO other fields
    };
}

monaco.languages.registerDocumentFormattingEditProvider('kast', {
    async provideDocumentFormattingEdits(
        model,
        _options,
        _token,
    ): Promise<monaco.languages.TextEdit[] | null> {
        const result = await kastWorker.format(model.uri.toString());
        if (result == null) return null;
        return result.map(from_kast_text_edit);
    },
});

monaco.languages.registerHoverProvider('kast', {
    async provideHover(
        model,
        position,
        _token,
        _context,
    ): Promise<monaco.languages.Hover | null> {
        const result = await kastWorker.hover(
            model.uri.toString(),
            to_kast_position(position),
        );
        if (result == null) return null;
        let value;
        if (typeof result.contents === 'string') {
            value = result.contents;
        } else {
            throw 'todo';
        }
        return {
            contents: [{ value }],
            range: from_kast_range(result.range!),
        };
    },
});

monaco.languages.registerRenameProvider('kast', {
    async provideRenameEdits(model, position, newName, _token) {
        const result = await kastWorker.rename(
            model.uri.toString(),
            to_kast_position(position),
            newName,
        );
        console.log(result);
        if (result == null) return null;
        return from_kast_workspace_edit(result);
    },
    async resolveRenameLocation(
        model,
        position,
        _token,
    ): Promise<monaco.languages.RenameLocation | null> {
        const result = await kastWorker.prepareRename(
            model.uri.toString(),
            to_kast_position(position),
        );
        console.log(result);
        if (result == null) throw 'not renamable';
        const range = from_kast_range(result);
        const text = model.getValueInRange(range);
        return {
            range,
            text,
        };
    },
});

monaco.languages.registerDefinitionProvider('kast', {
    async provideDefinition(
        model,
        position,
        _token,
    ): Promise<
        monaco.languages.Definition | monaco.languages.LocationLink[] | null
    > {
        const result = await kastWorker.findDefinition(
            model.uri.toString(),
            to_kast_position(position),
        );
        if (result == null) return null;
        return result.map(from_kast_location);
    },
});

monaco.languages.registerInlayHintsProvider('kast', {
    async provideInlayHints(
        model,
        _range,
        _token,
    ): Promise<monaco.languages.InlayHintList | null> {
        const result = await kastWorker.inlayHints(model.uri.toString());
        if (result == null) return null;
        return {
            hints: result.map(from_kast_inlay_hint),
            dispose() {
                // TODO maybe
            },
        };
    },
});

const editor = monaco.editor.create(document.getElementById('editor')!, {
    value: originalSource,
    language: 'kast',
    'semanticHighlighting.enabled': true,
    hover: { enabled: true },
});

function updateState(model: monaco.editor.ITextModel) {
    kastWorker.updateFile(model.uri.toString(), model.getValue());
}
updateState(editor.getModel()!);
editor.getModel()?.onDidChangeContent(function (_event) {
    updateState(editor.getModel()!);
});

document
    .getElementById('format-button')
    ?.addEventListener('click', function () {
        editor.getAction('editor.action.formatDocument')!.run();
    });

const output = document.getElementById('output')!;

let currentRunWorker: Promise<KastWorker> | null = null;
async function run() {
    if (currentRunWorker !== null) {
        (await currentRunWorker).terminate();
    }
    output.innerText = '';
    currentRunWorker = KastWorker.init();
    const worker = await currentRunWorker;
    const model = editor.getModel()!;
    await worker.run(
        model.uri.toString(),
        model.getValue(),
        (s) => (output.innerText += s),
    );
}

function shareCode() {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('code', editor.getValue());
    const shareUrl = currentUrl.toString();

    // Copy to clipboard
    navigator.clipboard
        .writeText(shareUrl)
        .then(() => alert('Copied to clipboard'))
        .catch((err) => {
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

document.getElementById('share-button')!.addEventListener('click', shareCode);
document.getElementById('run-button')!.addEventListener('click', run);
