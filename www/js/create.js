"use strict";
/* ================================================================
   OLUŞTURMA v2 — kamera → düzenleyici → paylaşım
   Kamera görüntüsü 720x1280 bir tuvale çizilir ve kayıt bu tuvalden
   yapılır: ekranda ne görüyorsan (yakınlaştırma, filtre, ayna) o kaydedilir.
   ================================================================ */
const FILTER_CSS={none:'none',sicak:'sepia(.35) saturate(1.3) hue-rotate(-8deg)',soguk:'saturate(1.1) hue-rotate(12deg) brightness(1.03)',canli:'saturate(1.6) contrast(1.08)',sb:'grayscale(1) contrast(1.1)',retro:'sepia(.6) contrast(.9) brightness(1.05)'};
const SWATCH=['#FFFFFF','#16141C','#E11D48','#D9A520','#0F9F66','#3B5BDB','#7048E8','#E8590C'];
const CAMV={stream:null,video:null,canvas:null,ctx:null,raf:0,facing:'user',lenses:[],lensIdx:-1,hw:null,zoom:1,torch:false,torchOK:false,timer:0,mode:'60',grid:false,filter:'none',
  rec:null,chunks:[],state:'idle',elapsed:0,segStart:0,marks:[],shots:[],ptr:new Map(),pinch:null,lastTap:0,zoomT:0,starting:false};
const W9=720,H16=1280;
const CI={
 x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 flip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg>',
 flash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
 timer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>',
 grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
 filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="5.5"/><circle cx="15" cy="9" r="5.5"/><circle cx="12" cy="15" r="5.5"/></svg>',
 lens:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
 text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 7V5h14v2M12 5v14M9 19h6"/></svg>',
 cover:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m4 16 5-5 4 4 3-3 4 4"/></svg>',
 img:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
 trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
 cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
};
const fmtZ=z=>(Math.round(z*10)/10).toString().replace('.',',')+'x';
const mmss=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const maxSec=()=>{if(UP.duetOf){const r=vById(UP.duetOf);if(r&&r.dur)return Math.min(180,r.realDur||r.dur)}return +CAMV.mode||60};

/* ---------------- giriş noktaları ---------------- */
function openUpload(opts){
  if(needAccount())return;
  if(opts||(!UP.busy&&!UP.file&&!UP.files.length&&!UP.assetId))resetUP(opts||{});
  closeSheet();
  if(currentScreen()==='home'&&active>=0&&!paused)togglePause(cur());
  $('#createLayer').classList.add('on');
  if(UP.url||UP.urls.length)return showEdit();
  if(UP.duetOf||UP.stitchOf)CAMV.mode='60';
  showCapture();
}
function closeCreate(){camOff();CAMV.shots=[];resetRec();const L=$('#createLayer');L.classList.remove('on');L.innerHTML=''}
function openDraft(id){
  const u=D.myUploads[id];if(!u)return;
  resetUP({draftId:id,mode:u.type||'video',assetId:u.assetId,assetIds:u.assetIds,thumbId:u.thumbId,url:blobUrl(u.assetId),urls:(u.assetIds||[]).map(blobUrl),cap:u.cap||'',cat:u.cat,game:u.game,
    filter:(u.edit&&u.edit.filter)||'none',texts:(u.edit&&u.edit.texts)||[],speed:(u.edit&&u.edit.speed)||1,duetOf:u.duetOf,stitchOf:u.stitchOf,stitchSec:u.stitchSec||5,soundOf:u.soundOf,replyTo:u.replyTo,
    addYours:u.addYours||'',aiLabel:!!u.aiLabel,productId:u.productId,playlistId:u.playlistId,dur:u.dur,thumbUrl:blobUrl(u.thumbId),visibility:u.visibility||'all'});
  closeSheet();$('#createLayer').classList.add('on');showEdit();
}

/* ================================================================
   1. KAMERA
   ================================================================ */
