"use strict";
/* ================================================================
   UÇTAN UCA ŞİFRELİ MESAJLAŞMA (ECDH P-256 + AES-GCM)
   Mesaj içeriği veritabanında şifreli durur; anahtarlar yalnızca
   kullanıcının kendi gizli alanındadır (data/users/<id>/keys).
   ================================================================ */
const CRY={priv:null,pk:null,shared:{},chatKeys:{},plain:{}};
const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const EC={name:'ECDH',namedCurve:'P-256'};
async function initKeys(){
  if(!App.online||!(window.crypto&&crypto.subtle))return;
  try{
    const ref=App.db.doc(`data/users/${App.uid}/keys`);const s=await ref.get();let privJwk,pubJwk;
    if(s.exists&&s.data().priv){({priv:privJwk,pub:pubJwk}=s.data())}
    else{const kp=await crypto.subtle.generateKey(EC,true,['deriveKey']);privJwk=await crypto.subtle.exportKey('jwk',kp.privateKey);pubJwk=await crypto.subtle.exportKey('jwk',kp.publicKey);await ref.set({priv:privJwk,pub:pubJwk,at:now()})}
    CRY.priv=await crypto.subtle.importKey('jwk',privJwk,EC,false,['deriveKey']);
    CRY.pk={kty:pubJwk.kty,crv:pubJwk.crv,x:pubJwk.x,y:pubJwk.y};
    if(D.me&&(!D.me.pk||D.me.pk.x!==CRY.pk.x)){D.me.pk=CRY.pk;D.profiles[App.uid]=D.me;saveProfile()}
  }catch(e){console.warn('keys',e)}
}
async function sharedKey(pk){
  const k=pk.x+pk.y;if(CRY.shared[k])return CRY.shared[k];
  const pub=await crypto.subtle.importKey('jwk',{...pk,ext:true},EC,false,[]);
  return CRY.shared[k]=await crypto.subtle.deriveKey({name:'ECDH',public:pub},CRY.priv,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function enc(key,data){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,typeof data==='string'?new TextEncoder().encode(data):data);return {iv:b64(iv),ct:b64(ct)}}
async function dec(key,o){const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(o.iv)},key,unb64(o.ct));return pt}
async function chatKey(cid){
  if(CRY.chatKeys[cid])return CRY.chatKeys[cid];const c=D.chats[cid];if(!c||!c.keys||!c.keys[App.uid]||!CRY.priv)return null;
  const sk=await sharedKey(c.byPk);const raw=await dec(sk,c.keys[App.uid]);
  return CRY.chatKeys[cid]=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
}
async function createChat(members,name){
  if(!CRY.priv)return toast('Mesajlaşma bu görünümde kullanılamıyor');
  const all=[...new Set([App.uid,...members])];
  const missing=all.filter(u=>u!==App.uid&&!person(u).pk);
  if(missing.length)return toast(`@${person(missing[0]).handle} henüz mesajlaşmayı açmamış. Uygulamaya girdiğinde yazabilirsin.`),null;
  const raw=crypto.getRandomValues(new Uint8Array(32));const keys={};
  for(const u of all){const pk=u===App.uid?CRY.pk:person(u).pk;keys[u]=await enc(await sharedKey(pk),raw)}
  const cid=rid();const doc={members:all,name:name||'',by:App.uid,byPk:CRY.pk,keys,at:now(),lastAt:now(),group:all.length>2};
  await App.db.doc(`chats/${cid}`).set(doc);D.chats[cid]=doc;return cid;
}
async function sendMsg(cid,payload){
  const k=await chatKey(cid);if(!k)return toast('Bu sohbetin anahtarı açılamadı');
  const body=await enc(k,JSON.stringify(payload));const at=now();
  await App.db.doc(`chats/${cid}/m/${rid()}`).set({by:App.uid,at,...body});
  const prev=await enc(k,JSON.stringify({t:payload.kind==='share'?'Bir video paylaştı':payload.t}));
  try{await App.db.doc(`chats/${cid}`).update({lastAt:at,lastBy:App.uid,last:prev,act:{[App.uid]:{[dayKey(at)]:1}}})}catch(e){dbErr(e)}
}
async function decryptPreview(cid){
  const c=D.chats[cid];if(!c||!c.last)return '';const key=c.last.iv+c.last.ct;if(CRY.plain[key]!==undefined)return CRY.plain[key];
  try{const k=await chatKey(cid);CRY.plain[key]=JSON.parse(new TextDecoder().decode(await dec(k,c.last))).t||''}catch{CRY.plain[key]='🔒'}
  return CRY.plain[key];
}
function streakOf(c){
  if(!c||!c.act||c.members.length!==2)return 0;let n=0;let d=new Date();
  const has=k=>c.members.every(u=>c.act[u]&&c.act[u][k]);
  if(!has(dayKey(d.getTime())))d.setDate(d.getDate()-1);
  while(has(dayKey(d.getTime()))){n++;d.setDate(d.getDate()-1)}
  return n;
}
const myChats=()=>Object.entries(D.chats).filter(([,c])=>(c.members||[]).includes(App.uid)).sort((a,b)=>(b[1].lastAt||0)-(a[1].lastAt||0));
const unreadChats=()=>myChats().filter(([id,c])=>c.lastBy&&c.lastBy!==App.uid&&(c.lastAt||0)>((D.prefs.chatSeen||{})[id]||0)).length;
function chatTitle(c){if(c.name)return c.name;const others=c.members.filter(u=>u!==App.uid);return others.map(u=>'@'+person(u).handle).join(', ')||'Sohbet'}
function chatAva(c){const others=c.members.filter(u=>u!==App.uid);if(others.length===1)return avaHTML(person(others[0]));return `<span class="group-ava">${avaHTML(person(others[0]))}${avaHTML(person(others[1]||App.uid))}</span>`}

