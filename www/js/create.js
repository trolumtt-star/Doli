"use strict";
/* ================================================================
   OLUŞTURMA: kamera → düzenleyici → paylaşım
   ================================================================ */
const CAM={stream:null,facing:'user',torch:false,timer:0,mode:'60',rec:null,chunks:[],t0:0,raf:0,shots:[],filter:'none',refVid:null,sndVid:null};
const MODES=[['photo','Fotoğraf'],['15','15 sn'],['60','60 sn'],['180','3 dk']];
function openUpload(opts){
  if(needAccount())return;
  if(opts||(!UP.busy&&!UP.file&&!UP.files.length&&!UP.assetId))resetUP(opts||{});
  closeSheet();
  if(currentScreen()==='home'&&active>=0&&!paused)togglePause(cur());
  const L=$('#createLayer');L.classList.add('on');
  if(UP.url||UP.urls.length)return showEdit();
  showCapture();
}
function closeCreate(){camStop();const L=$('#createLayer');L.classList.remove('on');L.innerHTML='';if(CAM.refVid)CAM.refVid=null}
function openDraft(id){
  const u=D.myUploads[id];if(!u)return;
  resetUP({draftId:id,mode:u.type||'video',assetId:u.assetId,assetIds:u.assetIds,thumbId:u.thumbId,url:blobUrl(u.assetId),urls:(u.assetIds||[]).map(blobUrl),cap:u.cap||'',cat:u.cat,game:u.game,
    filter:(u.edit&&u.edit.filter)||'none',texts:(u.edit&&u.edit.texts)||[],speed:(u.edit&&u.edit.speed)||1,duetOf:u.duetOf,stitchOf:u.stitchOf,stitchSec:u.stitchSec||5,soundOf:u.soundOf,replyTo:u.replyTo,
    addYours:u.addYours||'',aiLabel:!!u.aiLabel,productId:u.productId,playlistId:u.playlistId,dur:u.dur,thumbUrl:blobUrl(u.thumbId)});
  closeSheet();$('#createLayer').classList.add('on');showEdit();
}
const camIcon={
 flip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><path d="M9 13a3 3 0 0 1 5-2.2M15 13a3 3 0 0 1-5 2.2M14 9v2h-2M10 17v-2h2"/></svg>',
 flash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
 timer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>',
 filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="5.5"/><circle cx="15" cy="9" r="5.5"/><circle cx="12" cy="15" r="5.5"/></svg>',
 text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 6V4h14v2M12 4v16M9 20h6"/></svg>',
 x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 img:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
};