function resetRec(){CAMV.state='idle';CAMV.elapsed=0;CAMV.marks=[];CAMV.chunks=[];if(CAMV.rec){CAMV.rec.onstop=null;try{CAMV.rec.state!=='inactive'&&CAMV.rec.stop()}catch{}}CAMV.rec=null}
function camOff(){
  cancelAnimationFrame(CAMV.raf);CAMV.raf=0;
  if(CAMV.stream){CAMV.stream.getTracks().forEach(t=>t.stop());CAMV.stream=null}
  ['refVid','sndVid'].forEach(id=>{const v=$('#'+id);if(v)v.pause()});
}
async function camOn(){
  if(CAMV.starting)return;CAMV.starting=true;
  cancelAnimationFrame(CAMV.raf);if(CAMV.stream){CAMV.stream.getTracks().forEach(t=>t.stop());CAMV.stream=null}
  const perm=$('#camPerm');if(perm)perm.hidden=true;
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw {name:'NoDevice'};
    const lens=CAMV.lenses[CAMV.lensIdx];
    // Kamera sensörü yataydır: yatay çözünürlük istemek görüntünün kırpılıp yakınlaştırılmasını önler.
    const base={width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}};
    const video=lens&&lens.facing===CAMV.facing?{...base,deviceId:{exact:lens.id}}:{...base,facingMode:{ideal:CAMV.facing}};
    const audio=CAMV.mode!=='photo';
    let s;
    try{s=await navigator.mediaDevices.getUserMedia({video:{...video,zoom:true},audio})}
    catch(e){if(e&&e.name==='NotAllowedError'&&audio)throw e;s=await navigator.mediaDevices.getUserMedia({video,audio})}
    CAMV.stream=s;
    const v=CAMV.video;v.srcObject=s;v.muted=true;await v.play().catch(()=>{});
    const tr=s.getVideoTracks()[0];const caps=tr&&tr.getCapabilities?tr.getCapabilities():{};
    CAMV.hw=caps.zoom&&caps.zoom.max>caps.zoom.min?{min:caps.zoom.min,max:caps.zoom.max,step:caps.zoom.step||.1}:null;
    CAMV.torchOK=!!caps.torch;CAMV.torch=false;
    const st=tr.getSettings?tr.getSettings():{};if(st.facingMode)CAMV.facing=st.facingMode==='user'?'user':'environment';
    try{const ds=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
      CAMV.lenses=ds.map(d=>({id:d.deviceId,label:d.label||'',facing:/front|ön|user|selfie/i.test(d.label)?'user':'environment'}));
      const ci=CAMV.lenses.findIndex(l=>l.id===st.deviceId);if(ci>=0)CAMV.lensIdx=ci}catch{}
    CAMV.zoom=1;if(CAMV.hw)setZoom(Math.max(CAMV.hw.min,Math.min(1,CAMV.hw.max)),true);
    drawLoop();renderCamChrome();
    const cv=$('#camCanvas');if(cv)setTimeout(()=>cv.classList.add('is'),80);
  }catch(e){
    console.warn('kamera',e);const p=$('#camPerm');if(!p)return;
    const denied=e&&e.name==='NotAllowedError';
    p.hidden=false;p.innerHTML=`<div class="box"><div class="ic">${CI.cam}</div><h3>${denied?'Kamera izni gerekli':'Kamera açılamadı'}</h3>
     <p>${denied?'Video çekmek için kamera ve mikrofon iznine ihtiyaç var. Telefonunun Ayarlar › Uygulamalar bölümünden izin verip tekrar dene.':'Bu ekranda kamera kullanılamıyor. Galeriden video veya fotoğraf seçebilirsin.'}</p>
     <div class="row" style="justify-content:center;gap:10px">${denied?'<button class="btn" style="background:#fff;color:#000" onclick="camOn()">Tekrar dene</button>':''}<label class="btn primary">Galeriden seç<input type="file" class="sr" accept="video/*,image/*" multiple onchange="galleryPick([...this.files])"></label></div></div>`;
  }finally{CAMV.starting=false}
}
function drawLoop(){
  const v=CAMV.video,c=CAMV.canvas,x=CAMV.ctx;
  const step=()=>{
    if(!CAMV.stream||!c.isConnected)return;
    if(v.videoWidth){
      const vw=v.videoWidth,vh=v.videoHeight,dz=CAMV.hw?1:CAMV.zoom;
      const sc=Math.max(W9/vw,H16/vh)*dz,sw=W9/sc,sh=H16/sc,sx=(vw-sw)/2,sy=(vh-sh)/2;
      x.save();x.filter=FILTER_CSS[CAMV.filter]||'none';
      if(CAMV.facing==='user'){x.translate(W9,0);x.scale(-1,1)}
      x.drawImage(v,sx,sy,sw,sh,0,0,W9,H16);x.restore();
    }
    if(CAMV.state==='rec'){const e=(CAMV.elapsed+performance.now()-CAMV.segStart)/1000;updateRecUI(e);if(e>=maxSec())finishRec()}
    CAMV.raf=requestAnimationFrame(step);
  };step();
}
function showCapture(){
  const L=$('#createLayer');const ref=UP.duetOf&&vById(UP.duetOf);const snd=UP.soundOf&&vById(UP.soundOf);
  L.innerHTML=`<div class="cs ${ref?'duet':''}" id="camStage">
     ${ref?`<div>${ref.real?`<video id="refVid" src="${esc(ref.src)}" poster="${BLANK}" playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>`:sceneHTML(ref)}</div><div style="position:relative">`:''}
     <video class="cam-raw" id="camRaw" playsinline muted autoplay poster="${BLANK}"></video>
     <canvas id="camCanvas" class="ready" width="${W9}" height="${H16}"></canvas>
     <div class="grid9" id="camGrid" ${CAMV.grid?'':'hidden'}></div>${ref?'</div>':''}
   </div>
   <div class="cam-shade"></div>
   <div class="cam-perm" id="camPerm" hidden></div>
   <div class="seg-bar" id="segBar" hidden><i id="segFill"></i></div>
   <div class="ctop"><button class="cbtn glass" aria-label="Kapat" onclick="camClose()">${CI.x}</button>
     <button class="snd-pill glass" id="sndPill" onclick="soundPanel()">${I.note}<span>${snd?esc(snd.sound):'Ses ekle'}</span></button><span style="width:38px"></span></div>
   <div class="crail" id="camRail"></div>
   <div class="zoom-read" id="zoomRead"></div>
   <div class="cbot">
     <div class="zooms glass" id="zoomChips"></div>
     <div class="shutter-row">
       <div class="side" id="leftSide"></div>
       <button class="shutter ${CAMV.mode==='photo'?'photo':''}" id="shutter" aria-label="Çek" onclick="shutter()"><span class="core"></span></button>
       <div class="side" id="rightSide"></div>
     </div>
     ${UP.duetOf||UP.stitchOf?`<div class="cmodes glass"><button aria-pressed="true">${UP.duetOf?'Düet':'Stitch'}</button></div>`:`<div class="cmodes glass" id="modes">${[['photo','Fotoğraf'],['15','15 sn'],['60','60 sn'],['180','3 dk']].map(([k,n])=>`<button data-m="${k}" aria-pressed="${CAMV.mode===k}" onclick="setMode('${k}')">${n}</button>`).join('')}</div>`}
   </div>
   ${snd&&snd.real?`<video id="sndVid" src="${esc(snd.src)}" poster="${BLANK}" playsinline style="display:none"></video>`:''}`;
  CAMV.video=$('#camRaw');CAMV.canvas=$('#camCanvas');CAMV.ctx=CAMV.canvas.getContext('2d');
  bindStage();renderCamChrome();camOn();
}
function renderCamChrome(){
  const rail=$('#camRail');if(!rail)return;const rec=CAMV.state!=='idle';
  const tools=[
    ['flip',CI.flip,'Çevir','camFlip()',false],
    CAMV.lenses.filter(l=>l.facing===CAMV.facing).length>1?['lens',CI.lens,'Lens','camLens()',false]:null,
    ['flash',CI.flash,'Flaş','camTorch()',CAMV.torch],
    ['timer',CAMV.timer?`<b>${CAMV.timer}s</b>`:CI.timer,'Süre','CAMV.timer=CAMV.timer===0?3:CAMV.timer===3?10:0;renderCamChrome()',!!CAMV.timer],
    ['grid',CI.grid,'Izgara',"CAMV.grid=!CAMV.grid;$('#camGrid').hidden=!CAMV.grid;renderCamChrome()",CAMV.grid],
    ['filter',CI.filter,'Filtre','filterPanel()',CAMV.filter!=='none'],
  ].filter(Boolean);
  rail.style.visibility=CAMV.state==='rec'?'hidden':'visible';
  rail.innerHTML=tools.map(([k,ic,l,fn,on])=>`<button class="ctool" aria-pressed="${on}" onclick="${fn}"><span class="ic glass">${ic}</span>${l}</button>`).join('');
  const zc=$('#zoomChips');
  const minZ=CAMV.hw?CAMV.hw.min:1,maxZ=CAMV.hw?Math.min(CAMV.hw.max,10):5;
  const opts=[];if(minZ<.95)opts.push(Math.round(minZ*10)/10);opts.push(1,2);if(maxZ>=3)opts.push(3);if(maxZ>=5)opts.push(5);
  const near=opts.reduce((a,b)=>Math.abs(b-CAMV.zoom)<Math.abs(a-CAMV.zoom)?b:a,opts[0]);
  const lab=z=>(z<1?String(z).replace('0.',','):String(z));
  zc.innerHTML=opts.map(z=>`<button aria-pressed="${z===near}" onclick="setZoom(${z})">${z===near?(Math.abs(CAMV.zoom-z)>.05?fmtZ(CAMV.zoom):lab(z)+'x'):lab(z)}</button>`).join('');
  zc.style.visibility=CAMV.stream&&CAMV.state!=='rec'?'visible':'hidden';
  const left=$('#leftSide'),right=$('#rightSide'),photo=CAMV.mode==='photo';
  left.innerHTML=rec?`<button class="trash-btn glass" aria-label="Kaydı sil" onclick="discardPrompt()">${CI.trash}</button>`
    :`<label class="up-btn"><input type="file" class="sr" id="galIn" ${photo?'accept="image/*" multiple':'accept="video/*,image/*" multiple'}><span class="sq">${CI.img}</span>Yükle</label>`;
  const gi=$('#galIn');if(gi)gi.onchange=e=>galleryPick([...e.target.files]);
  const got=CAMV.elapsed+(CAMV.state==='rec'?performance.now()-CAMV.segStart:0);
  right.innerHTML=(rec&&got>1000)||(photo&&CAMV.shots.length)?`<button class="done-btn" aria-label="Bitti" onclick="${photo?'photosDone()':'finishRec()'}">${CI.check}</button>`:'';
  const sh=$('#shutter');sh.classList.toggle('rec',CAMV.state==='rec');sh.setAttribute('aria-label',photo?'Fotoğraf çek':CAMV.state==='rec'?'Duraklat':'Kaydet');
  const m=$('#modes');if(m)m.style.visibility=rec?'hidden':'visible';
  $('#segBar').hidden=!rec;
  let st=$('#shotsStrip');if(photo&&CAMV.shots.length){if(!st){st=document.createElement('div');st.className='shots-strip';st.id='shotsStrip';$('#createLayer').appendChild(st)}st.innerHTML=CAMV.shots.slice(-5).map(s=>`<img src="${s.url}" alt="">`).join('')}else if(st)st.remove();
}
function updateRecUI(e){
  const max=maxSec();const f=$('#segFill');if(!f)return;f.style.width=Math.min(100,e/max*100)+'%';
  const bar=$('#segBar');if(bar.dataset.n!=CAMV.marks.length){bar.dataset.n=CAMV.marks.length;bar.querySelectorAll('b').forEach(b=>b.remove());CAMV.marks.forEach(m=>{const b=document.createElement('b');b.style.left=(m/1000/max*100)+'%';bar.appendChild(b)})}
  let c=$('#recClock');if(!c){c=document.createElement('div');c.className='rec-clock glass';c.id='recClock';$('#createLayer').appendChild(c)}
  c.innerHTML=`<i></i>${mmss(e)} / ${mmss(max)}`;
  const rs=$('#rightSide');if(e>1&&rs&&!rs.firstChild)renderCamChrome();
}
function setMode(k){if(CAMV.state!=='idle')return;const needAudio=(k==='photo')!==(CAMV.mode==='photo');CAMV.mode=k;if(k!=='photo')CAMV.shots=[];
  $('#shutter').classList.toggle('photo',k==='photo');$$('#modes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===k));
  if(needAudio)camOn();else renderCamChrome()}
function camFlip(){if(CAMV.state==='rec')return;CAMV.facing=CAMV.facing==='user'?'environment':'user';CAMV.lensIdx=-1;const cv=$('#camCanvas');if(cv)cv.classList.remove('is');camOn()}
function camLens(){const same=CAMV.lenses.map((l,i)=>({...l,i})).filter(l=>l.facing===CAMV.facing);const k=same.findIndex(l=>l.i===CAMV.lensIdx);const n=(k+1)%same.length;CAMV.lensIdx=same[n].i;toast('Lens '+(n+1)+' / '+same.length);camOn()}
async function camTorch(){
  if(!CAMV.torchOK)return toast(CAMV.facing==='user'?'Ön kamerada flaş yok':'Bu kamerada flaş desteklenmiyor');
  CAMV.torch=!CAMV.torch;try{await CAMV.stream.getVideoTracks()[0].applyConstraints({advanced:[{torch:CAMV.torch}]})}catch{CAMV.torch=false}renderCamChrome();
}
function setZoom(z,silent){
  const minZ=CAMV.hw?CAMV.hw.min:1,maxZ=CAMV.hw?Math.min(CAMV.hw.max,10):5;
  CAMV.zoom=Math.max(minZ,Math.min(maxZ,Math.round(z*20)/20));
  if(CAMV.hw&&CAMV.stream){const tr=CAMV.stream.getVideoTracks()[0];const t=performance.now();if(t-CAMV.zoomT>40){CAMV.zoomT=t;tr.applyConstraints({advanced:[{zoom:CAMV.zoom}]}).catch(()=>{})}}
  if(!silent){const r=$('#zoomRead');if(r){r.textContent=fmtZ(CAMV.zoom);r.classList.add('on');clearTimeout(r._t);r._t=setTimeout(()=>r.classList.remove('on'),700)}}
  renderCamChrome();
}
function bindStage(){
  const st=$('#camStage');
  st.onpointerdown=e=>{CAMV.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(CAMV.ptr.size===2){const [a,b]=[...CAMV.ptr.values()];CAMV.pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:CAMV.zoom}}
    else{const t=now();if(t-CAMV.lastTap<280&&CAMV.state!=='rec')camFlip();CAMV.lastTap=t}};
  st.onpointermove=e=>{if(!CAMV.ptr.has(e.pointerId))return;CAMV.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(CAMV.ptr.size===2&&CAMV.pinch){const [a,b]=[...CAMV.ptr.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);setZoom(CAMV.pinch.z*d/CAMV.pinch.d)}};
  const up=e=>{CAMV.ptr.delete(e.pointerId);if(CAMV.ptr.size<2)CAMV.pinch=null};st.onpointerup=up;st.onpointercancel=up;
}
async function countdown(n){
  for(let i=n;i>0;i--){const c=document.createElement('div');c.className='cd';c.textContent=i;$('#createLayer').appendChild(c);await new Promise(r=>setTimeout(r,1000));c.remove()}
}
async function shutter(){
  if(!CAMV.stream)return toast('Kamera hazır değil');
  if(CAMV.mode==='photo')return takePhoto();
  if(CAMV.state==='rec')return pauseRec();
  if(CAMV.state==='paused')return resumeRec();
  if(CAMV.state!=='idle')return;
  if(CAMV.timer)await countdown(CAMV.timer);
  startRec();
}
function pickMime(){return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t))||''}
function startRec(){
  const out=CAMV.canvas.captureStream(30);
  CAMV.stream.getAudioTracks().forEach(t=>out.addTrack(t));
  let rec;try{rec=new MediaRecorder(out,{mimeType:pickMime()||undefined,videoBitsPerSecond:2500000,audioBitsPerSecond:128000})}catch(e){return toast('Bu cihazda kayıt başlatılamadı')}
  CAMV.rec=rec;CAMV.chunks=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)CAMV.chunks.push(e.data)};
  rec.onstop=onRecStop;rec.start(250);
  CAMV.state='rec';CAMV.elapsed=0;CAMV.marks=[];CAMV.segStart=performance.now();
  syncSide('play',true);renderCamChrome();
}
function pauseRec(){if(!CAMV.rec)return;try{CAMV.rec.pause()}catch{}CAMV.elapsed+=performance.now()-CAMV.segStart;CAMV.marks.push(CAMV.elapsed);CAMV.state='paused';syncSide('pause');renderCamChrome();const c=$('#recClock');if(c)c.innerHTML=`${mmss(CAMV.elapsed/1000)} / ${mmss(maxSec())}`}
function resumeRec(){if(!CAMV.rec)return;try{CAMV.rec.resume()}catch{}CAMV.segStart=performance.now();CAMV.state='rec';syncSide('play');renderCamChrome()}
function finishRec(){if(!CAMV.rec||CAMV.state==='stopping')return;if(CAMV.state==='rec')CAMV.elapsed+=performance.now()-CAMV.segStart;CAMV.state='stopping';try{CAMV.rec.state==='paused'&&CAMV.rec.resume()}catch{}CAMV.rec.stop()}
function syncSide(what,fromStart){['refVid','sndVid'].forEach(id=>{const v=$('#'+id);if(!v)return;if(fromStart)v.currentTime=0;if(what==='play'){v.muted=false;v.play().catch(()=>{})}else v.pause()})}
function onRecStop(){
  const type=((CAMV.rec&&CAMV.rec.mimeType)||'video/webm').split(';')[0];const blob=new Blob(CAMV.chunks,{type});
  const dur=CAMV.elapsed/1000;syncSide('pause');
  const ext=type.includes('mp4')?'mp4':'webm';
  CAMV.rec=null;CAMV.state='idle';CAMV.elapsed=0;CAMV.marks=[];const c=$('#recClock');if(c)c.remove();
  if(dur<1||!blob.size){toast('Kayıt çok kısa');return renderCamChrome()}
  camOff();UP.mode='video';UP.filter='none';
  setVideoFile(new File([blob],`doli-${Date.now()}.${ext}`,{type}),dur);
}
function confirmPanel(q,noTxt,yesTxt,yes){
  const p=panel(q,`<div class="row" style="padding:0 16px"><button class="btn" style="flex:1;background:rgba(255,255,255,.12);color:#fff" data-no>${noTxt}</button><button class="btn primary" style="flex:1" data-yes>${yesTxt}</button></div>`);
  p.querySelector('[data-no]').onclick=()=>p.remove();p.querySelector('[data-yes]').onclick=()=>{p.remove();yes()};
}
function discardPrompt(){confirmPanel('Kaydı silip baştan başlamak istiyor musun?','Vazgeç','Sil',()=>{if(CAMV.state==='rec')pauseRec();resetRec();syncSide('pause');const c=$('#recClock');if(c)c.remove();renderCamChrome()})}
function camClose(){if(CAMV.state!=='idle'||CAMV.shots.length)return confirmPanel('Çektiklerin silinsin mi?','Devam et','Sil ve çık',closeCreate);closeCreate()}
async function takePhoto(){
  if(CAMV.timer)await countdown(CAMV.timer);
  const f=document.createElement('div');f.className='flash-fx';$('#createLayer').appendChild(f);setTimeout(()=>f.remove(),400);
  const blob=await new Promise(r=>CAMV.canvas.toBlob(r,'image/jpeg',.92));
  const file=new File([blob],`doli-${Date.now()}.jpg`,{type:'image/jpeg'});CAMV.shots.push({file,url:URL.createObjectURL(file)});
  if(CAMV.shots.length>=10)return photosDone();renderCamChrome();
}
function photosDone(){if(!CAMV.shots.length)return;camOff();UP.mode='photos';UP.filter='none';UP.files=CAMV.shots.map(s=>s.file);UP.urls=CAMV.shots.map(s=>s.url);UP.assetIds=null;CAMV.shots=[];showEdit()}
async function galleryPick(fs){
  if(!fs.length)return;
  const vids=fs.filter(f=>f.type.startsWith('video/')),imgs=fs.filter(f=>f.type.startsWith('image/'));
  if(vids.length){const f=vids[0];if(f.size>CFG.maxMB*1048576)return toast(`Video ${CFG.maxMB} MB'tan büyük. Daha kısa bir video seç.`);camOff();UP.mode='video';UP.filter=CAMV.filter||'none';setVideoFile(f)}
  else if(imgs.length){if(imgs.some(f=>f.size>CFG.maxMB*1048576))return toast(`Fotoğraflar en fazla ${CFG.maxMB} MB olabilir`);camOff();UP.mode='photos';UP.filter=CAMV.filter||'none';UP.files=imgs.slice(0,10);UP.urls=UP.files.map(f=>URL.createObjectURL(f));UP.assetIds=null;showEdit()}
  else toast('Video ya da fotoğraf seç');
}
async function setVideoFile(f,dur){
  if(f.size>CFG.maxMB*1048576){toast(`Video ${CFG.maxMB} MB'tan büyük. Daha kısa çek.`);return showCapture()}
  UP.file=f;UP.url=URL.createObjectURL(f);UP.assetId=null;UP.dur=dur||null;UP.coverFrac=null;UP._strip=null;
  $('#createLayer').innerHTML=`<div class="cam-perm"><div class="box"><div class="ic" style="animation:spin 1s linear infinite;border-radius:50%;border:3px solid #fff;border-right-color:transparent;background:none;width:44px;height:44px"></div><h3>Hazırlanıyor</h3></div></div>`;
  try{const r=await grabFrames(UP.url,[.5]);if(r.dur&&isFinite(r.dur))UP.dur=r.dur;UP.thumbUrl=r.frames[0].toDataURL('image/jpeg',.7)}catch{}
  showEdit();
}