/* ---------------- sohbet listesi ve görünüm ---------------- */
async function renderChatList(el){
  const list=myChats();
  if(!App.online){el.innerHTML='<div class="empty"><h3>Mesajlar kullanılamıyor</h3>Bu görünümde veritabanına bağlanılamadı.</div>';return}
  el.innerHTML=`<button class="btn dark full" onclick="newChat()" style="margin-bottom:6px">Yeni mesaj veya grup</button>`+(list.length?list.map(([id,c])=>{const un=c.lastBy&&c.lastBy!==App.uid&&(c.lastAt||0)>((D.prefs.chatSeen||{})[id]||0);const st=streakOf(c);
    return `<button class="chat-row ${un?'unread':''}" onclick="openChat('${esc(id)}')">${chatAva(c)}<span class="grow"><span class="b ell" style="display:block">${esc(chatTitle(c))}</span><span class="last" data-prev="${esc(id)}">…</span></span><span style="text-align:right"><span class="xs muted" style="display:block">${ago(c.lastAt)}</span>${st?`<span class="streak">🔥 ${st}</span>`:''}</span></button>`}).join(''):'<div class="empty"><h3>Henüz mesaj yok</h3>Arkadaşlarına yaz ya da grup kur. Mesajlar uçtan uca şifrelidir.</div>')
   +`<div class="lock-note">${I.lock} Mesajlar uçtan uca şifrelidir</div>`;
  for(const [id] of list){const t=await decryptPreview(id);const s=el.querySelector(`[data-prev="${CSS.escape(id)}"]`);if(s)s.textContent=(D.chats[id].lastBy===App.uid?'Sen: ':'')+t}
}
let CHAT={id:null,unsub:null,msgs:[]};
function openDM(uid){
  if(needAccount())return;
  const hit=myChats().find(([,c])=>!c.group&&c.members.length===2&&c.members.includes(uid));
  if(hit)return openChat(hit[0]);
  createChat([uid]).then(cid=>cid&&openChat(cid)).catch(e=>{dbErr(e);toast('Sohbet açılamadı')});
}
function openChat(cid){
  CHAT.unsub&&CHAT.unsub();CHAT={id:cid,unsub:null,msgs:[]};
  const L=$('#chatLayer');L.classList.add('on');renderChatView();
  CHAT.unsub=App.db.collection(`chats/${cid}/m`).onSnapshot(async s=>{
    const k=await chatKey(cid).catch(()=>null);const out=[];
    for(const d of s.docs){const m=d.data();const key=m.iv+m.ct;if(CRY.plain[key]===undefined){try{CRY.plain[key]=JSON.parse(new TextDecoder().decode(await dec(k,m)))}catch{CRY.plain[key]={t:'🔒 Bu mesaj çözülemedi'}}}out.push({id:d.id,by:m.by,at:m.at,...CRY.plain[key]})}
    CHAT.msgs=out.sort((a,b)=>a.at-b.at);renderChatView();
    D.prefs.chatSeen=D.prefs.chatSeen||{};D.prefs.chatSeen[cid]=now();savePrefs();renderBadge();
  },e=>console.warn(e));
}
function renderChatView(){
  const c=D.chats[CHAT.id];if(!c)return;const L=$('#chatLayer');const st=streakOf(c);
  const keep=$('#chatIn')?.value||'';let lastDay='';
  L.innerHTML=`<div class="layer-head" style="border-bottom:1px solid var(--line)"><button class="back" aria-label="Geri" onclick="closeLayers()">${I.backArrow}</button>${chatAva(c)}<div class="t"><div class="b ell">${esc(chatTitle(c))}</div><div class="xs muted">${c.group?c.members.length+' kişi':''}${st?`🔥 ${st} günlük seri`:c.group?'':'Seri için ikiniz de her gün yazın'}</div></div>${c.group?`<button class="btn soft sm" onclick="groupInfo()">Bilgi</button>`:''}</div>
   <div class="msgs" id="msgs">${CHAT.msgs.map(m=>{const d=dayKey(m.at);const sep=d!==lastDay?`<div class="msg-time">${new Date(m.at).toLocaleDateString('tr-TR',{day:'numeric',month:'long'})}</div>`:'';lastDay=d;const me=m.by===App.uid;
     if(m.kind==='share'){const v=vById(m.vid);return sep+`<button class="msg share ${me?'me':''}" onclick="closeLayers();playFrom('${esc(m.vid)}')">${c.group&&!me?`<div class="who">@${esc(person(m.by).handle)}</div>`:''}<div class="sq">${v?(v.thumb?`<img src="${esc(v.thumb)}" alt="">`:v.imgs&&v.imgs[0]?`<img src="${esc(v.imgs[0])}" alt="">`:`<div class="mini" style="position:absolute;inset:0;transform:scale(.4);transform-origin:top left;width:250%;height:250%">${sceneHTML(v)}</div>`):''}</div><div class="cap">${esc(v?v.cap:'Video kaldırılmış')}</div></button>`}
     return sep+`<div class="msg ${me?'me':''}">${c.group&&!me?`<div class="who">@${esc(person(m.by).handle)}</div>`:''}${m.story?'<div class="xs" style="opacity:.7">Hikâyene yanıt</div>':''}${mentionHTML(m.t||'')}</div>`}).join('')||'<div class="empty">İlk mesajı sen gönder.</div>'}</div>
   <div class="lock-note">${I.lock} Uçtan uca şifreli</div>
   <form class="composer" onsubmit="event.preventDefault();chatSend()"><input class="field" id="chatIn" maxlength="1000" placeholder="Mesaj yaz" autocomplete="off" style="height:46px"><button class="btn primary" style="height:46px" aria-label="Gönder">${I.send}</button></form>`;
  if(keep)$('#chatIn').value=keep;const m=$('#msgs');m.scrollTop=m.scrollHeight;
}
async function chatSend(){const i=$('#chatIn');const t=i.value.trim();if(!t)return;i.value='';try{await sendMsg(CHAT.id,{kind:'text',t})}catch(e){dbErr(e);toast('Gönderilemedi')}}
function groupInfo(){const c=D.chats[CHAT.id];openSheet('blank');sheet(chatTitle(c),c.members.map(u=>{const p=person(u);return `<div class="person">${avaHTML(p)}<b class="grow">@${esc(p.handle)}${u===c.by?' · kurucu':''}</b></div>`}).join(''))}
function closeLayers(){CHAT.unsub&&CHAT.unsub();CHAT={id:null,unsub:null,msgs:[]};$$('.layer').forEach(l=>{l.classList.remove('on');l.innerHTML=''});storyStop();liveLeave();if(currentScreen()==='inbox')renderInbox()}
function chatSoft(){if(CHAT.id&&$('#chatLayer').classList.contains('on'))renderChatView();if(currentScreen()==='inbox'&&UI.inboxTab==='chats')renderInbox()}

