#!/bin/bash
# Builds the web app into web/dist. Needs only bash and node.
cd "$(dirname "$0")"
SRC="src/data.js src/persist.js src/ui.js src/geo.js src/forms.js src/vessel.js src/views1.js src/views2.js src/views3.js src/importer.js src/manage.js src/field.js src/app.js"
rm -rf dist; mkdir -p dist; cp public/* dist/ 2>/dev/null
cat $SRC > dist/app.js
cp src/styles.css dist/styles.css
V=$(date +%s); sed -i "s/__V__/$V/" dist/sw.js
echo built $(wc -c < dist/app.js) bytes