/* ---------------- paneller: filtre, ses ---------------- */
function panel(title,body){
  $$('.dpanel').forEach(p=>p.remove());
  const p=document.createElement('div');p.className='dpanel';
  p.innerHTML=`<div class="ph"><span>${title}</span><button class="cbtn" style="width:32px;height:32px;background:rgba(255,255,255,.1)" aria-label="Kapat">${CI.x}</button></div>${body}`;
  p.querySelector('.ph button').onclick=()=>{p.remove();if(p.dataset.onclose)window[p.dataset.onclose]()};
  $('#createLayer').appendChild(p);return p;
}
function filterPanel(){
  let snap='';try{const c=document.createElement('canvas');c.width=90;c.height=160;c.getContext('2d').drawImage(CAMV.canvas,0,0,90,160);snap=c.toDataURL('image/jpeg',.6)}catch{}
  panel('Filtre',`<div class="fstrip">${FILTERS.map(([k,n])=>`<button class="fcell" aria-pressed="${CAMV.filter===k}" onclick="CAMV.filter='${k}';$$('.dpanel .fcell').forEach(b=>b.setAttribute('aria-pressed',b===this));renderCamChrome()"><span class="fp"><img src="${snap}" style="filter:${FILTER_CSS[k]}" alt=""></span>${n}</button>`).join('')}</div>`);
}
function soundList(){return allVideos().filter(v=>v.real&&!v.soundOf&&v.type!=='photos').slice(0,30)}
function soundPanel(){
  if(CAMV.state!=='idle'&&$('#camStage'))return toast('Kayıt sırasında ses değiştirilemez');
  const list=soundList();
  panel('Ses ekle',`<div class="snd-list">
    <button class="snd-row" aria-pressed="${!UP.soundOf}" onclick="pickSound(null)"><span class="cov">${I.volOff}</span><span class="grow"><div class="nm">Kendi sesim</div><div class="by">Mikrofondan kaydedilir</div></span></button>
    ${list.map(v=>`<button class="snd-row" aria-pressed="${UP.soundOf===v.id}" onclick="pickSound('${esc(v.id)}')"><span class="cov">${v.thumb?`<img src="${esc(v.thumb)}" alt="">`:I.note}</span><span class="grow" style="min-width:0"><div class="nm ell">${esc(v.sound)}</div><div class="by">@${esc(person(v.owner).handle)} · ${Math.round(v.dur||0)} sn</div></span></button>`).join('')}
    ${list.length?'':'<p class="s" style="color:#9d9ca6;padding:8px 0 4px">Henüz kullanılabilir ses yok. Yayındaki videoların sesleri burada listelenir.</p>'}</div>`);
}
function pickSound(id){UP.soundOf=id;$$('.dpanel').forEach(p=>p.remove());if($('#camStage'))showCapture();else showEdit()}

