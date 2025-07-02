serve:
    rm -rf dist
    mkdir dist
    cp style.css dist/
    sed 's|https://kast-lang.github.io/kast/kast_js.bc.js|kast_js.bc.js|g' index.html > dist/index.html
    cp ~/projects/kast-lang/kast/_build/default/src/kast/js/kast_js.bc.js dist/
    caddy file-server --listen 127.0.0.1:8080 --root dist