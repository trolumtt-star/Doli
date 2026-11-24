// supabase-js tarayıcı paketini www/vendor içine kopyalar
const fs=require('fs');const path=require('path');
const src=path.join('node_modules','@supabase','supabase-js','dist','umd','supabase.js');
fs.mkdirSync(path.join('www','vendor'),{recursive:true});
fs.copyFileSync(src,path.join('www','vendor','supabase.js'));
console.log('supabase.js kopyalandı');
