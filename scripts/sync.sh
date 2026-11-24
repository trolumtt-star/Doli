#!/bin/sh
# Ortak uygulama kodunu (app3) www klasörüne kopyalar ve APK katmanını ekler
set -e
SRC=${1:-../app3}
rm -rf www && mkdir -p www
cp -r "$SRC/css" "$SRC/js" www/
cp native/config.js native/backend.js www/js/
sed 's#<script src="js/data.js"></script>#<script src="vendor/supabase.js"></script>\n<script src="js/config.js"></script>\n<script src="js/backend.js"></script>\n<script src="js/data.js"></script>#' "$SRC/index.html" > www/index.html
