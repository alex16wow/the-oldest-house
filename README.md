# The Oldest House

An interactive, responsive exploration of the Oldest House from Control.

The static site is published from the repository root using GitHub Pages.
Open `index.html` through a local HTTP server for development. `index.src.html`
and `app/src/` retain the original editable source; `index.html` includes the
prebuilt animation bundle. Original third-party license notices are retained.

Build with Node.js: run `npm ci --prefix app`, then `node build.mjs` from the
repository root. The build extracts embedded images and fonts into deduplicated
cacheable assets and writes the ready-to-publish static files.
