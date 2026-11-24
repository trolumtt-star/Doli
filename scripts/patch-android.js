// Android projesine kamera, mikrofon ve depolama izinlerini ekler
const fs=require('fs');
const f='android/app/src/main/AndroidManifest.xml';
let x=fs.readFileSync(f,'utf8');
const perms=['android.permission.CAMERA','android.permission.RECORD_AUDIO','android.permission.MODIFY_AUDIO_SETTINGS','android.permission.READ_MEDIA_VIDEO','android.permission.READ_MEDIA_IMAGES'];
const lines=perms.filter(p=>!x.includes(p)).map(p=>`    <uses-permission android:name="${p}" />`).join('\n');
x=x.replace('</manifest>',`${lines}\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>`);
fs.writeFileSync(f,x);
// sürüm numarası: GitHub derleme sayısı
const g='android/app/build.gradle';let b=fs.readFileSync(g,'utf8');
const n=process.env.GITHUB_RUN_NUMBER||'1';
b=b.replace(/versionCode \d+/,`versionCode ${n}`).replace(/versionName "[^"]*"/,`versionName "1.0.${n}"`);
fs.writeFileSync(g,b);
console.log('Android izinleri ve sürüm ayarlandı');