/* ---------------- 1. kamera ---------------- */
async function camStart(){
  camStop(true);
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('nocam');
  CAM.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:CAM.facing,width:{ideal:1080},height:{ideal:1920}},audio:CAM.mode!=='photo'});
  const v=$('#camVideo');if(v){v.srcObject=CAM.stream;v.classList.toggle('mirror',CAM.facing==='user');await v.play().catch(()=>{})}
}
function camStop(keepUI){
  if(CAM.rec&&CAM.rec.state!=='inactive'){try{CAM.rec.onstop=null;CAM.rec.stop()}catch{}}
  cancelAnimationFrame(CAM.raf);
  if(CAM.stream){CAM.stream.getTracks().forEach(t=>t.stop());CAM.stream=null}
  if(CAM.sndVid)CAM.sndVid.pause();if(CAM.refVid)CAM.refVid.pause();
}
function showCapture(){
  const L=$('#createLayer');const ref=UP.duetOf&&vById(UP.duetOf);const snd=UP.soundOf&&vById(UP.soundOf);
  const photo=CAM.mode==='photo';
  L.innerHTML=`<div class="cam-stage ${ref?'duet':''}" id="camStage">
     ${ref?`<div>${ref.real?`<video id="refVid" src="${esc(ref.src)}" playsinline style="width:100%;height:100%;object-fit:cover"></video>`:sceneHTML(ref)}</div><div>`:''}
     <video id="camVideo" class="f-${CAM.filter}" playsinline muted autoplay></video>${ref?'</div>':''}
   </div>
   <div class="cam-msg" id="camMsg" hidden></div>
   <div class="cam-top">
     <button class="cam-x" aria-label="Kapat" onclick="closeCreate()">${camIcon.x}</button>
     <div class="cam-tools">
       <button class="cam-tool" onclick="camFlip()"><span class="ic">${camIcon.flip}</span>Çevir</button>
       <button class="cam-tool" aria-pressed="${CAM.torch}" onclick="camTorch()"><span class="ic">${camIcon.flash}</span>Flaş</button>
       <button class="cam-tool" aria-pressed="${!!CAM.timer}" onclick="CAM.timer=CAM.timer===0?3:CAM.timer===3?10:0;showCapture()"><span class="ic">${CAM.timer?`<b style="font-size:15px">${CAM.timer}</b>`:camIcon.timer}</span>Zamanlayıcı</button>
       <button class="cam-tool" aria-pressed="${CAM.filter!=='none'}" onclick="$('#camFilters').hidden=!$('#camFilters').hidden"><span class="ic">${camIcon.filter}</span>Filtre</button>
     </div>
   </div>
   ${snd?`<div class="cam-sound">${I.note} ${esc(snd.sound)}</div>${snd.real?`<video id="sndVid" src="${esc(snd.src)}" playsinline style="display:none"></video>`:''}`:''}
   ${UP.stitchOf?`<div class="cam-sound">Stitch: ilk ${UP.stitchSec} sn orijinalden</div>`:''}
   ${CAM.shots.length?`<div class="shots">${CAM.shots.slice(-4).map(s=>`<img src="${s.url}" alt="">`).join('')}</div>`:''}
   <div class="cam-bottom">
     <div class="cam-filters" id="camFilters" hidden>${FILTERS.map(([k,n])=>`<button aria-pressed="${CAM.filter===k}" onclick="CAM.filter='${k}';$('#camVideo').className='f-${k}'+(CAM.facing==='user'?' mirror':'');$$('#camFilters button').forEach(b=>b.setAttribute('aria-pressed',b===this))">${n}</button>`).join('')}</div>
     <div class="cam-row">
       <label class="gal" aria-label="Galeriden seç"><input type="file" class="sr" id="galIn" ${photo?'accept="image/*" multiple':'accept="video/*,image/*" multiple'}>${camIcon.img}</label>
       <button class="rec ${photo?'photo':''}" id="recBtn" aria-label="${photo?'Fotoğraf çek':'Kaydı başlat'}" onclick="camShutter()"><svg class="ring" viewBox="0 0 84 84"><circle cx="42" cy="42" r="38" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="5"/><circle id="recRing" cx="42" cy="42" r="38" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="238.8" stroke-dashoffset="238.8" stroke-linecap="round"/></svg><span class="core"></span></button>
       ${photo&&CAM.shots.length?`<button class="btn sm" style="background:#fff;color:#000;width:64px" onclick="photosDone()">İleri</button>`:'<span style="width:46px"></span>'}
     </div>
     ${UP.duetOf||UP.stitchOf?'':`<div class="modes">${MODES.map(([k,n])=>`<button aria-pressed="${CAM.mode===k}" onclick="camMode('${k}')">${n}</button>`).join('')}</div>`}
   </div>`;
  $('#galIn').onchange=e=>galleryPick([...e.target.files]);
  CAM.refVid=$('#refVid');CAM.sndVid=$('#sndVid');
  camStart().then(()=>{$('#camMsg').hidden=true}).catch(e=>{
    const m=$('#camMsg');m.hidden=false;
    m.innerHTML=`<h3>Kamera açılamadı</h3><p>${e&&e.name==='NotAllowedError'?'Kamera izni verilmedi. Telefonunun ayarlarından uygulamaya kamera ve mikrofon izni ver.':'Bu ekranda kamera kullanılamıyor. Galeriden video veya fotoğraf seçebilirsin.'}</p><label class="btn primary"><input type="file" class="sr" accept="video/*,image/*" multiple onchange="galleryPick([...this.files])">Galeriden seç</label>`;
  });
}
function camMode(k){if(CAM.rec)return;CAM.mode=k;if(k!=='photo')CAM.shots=[];showCapture()}
function camFlip(){if(CAM.rec)return;CAM.facing=CAM.facing==='user'?'environment':'user';CAM.torch=false;showCapture()}
async function camTorch(){
  const t=CAM.stream&&CAM.stream.getVideoTracks()[0];
  const caps=t&&t.getCapabilities?t.getCapabilities():{};
  if(!caps.torch)return toast(CAM.facing==='user'?'Ön kamerada flaş yok':'Bu cihaz flaşı desteklemiyor');
  CAM.torch=!CAM.torch;try{await t.applyConstraints({advanced:[{torch:CAM.torch}]})}catch{}
  $$('.cam-tool')[1].setAttribute('aria-pressed',CAM.torch);
}
async function countdown(n){
  if(!n)return;const c=document.createElement('div');c.className='countdown';$('#createLayer').appendChild(c);
  for(let i=n;i>0;i--){c.textContent=i;await new Promise(r=>setTimeout(r,1000))}c.remove();
}
async function camShutter(){
  if(!CAM.stream)return toast('Kamera hazır değil');
  if(CAM.mode==='photo')return takePhoto();
  if(CAM.rec&&CAM.rec.state==='recording')return CAM.rec.stop();
  await countdown(CAM.timer);
  const types=['video/mp4;codecs=avc1,mp4a','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  const mime=types.find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t))||'';
  try{CAM.rec=new MediaRecorder(CAM.stream,{mimeType:mime||undefined,videoBitsPerSecond:2200000})}catch{return toast('Bu cihazda kayıt yapılamıyor')}
  CAM.chunks=[];CAM.rec.ondataavailable=e=>{if(e.data&&e.data.size)CAM.chunks.push(e.data)};
  CAM.rec.onstop=()=>{
    cancelAnimationFrame(CAM.raf);const type=(CAM.rec.mimeType||'video/webm').split(';')[0];
    const blob=new Blob(CAM.chunks,{type});const ext=type.includes('mp4')?'mp4':'webm';
    const dur=(performance.now()-CAM.t0)/1000;CAM.rec=null;
    if(CAM.refVid)CAM.refVid.pause();if(CAM.sndVid)CAM.sndVid.pause();
    if(dur<1)return toast('Kayıt çok kısa'),showCapture();
    const file=new File([blob],`kayit-${Date.now()}.${ext}`,{type});
    camStop();UP.mode='video';UP.filter=CAM.filter;setVideoFile(file,dur);
  };
  if(CAM.refVid){CAM.refVid.currentTime=0;CAM.refVid.muted=false;CAM.refVid.play().catch(()=>{})}
  if(CAM.sndVid){CAM.sndVid.currentTime=0;CAM.sndVid.play().catch(()=>{})}
  CAM.rec.start(500);CAM.t0=performance.now();
  $('#recBtn').classList.add('on');$('#recBtn').setAttribute('aria-label','Kaydı durdur');
  $$('.modes,.gal,.cam-tools').forEach(e=>e.style.visibility='hidden');
  const tm=document.createElement('div');tm.className='rec-time';tm.id='recTime';$('#createLayer').appendChild(tm);
  const max=(UP.duetOf&&CAM.refVid&&CAM.refVid.duration)?Math.min(180,CAM.refVid.duration):+CAM.mode;
  const ring=$('#recRing');
  const loop=()=>{const e=(performance.now()-CAM.t0)/1000;ring.style.strokeDashoffset=238.8*(1-Math.min(1,e/max));tm.textContent=`${Math.floor(e/60)}:${String(Math.floor(e%60)).padStart(2,'0')} / ${Math.floor(max/60)}:${String(Math.round(max%60)).padStart(2,'0')}`;
    if(e>=max&&CAM.rec&&CAM.rec.state==='recording')CAM.rec.stop();else CAM.raf=requestAnimationFrame(loop)};loop();
}
async function takePhoto(){
  await countdown(CAM.timer);
  const v=$('#camVideo');if(!v.videoWidth)return;
  const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');
  if(CAM.facing==='user'){x.translate(c.width,0);x.scale(-1,1)}
  x.filter=getComputedStyle(v).filter||'none';x.drawImage(v,0,0);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));
  const f=new File([blob],`foto-${Date.now()}.jpg`,{type:'image/jpeg'});CAM.shots.push({file:f,url:URL.createObjectURL(f)});
  if(CAM.shots.length>=10)return photosDone();
  showCapture();toast(`${CAM.shots.length}. fotoğraf çekildi`);
}
function photosDone(){EDP=null;camStop();UP.mode='photos';UP.files=CAM.shots.map(s=>s.file);UP.urls=CAM.shots.map(s=>s.url);UP.assetIds=null;CAM.shots=[];showEdit()}
async function galleryPick(fs){
  if(!fs.length)return;
  const vids=fs.filter(f=>f.type.startsWith('video/')),imgs=fs.filter(f=>f.type.startsWith('image/'));
  if(vids.length){const f=vids[0];if(f.size>CFG.maxMB*1048576)return toast(`Video ${CFG.maxMB} MB'tan büyük`);camStop();UP.mode='video';setVideoFile(f)}
  else if(imgs.length){if(imgs.some(f=>f.size>CFG.maxMB*1048576))return toast(`Fotoğraflar en fazla ${CFG.maxMB} MB olabilir`);camStop();UP.mode='photos';UP.files=imgs.slice(0,10);UP.urls=UP.files.map(f=>URL.createObjectURL(f));UP.assetIds=null;showEdit()}
  else toast('Video ya da fotoğraf seç');
}
async function setVideoFile(f,dur){
  EDP=null;
  if(f.size>CFG.maxMB*1048576){toast(`Video ${CFG.maxMB} MB'tan büyük. Daha kısa çek.`);return showCapture()}
  UP.file=f;UP.url=URL.createObjectURL(f);UP.assetId=null;UP.dur=dur||null;
  try{const r=await grabFrames(UP.url,[.5]);UP.dur=r.dur&&isFinite(r.dur)?r.dur:UP.dur;UP.thumbUrl=r.frames[0].toDataURL('image/jpeg',.6)}catch{}
  showEdit();
}