/* yeni sohbet: kişi seç (tek kişi = özel mesaj, çok kişi = grup) */
let PICK=new Set();
function newChat(){if(needAccount())return;PICK=new Set();openSheet('pick')}
function contacts(){const ids=new Set([...Object.keys(local.follows.m),...Object.entries(D.follows).filter(([,d])=>d&&d.m&&d.m[App.uid]).map(([u])=>u)]);return [...ids].filter(u=>!SU[u]&&u!==App.uid&&D.profiles[u])}
SHEETS.pick=function(){
  const ppl=contacts();
  sheet('Yeni mesaj',`${PICK.size>1?`<label class="lbl" for="grpN" style="margin-top:0">Grup adı</label><input class="field" id="grpN" maxlength="40" placeholder="Örneğin Kuzenler">`:''}
   <div class="pick-list" style="margin-top:8px">${ppl.map(u=>{const p=person(u);return `<button class="person" style="width:100%;text-align:left" onclick="PICK.has('${esc(u)}')?PICK.delete('${esc(u)}'):PICK.add('${esc(u)}');SHEETS.pick()">${avaHTML(p)}<span class="grow"><b>@${esc(p.handle)}</b><div class="xs muted">${p.pk?'':'Henüz mesajlaşmayı açmadı'}</div></span><span class="check" role="checkbox" aria-checked="${PICK.has(u)}"><span class="bx">${I.check}</span></span></button>`}).join('')||'<div class="empty"><h3>Kimse yok</h3>Takip ettiğin ya da seni takip eden kişilere mesaj atabilirsin.</div>'}</div>`);
  foot(`<button class="btn primary full" ${PICK.size?'':'disabled'} onclick="startPicked()">${PICK.size>1?'Grubu kur':'Sohbet başlat'}</button>`);
};
async function startPicked(){const ids=[...PICK];const name=ids.length>1?($('#grpN')?.value.trim()||''):'';closeSheet();if(ids.length===1)return openDM(ids[0]);const cid=await createChat(ids,name).catch(e=>{dbErr(e);return null});if(cid)openChat(cid)}
/* videoyu mesajla gönder */
SHEETS.sendTo=function(vid){
  const chats=myChats();const ppl=contacts().filter(u=>!chats.some(([,c])=>!c.group&&c.members.includes(u)));
  sheet('Mesajla gönder',`${chats.map(([id,c])=>`<button class="chat-row" onclick="shareToChat('${esc(id)}','${esc(vid)}')">${chatAva(c)}<span class="grow b">${esc(chatTitle(c))}</span>${I.send.replace('<svg','<svg width="20" height="20"')}</button>`).join('')}
   ${ppl.map(u=>{const p=person(u);return `<button class="chat-row" onclick="shareToUser('${esc(u)}','${esc(vid)}')">${avaHTML(p)}<span class="grow b">@${esc(p.handle)}</span>${I.send.replace('<svg','<svg width="20" height="20"')}</button>`}).join('')}
   ${!chats.length&&!ppl.length?'<div class="empty"><h3>Gönderecek kimse yok</h3>Önce birilerini takip et.</div>':''}`);
};
async function shareToChat(cid,vid){closeSheet();try{await sendMsg(cid,{kind:'share',vid});toast('Gönderildi')}catch(e){dbErr(e)}}
async function shareToUser(uid,vid){closeSheet();const cid=await createChat([uid]).catch(()=>null);if(cid){await sendMsg(cid,{kind:'share',vid});toast('Gönderildi')}}

