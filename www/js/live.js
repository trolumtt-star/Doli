"use strict";
/* ================================================================
   CANLI ODA — anlık sohbet, kalp, hediye, izleyici sayısı, eşleşme
   Görüntü: yayıncının seçtiği video (tarayıcı sayfası kamera açamaz).
   ================================================================ */
let LIVE={host:null,room:null,offs:[],beat:null,chat:[],hidden:new Set(),viewers:0,tick:null};
const liveActive=()=>Object.entries(D.lives).filter(([u,l])=>l&&l.active&&now()-(l.beat||l.startedAt||0)<150000&&!D.prefs.blocked[u]);
function openLiveList(){openSheet('lives')}
SHEETS.lives=function(){
  const list=liveActive();
  sheet('Canlı yayınlar',`${list.length?`<div class="live-list">${list.map(([u,l])=>{const p=person(u),v=l.vid&&vById(l.vid);return `<button class="live-card" onclick="closeSheet();joinLive('${esc(u)}')">${v&&v.thumb?`<img src="${esc(v.thumb)}" alt="">`:`<div style="position:absolute;inset:0;background:${esc(p.c)}"></div>`}<span class="live-tag">CANLI</span><div class="info">@${esc(p.handle)}<div class="xs" style="font-weight:600;opacity:.9">${esc(l.title||'')}</div></div></button>`}).join('')}</div>`
   :'<div class="empty"><h3>Şu an canlı yayın yok</h3>İlk yayını sen başlat.</div>'}
   <button class="btn primary full" style="margin-top:16px" onclick="openSheet('goLive')">Canlı yayın başlat</button>`);
};
SHEETS.goLive=function(){
  if(needAccount())return;
  const mine=Object.entries(D.feed).filter(([,f])=>f.owner===App.uid&&(f.type||'video')==='video').map(([id])=>vById(id)).filter(Boolean);
  sheet('Canlı yayın başlat',`<div class="banner">Tarayıcı sayfası kamera açamadığı için yayında görüntü olarak videolarından biri döner. Sohbet, kalpler, hediyeler ve izleyici sayısı gerçek zamanlıdır.</div>
   <label class="lbl" for="lvT">Yayın başlığı</label><input class="field" id="lvT" maxlength="60" placeholder="Örneğin Soru cevap, PUBG turnuvası">
   <span class="lbl">Arka plan videosu</span><div class="chips wrapx" id="lvV"><button class="chip" aria-pressed="true" data-v="">Düz renk</button>${mine.map(v=>`<button class="chip" aria-pressed="false" data-v="${esc(v.id)}">${esc((v.cap||'Video').slice(0,20))}</button>`).join('')}</div>`);
  foot(`<button class="btn primary full" onclick="startLive()">Yayını başlat</button>`);
  $('#lvV').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;$$('#lvV .chip').forEach(x=>x.setAttribute('aria-pressed',x===b))};
};
async function startLive(){
  if(!App.db)return toast('Bu görünümde yayın başlatılamıyor');
  const title=$('#lvT').value.trim()||'Canlı yayın',vid=$('#lvV [aria-pressed=true]').dataset.v||null;
  const doc={active:true,title,vid,startedAt:now(),beat:now(),matchWith:null,matchStart:0};
  try{await App.db.doc(`lives/${App.uid}`).set(doc);D.lives[App.uid]=doc;closeSheet();joinLive(App.uid)}catch(e){dbErr(e)}
}
function liveGiftsTo(host,since){let n=0;for(const [u,d] of Object.entries({...D.gifts,[App.uid]:local.gifts}))for(const g of (d&&d.sent)||[])if(g.to===host&&g.kind==='live'&&g.at>=since)n+=g.amount;return n}
async function joinLive(host){
  if(LIVE.host)liveLeave();
  const l=D.lives[host];if(!l||!l.active)return toast('Bu yayın bitti');
  LIVE={host,room:null,offs:[],beat:null,chat:[{sys:true,t:'Yayına hoş geldin. Kurallara uy, saygılı ol.'}],hidden:new Set(),viewers:1,tick:null};
  $('#liveLayer').classList.add('on');renderLive();
  if(currentScreen()==='home'&&active>=0&&!paused)togglePause(cur());
  if(App.room){
    try{
      const r=await App.room.join('live-'+hashName(host));LIVE.room=r;
      r.presence({in:true,uid:App.uid}).catch(()=>{});
      LIVE.offs.push(r.on('lchat',m=>{const d=m.data||{};if(!m.by||LIVE.hidden.has(m.by))return;LIVE.chat.push({by:m.by,t:String(d.t||'').slice(0,200)});LIVE.chat=LIVE.chat.slice(-80);drawChat()}));
      LIVE.offs.push(r.on('lheart',()=>floatHeart()));
      LIVE.offs.push(r.on('lgift',m=>{const g=gift((m.data||{}).g);if(!g||m.isMe)return;giftFly(g,`@${person(m.by).handle} ${g.name} gönderdi`);LIVE.chat.push({sys:true,t:`@${person(m.by).handle} ${g.e} ${g.name} gönderdi`});drawChat();renderLiveTop()}));
      LIVE.offs.push(r.on('lmod',m=>{if(m.by!==host)return;const d=m.data||{};if(d.hide){LIVE.hidden.add(d.hide);LIVE.chat=LIVE.chat.filter(c=>c.by!==d.hide);drawChat()}}));
      LIVE.offs.push(r.onPeers(ch=>{LIVE.viewers=ch.peers.length;renderLiveTop()}));
      const li=$('#lvIn');if(li)li.placeholder='Bir şey yaz';
      if(host!==App.uid)r.emit('lchat',{t:'katıldı 👋'}).catch(()=>{});
    }catch(e){console.warn('room',e);LIVE.chat.push({sys:true,t:'Anlık sohbete bağlanılamadı.'});drawChat()}
  }else{LIVE.chat.push({sys:true,t:'Bu görünümde anlık sohbet kullanılamıyor.'});drawChat()}
  if(host===App.uid)LIVE.beat=setInterval(()=>{if(App.db)App.db.doc(`lives/${App.uid}`).update({beat:now()}).catch(()=>{})},60000);
  LIVE.tick=setInterval(renderLiveTop,1000);
}
function renderLive(){
  const host=LIVE.host,l=D.lives[host]||{},p=person(host),v=l.vid&&vById(l.vid),me=host===App.uid;
  $('#liveLayer').innerHTML=`<div class="live-wrap"><div class="media">${v?(v.real?`<video class="vid ${'f-'+((v.edit&&v.edit.filter)||'none')}" src="${esc(v.src)}" autoplay loop playsinline ${UI.muted?'muted':''}></video>`:sceneHTML(v)):`<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 35%,${esc(p.c)},#000 75%)"></div><div style="position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);font-size:120px">${esc(p.e)}</div>`}</div><div class="fade"></div>
   <div class="live-top" id="liveTop"></div><div class="match" id="liveMatch"></div>
   <div class="live-chat" id="liveChat" aria-live="polite"></div><div class="hearts" id="hearts"></div>
   <form class="live-bottom" onsubmit="event.preventDefault();liveSend()"><input id="lvIn" maxlength="200" placeholder="${LIVE.room||!App.room?'Bir şey yaz':'Bağlanıyor'}" autocomplete="off">
    ${me?`<button type="button" class="round" aria-label="Eşleşme" onclick="openSheet('liveMatch')">⚔️</button>`:`<button type="button" class="round" aria-label="Hediye" onclick="openSheet('gift',{to:'${esc(host)}',live:true})">🎁</button>`}
    <button type="button" class="round" aria-label="Kalp gönder" onclick="sendHeart()">❤️</button></form></div>`;
  renderLiveTop();drawChat();
}
function renderLiveTop(){
  const t=$('#liveTop');if(!t||!LIVE.host)return;const host=LIVE.host,l=D.lives[host]||{},p=person(host),me=host===App.uid;
  const mins=Math.floor((now()-(l.startedAt||now()))/60000);const tot=liveGiftsTo(host,l.startedAt||0);
  t.innerHTML=`<div class="live-host">${avaHTML(p)}<div style="min-width:0"><div class="b ell" style="font-size:13.5px">@${esc(p.handle)}</div><div class="xs" style="opacity:.85">${tl(tot)} hediye</div></div></div><span class="live-tag">CANLI</span><span class="viewers">👁 ${LIVE.viewers}</span><span class="xs" style="opacity:.8">${mins} dk</span><span style="flex:1"></span>
   ${me?`<button class="btn sm" style="background:var(--nar);color:#fff" onclick="endLive()">Bitir</button>`:''}<button class="back" aria-label="Kapat" onclick="closeLayers()"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
  const m=$('#liveMatch');const other=l.matchWith;
  if(other&&D.lives[other]&&D.lives[other].active&&now()-l.matchStart<180000){
    const a=liveGiftsTo(host,l.matchStart),b=liveGiftsTo(other,l.matchStart),left=Math.max(0,180-Math.floor((now()-l.matchStart)/1000));
    m.innerHTML=`<div class="mbar"><div class="a" style="flex-grow:${a+1}">${tl(a)}</div><div class="b" style="flex-grow:${b+1}">${tl(b)}</div></div><div class="mt">@${esc(p.handle)} ⚔️ @${esc(person(other).handle)} · ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}</div>`;
  }else if(other&&l.matchStart&&now()-l.matchStart<190000){const a=liveGiftsTo(host,l.matchStart),b=liveGiftsTo(other,l.matchStart);m.innerHTML=`<div class="mt" style="font-size:15px">${a===b?'Berabere':a>b?`@${esc(p.handle)} kazandı`:`@${esc(person(other).handle)} kazandı`}</div>`}
  else m.innerHTML='';
}
function drawChat(){const c=$('#liveChat');if(!c)return;const me=LIVE.host===App.uid;
  c.innerHTML=LIVE.chat.map(x=>x.sys?`<div class="sys">${esc(x.t)}</div>`:`<div><b>${esc(person(x.by).handle)}${fanOf(x.by,LIVE.host)?'<span class="fan">Hayran</span>':''}</b>${esc(x.t)}${me&&x.by!==App.uid?` <button class="xs" style="opacity:.6;color:#fff" onclick="liveHide('${esc(x.by)}')">gizle</button>`:''}</div>`).join('');c.scrollTop=c.scrollHeight}
