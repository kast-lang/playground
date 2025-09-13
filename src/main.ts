import './style.css';

import * as monaco from 'monaco-editor';
import * as lsp from 'vscode-languageserver-types';
import { KastWorker } from './worker';

const kastWorker = await KastWorker.init();

import defaultSource from './default-source.ks?raw';

async function loadGistFromQuery(): Promise<string | null> {
    const params = new URLSearchParams(window.location.search);
    const gistId = params.get('gist');
    if (!gistId) return null;

    try {
        const res = await fetch(`https://api.github.com/gists/${gistId}`);
        const data = await res.json();
        const files = data.files;

        // Pick the first file in the gist
        return (Object.values(files) as any)[0].content;
    } catch (err) {
        console.error('Gist loading failed:', err);
        return null;
    }
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

monaco.languages.setMonarchTokensProvider('kast', {
    tokenizer: {
        root: [
            [/[a-z_$][\w$]*/, 'identifier'],
            [/\d+/, 'number'],
            [/".*?"/, 'string'],
            [/'.*?'/, 'string'],
            [/[{}()\[\]]/, '@brackets'],
            [/#.*/, 'comment'],
        ],
    },
});

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

monaco.languages.registerCompletionItemProvider('kast', {
    async provideCompletionItems(model, pos, _ctx, _token) {
        const result = await kastWorker.complete(
            model.uri.toString(),
            to_kast_position(pos),
        );
        return {
            suggestions: result.map(
                (item): monaco.languages.CompletionItem => ({
                    label: item.label,
                    insertText: item.label,
                    detail: item.detail,
                    kind: item.kind!,
                    range: {
                        startLineNumber: pos.lineNumber,
                        startColumn: pos.column,
                        endLineNumber: pos.lineNumber,
                        endColumn: pos.column,
                    },
                }),
            ),
        };
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

import '@fontsource/monaspace-neon/index.css';
await document.fonts.load("16px 'Monaspace Neon'");

const editor = monaco.editor.create(document.getElementById('editor')!, {
    value:
        (await loadGistFromQuery()) ??
        localStorage.getItem('source') ??
        defaultSource,
    language: 'kast',
    'semanticHighlighting.enabled': true,
    hover: { enabled: true },
    fontFamily: 'Monaspace Neon, monospace',
    fontLigatures:
        "'calt', 'ss01', 'ss02', 'ss03', 'ss04', 'ss05', 'ss06', 'ss07', 'ss08', 'ss09', 'liga'",
    automaticLayout: true,
});
monaco.editor.setTheme('vs-dark');

kastWorker.diantostics_handler = (uri, diagnostics) => {
    monaco.editor.setModelMarkers(
        editor.getModel()!,
        'kast',
        diagnostics.map((diagnostic) => {
            const range = from_kast_range(diagnostic.range);
            let severity: monaco.MarkerSeverity | null = null;
            switch (diagnostic.severity) {
                case 1:
                    severity = monaco.MarkerSeverity.Error;
                    break;
                case 2:
                    severity = monaco.MarkerSeverity.Warning;
                    break;
                case 3:
                    severity = monaco.MarkerSeverity.Info;
                    break;
                case 4:
                    severity = monaco.MarkerSeverity.Hint;
                    break;
                case null:
                    severity = monaco.MarkerSeverity.Error;
                    break;
            }
            return {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.endLineNumber,
                endColumn: range.endColumn,
                message: diagnostic.message,
                severity: severity!,
            };
        }),
    );
    console.log(uri, diagnostics);
};

function updateState(model: monaco.editor.ITextModel) {
    kastWorker.updateFile(model.uri.toString(), model.getValue());
}
updateState(editor.getModel()!);
editor.getModel()?.onDidChangeContent(function (_event) {
    localStorage.setItem('source', editor.getValue());
    updateState(editor.getModel()!);
});

document
    .getElementById('format-button')
    ?.addEventListener('click', function () {
        editor.getAction('editor.action.formatDocument')!.run();
    });

const output = document.getElementById('output')!;

function input(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        const container = document.getElementById('prompt-container')!;
        const label = document.getElementById('prompt-label')!;
        const input = document.getElementById(
            'prompt-input',
        ) as HTMLInputElement;

        label.textContent = prompt;
        input.value = '';
        container.style.display = 'block';
        input.focus();

        function handler(e: KeyboardEvent) {
            if (e.key === 'Enter') {
                container.style.display = 'none';
                input.removeEventListener('keydown', handler);
                resolve(input.value);
            }
        }

        input.addEventListener('keydown', handler);
    });
}

let currentRunWorker: Promise<KastWorker> | null = null;
async function run() {
    if (currentRunWorker !== null) {
        (await currentRunWorker).terminate();
    }
    document.getElementById('prompt-container')!.style.display = 'none';
    output.innerText = '';
    currentRunWorker = KastWorker.init();
    const worker = await currentRunWorker;
    const model = editor.getModel()!;
    await worker.run(
        model.uri.toString(),
        model.getValue(),
        (s) => (output.innerText += s),
        input,
    );
}
document.getElementById('run-button')!.addEventListener('click', run);

const shareResult = document.getElementById('share-result')!;
const shareButton = document.getElementById(
    'share-button',
) as HTMLButtonElement;
async function shareCode() {
    const code = editor.getValue();

    if (!code.trim()) {
        shareResult.textContent = 'Code is empty!';
        return;
    }
    const oldButtonText = shareButton.textContent;
    shareButton.disabled = true;
    shareButton.textContent = 'Sharing...';
    try {
        const res = await fetch(
            import.meta.env.PROD
                ? 'https://backend.play.kast-lang.org/share'
                : 'http://localhost:3000/share',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, filename: 'main.kast' }),
            },
        );

        if (!res.ok) throw new Error('Server error');

        const data = await res.json();

        shareResult.innerHTML = `Shared! <a href="?gist=${data.id}" target="_blank">Permalink to playground</a>`;
    } catch (err) {
        console.error(err);
        shareResult.textContent = 'Failed to share code';
    } finally {
        shareButton.disabled = false;
        shareButton.textContent = oldButtonText;
    }
}
shareButton.addEventListener('click', shareCode);