/* ================================================================
   2. DÜZENLEYİCİ
   ================================================================ */
function showEdit(){
  const L=$('#createLayer');const fc='f-'+UP.filter;const snd=UP.soundOf&&vById(UP.soundOf);
  const media=UP.mode==='photos'?`<div class="carousel ${fc}" id="edCar">${UP.urls.map(u=>`<img src="${u}" alt="" draggable="false">`).join('')}</div>${UP.urls.length>1?`<div class="dots" style="bottom:96px">${UP.urls.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div>`:''}`
    :`<video id="edVid" class="${fc}" src="${UP.url}" poster="${UP.thumbUrl||BLANK}" autoplay loop playsinline ${UI.muted||snd?'muted':''}></video>`;
  const me=myProfile();
  L.innerHTML=`<div class="ed"><div class="ed-media" id="edStage">${media}${UP.texts.map((t,i)=>`<div class="overlay-text ${t.style==='bg'?'bg':'sh'}" data-ti="${i}" style="left:${t.x}%;top:${t.y}%;${textCss(t)}">${esc(t.t)}</div>`).join('')}</div>
   <div class="cam-shade"></div>
   <div class="ctop"><button class="cbtn glass" aria-label="Geri" onclick="editBack()">${I.backArrow}</button>
     <button class="snd-pill glass" onclick="soundPanel()">${I.note}<span>${snd?esc(snd.sound):'Ses ekle'}</span></button><span style="width:38px"></span></div>
   <div class="crail">
     <button class="ctool" onclick="textEditor()"><span class="ic glass">${CI.text}</span>Yazı</button>
     <button class="ctool" aria-pressed="${UP.filter!=='none'}" onclick="edFilterPanel()"><span class="ic glass">${CI.filter}</span>Filtre</button>
     ${UP.mode==='video'?`<button class="ctool" aria-pressed="${UP.speed!==1}" onclick="speedPanel()"><span class="ic glass">${UP.speed!==1?`<b>${String(UP.speed).replace('.',',')}x</b>`:I.speed}</span>Hız</button>
     <button class="ctool" id="muteTool" onclick="edMute()"><span class="ic glass">${UI.muted?I.volOff:I.volOn}</span>Ses</button>
     <button class="ctool" aria-pressed="${UP.coverFrac!=null}" onclick="coverPanel()"><span class="ic glass">${CI.cover}</span>Kapak</button>`:''}
     ${UP.stitchOf?`<button class="ctool" onclick="stitchPanel()"><span class="ic glass"><b>${UP.stitchSec}s</b></span>Stitch</button>`:''}
   </div>
   <div class="ed-trash" id="edTrash">${CI.trash}</div>
   <div class="ed-bottom">
     ${UP.duetOf||UP.stitchOf||UP.replyTo||UP.draftId?'':`<button class="btn ed-story" onclick="storyFromCreate()">${avaHTML(me)}Hikâyen</button>`}
     <button class="btn primary" style="flex:1.4" onclick="showPost()">İleri</button></div>
   ${snd&&snd.real?`<video id="sndVid" src="${esc(snd.src)}" poster="${BLANK}" playsinline loop autoplay ${UI.muted?'muted':''} style="display:none"></video>`:''}</div>`;
  const v=$('#edVid');if(v){v.playbackRate=UP.speed;v.onloadedmetadata=()=>{v.playbackRate=UP.speed}}
  const car=$('#edCar');if(car)car.addEventListener('scroll',()=>{const n=Math.round(car.scrollLeft/car.clientWidth);$$('#createLayer .dots i').forEach((d,j)=>d.classList.toggle('on',j===n))},{passive:true});
  bindTexts();
}
function edMute(){UI.muted=!UI.muted;const snd=$('#sndVid'),v=$('#edVid');if(snd)snd.muted=UI.muted;else if(v)v.muted=UI.muted;$('#muteTool .ic').innerHTML=UI.muted?I.volOff:I.volOn}
function editBack(){
  if(UP.draftId)return closeCreate();
  confirmPanel('Çektiğin silinsin mi?','Düzenlemeye dön','Sil, yeniden çek',()=>{UP.file=null;UP.url=null;UP.files=[];UP.urls=[];UP.texts=[];UP.coverFrac=null;UP.thumbUrl=null;showCapture()});
}
function bindTexts(){
  const st=$('#edStage'),trash=$('#edTrash');
  st.querySelectorAll('[data-ti]').forEach(el=>{
    el.onpointerdown=e=>{e.preventDefault();e.stopPropagation();el.setPointerCapture(e.pointerId);const r=st.getBoundingClientRect(),i=+el.dataset.ti;let moved=false;const sx=e.clientX,sy=e.clientY;
      el.onpointermove=m=>{if(!moved&&Math.hypot(m.clientX-sx,m.clientY-sy)<6)return;moved=true;el.classList.add('drag');trash.classList.add('on');
        const x=Math.max(6,Math.min(94,(m.clientX-r.left)/r.width*100)),y=Math.max(6,Math.min(94,(m.clientY-r.top)/r.height*100));el.style.left=x+'%';el.style.top=y+'%';UP.texts[i].x=Math.round(x);UP.texts[i].y=Math.round(y);
        const tr=trash.getBoundingClientRect();trash.classList.toggle('hot',m.clientY>tr.top-20&&Math.abs(m.clientX-(tr.left+tr.width/2))<60)};
      el.onpointerup=()=>{el.onpointermove=null;el.classList.remove('drag');const hot=trash.classList.contains('hot');trash.classList.remove('on','hot');
        if(hot){UP.texts.splice(i,1);showEdit();return}if(!moved)textEditor(i)}};
  });
}
function textEditor(idx){
  const t=idx!=null?{...UP.texts[idx]}:{t:'',style:'bg',color:'#FFFFFF',x:50,y:40};
  const p=document.createElement('div');p.className='tp';
  const paint=()=>{const i=p.querySelector('input');const c=t.color||'#FFFFFF';if(t.style==='bg'){i.style.background=c;i.style.color=LIGHT.includes(c)?'#16141C':'#fff';i.style.textShadow='none'}else{i.style.background='none';i.style.color=c;i.style.textShadow='0 2px 8px rgba(0,0,0,.6)'}
    p.querySelectorAll('[data-c]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===c));p.querySelector('[data-s]').textContent=t.style==='bg'?'Kutulu':'Gölgeli'};
  p.innerHTML=`<div class="tp-top"><button class="btn sm" style="background:rgba(255,255,255,.14);color:#fff" data-x>Vazgeç</button><button class="btn sm" style="background:rgba(255,255,255,.14);color:#fff" data-s></button><button class="btn sm primary" data-ok>Bitti</button></div>
   <div class="tp-mid"><input maxlength="40" placeholder="Yaz" autocomplete="off" value="${esc(t.t)}"></div>
   <div class="tp-bot"><div class="swatches">${SWATCH.map(c=>`<button data-c="${c}" style="background:${c}" aria-label="Renk"></button>`).join('')}</div></div>`;
  $('#createLayer').appendChild(p);const i=p.querySelector('input');paint();setTimeout(()=>i.focus(),60);
  p.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{t.color=b.dataset.c;paint();i.focus()});
  p.querySelector('[data-s]').onclick=()=>{t.style=t.style==='bg'?'sh':'bg';paint();i.focus()};
  p.querySelector('[data-x]').onclick=()=>p.remove();
  const ok=()=>{t.t=i.value.trim();if(idx!=null){if(t.t)UP.texts[idx]=t;else UP.texts.splice(idx,1)}else if(t.t){UP.texts.push({...t,y:35+UP.texts.length*9});if(UP.texts.length>5)UP.texts.shift()}p.remove();showEdit()};
  p.querySelector('[data-ok]').onclick=ok;i.onkeydown=e=>{if(e.key==='Enter')ok()};
}
function setEdFilter(k,btn){UP.filter=k;$$('.dpanel .fcell').forEach(b=>b.setAttribute('aria-pressed',b===btn));const m=$('#edVid')||$('#edCar');if(m)m.className=m.className.replace(/\bf-\w+/,'f-'+k)}
function edFilterPanel(){
  const src=UP.mode==='photos'?UP.urls[0]:(UP.thumbUrl||'');
  panel('Filtre',`<div class="fstrip">${FILTERS.map(([k,n])=>`<button class="fcell" aria-pressed="${UP.filter===k}" onclick="setEdFilter('${k}',this)"><span class="fp">${src?`<img src="${src}" style="filter:${FILTER_CSS[k]}" alt="">`:''}</span>${n}</button>`).join('')}</div>`).dataset.onclose='showEdit';
}
function speedPanel(){panel('Hız',`<div class="fstrip">${SPEEDS.map(s=>`<button class="fcell" aria-pressed="${UP.speed===s}" onclick="UP.speed=${s};$('#edVid').playbackRate=${s};$$('.dpanel .fcell').forEach(b=>b.setAttribute('aria-pressed',b===this))"><span class="fp" style="display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff">${String(s).replace('.',',')}x</span>${s<1?'Yavaş':s>1?'Hızlı':'Normal'}</button>`).join('')}</div>`).dataset.onclose='showEdit'}
function stitchPanel(){panel('Orijinalden ne kadar?',`<div class="fstrip">${[3,5,10].map(s=>`<button class="fcell" aria-pressed="${UP.stitchSec===s}" onclick="UP.stitchSec=${s};$$('.dpanel .fcell').forEach(b=>b.setAttribute('aria-pressed',b===this))"><span class="fp" style="display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff">${s} sn</span></button>`).join('')}</div>`).dataset.onclose='showEdit'}
async function coverPanel(){
  const v=$('#edVid');if(!v)return;v.pause();
  const p=panel('Kapak seç',`<div class="cover-strip" id="cvStrip"><div class="knob" id="cvKnob"></div></div><div style="padding:12px 16px 0"><input type="range" class="cover-range" id="cvRange" min="0" max="1000" value="${Math.round((UP.coverFrac??.5)*1000)}" aria-label="Kapak karesi"></div><p class="xs" style="color:#9d9ca6;text-align:center;margin-top:6px">Kaydırarak profilinde görünecek kareyi seç</p>`);
  p.dataset.onclose='showEdit';
  const strip=$('#cvStrip'),knob=$('#cvKnob'),rg=$('#cvRange');
  const d=()=>isFinite(v.duration)&&v.duration>0?v.duration:(UP.dur||1);
  const place=()=>{const f=rg.value/1000;knob.style.left=(f*100)+'%';UP.coverFrac=f;try{v.currentTime=Math.min(d()-.05,f*d())}catch{}};
  rg.oninput=place;place();
  if(!UP._strip){try{const r=await grabFrames(UP.url,[.02,.2,.4,.6,.8,.98]);UP._strip=r.frames.map(c=>c.toDataURL('image/jpeg',.5))}catch{UP._strip=[]}}
  if(strip.isConnected)strip.insertAdjacentHTML('afterbegin',UP._strip.map(u=>`<img src="${u}" alt="">`).join(''));
}
async function storyFromCreate(){
  if(!App.assets)return toast('Bu görünümde hikâye paylaşılamıyor');
  const f=UP.mode==='photos'?UP.files[0]:UP.file;if(!f)return toast('Hikâye için önce çek ya da seç');
  toast('Hikâyen yükleniyor');
  try{const a=await App.assets.upload(f);
    local.stories.items=[...activeStories(App.uid),{id:rid(),type:UP.mode==='photos'?'image':'video',asset:a.id,text:UP.texts[0]?UP.texts[0].t:'',bg:'#000',at:now()}].slice(-20);
    saveOwn('stories');resetUP();closeCreate();toast('Hikâyen paylaşıldı, 24 saat görünecek');}
  catch(e){toast('Hikâye yüklenemedi')}
}

/* ================================================================
   3. PAYLAŞIM
   ================================================================ */
let PEXP=null;
function showPost(){
  $$('.dpanel').forEach(p=>p.remove());const v=$('#edVid');if(v)v.pause();
  const L=$('#createLayer');const ban=refBanner();const myShop=local.shop.items,myPl=local.playlists.list;
  const cover=UP.mode==='photos'?`<img src="${UP.urls[0]}" class="f-${UP.filter}" alt="">`:`<img src="${UP.thumbUrl||BLANK}" class="f-${UP.filter}" alt="">`;
  const vis={all:'Herkes',followers:'Takipçiler',me:'Sadece ben'}[UP.visibility||'all'];
  const row=(k,ic,t,sub,val,req)=>`<button class="prow" onclick="keepPost();PEXP=PEXP==='${k}'?null:'${k}';showPost()" aria-expanded="${PEXP===k}"><span class="pi2">${ic}</span><span class="pt"><b>${t}${req?' <span class="req">*</span>':''}</b>${sub?`<small>${sub}</small>`:''}</span><span class="pv">${val||''}</span>${I.chev}</button>`;
  L.innerHTML=`<div class="pub">
   <div class="pub-head"><button class="back" aria-label="Geri" onclick="keepPost();showEdit()">${I.backArrow}</button><h2>Gönderi</h2></div>
   <div class="pub-body">
    ${ban?`<div class="banner">${ban}</div>`:''}
    ${App.online&&!App.assets?'<div class="banner">Bu hesapla yükleme açık değil. Uygulama sahibinin seni eklemesi gerekiyor.</div>':''}
    <div class="compose"><div class="grow"><textarea id="upCap" maxlength="300" placeholder="Açıklama ekle. İnsanlar neden izlesin?">${esc(UP.cap)}</textarea><div class="counter" id="capN">${(UP.cap||'').length}/300</div></div>
     <div class="cv"><button class="im" onclick="keepPost();showEdit();${UP.mode==='video'?'setTimeout(coverPanel,60)':''}">${cover}<span>${UP.mode==='video'?'Kapağı seç':UP.urls.length+' fotoğraf'}</span></button></div></div>
    <div class="quick"><button onclick="insertAt('@')">@ Bahset</button>${App.sample?`<button onclick="keepPost();aiCaption(this)">Yapay zekâ yazsın</button>`:''}</div>
    <div class="rows">
     ${row('cat',`<span style="font-size:17px">${UP.cat?cat(UP.cat).e:'🏷️'}</span>`,'Kategori','Keşfet’te bu etiketle görünür',UP.cat?cat(UP.cat).name:'Seç',true)}
     ${PEXP==='cat'?`<div class="pexp"><div class="chips wrapx">${CATS.map(c=>`<button class="chip" aria-pressed="${UP.cat===c.id}" onclick="keepPost();UP.cat=${c.id};if(${c.id}!==2)UP.game=null;PEXP=${c.id}===2&&!UP.game?'game':null;showPost()">${c.e} ${c.name}</button>`).join('')}</div></div>`:''}
     ${UP.cat===2?row('game',I.pad,'Oyun','Oyun veritabanından seç',UP.game?esc(game(UP.game).name):'Seç',true):''}
     ${UP.cat===2&&PEXP==='game'?`<div class="pexp"><input class="field" id="gameIn" placeholder="Oyunun adını yaz, örneğin pubg" autocomplete="off"><div id="gameAc"></div></div>`:''}
     ${row('vis',I.globe,'Kimler izleyebilir','',vis)}
     ${PEXP==='vis'?`<div class="pexp"><div class="seg">${[['all','Herkes'],['followers','Takipçiler'],['me','Sadece ben']].map(([k,t])=>`<button aria-pressed="${(UP.visibility||'all')===k}" onclick="keepPost();UP.visibility='${k}';showPost()">${t}</button>`).join('')}</div></div>`:''}
     ${myShop.length?row('prod',I.bag,'Ürün etiketle','',UP.productId?esc((myShop.find(p=>p.id===UP.productId)||{}).name||''):'Yok'):''}
     ${PEXP==='prod'?`<div class="pexp"><div class="chips wrapx"><button class="chip" aria-pressed="${!UP.productId}" onclick="keepPost();UP.productId=null;showPost()">Yok</button>${myShop.map(p=>`<button class="chip" aria-pressed="${UP.productId===p.id}" onclick="keepPost();UP.productId='${esc(p.id)}';showPost()">${esc(p.name)}</button>`).join('')}</div></div>`:''}
     ${myPl.length?row('pl',I.list,'Oynatma listesi','',UP.playlistId?esc((myPl.find(p=>p.id===UP.playlistId)||{}).name||''):'Yok'):''}
     ${PEXP==='pl'?`<div class="pexp"><div class="chips wrapx"><button class="chip" aria-pressed="${!UP.playlistId}" onclick="keepPost();UP.playlistId=null;showPost()">Yok</button>${myPl.map(p=>`<button class="chip" aria-pressed="${UP.playlistId===p.id}" onclick="keepPost();UP.playlistId='${esc(p.id)}';showPost()">${esc(p.name)}</button>`).join('')}</div></div>`:''}
     ${UP.addYours&&!UP.startChain?'':row('chain','<span style="font-size:16px">🔗</span>','Senin sıran zinciri','İzleyiciler aynı konuyla video ekler',UP.startChain?esc(UP.addYours||'Açık'):'Kapalı')}
     ${PEXP==='chain'?`<div class="pexp"><button class="opt-row" style="padding:4px 0 10px" onclick="keepPost();UP.startChain=!UP.startChain;showPost()"><span class="grow b">Zincir başlat</span>${tg(UP.startChain)}</button>${UP.startChain?`<input class="field" id="upAY" maxlength="50" placeholder="Örneğin En sevdiğin sokak yemeği" value="${esc(UP.addYours)}">`:''}</div>`:''}
     ${row('sch',I.timer,'Zamanla','Onaydan sonra bu saatte yayına girer',UP.schedule?new Date(UP.schedule).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Hemen')}
     ${PEXP==='sch'?`<div class="pexp"><input type="datetime-local" class="field" id="upSch" value="${esc(UP.schedule)}"></div>`:''}
     <button class="prow" onclick="keepPost();UP.aiLabel=!UP.aiLabel;showPost()"><span class="pi2"><span style="font-size:15px">✨</span></span><span class="pt"><b>Yapay zekâ ile üretildi</b><small>İçerik yapay zekâyla oluşturulduysa işaretle</small></span>${tg(UP.aiLabel)}</button>
    </div>
    <button class="check" role="checkbox" aria-checked="${UP.rules}" onclick="UP.rules=!UP.rules;this.setAttribute('aria-checked',UP.rules)" style="margin-top:10px"><span class="bx">${I.check}</span><span>Bu içerik bana ait ve orijinal. Kurallara uyduğumu ve sorumluluğun bende olduğunu kabul ediyorum.</span></button>
   </div>
   <div class="pub-foot"><button class="btn soft draft" onclick="postSubmit(true)">${I.doc}Taslak</button><button class="btn primary" style="flex:1" onclick="postSubmit(false)">Paylaş</button></div></div>`;
  const ta=$('#upCap');ta.oninput=()=>{UP.cap=ta.value;$('#capN').textContent=ta.value.length+'/300'};
  const gi=$('#gameIn');if(gi){gi.oninput=()=>gameSearch(gi.value);setTimeout(()=>gi.focus(),50)}
}
function insertAt(s){const ta=$('#upCap');const p=ta.selectionStart??ta.value.length;ta.value=ta.value.slice(0,p)+s+ta.value.slice(p);ta.focus();ta.selectionStart=ta.selectionEnd=p+s.length;UP.cap=ta.value}
function keepPost(){keepCap()}
function gameSearch(t){
  const n=norm(t),box=$('#gameAc');if(!box)return;if(!n){box.innerHTML='';return}
  const hits=GAMES.filter(g=>norm(g.name).includes(n)||norm(g.name).replace(/ /g,'').includes(n.replace(/ /g,''))).slice(0,6);
  box.innerHTML=`<div class="ac">${hits.map(g=>`<button onclick="keepPost();UP.game=${g.id};PEXP=null;showPost()"><span>${esc(g.name)}</span><span class="src">IGDB ${g.id}</span></button>`).join('')||`<button disabled><span class="muted">“${esc(t)}” listede yok</span><span class="src">Listede olmayan oyun eklenemez</span></button>`}</div>`;
}
function postSubmit(draft){
  keepPost();
  if(!draft){
    if(!UP.cat){PEXP='cat';showPost();return toast('Bir kategori seç')}
    if(UP.cat===2&&!UP.game){PEXP='game';showPost();return toast('Oyun videolarında oyunu seçmek zorunlu')}
    if(!UP.rules)return toast('Paylaşmak için kuralları kabul et');
    if(todayUploads()>=CFG.dailyUpload)return toast('Günlük yükleme sınırına ulaştın');
    if(UP.startChain&&!(UP.addYours||'').trim()){PEXP='chain';showPost();return toast('Zincir konusunu yaz')}
  }
  PEXP=null;camOff();$('#createLayer').classList.remove('on');$('#createLayer').innerHTML='';openSheet('blank');runPipeline(draft);
}
