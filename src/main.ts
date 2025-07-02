import './style.css'

import * as monaco from 'monaco-editor'

const KAST_JS = (import.meta.env.PROD)
    ? "https://kast-lang.github.io/kast/kast_js.bc.js"
    : "../public/kast_js.bc.js";
await import(KAST_JS)

const DEFAULT_SOURCE = [
    'use std.*;',
    '',
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



// TODO move this somewhere else
const editor = monaco.editor.create(document.getElementById('editor')!, {
    value: getCodeFromUrl(),
    language: 'kast'
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