/* ================================================================
   HİKÂYELER (24 saat)
   ================================================================ */
const activeStories=uid=>{const items=SU[uid]?(SAMPLE_STORIES[uid]||[]).map(s=>({...s,at:s.at||now()-3600e3})):((ownDoc('stories',uid).items)||[]);return items.filter(s=>now()-s.at<CFG.storyHours*3600e3)};
function storyUsers(){
  const ids=[...new Set([...Object.keys(local.follows.m),...Object.keys(SAMPLE_STORIES)])].filter(u=>u!==App.uid&&!D.prefs.blocked[u]&&activeStories(u).length&&canSee(u));
  return ids.sort((a,b)=>{const sa=storySeen(a),sb=storySeen(b);return sa-sb});
}
const storySeen=uid=>{const st=activeStories(uid);return st.length&&((D.prefs.storySeen||{})[uid]||0)>=Math.max(...st.map(s=>s.at))?1:0};
function storiesStrip(){
  const me=myProfile(),mine=activeStories(App.uid);
  return `<div class="stories">
   <button class="story-av" onclick="${mine.length?`viewStories(['${esc(App.uid)}'])`:'openSheet(\'storyNew\')'}"><span class="ring ${mine.length?'':'add'}">${avaHTML(me)}</span><span class="n">${mine.length?'Hikâyen':'Hikâye ekle'}</span></button>
   ${storyUsers().map((u,i,a)=>{const p=person(u);return `<button class="story-av" onclick="viewStories(${JSON.stringify(a.slice(i)).replace(/"/g,'&quot;')})"><span class="ring ${storySeen(u)?'seen':''}">${avaHTML(p)}</span><span class="n">${esc(p.handle)}</span></button>`}).join('')}</div>`;
}
SHEETS.storyNew=function(){
  sheet('Yeni hikâye',`<p class="s muted">Hikâyen 24 saat sonra kendiliğinden kaybolur.</p>
   <label class="lbl" for="stF">Fotoğraf veya video <small>isteğe bağlı</small></label><input type="file" id="stF" accept="image/*,video/*" class="field" style="padding-top:12px">
   <label class="lbl" for="stT">Yazı</label><input class="field" id="stT" maxlength="80" placeholder="Bugün neler oluyor?">
   <span class="lbl">Arka plan</span><div class="chips wrapx" id="stC">${COLORS.map((c,i)=>`<button class="chip" aria-pressed="${i===0}" data-c="${c}" style="width:38px;padding:0;background:${c};border-color:${c}"></button>`).join('')}</div>
   ${activeStories(App.uid).length?`<button class="btn soft full" style="margin-top:14px" onclick="local.stories.items=[];saveOwn('stories');closeSheet();renderInbox()">Hikâyelerimi sil</button>`:''}`);
  foot(`<button class="btn primary full" onclick="postStory()">Paylaş</button>`);
  $('#stC').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;$$('#stC .chip').forEach(x=>x.setAttribute('aria-pressed',x===b))};
};
async function postStory(){
  const f=$('#stF').files[0],t=$('#stT').value.trim(),bg=($('#stC [aria-pressed=true]')||{}).dataset?.c||COLORS[0];
  if(!f&&!t)return toast('Bir yazı yaz ya da dosya seç');
  let asset=null,type='text';
  if(f){if(!App.assets)return toast('Bu görünümde dosya yüklenemiyor');if(f.size>CFG.maxMB*1048576)return toast(`Dosya ${CFG.maxMB} MB'tan büyük`);
    toast('Yükleniyor');try{const a=await App.assets.upload(f);asset=a.id;type=f.type.startsWith('video')?'video':'image'}catch{return toast('Yüklenemedi')}}
  local.stories.items=[...activeStories(App.uid),{id:rid(),type,asset,text:t,bg,at:now()}].slice(-20);saveOwn('stories');closeSheet();toast('Hikâyen paylaşıldı');renderInbox();
}
let STORY={users:[],ui:0,si:0,timer:null,t0:0,dur:5000};
function viewStories(users){STORY={users,ui:0,si:0,timer:null};$('#storyLayer').classList.add('on');showStory()}
function storyStop(){clearInterval(STORY.timer);STORY.timer=null}
function showStory(){
  storyStop();const uid=STORY.users[STORY.ui];if(!uid)return closeLayers();const items=activeStories(uid);const s=items[STORY.si];if(!s){STORY.ui++;STORY.si=0;return showStory()}
  const p=person(uid);D.prefs.storySeen=D.prefs.storySeen||{};D.prefs.storySeen[uid]=Math.max(D.prefs.storySeen[uid]||0,s.at);savePrefs();
  const L=$('#storyLayer');
  L.innerHTML=`<div class="sv-media" style="background:${esc(s.bg||'#111')}">${s.asset?(s.type==='video'?`<video src="${blobUrl(s.asset)}" autoplay playsinline poster="${BLANK}" ${UI.muted?'muted':''}></video>`:`<img src="${blobUrl(s.asset)}" alt="">`):''}${s.text?`<div class="sv-text">${esc(s.text)}</div>`:''}</div>
   <div class="sv-bars">${items.map((_,i)=>`<i><b style="width:${i<STORY.si?100:0}%"></b></i>`).join('')}</div>
   <div class="sv-top">${avaHTML(p)}<div class="grow"><div class="b">@${esc(p.handle)}${p.sample?' <span class="flag">Örnek</span>':''}</div><div class="xs" style="opacity:.75">${ago(s.at)}</div></div><button class="back" aria-label="Kapat" onclick="closeLayers()"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
   <button class="sv-tap" style="left:0" aria-label="Önceki" onclick="storyNav(-1)"></button><button class="sv-tap" style="right:0" aria-label="Sonraki" onclick="storyNav(1)"></button>
   ${uid!==App.uid&&!p.sample?`<form class="sv-reply" onsubmit="event.preventDefault();storyReply('${esc(uid)}')"><input id="svIn" placeholder="Yanıt gönder" maxlength="300" onfocus="storyStop()"><button class="round" aria-label="Gönder">${I.send.replace('currentColor','#fff')}</button></form>`:''}`;
  const bar=L.querySelectorAll('.sv-bars b')[STORY.si];const vid=L.querySelector('video');
  STORY.dur=5000;if(vid)vid.onloadedmetadata=()=>{STORY.dur=Math.min(30000,(vid.duration||5)*1000)};
  STORY.t0=performance.now();STORY.timer=setInterval(()=>{const e=performance.now()-STORY.t0;bar.style.width=Math.min(100,e/STORY.dur*100)+'%';if(e>=STORY.dur)storyNav(1)},50);
}
function storyNav(d){const items=activeStories(STORY.users[STORY.ui]);STORY.si+=d;if(STORY.si<0){STORY.ui=Math.max(0,STORY.ui-1);STORY.si=0}else if(STORY.si>=items.length){STORY.ui++;STORY.si=0}showStory()}
async function storyReply(uid){const t=$('#svIn').value.trim();if(!t)return;const hit=myChats().find(([,c])=>!c.group&&c.members.includes(uid));const cid=hit?hit[0]:await createChat([uid]).catch(()=>null);if(!cid)return;await sendMsg(cid,{kind:'text',t,story:true});toast('Yanıtın gönderildi');$('#svIn').value='';showStory()}

