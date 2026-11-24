"use strict";
/* ================================================================
   YÜKLEME VE DÜZENLEME
   video veya fotoğraf slaytı · filtre · yazı · hız · ses · düet · stitch
   video yanıt · Senin sıran · ürün · liste · zamanlama · taslak · AI etiketi
   ================================================================ */
const UP={};
function resetUP(o={}){Object.assign(UP,{mode:'video',file:null,files:[],url:null,urls:[],assetId:null,assetIds:null,thumbId:null,dur:null,cat:null,game:null,cap:'',rules:false,busy:false,
  filter:'none',texts:[],speed:1,txtStyle:'sh',aiLabel:false,productId:null,playlistId:null,schedule:'',addYours:'',startChain:false,stitchSec:5,draftId:null,
  duetOf:null,stitchOf:null,soundOf:null,replyTo:null},o);if(o.addYours)UP.startChain=false}
resetUP();
const todayUploads=()=>Object.values(D.myUploads).filter(u=>u.createdAt>=dayStart()&&u.status!=='draft').length;
const keepCap=()=>{const c=$('#upCap');if(c)UP.cap=c.value;const a=$('#upAY');if(a)UP.addYours=a.value;const s=$('#upSch');if(s)UP.schedule=s.value};
function refBanner(){
  if(UP.duetOf)return `Düet: @${esc(person(vById(UP.duetOf)?.owner).handle)} videosuyla yan yana`;
  if(UP.stitchOf)return `Stitch: @${esc(person(vById(UP.stitchOf)?.owner).handle)} videosunun ilk ${UP.stitchSec} saniyesi`;
  if(UP.soundOf)return `Ses: ${esc(vById(UP.soundOf)?.sound||'')}`;
  if(UP.replyTo)return `@${esc(person(UP.replyTo.u).handle)} yorumuna video yanıtı`;
  if(UP.addYours&&!UP.startChain)return `Senin sıran: ${esc(UP.addYours)}`;
  return '';
}
function previewHTML(){
  const fc='f-'+UP.filter;
  const media=UP.mode==='photos'?(UP.urls[0]?`<img src="${UP.urls[0]}" class="${fc}" alt="">`:I.film):(UP.url?`<video src="${UP.url}" class="${fc}" autoplay muted loop playsinline></video>`:I.film);
  return `<div class="ed-stage" id="edStage">${media}${UP.texts.map((t,i)=>`<div class="overlay-text ${t.style==='bg'?'bg':'sh'}" data-ti="${i}" style="left:${t.x}%;top:${t.y}%">${esc(t.t)}</div>`).join('')}</div>`;
}
SHEETS.upload=function(){
  const left=CFG.dailyUpload-todayUploads(),canAssets=!!App.assets||!App.online,ban=refBanner();
  if(left<=0)return sheet('Yeni gönderi',`<div class="empty"><h3>Bugünlük bu kadar</h3>Bugün ${CFG.dailyUpload} gönderi yükledin. Taslak olarak kaydedebilir, yarın gönderebilirsin.</div>`);
  const hasMedia=UP.mode==='photos'?(UP.urls.length>0):!!UP.url;
  const myShop=local.shop.items,myPl=local.playlists.list;
  sheet(UP.draftId?'Taslak':'Yeni gönderi',`
   ${!App.assets&&App.online?`<div class="banner">Bu hesapla yükleme açık değil. Sayfa sahibinin seni katkıda bulunan olarak eklemesi gerekiyor.</div>`:''}
   ${ban?`<div class="banner">${ban}</div>`:''}
   ${UP.duetOf||UP.stitchOf?'':`<div class="seg" style="margin-bottom:12px"><button aria-pressed="${UP.mode==='video'}" onclick="keepCap();UP.mode='video';SHEETS.upload()">Video</button><button aria-pressed="${UP.mode==='photos'}" onclick="keepCap();UP.mode='photos';SHEETS.upload()">Fotoğraf slaytı</button></div>`}
   <div class="upl-pick">${previewHTML()}
     <div class="grow" style="display:flex;flex-direction:column;gap:8px">
      <label class="drop"><input type="file" ${UP.mode==='photos'?'accept="image/jpeg,image/png,image/webp" multiple':'accept="video/mp4,video/quicktime,video/webm"'} id="upFile" class="sr">
       <span style="width:26px">${I.upload}</span><b>${hasMedia?'Değiştir':UP.mode==='photos'?'Fotoğrafları seç':'Video seç'}</b>
       <span class="xs muted">${UP.mode==='photos'?(UP.files.length?UP.files.length+' fotoğraf':'En fazla 10 fotoğraf'):(UP.file?esc(UP.file.name):'En fazla '+CFG.maxMB+' MB')}</span></label>
      ${hasMedia?`<p class="help" style="margin:0">Yazıları önizlemede sürükleyip yerleştirebilirsin.</p>`:''}
     </div></div>
   ${UP.mode==='photos'&&UP.urls.length>1?`<div class="thumbs">${UP.urls.map(u=>`<img src="${u}" alt="">`).join('')}</div>`:''}
   ${hasMedia?`<span class="lbl">Filtre</span><div class="filters">${FILTERS.map(([k,n])=>`<button aria-pressed="${UP.filter===k}" onclick="keepCap();UP.filter='${k}';SHEETS.upload()"><span class="fp">${UP.mode==='photos'?`<img src="${UP.urls[0]}" class="f-${k}" alt="">`:UP.thumbUrl?`<img src="${UP.thumbUrl}" class="f-${k}" alt="">`:''}</span>${n}</button>`).join('')}</div>
   <span class="lbl">Yazı ekle</span><div class="row"><input class="field" id="txIn" maxlength="40" placeholder="Videonun üstüne yazı"><button class="btn soft" onclick="addText()">Ekle</button></div>
   ${UP.texts.length?`<div class="chips wrapx" style="margin-top:8px">${UP.texts.map((t,i)=>`<button class="chip" onclick="keepCap();UP.texts.splice(${i},1);SHEETS.upload()">${esc(t.t)} ✕</button>`).join('')}<button class="chip" onclick="keepCap();UP.texts.forEach(t=>t.style=t.style==='bg'?'sh':'bg');SHEETS.upload()">Stili değiştir</button></div>`:''}
   ${UP.mode==='video'?`<span class="lbl">Hız</span><div class="seg">${SPEEDS.map(s=>`<button aria-pressed="${UP.speed===s}" onclick="keepCap();UP.speed=${s};SHEETS.upload()">${String(s).replace('.',',')}x</button>`).join('')}</div>`:''}
   ${UP.stitchOf?`<span class="lbl">Orijinalden kaç saniye?</span><div class="seg">${[3,5,10].map(s=>`<button aria-pressed="${UP.stitchSec===s}" onclick="keepCap();UP.stitchSec=${s};SHEETS.upload()">${s} sn</button>`).join('')}</div>`:''}`:''}
   <div class="row" style="margin-top:20px;margin-bottom:8px"><label class="b grow" for="upCap" style="font-size:14px">Açıklama</label>${App.sample&&hasMedia?`<button class="btn soft sm" onclick="aiCaption(this)">Yapay zekâ önersin</button>`:''}</div>
   <textarea class="field" id="upCap" rows="2" maxlength="300" placeholder="Videonu anlat. @ ile birinden bahsedebilirsin.">${esc(UP.cap)}</textarea>
   <span class="lbl">Kategori <small>tek etiket</small></span>
   <div class="chips wrapx">${CATS.map(c=>`<button class="chip" aria-pressed="${UP.cat===c.id}" onclick="upCat(${c.id})">${c.e} ${c.name}</button>`).join('')}</div>
   ${UP.cat===2?`<label class="lbl" for="gameIn">Oyun <small>oyun veritabanından</small></label>
     ${UP.game?`<div class="picked"><span style="width:22px">${I.pad}</span><span class="grow">${esc(game(UP.game).name)}</span><button class="close" style="background:rgba(255,255,255,.14);color:#fff" aria-label="Oyunu kaldır" onclick="UP.game=null;keepCap();SHEETS.upload()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`
      :`<input class="field" id="gameIn" placeholder="Oyunun adını yaz, örneğin pubg" autocomplete="off"><div id="gameAc"></div>`}`:''}
   <h2 class="sec">Seçenekler</h2>
   <div class="group">
    ${myShop.length?`<div class="opt-row"><span class="grow"><div class="b">Ürün etiketle</div></span><select class="field" style="width:50%;height:40px" onchange="UP.productId=this.value||null"><option value="">Yok</option>${myShop.map(p=>`<option value="${esc(p.id)}" ${UP.productId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>`:''}
    ${myPl.length?`<div class="opt-row"><span class="grow"><div class="b">Listeye ekle</div></span><select class="field" style="width:50%;height:40px" onchange="UP.playlistId=this.value||null"><option value="">Yok</option>${myPl.map(p=>`<option value="${esc(p.id)}" ${UP.playlistId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>`:''}
    ${UP.addYours&&!UP.startChain?'':`<button class="opt-row" onclick="keepCap();UP.startChain=!UP.startChain;SHEETS.upload()"><span class="grow"><div class="b">Senin sıran zinciri başlat</div><div class="help">İzleyiciler aynı konuyla kendi videosunu ekler.</div></span>${tg(UP.startChain)}</button>
     ${UP.startChain?`<div style="padding:0 0 12px"><input class="field" id="upAY" maxlength="50" placeholder="Örneğin En sevdiğin sokak yemeği" value="${esc(UP.addYours)}"></div>`:''}`}
    <button class="opt-row" onclick="keepCap();UP.aiLabel=!UP.aiLabel;SHEETS.upload()"><span class="grow"><div class="b">Yapay zekâ ile üretildi</div><div class="help">Video yapay zekâyla oluşturulduysa etiket ekle.</div></span>${tg(UP.aiLabel)}</button>
    <div class="opt-row"><span class="grow"><div class="b">Zamanla</div><div class="help">Onaydan sonra bu saatte yayına girer.</div></span><input type="datetime-local" class="field" id="upSch" style="width:52%;height:40px;font-size:13px" value="${esc(UP.schedule)}"></div>
   </div>
   <button class="check" role="checkbox" aria-checked="${UP.rules}" onclick="UP.rules=!UP.rules;this.setAttribute('aria-checked',UP.rules)" style="margin-top:14px"><span class="bx">${I.check}</span><span>Bu içerik bana ait ve orijinal. Kurallara uyduğumu ve içeriğin sorumluluğunun bende olduğunu kabul ediyorum.</span></button>
   <div class="row" style="margin-top:8px"><button class="btn soft" style="flex:1" onclick="submitUpload(true)" ${canAssets?'':'disabled'}>Taslak kaydet</button><button class="btn primary" style="flex:2" onclick="submitUpload(false)" ${canAssets?'':'disabled'}>Gönder</button></div>
   <p class="help" style="text-align:center">Yapay zekâ içeriği ve etiketi kontrol eder, sonra yönetici onaylar.</p>`);
  $('#upFile').onchange=e=>pickFiles([...e.target.files]);
  $('#upCap').oninput=e=>UP.cap=e.target.value;
  const gi=$('#gameIn');if(gi)gi.oninput=()=>gameSearch(gi.value);
  bindTextDrag();
};
function upCat(id){keepCap();UP.cat=id;if(id!==2)UP.game=null;SHEETS.upload();if(id===2)setTimeout(()=>$('#gameIn')?.focus(),60)}
function addText(){keepCap();const t=$('#txIn').value.trim();if(!t)return;UP.texts.push({t,x:50,y:30+UP.texts.length*12,style:UP.txtStyle});SHEETS.upload()}
function bindTextDrag(){
  const st=$('#edStage');if(!st)return;
  st.querySelectorAll('[data-ti]').forEach(el=>{el.onpointerdown=e=>{e.preventDefault();el.setPointerCapture(e.pointerId);const r=st.getBoundingClientRect(),i=+el.dataset.ti;
    el.onpointermove=m=>{const x=Math.max(8,Math.min(92,(m.clientX-r.left)/r.width*100)),y=Math.max(6,Math.min(94,(m.clientY-r.top)/r.height*100));el.style.left=x+'%';el.style.top=y+'%';UP.texts[i].x=Math.round(x);UP.texts[i].y=Math.round(y)};
    el.onpointerup=()=>{el.onpointermove=null}}});
}
async function pickFiles(fs){
  keepCap();if(!fs.length)return;
  if(UP.mode==='photos'){
    fs=fs.filter(f=>/^image\//.test(f.type)).slice(0,10);if(!fs.length)return toast('Fotoğraf seç');
    if(fs.some(f=>f.size>CFG.maxMB*1048576))return toast(`Her fotoğraf en fazla ${CFG.maxMB} MB olabilir`);
    UP.urls.forEach(u=>URL.revokeObjectURL(u));UP.files=fs;UP.urls=fs.map(f=>URL.createObjectURL(f));UP.assetIds=null;
  }else{
    const f=fs[0];if(!/^video\//.test(f.type))return toast('Lütfen bir video dosyası seç');
    if(f.size>CFG.maxMB*1048576)return toast(`Video ${CFG.maxMB} MB'tan büyük. Daha kısa bir video dene.`);
    if(UP.url&&UP.url.startsWith('blob:'))URL.revokeObjectURL(UP.url);UP.file=f;UP.url=URL.createObjectURL(f);UP.assetId=null;
    try{const {frames,dur}=await grabFrames(UP.url,[.5]);UP.dur=dur;UP.thumbUrl=frames[0].toDataURL('image/jpeg',.6)}catch{}
  }
  SHEETS.upload();
}
/* kareler, parmak izi */
function grabFrames(url,fracs){
  return new Promise((res,rej)=>{
    const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.crossOrigin='anonymous';v.src=url;
    const out=[];let i=0;const fail=setTimeout(()=>rej(new Error('Video okunamadı')),20000);
    v.onerror=()=>{clearTimeout(fail);rej(new Error('Bu video biçimi tarayıcıda açılamıyor'))};
    const fixDur=cb=>{if(isFinite(v.duration)&&v.duration>0)return cb(v.duration);let done=false;const fin=()=>{if(done)return;if(isFinite(v.duration)&&v.duration>0){done=true;v.ontimeupdate=null;cb(v.duration)}};v.ondurationchange=fin;v.ontimeupdate=fin;v.currentTime=1e7;setTimeout(()=>{if(!done){done=true;cb(UP.dur||5)}},4000)};
    v.onloadedmetadata=()=>fixDur(dur=>{const next=()=>{if(i>=fracs.length){clearTimeout(fail);return res({frames:out,dur})}v.currentTime=Math.min(dur-.05,Math.max(.05,dur*fracs[i]))};
      v.onseeked=()=>{const w=480,h=Math.round(w*(v.videoHeight/v.videoWidth||16/9));const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(v,0,0,w,h);out.push(c);i++;next()};next()});
  });
}
function imgCanvas(url){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>{const w=480,h=Math.round(w*im.naturalHeight/im.naturalWidth);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);res(c)};im.onerror=()=>rej(new Error('Fotoğraf açılamadı'));im.src=url})}
const toBlob=(c,q=.82)=>new Promise(r=>c.toBlob(r,'image/jpeg',q));
function dhash(canvas){
  const c=document.createElement('canvas');c.width=9;c.height=8;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(canvas,0,0,9,8);
  const d=x.getImageData(0,0,9,8).data;let bits='';const l=p=>d[p]*.299+d[p+1]*.587+d[p+2]*.114;
  for(let y=0;y<8;y++)for(let xx=0;xx<8;xx++){const a=(y*9+xx)*4;bits+=l(a)>l(a+4)?'1':'0'}
  return bits.match(/.{4}/g).map(n=>parseInt(n,2).toString(16)).join('');
}
const hamming=(a,b)=>{let n=0;for(let i=0;i<16;i++){let x=parseInt(a[i],16)^parseInt(b[i],16);while(x){n+=x&1;x>>=1}}return n};
function isDuplicate(ph,selfId){
  const ch=s=>s.match(/.{16}/g)||[];const mine=ch(ph);
  const others=[...Object.entries(D.feed).filter(([id])=>id!==selfId).map(([,f])=>f.phash),...Object.entries(D.myUploads).filter(([id,u])=>id!==selfId&&u.status!=='rejected'&&u.status!=='draft').map(([,u])=>u.phash)].filter(Boolean);
  return others.some(o=>{const oc=ch(o);let close=0;mine.forEach((m,i)=>{if(oc[i]&&hamming(m,oc[i])<=8)close++});return close>=Math.min(2,mine.length)});
}
async function aiCaption(btn){
  keepCap();btn.disabled=true;btn.textContent='Düşünüyor';
  try{const frames=UP.mode==='photos'?await Promise.all(UP.urls.slice(0,3).map(imgCanvas)):(await grabFrames(UP.url,[.2,.5,.8])).frames;
    const lim=await App.sample.limits();if(!lim.images)throw 0;
    const r=await App.sample.json(`Bu kareler kısa bir sosyal medya videosundan. Türkçe, samimi, en fazla 15 kelimelik bir açıklama yaz. Emoji en fazla 1 tane. Hashtag kullanma. Yalnızca {"caption":"..."} döndür.`,{images:await Promise.all(frames.map(f=>toBlob(f,.7))),modelTier:'quick',cache:false});
    if(r&&r.caption){UP.cap=String(r.caption).slice(0,300);SHEETS.upload()}}
  catch(e){toast(e&&e.code==='not_granted'?'Yapay zekâ izni verilmedi':'Öneri alınamadı')}
  finally{if(btn.isConnected){btn.disabled=false;btn.textContent='Yapay zekâ önersin'}}
}
function submitUpload(draft){
  keepCap();
  const hasMedia=UP.mode==='photos'?UP.urls.length:UP.url;
  if(!hasMedia)return toast(UP.mode==='photos'?'Önce fotoğraf seç':'Önce bir video seç');
  if(!draft){
    if(!UP.cat)return toast('Bir kategori seç');
    if(UP.cat===2&&!UP.game)return toast('Oyun videolarında oyunu seçmek zorunlu');
    if(!UP.rules)return toast('Devam etmek için kuralları kabul et');
    if(todayUploads()>=CFG.dailyUpload)return toast('Günlük yükleme sınırına ulaştın');
    if(UP.startChain&&!UP.addYours.trim())return toast('Zincir konusunu yaz');
  }
  runPipeline(draft);
}
async function runPipeline(draft){
  UP.busy=true;
  const c=cat(UP.cat||8),g=UP.game&&game(UP.game);
  const steps=draft?[{k:'up',t:'Taslak kaydediliyor',sub:'Dosya güvenli depolamaya gönderiliyor'}]:[
   {k:'frames',t:'İçerik okunuyor',sub:'Kontrol için kareler alınıyor'},
   {k:'dup',t:'Tekrar ve çalıntı kontrolü',sub:'Parmak izi daha önce yüklenenlerle karşılaştırılıyor'},
   {k:'ai',t:'Yapay zekâ kontrolü',sub:g?`Güvenlik ve oyunun “${g.name}” olup olmadığı`:`Güvenlik ve “${c.name}” kategorisine uygunluk`},
   {k:'up',t:'Yükleniyor',sub:'Dosyalar güvenli depolamaya gönderiliyor'}];
  sheet(draft?'Kaydediliyor':'Kontrol ediliyor',`<div class="steps">${steps.map((s,i)=>`<div class="stp" id="st-${s.k}"><span class="d">${i+1}</span><div><div class="t">${s.t}</div><div class="sub">${esc(s.sub)}</div></div></div>`).join('')}</div><div id="stRes"></div>`);
  const mark=(k,state,sub)=>{const el=$('#st-'+k);if(!el)return;el.className='stp '+state;const d=el.querySelector('.d');if(state==='ok')d.innerHTML=I.check.replace('currentColor','#fff');else if(state==='bad')d.textContent='!';else if(state==='warn')d.textContent='?';else d.textContent='';if(sub)el.querySelector('.sub').textContent=sub};
  const finish=(kind,title,msg,extra='')=>{UP.busy=false;$('#shTitle').textContent=title;$('#stRes').innerHTML=`<div class="result ${kind}"><h4>${title}</h4><p>${msg}</p></div>${extra}`};
  const vid=UP.draftId||rid();let frames=[],dur=UP.dur||0,ph=null,ai=null,status=draft?'draft':'pending',reason=null;
  try{
    if(!draft||true){
      if(!draft)mark('frames','run');
      if(UP.mode==='photos'){frames=await Promise.all(UP.urls.slice(0,3).map(imgCanvas));dur=Math.max(6,UP.urls.length*3)}
      else{const r=await grabFrames(UP.url,[.15,.5,.85]);frames=r.frames;dur=r.dur}
      if(!draft)mark('frames','ok',UP.mode==='photos'?`${UP.urls.length} fotoğraf okundu`:`${Math.round(dur)} saniyelik video, 3 kare alındı`);
      ph=frames.map(dhash).join('');
    }
    if(!draft){
      mark('dup','run');await new Promise(r=>setTimeout(r,300));
      if(isDuplicate(ph,vid)&&!UP.duetOf){mark('dup','bad','Bu içerik daha önce yüklenmiş');status='rejected';reason='Bu içerik daha önce yüklenmiş (tekrar veya çalıntı)'}
      else mark('dup','ok','Benzer içerik bulunmadı');
      if(status!=='rejected'){
        mark('ai','run');ai=await aiCheck(frames,c,g);
        if(ai.unavailable)mark('ai','warn','Yapay zekâ kontrolü yapılamadı. Yönetici elle inceleyecek.');
        else if(!ai.safe){mark('ai','bad','Uygunsuz içerik: '+(ai.issues||[]).join(', '));status='rejected';reason='Uygunsuz içerik: '+(ai.issues||[]).join(', ')}
        else if(g&&ai.game_ok===false&&(ai.confidence||0)>=.7){mark('ai','bad',`Bu ${g.name} gibi görünmüyor${ai.detected_game?', '+ai.detected_game+' olabilir':''}`);status='rejected';reason=`Seçilen oyunla uyuşmuyor (${g.name})`}
        else if(ai.category_ok===false&&(ai.confidence||0)>=.7)mark('ai','warn','Kategori şüpheli: '+(ai.summary||''));
        else mark('ai','ok',ai.summary||'Sorun bulunmadı');
      }
    }
    mark('up','run');
    let assetId=UP.assetId,assetIds=UP.assetIds,thumbId=UP.thumbId;
    if(App.assets){
      if(UP.mode==='photos'&&!assetIds){assetIds=[];for(const f of UP.files){const a=await App.assets.upload(f);assetIds.push(a.id)}}
      if(UP.mode==='video'&&!assetId){assetId=(await App.assets.upload(UP.file)).id}
      if(!thumbId)thumbId=(await App.assets.upload(await toBlob(frames[Math.min(1,frames.length-1)]))).id;
      UP.assetId=assetId;UP.assetIds=assetIds;UP.thumbId=thumbId;mark('up','ok','Yüklendi');
    }else mark('up','warn','Bu görünümde dosya kaydedilemiyor');
    const sch=UP.schedule?new Date(UP.schedule).getTime():0;
    const rec={type:UP.mode,assetId:UP.mode==='video'?assetId:null,assetIds:UP.mode==='photos'?assetIds:null,thumbId,cap:UP.cap.trim().slice(0,300),cat:UP.cat||8,game:UP.game||null,dur:Math.round(dur),phash:ph,status,reason,
      edit:{filter:UP.filter,texts:UP.texts.slice(0,5),speed:UP.speed},duetOf:UP.duetOf,stitchOf:UP.stitchOf,stitchSec:UP.stitchSec,soundOf:UP.soundOf,soundName:UP.soundOf?(vById(UP.soundOf)?.sound||null):null,
      replyTo:UP.replyTo,addYours:(UP.startChain||UP.addYours)?(UP.addYours||'').trim().slice(0,50)||null:null,aiLabel:UP.aiLabel,productId:UP.productId,playlistId:UP.playlistId,
      city:(D.me&&D.me.city)||'',scheduledAt:sch>now()?sch:0,
      ai:ai&&!ai.unavailable?{safe:ai.safe,category_ok:ai.category_ok,game_ok:ai.game_ok??null,detected_game:ai.detected_game||null,confidence:ai.confidence||null,summary:ai.summary||'',issues:ai.issues||[]}:(draft?null:{unavailable:true}),createdAt:now()};
    if(App.db)await App.db.doc(`uploads/${App.uid}/items/${vid}`).set(rec);else D.myUploads[vid]={...rec,localUrl:UP.url};
    if(UP.playlistId&&!draft){const pl=local.playlists.list.find(p=>p.id===UP.playlistId);if(pl&&!pl.vids.includes(vid)){pl.vids.push(vid);saveOwn('playlists')}}
    if(draft){finish('ok','Taslak kaydedildi','Profilindeki Taslaklar sekmesinden açıp gönderebilirsin.',`<button class="btn soft full" style="margin-top:12px" onclick="closeSheet();UI.pfTab='drafts';go('profile')">Taslaklara git</button>`);resetUP();return}
    if(status==='rejected')finish('bad','Gönderi reddedildi',esc(reason)+'. Bu gönderi için ödül verilmez.',`<button class="btn soft full" style="margin-top:12px" onclick="resetUP();openUpload()">Başka gönderi yükle</button>`);
    else finish('ok','İncelemeye alındı',`Otomatik kontrollerden geçti. Yönetici onayladığında ${rec.scheduledAt?'belirlediğin saatte ':''}yayına girer ve kumbarana ${tl(CFG.reward)} eklenir.`,
      `${App.admin?`<button class="btn dark full" style="margin-top:12px" onclick="openSheet('admin')">Yönetici olarak incele</button>`:''}<button class="btn soft full" style="margin-top:8px" onclick="closeSheet();go('profile')">Profilime git</button>`);
    resetUP();
  }catch(e){
    console.error(e);UP.busy=false;
    finish('bad','Yükleme tamamlanamadı',esc(e&&e.message?e.message:'Beklenmeyen bir hata oldu')+'. Tekrar dene.',`<button class="btn soft full" style="margin-top:12px" onclick="closeSheet();openUpload()">Geri dön</button>`);
  }
}
async function aiCheck(frames,c,g){
  const s=App.sample;if(!s)return {unavailable:true};
  try{
    const lim=await s.limits().catch(()=>null);if(!lim||!lim.images)return {unavailable:true};
    const imgs=(await Promise.all(frames.map(f=>toBlob(f,.75)))).slice(0,lim.images.maxCount||3);
    const prompt=`Sen bir kısa video uygulamasının içerik denetçisisin. Ekteki ${imgs.length} görüntü, bir kullanıcının yüklediği gönderiden alınmış kareler.
Kullanıcının seçtiği kategori: "${c.name}".${g?`\nKullanıcının seçtiği oyun: "${g.name}".`:''}
Kategoriler: ${CATS.map(x=>x.name).join(', ')}.
Değerlendir:
1. Güvenlik: çıplaklık/cinsel içerik, gerçek şiddet veya kan, nefret sembolleri, uyuşturucu, kendine zarar, çocukları tehlikeye atan içerik var mı?
2. Kareler seçilen kategoriye uyuyor mu?${g?`\n3. Oyun görüntüsü varsa bu oyun gerçekten "${g.name}" mı? Arayüz, harita, karakterler ve logolara bak.`:''}
Yalnızca şu JSON'u döndür:
{"safe":true,"issues":[],"category_ok":true,"detected_category":"Kategori adı",${g?'"game_ok":true,"detected_game":"oyun adı veya null",':''}"confidence":0.0,"summary":"Türkçe, en fazla 12 kelimelik tek cümle"}`;
    const r=await s.json(prompt,{images:imgs,modelTier:'default'});
    if(!r||typeof r!=='object')return {unavailable:true};
    return {safe:r.safe!==false,issues:Array.isArray(r.issues)?r.issues.map(String).slice(0,4):[],category_ok:r.category_ok!==false,game_ok:g?(r.game_ok===false?false:true):null,detected_game:r.detected_game&&r.detected_game!=='null'?String(r.detected_game):null,confidence:Number(r.confidence)||0,summary:String(r.summary||'').slice(0,120)};
  }catch(e){console.warn('ai',e);return {unavailable:true,code:e&&e.code}}
}