function liveSend(){const i=$('#lvIn'),t=i.value.trim();if(!t)return;i.value='';if(needAccount())return;
  if(!LIVE.room){LIVE.chat.push({by:App.uid,t});drawChat();return}
  LIVE.room.emit('lchat',{t}).catch(e=>{if(e&&e.code==='not_permitted')toast('Bu hesapla sohbete yazamazsın')})}
function sendHeart(){floatHeart();LIVE.room&&LIVE.room.emit('lheart',{}).catch(()=>{})}
function floatHeart(){const h=$('#hearts');if(!h)return;const s=document.createElement('span');s.textContent=['❤️','💖','🧡','💛'][Math.floor(Math.random()*4)];s.style.setProperty('--dx',(Math.random()*60-30)+'px');h.appendChild(s);setTimeout(()=>s.remove(),2500)}
function liveGiftSent(g){if(!LIVE.host)return;LIVE.chat.push({sys:true,t:`Sen ${g.e} ${g.name} gönderdin`});drawChat();renderLiveTop();LIVE.room&&LIVE.room.emit('lgift',{g:g.id}).catch(()=>{})}
function liveHide(uid){LIVE.hidden.add(uid);LIVE.chat=LIVE.chat.filter(c=>c.by!==uid);drawChat();LIVE.room&&LIVE.room.emit('lmod',{hide:uid}).catch(()=>{});toast('Bu kişinin mesajları gizlendi')}
SHEETS.liveMatch=function(){
  const others=liveActive().filter(([u])=>u!==App.uid);
  sheet('Eşleşme',`<p class="s muted" style="line-height:1.5">Başka bir yayıncıyla 3 dakikalık hediye yarışı başlat. Daha çok hediye alan kazanır.</p>
   ${others.length?others.map(([u,l])=>{const p=person(u);return `<div class="person">${avaHTML(p)}<div class="grow"><b>@${esc(p.handle)}</b><div class="xs muted">${esc(l.title||'')}</div></div><button class="follow" onclick="startMatch('${esc(u)}')">Eşleş</button></div>`}).join(''):'<div class="empty"><h3>Şu an başka yayın yok</h3></div>'}`);
};
async function startMatch(other){const st=now();try{await App.db.doc(`lives/${App.uid}`).update({matchWith:other,matchStart:st});D.lives[App.uid]={...D.lives[App.uid],matchWith:other,matchStart:st};closeSheet();toast('Eşleşme başladı');LIVE.room&&LIVE.room.emit('lchat',{t:`⚔️ @${person(other).handle} ile eşleşme başladı`}).catch(()=>{})}catch(e){dbErr(e)}}
async function endLive(){if(App.db){try{await App.db.doc(`lives/${App.uid}`).update({active:false,endedAt:now()})}catch(e){dbErr(e)}}closeLayers();toast('Yayın bitti')}
function liveLeave(){
  if(!LIVE.host)return;clearInterval(LIVE.beat);clearInterval(LIVE.tick);LIVE.offs.forEach(f=>{try{f()}catch{}});
  if(LIVE.room)LIVE.room.leave().catch(()=>{});
  LIVE={host:null,room:null,offs:[],beat:null,chat:[],hidden:new Set(),viewers:0,tick:null};
}
function liveSoft(){if(LIVE.host&&$('#liveLayer').classList.contains('on')){const l=D.lives[LIVE.host];if(!l||!l.active){toast('Yayın bitti');closeLayers()}else renderLiveTop()}}