/* ---------------- 2. düzenleyici ---------------- */
let EDP=null;
function showEdit(){
  const L=$('#createLayer');const fc='f-'+UP.filter;
  const media=UP.mode==='photos'?`<div class="carousel ${fc}" id="edCar">${UP.urls.map(u=>`<img src="${u}" alt="">`).join('')}</div>${UP.urls.length>1?`<div class="dots">${UP.urls.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div>`:''}`
    :`<video id="edVid" class="${fc}" src="${UP.url}" autoplay loop playsinline ${UI.muted?'muted':''}></video>`;
  L.innerHTML=`<div class="ed-full" id="edStage">${media}${UP.texts.map((t,i)=>`<div class="overlay-text ${t.style==='bg'?'bg':'sh'}" data-ti="${i}" style="left:${t.x}%;top:${t.y}%">${esc(t.t)}</div>`).join('')}</div>
   <div class="cam-top"><button class="cam-x" aria-label="Geri" onclick="editBack()">${I.backArrow}</button>
    <div class="cam-tools">
     <button class="cam-tool" onclick="textPop()"><span class="ic">${camIcon.text}</span>Yazı</button>
     <button class="cam-tool" aria-pressed="${EDP==='filter'}" onclick="EDP=EDP==='filter'?null:'filter';showEdit()"><span class="ic">${camIcon.filter}</span>Filtre</button>
     ${UP.mode==='video'?`<button class="cam-tool" aria-pressed="${EDP==='speed'}" onclick="EDP=EDP==='speed'?null:'speed';showEdit()"><span class="ic">${I.speed}</span>Hız</button>
     <button class="cam-tool" onclick="UI.muted=!UI.muted;$('#edVid').muted=UI.muted;this.querySelector('.ic').innerHTML=UI.muted?I.volOff:I.volOn"><span class="ic">${UI.muted?I.volOff:I.volOn}</span>Ses</button>`:''}
     ${UP.stitchOf?`<button class="cam-tool" aria-pressed="${EDP==='stitch'}" onclick="EDP=EDP==='stitch'?null:'stitch';showEdit()"><span class="ic"><b>${UP.stitchSec}s</b></span>Stitch</button>`:''}
    </div></div>
   ${EDP?`<div class="ed-panel"><div class="cam-filters">${EDP==='filter'?FILTERS.map(([k,n])=>`<button aria-pressed="${UP.filter===k}" onclick="UP.filter='${k}';showEdit()">${n}</button>`).join(''):EDP==='speed'?SPEEDS.map(s=>`<button aria-pressed="${UP.speed===s}" onclick="UP.speed=${s};showEdit()">${String(s).replace('.',',')}x</button>`).join(''):[3,5,10].map(s=>`<button aria-pressed="${UP.stitchSec===s}" onclick="UP.stitchSec=${s};showEdit()">Orijinalden ${s} sn</button>`).join('')}</div></div>`:''}
   ${UP.texts.length?`<p class="xs" style="position:absolute;z-index:3;left:0;right:0;bottom:calc(150px + var(--sb));text-align:center;opacity:.8;text-shadow:0 1px 3px #000">Yazıyı sürükleyerek taşı, silmek için uzun bas</p>`:''}
   <div class="ed-next"><button class="btn" style="background:rgba(255,255,255,.16);color:#fff" onclick="editBack()">Yeniden çek</button><button class="btn primary" onclick="showPost()">İleri</button></div>`;
  const v=$('#edVid');if(v)v.playbackRate=UP.speed;
  const car=$('#edCar');if(car)car.addEventListener('scroll',()=>{const n=Math.round(car.scrollLeft/car.clientWidth);$$('#createLayer .dots i').forEach((d,j)=>d.classList.toggle('on',j===n))},{passive:true});
  bindEdDrag();
}
function editBack(){if(UP.draftId)return closeCreate();UP.file=null;UP.url=null;UP.files=[];UP.urls=[];UP.texts=[];EDP=null;showCapture()}
function bindEdDrag(){
  const st=$('#edStage');
  st.querySelectorAll('[data-ti]').forEach(el=>{let hold;
    el.onpointerdown=e=>{e.preventDefault();el.setPointerCapture(e.pointerId);const r=st.getBoundingClientRect(),i=+el.dataset.ti;let moved=false;
      hold=setTimeout(()=>{if(!moved){UP.texts.splice(i,1);showEdit();toast('Yazı silindi')}},700);
      el.onpointermove=m=>{moved=true;clearTimeout(hold);const x=Math.max(8,Math.min(92,(m.clientX-r.left)/r.width*100)),y=Math.max(6,Math.min(94,(m.clientY-r.top)/r.height*100));el.style.left=x+'%';el.style.top=y+'%';UP.texts[i].x=Math.round(x);UP.texts[i].y=Math.round(y)};
      el.onpointerup=()=>{clearTimeout(hold);el.onpointermove=null}}});
}
function textPop(){
  const p=document.createElement('div');p.className='txt-pop';
  p.innerHTML=`<input id="tpIn" maxlength="40" placeholder="Yazını yaz" autocomplete="off"><div class="row"><button class="btn sm" style="background:#fff;color:#000" data-s="bg">Kutulu</button><button class="btn sm" style="background:rgba(255,255,255,.2);color:#fff" data-s="sh">Gölgeli</button></div><div class="row"><button class="btn soft" data-x>Vazgeç</button><button class="btn primary" data-ok>Ekle</button></div>`;
  $('#createLayer').appendChild(p);let style='bg';const i=p.querySelector('#tpIn');setTimeout(()=>i.focus(),50);
  p.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{style=b.dataset.s;i.style.background=style==='bg'?'#fff':'none';i.style.color=style==='bg'?'#000':'#fff'});
  p.querySelector('[data-x]').onclick=()=>p.remove();
  const ok=()=>{const t=i.value.trim();if(t){UP.texts.push({t,x:50,y:35+UP.texts.length*10,style});if(UP.texts.length>5)UP.texts.shift()}p.remove();showEdit()};
  p.querySelector('[data-ok]').onclick=ok;i.onkeydown=e=>{if(e.key==='Enter')ok()};
}

