#!/bin/sh
# Bundles the motion code and inlines it into the page: index.src.html -> index.html
set -e
cd "$(dirname "$0")/app"
bun build src/main.ts --outfile=dist/motion.js --format=esm --target=browser --minify --external three/webgpu --external three/tsl
cd ..
python3 - <<'PY'
s = open('index.src.html').read()
js = open('app/dist/motion.js').read().replace('</script', '<\\/script')
assert '/*MOTION*/' in s
import base64
video = 'data:video/mp4;base64,' + base64.b64encode(open('nightmare.mp4', 'rb').read()).decode()
js = js.replace('__NIGHTMARE__', video)
open('index.html', 'w').write(s.replace('/*MOTION*/', js))
PY
echo built