/* ================================================================
   BİLDİRİMLER
   ================================================================ */
function notifications(){
  const out=[],me=App.uid,myH=D.me&&D.me.handle;
  for(const [id,u] of Object.entries(D.myUploads)){
    if(u.status==='approved')out.push({at:u.reviewedAt||u.createdAt,txt:'Videon onaylandı ve yayında.',thumb:u.thumbId,ic:'✓'});
    if(u.status==='rejected')out.push({at:u.reviewedAt||u.createdAt,txt:'Videon reddedildi: '+(u.reason||'kurallara uymuyor'),thumb:u.thumbId,ic:'!'});
  }
  for(const l of (D.wallet&&D.wallet.items)||[])if(l.amount>0)out.push({at:l.at,txt:`Kumbarana ${tl(l.amount)} eklendi: ${l.note}.`,coin:true});
  for(const p of Object.values(D.payouts))if(p.status==='paid')out.push({at:p.paidAt||p.at,txt:'Google Play kodun hazır. Kumbarandan görebilirsin.',coin:true});
  const mine=Object.keys(D.feed).filter(id=>D.feed[id].owner===me);const myCm=new Set(local.comments.list.map(c=>c.id));
  for(const [u,d] of Object.entries(D.follows))if(u!==me&&d&&d.m&&d.m[me])out.push({at:d.m[me],who:u,txt:(D.me&&D.me.private&&!local.approvals.m[u])?'seni takip etmek istiyor.':'seni takip etmeye başladı.',req:D.me&&D.me.private&&!local.approvals.m[u]});
  for(const [u,d] of Object.entries(D.comments)){if(u===me)continue;for(const c of (d&&d.list)||[]){
    if(mine.includes(c.vid)&&!c.parent)out.push({at:c.at,who:u,txt:'yorum yaptı: '+(c.kind==='sticker'?c.t:c.t),thumb:D.feed[c.vid].thumbId,vid:c.vid});
    else if(c.parent&&myCm.has(c.parent))out.push({at:c.at,who:u,txt:'yorumuna yanıt verdi: '+c.t,vid:c.vid});
    else if(myH&&(c.t||'').includes('@'+myH))out.push({at:c.at,who:u,txt:'bir yorumda senden bahsetti: '+c.t,vid:c.vid})}}
  for(const [id,f] of Object.entries(D.feed))if(f.owner!==me&&myH&&(f.cap||'').includes('@'+myH))out.push({at:f.approvedAt,who:f.owner,txt:'bir videoda senden bahsetti.',thumb:f.thumbId,vid:id});
  for(const [u,d] of Object.entries(D.likes))if(u!==me)for(const vid of mine)if(d&&d.m&&d.m[vid])out.push({at:typeof d.m[vid]==='number'?d.m[vid]:0,who:u,txt:'videonu beğendi.',thumb:D.feed[vid].thumbId,vid});
  for(const [u,d] of Object.entries(D.gifts))if(u!==me)for(const g of (d&&d.sent)||[])if(g.to===me)out.push({at:g.at,who:u,txt:g.kind==='series'?`dizini satın aldı, +${tl(g.amount)}.`:`sana ${gift(g.gift)?.e||'🎁'} ${gift(g.gift)?.name||'hediye'} gönderdi, +${tl(g.amount)}.`});
  for(const u of Object.keys(local.follows.m))for(const b of (ownDoc('bulletins',u).list||[]))out.push({at:b.at,who:u,txt:'duyuru: '+b.t});
  for(const [u,l] of Object.entries(D.lives))if(l.active&&iFollow(u)&&u!==me)out.push({at:l.startedAt,who:u,txt:'şu an canlı yayında.',live:u});
  out.push({at:1,txt:`Hoş geldin. Onaylanan her videona ${tl(CFG.reward)}, ${fmt(CFG.viewBonusAt)} izlenmeyi geçene ${tl(CFG.viewBonus)} bonus.`,coin:true});
  return out.filter(n=>!n.who||!D.prefs.blocked[n.who]).sort((a,b)=>b.at-a.at).slice(0,80);
}
function renderInbox(){
  const el=$('#inboxBody');const unreadC=unreadChats();
  const head=`${storiesStrip()}<div class="seg" style="margin-bottom:12px"><button aria-pressed="${UI.inboxTab==='notifs'}" onclick="UI.inboxTab='notifs';renderInbox()">Bildirimler</button><button aria-pressed="${UI.inboxTab==='chats'}" onclick="UI.inboxTab='chats';renderInbox()">Mesajlar${unreadC?` (${unreadC})`:''}</button></div>`;
  if(UI.inboxTab==='chats'){el.innerHTML=head+'<div id="chatList"></div>';renderChatList($('#chatList'));return}
  const list=notifications(),seen=D.prefs.seenNotifs||0;
  el.innerHTML=head+`<button class="jar" style="margin-bottom:8px" onclick="openSheet('wallet')"><span class="coin"><span class="face">1₺</span></span><div class="grow"><div class="s" style="color:#6b5208">Kumbaram</div><div class="amt" style="font-size:24px">${tl(balance())}</div></div>${I.chev}</button>`+
   list.map(n=>{const p=n.who&&person(n.who);return `<div class="nt ${n.at>seen&&n.at>1?'unread':''}" ${n.vid?`onclick="playFrom('${esc(n.vid)}')"`:n.live?`onclick="joinLive('${esc(n.live)}')"`:''} style="${n.vid||n.live?'cursor:pointer':''}">${p?avaHTML(p):n.coin?'<span class="coin" style="--s:46px"><span class="face">1₺</span></span>':`<span class="ava" style="width:46px;height:46px;background:var(--ink);color:#fff;font-weight:800">${n.ic||'•'}</span>`}
     <div class="grow"><div class="txt s">${p?`<b>@${esc(p.handle)}</b> `:''}${mentionHTML(n.txt)}</div><div class="xs muted" style="margin-top:2px">${n.at>1?ago(n.at):''}</div></div>${n.req?`<button class="follow" onclick="event.stopPropagation();approveFollow('${esc(n.who)}');renderInbox()">Onayla</button>`:''}${n.thumb?`<span class="sq"><img src="${blobUrl(esc(n.thumb))}" alt=""></span>`:''}</div>`}).join('');
}
function renderBadge(){const seen=D.prefs.seenNotifs||0,n=notifications().filter(x=>x.at>seen&&x.at>1).length+unreadChats(),b=$('#badge');b.hidden=!n;b.textContent=n>9?'9+':n}