/* ---------------- 3. paylaşım ---------------- */
function showPost(){
  const L=$('#createLayer');const myShop=local.shop.items,myPl=local.playlists.list;const ban=refBanner();
  const cover=UP.mode==='photos'?`<img src="${UP.urls[0]}" class="f-${UP.filter}" alt="">`:UP.thumbUrl?`<img src="${UP.thumbUrl}" class="f-${UP.filter}" alt="">`:`<video src="${UP.url}" class="f-${UP.filter}" muted playsinline></video>`;
  L.innerHTML=`<div class="post">
   <div class="layer-head"><button class="back" aria-label="Geri" onclick="keepPost();showEdit()">${I.backArrow}</button><div class="t b" style="font-size:17px">Gönderi</div></div>
   <div class="post-body">
    ${ban?`<div class="banner">${ban}</div>`:''}
    ${App.online&&!App.assets?'<div class="banner">Bu hesapla yükleme açık değil. Uygulama sahibinin seni eklemesi gerekiyor.</div>':''}
    <div class="post-top"><div class="cover">${cover}${UP.mode==='photos'&&UP.urls.length>1?`<span class="status pending" style="left:auto;right:6px">${UP.urls.length}</span>`:''}</div>
     <textarea id="upCap" maxlength="300" placeholder="Açıklama ekle. @ ile birinden bahsedebilirsin.">${esc(UP.cap)}</textarea></div>
    ${App.sample?`<button class="btn soft sm" style="margin-top:8px" onclick="keepPost();aiCaption(this)">Yapay zekâ açıklama önersin</button>`:''}
    <span class="lbl">Kategori <small>tek etiket</small></span>
    <div class="chips wrapx">${CATS.map(c=>`<button class="chip" aria-pressed="${UP.cat===c.id}" onclick="keepPost();UP.cat=${c.id};if(${c.id}!==2)UP.game=null;showPost()">${c.e} ${c.name}</button>`).join('')}</div>
    ${UP.cat===2?`<label class="lbl" for="gameIn">Oyun</label>${UP.game?`<div class="picked"><span style="width:22px">${I.pad}</span><span class="grow">${esc(game(UP.game).name)}</span><button class="close" style="background:rgba(255,255,255,.14);color:#fff" aria-label="Oyunu kaldır" onclick="keepPost();UP.game=null;showPost()">${camIcon.x}</button></div>`:`<input class="field" id="gameIn" placeholder="Oyunun adını yaz" autocomplete="off"><div id="gameAc"></div>`}`:''}
    <div class="group" style="margin-top:18px">
     ${myShop.length?`<div class="opt-row"><span class="grow b">Ürün etiketle</span><select class="field" style="width:52%;height:40px" onchange="UP.productId=this.value||null"><option value="">Yok</option>${myShop.map(p=>`<option value="${esc(p.id)}" ${UP.productId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>`:''}
     ${myPl.length?`<div class="opt-row"><span class="grow b">Listeye ekle</span><select class="field" style="width:52%;height:40px" onchange="UP.playlistId=this.value||null"><option value="">Yok</option>${myPl.map(p=>`<option value="${esc(p.id)}" ${UP.playlistId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>`:''}
     ${UP.addYours&&!UP.startChain?'':`<button class="opt-row" onclick="keepPost();UP.startChain=!UP.startChain;showPost()"><span class="grow"><div class="b">Senin sıran zinciri başlat</div><div class="help">İzleyiciler aynı konuyla video ekler.</div></span>${tg(UP.startChain)}</button>
      ${UP.startChain?`<div style="padding:0 0 12px"><input class="field" id="upAY" maxlength="50" placeholder="Örneğin En sevdiğin sokak yemeği" value="${esc(UP.addYours)}"></div>`:''}`}
     <button class="opt-row" onclick="keepPost();UP.aiLabel=!UP.aiLabel;showPost()"><span class="grow"><div class="b">Yapay zekâ ile üretildi</div><div class="help">İçerik yapay zekâyla oluşturulduysa işaretle.</div></span>${tg(UP.aiLabel)}</button>
     <div class="opt-row"><span class="grow"><div class="b">Zamanla</div><div class="help">Onaydan sonra bu saatte yayına girer.</div></span><input type="datetime-local" class="field" id="upSch" style="width:52%;height:40px;font-size:13px" value="${esc(UP.schedule)}"></div>
    </div>
    <button class="check" role="checkbox" aria-checked="${UP.rules}" onclick="UP.rules=!UP.rules;this.setAttribute('aria-checked',UP.rules)" style="margin-top:12px"><span class="bx">${I.check}</span><span>Bu içerik bana ait ve orijinal. Kurallara uyduğumu ve içeriğin sorumluluğunun bende olduğunu kabul ediyorum.</span></button>
   </div>
   <div class="post-foot"><button class="btn soft" style="flex:1" onclick="postSubmit(true)">Taslak</button><button class="btn primary" style="flex:2" onclick="postSubmit(false)">Paylaş</button></div></div>`;
  const gi=$('#gameIn');if(gi)gi.oninput=()=>gameSearch(gi.value);
}
function keepPost(){keepCap()}
function gameSearch(t){
  const n=norm(t),box=$('#gameAc');if(!box)return;if(!n){box.innerHTML='';return}
  const hits=GAMES.filter(g=>norm(g.name).includes(n)||norm(g.name).replace(/ /g,'').includes(n.replace(/ /g,''))).slice(0,6);
  box.innerHTML=`<div class="ac">${hits.map(g=>`<button onclick="keepPost();UP.game=${g.id};showPost()"><span>${esc(g.name)}</span><span class="src">IGDB ${g.id}</span></button>`).join('')||`<button disabled><span class="muted">“${esc(t)}” listede yok</span><span class="src">Listede olmayan oyun eklenemez</span></button>`}</div>`;
}
function postSubmit(draft){
  keepPost();
  if(!draft){
    if(!UP.cat)return toast('Bir kategori seç');
    if(UP.cat===2&&!UP.game)return toast('Oyun videolarında oyunu seçmek zorunlu');
    if(!UP.rules)return toast('Devam etmek için kuralları kabul et');
    if(todayUploads()>=CFG.dailyUpload)return toast('Günlük yükleme sınırına ulaştın');
    if(UP.startChain&&!(UP.addYours||'').trim())return toast('Zincir konusunu yaz');
  }
  closeCreate();openSheet('blank');runPipeline(draft);
}
