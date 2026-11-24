"use strict";
/* ================================================================
   ALTTAN AÇILAN SAYFALAR
   ================================================================ */
let sheetKind=null,sheetArg=null,resumeAfter=false;
const TALL=['user','admin','advertiser','upload','analytics','wallet','settings','studio','sound','chain','colls','privacy','insights','shop','playlist','requests','gift','footnotes','comments'];
function openSheet(kind,arg){
  sheetKind=kind;sheetArg=arg;$('#shFoot').hidden=true;$('#shFoot').innerHTML='';
  $('#sheet').classList.toggle('tall',TALL.includes(kind));
  SHEETS[kind](arg);
  $('#scrim').classList.add('on');$('#sheet').classList.add('on');
  if(currentScreen()==='home'&&active>=0&&!paused&&!$('.layer.on')){togglePause(cur());resumeAfter=true}
  setTimeout(()=>{const f=$('#sheet .close');f&&f.focus({preventScroll:true})},320);
}
function closeSheet(){
  $('#scrim').classList.remove('on');$('#sheet').classList.remove('on');sheetKind=null;
  if(resumeAfter&&paused&&cur())togglePause(cur());resumeAfter=false;
}
$('#scrim').onclick=closeSheet;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(sheetKind)closeSheet();else if($('.layer.on'))closeLayers()}});
function sheet(title,body){$('#shTitle').textContent=title;const b=$('#shBody');const st=b.scrollTop;b.innerHTML=body;return st}
function foot(html){const f=$('#shFoot');f.hidden=false;f.innerHTML=html}
const SHEETS={};
SHEETS.blank=()=>{};

/* ---------------- yorumlar: yanıt, sabitleme, beğeni, sticker, anket, video yanıt ---------------- */
let CM={reply:null,mode:'text'};
function pinnedOf(v){const d=ownDoc('pins',v.owner);return (d.m||{})[v.id]||null}
function pollVotes(cid){const out={};for(const [u,d] of Object.entries({...D.votes,[App.uid]:local.votes})){const x=d&&d.poll&&d.poll[cid];if(x!==undefined)out[x]=(out[x]||0)+1}return out}
function filtered(v,c){const words=(person(v.owner).set&&person(v.owner).set.filter)||[];return words.some(w=>w&&norm(c.t||'').includes(norm(w)))}
function cmHTML(c,v,isReply){
  const p=person(c.u),liked=!!local.likes.m['c:'+c.id],pin=pinnedOf(v)===c.id,mineVid=v.owner===App.uid;
  let body='';
  if(c.kind==='sticker')body=`<div class="stk">${esc(c.t)}</div>`;
  else if(c.kind==='poll'){const votes=pollVotes(c.id),tot=Object.values(votes).reduce((a,b)=>a+b,0),my=local.votes.poll[c.id];
    body=`<p>${esc(c.t)}</p><div class="poll">${(c.opts||[]).map((o,i)=>{const n=votes[i]||0,pct=tot?Math.round(n/tot*100):0;return `<button class="${my===i?'mine':''}" onclick="votePoll('${esc(c.id)}',${i},'${esc(v.id)}')"><i style="width:${my!==undefined?pct:0}%"></i><span>${esc(o)}</span><span>${my!==undefined?pct+'%':''}</span></button>`}).join('')}</div><div class="xs muted" style="margin-top:4px">${tot} oy</div>`}
  else body=`<p>${mentionHTML(c.t)}</p>`;
  return `<div class="cm ${isReply?'reply':''}">${avaHTML(p)}<div class="grow">${pin?'<div class="pin">Sabitlendi</div>':''}
    <div class="h">${esc(p.handle)}${c.u===v.owner?' · üretici':''}${fanOf(c.u,v.owner)?'<span class="fan">Hayran</span>':''}${c.at?' · '+ago(c.at):''}</div>${body}
    <div class="act">${c.at?`<button class="${liked?'on':''}" onclick="likeComment('${esc(c.id)}','${esc(v.id)}')">♥ ${fmt(commentLikes(c.id))}</button>`:''}
     ${isReply?'':`<button onclick="CM.reply={id:'${esc(c.id)}',h:'${esc(p.handle)}'};SHEETS.comments('${esc(v.id)}',true);$('#cmIn')&&$('#cmIn').focus()">Yanıtla</button>`}
     ${!isReply&&c.at?`<button onclick="videoReply('${esc(v.id)}','${esc(c.id)}')">Video ile yanıtla</button>`:''}
     ${mineVid&&c.at&&!isReply?`<button onclick="pinComment('${esc(v.id)}','${esc(c.id)}')">${pin?'Sabitlemeyi kaldır':'Sabitle'}</button>`:''}
     ${c.mine?`<button onclick="delComment('${esc(c.id)}','${esc(v.id)}')">Sil</button>`:''}</div></div></div>`;
}
SHEETS.comments=function(id,live){
  const v=vById(id);if(!v)return;
  const st=person(v.owner).set||{};
  const all=commentsOf(id).filter(c=>!filtered(v,c)&&!D.prefs.blocked[c.u]);
  const tops=all.filter(c=>!c.parent).sort((a,b)=>{const pa=pinnedOf(v)===a.id,pb=pinnedOf(v)===b.id;if(pa!==pb)return pa?-1:1;return (b.at||0)-(a.at||0)});
  const keep=live?$('#cmIn')?.value:'';
  const s=sheet(`${fmt(commentCount(v))} yorum`,tops.length?tops.map(c=>cmHTML(c,v)+all.filter(r=>r.parent===c.id).sort((a,b)=>a.at-b.at).map(r=>cmHTML(r,v,true)).join('')).join(''):'<div class="empty"><h3>Henüz yorum yok</h3>İlk yorumu sen yaz.</div>');
  if(live)$('#shBody').scrollTop=s;
  const can=v.owner===App.uid||(st.comments==='none'?false:st.comments==='followers'?isFollowerOf(v.owner):true);
  if(!can){foot('<p class="help" style="text-align:center;margin:6px 0">Bu videoya yorum yapma kapalı.</p>');return}
  foot(`${CM.reply?`<div class="reply-to"><span>@${esc(CM.reply.h)} kişisine yanıt</span><button onclick="CM.reply=null;SHEETS.comments('${esc(id)}',true)">Vazgeç</button></div>`:''}
   ${CM.mode==='sticker'?`<div class="sticker-row">${STICKERS.map(s=>`<button onclick="addComment('${esc(id)}','sticker','${s}')">${s}</button>`).join('')}</div>`:''}
   ${CM.mode==='poll'?`<input class="field" id="pollO1" placeholder="1. seçenek" maxlength="40" style="height:40px;margin-bottom:6px"><input class="field" id="pollO2" placeholder="2. seçenek" maxlength="40" style="height:40px;margin-bottom:6px">`:''}
   <form class="row" onsubmit="event.preventDefault();addComment('${esc(id)}',CM.mode==='poll'?'poll':'text')">
    <button type="button" class="round" style="background:#E9EBF0;width:40px;height:40px" aria-label="Sticker" onclick="CM.mode=CM.mode==='sticker'?'text':'sticker';SHEETS.comments('${esc(id)}',true)">😊</button>
    <button type="button" class="round" style="background:#E9EBF0;width:40px;height:40px;font-size:14px;font-weight:800" aria-label="Anket" onclick="CM.mode=CM.mode==='poll'?'text':'poll';SHEETS.comments('${esc(id)}',true)">%</button>
    <input class="field" id="cmIn" maxlength="300" placeholder="${CM.mode==='poll'?'Anket sorusu':'Yorum ekle, @ ile birinden bahset'}" autocomplete="off" style="height:44px"><button class="btn primary" style="height:44px;padding:0 14px">Gönder</button></form>`);
  if(keep)$('#cmIn').value=keep;
};
function isFollowerOf(owner){return !!local.follows.m[owner]}
function addComment(vid,kind='text',val){
  if(needAccount())return;
  let t=kind==='sticker'?val:($('#cmIn')?.value||'').trim();if(!t)return toast(kind==='poll'?'Anket sorusunu yaz':'Bir şey yaz');
  const c={id:rid(),vid,t:t.slice(0,300),at:now(),kind};
  if(kind==='poll'){const o=[$('#pollO1').value.trim(),$('#pollO2').value.trim()].filter(Boolean);if(o.length<2)return toast('İki seçenek yaz');c.opts=o;CM.mode='text'}
  if(kind==='sticker')CM.mode='text';
  if(CM.reply){c.parent=CM.reply.id;CM.reply=null}
  local.comments.list.push(c);saveOwn('comments');if($('#cmIn'))$('#cmIn').value='';SHEETS.comments(vid,true);refreshCounts();
}
function delComment(cid,vid){local.comments.list=local.comments.list.filter(c=>c.id!==cid);saveOwn('comments');SHEETS.comments(vid,true);refreshCounts()}
function likeComment(cid,vid){const k='c:'+cid;if(local.likes.m[k])delete local.likes.m[k];else local.likes.m[k]=now();saveOwn('likes');SHEETS.comments(vid,true)}
function pinComment(vid,cid){local.pins.m[vid]===cid?delete local.pins.m[vid]:local.pins.m[vid]=cid;saveOwn('pins');SHEETS.comments(vid,true)}
function votePoll(cid,i,vid){if(local.votes.poll[cid]!==undefined)return;local.votes.poll[cid]=i;saveOwn('votes');SHEETS.comments(vid,true)}
function videoReply(vid,cid){const c=commentsOf(vid).find(x=>x.id===cid);closeSheet();openUpload({replyTo:{vid,cid,text:c?c.t:'',u:c?c.u:''}})}

/* ---------------- paylaş, diğer ---------------- */
SHEETS.share=function(id){
  const v=vById(id),on=!!local.reposts.m[id],st=person(v.owner).set||{},me=v.owner===App.uid;
  sheet('Paylaş',`
   ${on?'':`<div class="row" style="margin-bottom:14px"><input class="field" id="rpNote" maxlength="120" placeholder="Repost notu ekle (isteğe bağlı)"></div>`}
   <div class="share-grid">
   <button onclick="toggleRepost('${esc(id)}',$('#rpNote')&&$('#rpNote').value)"><span class="ic" style="${on?'':'background:var(--ink);color:#fff;border-color:var(--ink)'}">${I.repost}</span>${on?'Repostu geri al':'Repostla'}</button>
   <button onclick="openSheet('sendTo','${esc(id)}')"><span class="ic">${I.send}</span>Mesajla gönder</button>
   <button onclick="copyLink('${esc(id)}')"><span class="ic">${I.link}</span>Bağlantıyı kopyala</button>
   <button onclick="openSheet('colls','${esc(id)}')"><span class="ic">${I.bookmarkO}</span>Koleksiyona ekle</button>
   ${me||st.duet!==false?`<button onclick="closeSheet();openUpload({duetOf:'${esc(id)}'})"><span class="ic">${I.duet}</span>Düet</button>`:''}
   ${me||st.stitch!==false?`<button onclick="closeSheet();openUpload({stitchOf:'${esc(id)}'})"><span class="ic">${I.stitch}</span>Stitch</button>`:''}
   <button onclick="openSheet('sound','${esc(v.soundOf||id)}')"><span class="ic">${I.sound}</span>Bu sesi kullan</button>
   ${v.real&&(me||st.download!==false)?`<button onclick="downloadVideo('${esc(id)}')"><span class="ic">${I.download}</span>İndir</button>`:''}
  </div>`);
};
SHEETS.more=function(id){
  const v=vById(id),p=person(v.owner),me=v.owner===App.uid;
  sheet('Seçenekler',`<div class="group">
   <button class="list-btn" onclick="notInterested('${esc(id)}')">${I.hide}İlgilenmiyorum</button>
   <button class="list-btn" onclick="openSheet('report','${esc(id)}')">${I.flag}Şikayet et${I.chev}</button>
   <button class="list-btn" onclick="openSheet('footnotes','${esc(id)}')">${I.note2}Bağlam notları${I.chev}</button>
   ${me?`<button class="list-btn" onclick="openSheet('promote','${esc(id)}')">${I.rocket}Öne çıkar${I.chev}</button>`:''}
   ${me?'':`<button class="list-btn" onclick="toggleMute('${esc(v.owner)}')">${I.volOff.replace(/#fff/g,'currentColor')}@${esc(p.handle)} ${D.prefs.muted[v.owner]?'sessizden çıkar':'sessize al'}</button>
   <button class="list-btn danger" onclick="blockUser('${esc(v.owner)}')">${I.block}@${esc(p.handle)} hesabını engelle</button>`}
  </div>
  <span class="lbl">Oynatma hızı</span><div class="seg">${SPEEDS.map(s=>`<button aria-pressed="${UI.speed===s}" onclick="setSpeed(${s})">${String(s).replace('.',',')}x</button>`).join('')}</div>
  <div class="group" style="margin-top:14px">
   <button class="opt-row" onclick="D.prefs.autoscroll=!D.prefs.autoscroll;savePrefs(0);SHEETS.more('${esc(id)}')"><span class="grow"><div class="b">Otomatik kaydır</div><div class="help">Video bitince sıradakine geç</div></span><span class="toggle" role="switch" aria-checked="${!!D.prefs.autoscroll}"></span></button>
   <button class="opt-row" onclick="UI.measure=!UI.measure;$('#app').classList.toggle('show-measure',UI.measure);SHEETS.more('${esc(id)}')"><span class="grow"><div class="b">İzleme ölçümünü göster</div><div class="help">Geliştirici görünümü</div></span><span class="toggle" role="switch" aria-checked="${UI.measure}"></span></button>
  </div>`);
};
function setSpeed(s){UI.speed=s;vidsIn(cur()).forEach(v=>v.playbackRate=s);SHEETS.more(sheetArg);toast('Hız '+String(s).replace('.',',')+'x')}
SHEETS.report=function(id){
  const R=[['stolen','Çalıntı içerik veya telif ihlali'],['spam','Spam ya da yanıltıcı'],['nudity','Çıplaklık veya cinsel içerik'],['violence','Şiddet ya da tehlikeli davranış'],['hate','Nefret söylemi'],['harassment','Taciz veya zorbalık'],['minor','Çocuk güvenliği'],['misinfo','Yanlış bilgi'],['other','Başka bir sebep']];
  sheet('Neden şikayet ediyorsun?',`<div class="group">${R.map(([k,t])=>`<button class="list-btn" onclick="report('${esc(id)}','${k}','${t}')">${t}${I.chev}</button>`).join('')}</div><p class="help" style="margin-top:12px">Şikayetin gizli tutulur.</p>`);
};
SHEETS.user=function(uid){
  const p=person(uid),vids=allVideos().filter(v=>v.owner===uid),on=iFollow(uid),me=uid===App.uid;
  const locked=!canSee(uid);const pls=uid in SU?(SAMPLE_PLAYLISTS[uid]||[]):(ownDoc('playlists',uid).list||[]);
  const shop=uid in SU?(SAMPLE_SHOP[uid]||[]):(ownDoc('shop',uid).items||[]);
  const bulls=(ownDoc('bulletins',uid).list||[]).slice(-3).reverse();
  const liveNow=D.lives[uid]&&D.lives[uid].active;
  sheet('@'+p.handle,`<div class="pf-head">${avaHTML(p)}<h2>${esc(p.name)} ${p.private?I.lock.replace('<svg','<svg width="16" height="16" style="display:inline;vertical-align:-2px"'):''}</h2><div class="bio">${esc(p.bio)}${p.city?' · '+esc(p.city):''}</div>
   <div class="stats"><div><b>${fmt(followerCount(uid))}</b><span>takipçi</span></div><div><b>${vids.length}</b><span>video</span></div><div><b>${fmt(vids.reduce((a,v)=>a+likeCount(v),0))}</b><span>beğeni</span></div></div>
   ${me?'':`<div class="row" style="justify-content:center"><button class="btn ${on?'soft':'primary'}" style="min-width:140px" aria-pressed="${on}" onclick="toggleFollow('${esc(uid)}');SHEETS.user('${esc(uid)}')">${on?(p.private&&!ownDoc('approvals',uid).m[App.uid]?'İstek gönderildi':'Takiptesin'):'Takip et'}</button>${SU[uid]?'':`<button class="btn soft" onclick="closeSheet();openDM('${esc(uid)}')">Mesaj</button>`}<button class="btn soft" aria-label="Hediye" onclick="openSheet('gift',{to:'${esc(uid)}'})">🎁</button></div>`}
   ${liveNow?`<button class="btn primary full" style="margin-top:10px" onclick="closeSheet();joinLive('${esc(uid)}')">Şu an canlı yayında, katıl</button>`:''}</div>
   ${bulls.length?`<h2 class="sec">Duyuru panosu</h2>${bulls.map(b=>`<div class="card" style="margin-bottom:8px"><div style="font-size:14.5px;line-height:1.45">${mentionHTML(b.t)}</div><div class="xs muted" style="margin-top:4px">${ago(b.at)}</div></div>`).join('')}`:''}
   ${shop.length&&!locked?`<h2 class="sec">Mağaza</h2>${shop.map(it=>`<button class="product" style="border:1px solid var(--line);margin-top:6px" onclick="openSheet('product',{owner:'${esc(uid)}',id:'${esc(it.id)}'})">${it.img?`<img src="${esc(it.img)}" alt="">`:`<span class="pi">${esc(it.e||'🛍️')}</span>`}<span class="grow"><span class="pn" style="display:block">${esc(it.name)}</span><span class="pp">${tl(it.price)}</span></span></button>`).join('')}`:''}
   ${pls.length&&!locked?`<h2 class="sec">Oynatma listeleri</h2><div class="chips wrapx">${pls.map(pl=>`<button class="chip" onclick="openSheet('playlist',{owner:'${esc(uid)}',id:'${esc(pl.id)}'})">${esc(pl.name)} · ${pl.vids.length}${pl.price?' · '+tl(pl.price):''}</button>`).join('')}</div>`:''}
   ${locked?`<div class="empty"><h3>Bu hesap gizli</h3>Videolarını görmek için takip isteği gönder.</div>`:`<div class="grid" style="margin-top:20px">${vids.map(tileHTML).join('')||'<p class="muted s">Henüz video yok.</p>'}</div>`}`);
};
SHEETS.sound=function(sid){
  const src=vById(sid);if(!src)return sheet('Ses','<div class="empty"><h3>Ses bulunamadı</h3></div>');
  const users=allVideos().filter(v=>v.id===sid||v.soundOf===sid||(!src.real&&!v.real&&v.sound===src.sound));
  sheet('Ses',`<div class="row" style="gap:14px"><span class="ava" style="width:72px;height:72px;border-radius:14px;background:var(--ink);color:#fff">${I.sound.replace('<svg','<svg width="34" height="34"')}</span><div class="grow"><div class="b" style="font-size:18px">${esc(src.sound)}</div><div class="s muted">${users.length} video bu sesi kullanıyor</div></div></div>
   ${src.real?`<button class="btn primary full" style="margin-top:14px" onclick="closeSheet();openUpload({soundOf:'${esc(sid)}'})">Bu sesi kullan</button>`:`<p class="help" style="margin-top:12px">Örnek videoların sesi kullanılamaz. Gerçek yüklenen videoların sesini kendi videonda kullanabilirsin.</p>`}
   <div class="grid" style="margin-top:16px">${users.map(tileHTML).join('')}</div>`);
};
SHEETS.chain=function(prompt){
  const list=allVideos().filter(v=>v.addYours===prompt);
  sheet('Senin sıran',`<div class="card" style="background:var(--brass-tint);border-color:#f0dd9e"><div class="b" style="font-size:18px">${esc(prompt)}</div><div class="s muted" style="margin-top:4px">${list.length} kişi katıldı</div></div>
   <button class="btn primary full" style="margin-top:12px" onclick="closeSheet();openUpload({addYours:${JSON.stringify(prompt).replace(/"/g,'&quot;')}})">Sen de katıl</button>
   <div class="grid" style="margin-top:16px">${list.map(tileHTML).join('')}</div>`);
};
SHEETS.footnotes=function(vid){
  const v=vById(vid);const notes=[];
  if(v&&v.footnote&&!v.real)notes.push({id:'sample',t:v.footnote,u:null,sc:5});
  for(const [u,d] of Object.entries({...D.footnotes,[App.uid]:local.footnotes}))for(const f of (d&&d.list)||[])if(f.vid===vid)notes.push({...f,u,sc:sumOthers('votes',x=>x.fn&&x.fn[f.id]||0)});
  sheet('Bağlam notları',`<p class="s muted" style="line-height:1.5">Bağlam notları videoya ek bilgi ekler. Notu yararlı bulanlar arttıkça videonun altında gösterilir.</p>
   ${notes.length?notes.sort((a,b)=>b.sc-a.sc).map(n=>`<div class="card" style="margin-top:10px"><div style="font-size:14.5px;line-height:1.45">${esc(n.t)}</div>
     <div class="row" style="margin-top:8px"><span class="xs muted grow">${n.sc>0?'+':''}${n.sc} puan${n.u?' · '+esc(person(n.u).handle):''}</span>${n.id==='sample'?'':`<button class="btn soft sm" onclick="rateNote('${esc(n.id)}',1,'${esc(vid)}')">Yararlı</button><button class="btn soft sm" onclick="rateNote('${esc(n.id)}',-1,'${esc(vid)}')">Değil</button>`}</div></div>`).join(''):'<div class="empty"><h3>Henüz not yok</h3></div>'}
   <label class="lbl" for="fnIn">Not ekle</label><textarea class="field" id="fnIn" rows="3" maxlength="280" placeholder="Videodaki bilgiye kaynaklı bir bağlam ekle"></textarea>
   <button class="btn dark full" style="margin-top:10px" onclick="addNote('${esc(vid)}')">Notu gönder</button>`);
};
function addNote(vid){if(needAccount())return;const t=$('#fnIn').value.trim();if(t.length<10)return toast('Not en az 10 karakter olmalı');local.footnotes.list.push({id:rid(),vid,t,at:now()});saveOwn('footnotes');SHEETS.footnotes(vid);toast('Notun eklendi')}
function rateNote(id,val,vid){local.votes.fn[id]=val;saveOwn('votes');SHEETS.footnotes(vid)}
SHEETS.playlist=function({owner,id}){
  const pls=owner in SU?(SAMPLE_PLAYLISTS[owner]||[]):(ownDoc('playlists',owner).list||[]);const pl=pls.find(p=>p.id===id);
  if(!pl)return sheet('Oynatma listesi','<div class="empty"><h3>Liste bulunamadı</h3></div>');
  const vids=pl.vids.map(vById).filter(Boolean);const bought=local.gifts.sent.some(g=>g.kind==='series'&&g.pl===id);
  sheet(pl.name,`<p class="s muted">@${esc(person(owner).handle)} · ${vids.length} bölüm${pl.price?' · Dizi, '+tl(pl.price):''}</p>
   ${pl.price&&!bought&&owner!==App.uid?`<button class="btn brass full" style="margin-top:12px" onclick="buySeries('${esc(owner)}','${esc(id)}',${+pl.price})">Diziyi aç, ${tl(pl.price)}</button>`:''}
   <div class="grid" style="margin-top:14px">${vids.map(tileHTML).join('')}</div>`);
};
SHEETS.product=function({owner,id}){
  const items=owner in SU?(SAMPLE_SHOP[owner]||[]):(ownDoc('shop',owner).items||[]);const it=items.find(p=>p.id===id);
  if(!it)return sheet('Ürün','<div class="empty"><h3>Ürün bulunamadı</h3></div>');
  const safe=/^https:\/\//.test(it.url||'');
  sheet('Ürün',`${it.img?`<img src="${esc(it.img)}" alt="" style="width:100%;border-radius:16px;aspect-ratio:1;object-fit:cover">`:`<div style="font-size:90px;text-align:center;padding:20px;background:var(--brass-tint);border-radius:16px">${esc(it.e||'🛍️')}</div>`}
   <h2 class="sec" style="margin-top:14px">${esc(it.name)}</h2><div class="b" style="font-size:22px;color:var(--nar)">${tl(it.price)}</div>
   <p class="s muted" style="margin-top:6px">Satıcı: @${esc(person(owner).handle)}</p>
   ${safe?`<a class="btn primary full" style="margin-top:14px;text-decoration:none" href="${esc(it.url)}" target="_blank" rel="noopener">Satıcının sitesinde aç</a><p class="help" style="text-align:center">${esc(new URL(it.url).hostname)}</p>`:'<p class="help">Bu ürün için bağlantı eklenmemiş.</p>'}
   <p class="help" style="margin-top:12px">Ödeme uygulama içinde alınmaz. Satın alma satıcının kendi sitesinde yapılır.</p>`);
};
SHEETS.city=function(){
  sheet('Şehrin',`<p class="s muted">Yakın akışı, aynı şehirdeki kişilerin videolarını gösterir. Konumun kullanılmaz.</p><div class="chips wrapx" style="margin-top:12px">${CITIES.map(c=>`<button class="chip" aria-pressed="${D.me&&D.me.city===c}" onclick="setCity('${c}')">${c}</button>`).join('')}</div>`);
};
function setCity(c){if(!D.me)return showOnboarding();D.me.city=c;D.profiles[App.uid]=D.me;saveProfile();closeSheet();toast('Şehrin: '+c);if(currentScreen()==='home')buildFeed()}
SHEETS.limit=function(){
  sheet('Ekran süresi doldu',`<p style="font-size:15px;line-height:1.5">Bugün için belirlediğin ${D.prefs.limitMin} dakikalık süreyi doldurdun. Biraz ara vermek iyi gelebilir.</p>
   <button class="btn dark full" style="margin-top:16px" onclick="closeSheet()">Tamam</button>
   <button class="btn soft full" style="margin-top:8px" onclick="D.prefs.limitMin+=15;savePrefs(0);limitShown=false;closeSheet()">15 dakika daha</button>`);
};

/* ---------------- koleksiyonlar (özel + ortak) ---------------- */
SHEETS.colls=function(vid){
  const mine=Object.entries(D.prefs.colls||{});const shared=Object.entries(D.shared).filter(([,s])=>(s.members||[]).includes(App.uid));
  sheet(vid?'Koleksiyona ekle':'Koleksiyonlarım',`
   ${mine.map(([id,c])=>`<button class="opt-row" onclick="${vid?`toggleInColl('${esc(id)}','${esc(vid)}')`:`openSheet('coll','${esc(id)}')`}"><span class="grow"><div class="b">${esc(c.name)}</div><div class="help">${c.vids.length} video · sadece sen</div></span>${vid?`<span class="toggle" role="switch" aria-checked="${c.vids.includes(vid)}"></span>`:I.chev}</button>`).join('')}
   ${shared.map(([id,c])=>`<button class="opt-row" onclick="${vid?`toggleInShared('${esc(id)}','${esc(vid)}')`:`openSheet('coll','s:${esc(id)}')`}"><span class="grow"><div class="b">${esc(c.name)}</div><div class="help">${(c.vids||[]).length} video · ortak, ${(c.members||[]).length} kişi</div></span>${vid?`<span class="toggle" role="switch" aria-checked="${(c.vids||[]).includes(vid)}"></span>`:I.chev}</button>`).join('')}
   ${!mine.length&&!shared.length?'<p class="s muted">Henüz koleksiyonun yok.</p>':''}
   <label class="lbl" for="collN">Yeni koleksiyon</label><input class="field" id="collN" maxlength="40" placeholder="Örneğin Denenecek tarifler">
   <div class="row" style="margin-top:10px"><button class="btn dark" style="flex:1" onclick="newColl(false,'${esc(vid||'')}')">Özel oluştur</button><button class="btn soft" style="flex:1" onclick="newColl(true,'${esc(vid||'')}')">Ortak oluştur</button></div>
   <p class="help">Ortak koleksiyona arkadaşlarını ekleyebilir, birlikte video toplayabilirsiniz.</p>`);
};
function newColl(isShared,vid){
  const n=$('#collN').value.trim();if(!n)return toast('Koleksiyona bir ad ver');const id=rid();
  if(isShared){if(!App.db)return toast('Bu görünümde ortak koleksiyon kurulamıyor');App.db.doc(`shared/${id}`).set({name:n,members:[App.uid],vids:vid?[vid]:[],by:App.uid,at:now()}).then(()=>{toast('Ortak koleksiyon oluşturuldu');openSheet('coll','s:'+id)}).catch(dbErr)}
  else{D.prefs.colls[id]={name:n,vids:vid?[vid]:[]};savePrefs(0);SHEETS.colls(vid||null);toast('Koleksiyon oluşturuldu')}
}
function toggleInColl(id,vid){const c=D.prefs.colls[id];c.vids.includes(vid)?c.vids=c.vids.filter(x=>x!==vid):c.vids.push(vid);savePrefs(0);SHEETS.colls(vid)}
async function toggleInShared(id,vid){const s=D.shared[id];const vids=(s.vids||[]).includes(vid)?s.vids.filter(x=>x!==vid):[...(s.vids||[]),vid];try{await App.db.doc(`shared/${id}`).update({vids});D.shared[id]={...s,vids};SHEETS.colls(vid)}catch(e){dbErr(e)}}
SHEETS.coll=function(key){
  const isS=key.startsWith('s:'),id=isS?key.slice(2):key,c=isS?D.shared[id]:D.prefs.colls[id];if(!c)return sheet('Koleksiyon','<div class="empty"><h3>Bulunamadı</h3></div>');
  const vids=(c.vids||[]).map(vById).filter(Boolean);
  sheet(c.name,`${isS?`<div class="row" style="flex-wrap:wrap;gap:6px">${(c.members||[]).map(u=>{const p=person(u);return `<span class="chip">${esc(p.e)} @${esc(p.handle)}</span>`}).join('')}</div>
   <label class="lbl" for="collAdd">Arkadaş ekle</label><div class="row"><input class="field" id="collAdd" placeholder="Kullanıcı adı" autocapitalize="off"><button class="btn dark" onclick="addCollMember('${esc(id)}')">Ekle</button></div>`:''}
   <div class="grid" style="margin-top:16px">${vids.map(tileHTML).join('')||'<p class="muted s">Bu koleksiyon boş.</p>'}</div>
   <button class="btn soft full" style="margin-top:16px" onclick="${isS?`leaveShared('${esc(id)}')`:`delete D.prefs.colls['${esc(id)}'];savePrefs(0);openSheet('colls')`}">${isS?'Koleksiyondan ayrıl':'Koleksiyonu sil'}</button>`);
};
async function addCollMember(id){const h=$('#collAdd').value.trim().replace('@','').toLowerCase();const uid=byHandle(h);if(!uid||SU[uid])return toast('Bu kullanıcı bulunamadı');const s=D.shared[id];if(s.members.includes(uid))return;try{await App.db.doc(`shared/${id}`).update({members:[...s.members,uid]});D.shared[id]={...s,members:[...s.members,uid]};SHEETS.coll('s:'+id);toast('@'+h+' eklendi')}catch(e){dbErr(e)}}
async function leaveShared(id){const s=D.shared[id];try{const m=s.members.filter(u=>u!==App.uid);m.length?await App.db.doc(`shared/${id}`).update({members:m}):await App.db.doc(`shared/${id}`).delete();openSheet('colls')}catch(e){dbErr(e)}}

/* ---------------- yardımcı işlemler ---------------- */
function tileHTML(v){
  const st=v.status&&v.status!=='approved'?`<span class="status ${v.status}">${{pending:'İncelemede',rejected:'Reddedildi',draft:'Taslak',scheduled:'Zamanlandı'}[v.status]||''}</span>`:(v.scheduledAt&&v.scheduledAt>now()?'<span class="status pending">Zamanlandı</span>':'');
  const inner=v.thumb?`<img src="${esc(v.thumb)}" alt="" loading="lazy">`:v.imgs&&v.imgs.length?`<img src="${esc(v.imgs[0])}" alt="" loading="lazy">`:v.src?`<video src="${esc(v.src)}" poster="${BLANK}" muted preload="metadata"></video>`:v.tpl?`<div class="mini">${sceneHTML(v)}</div>`:'';
  return `<button class="tile" onclick="playFrom('${esc(v.id)}')" aria-label="${esc(v.cap||'Video')}">${inner}${st}<span class="plays">${I.eye}${fmt(viewCount(v))}</span></button>`;
}
function copyLink(id){
  const url=location.href.split('#')[0]+'#v-'+id;
  const done=()=>{toast('Bağlantı kopyalandı');closeSheet()};
  try{navigator.clipboard.writeText(url).then(done,()=>toast(url))}catch{toast(url)}
}
async function downloadVideo(id){
  const v=vById(id);if(!v||!v.real)return;
  if(!App.downloads)return toast('Bu görünümde indirme yapılamıyor');
  try{const r=await fetch(v.type==='photos'?v.imgs[0]:v.src);const blob=await r.blob();
    await App.downloads.save({filename:`${person(v.owner).handle}-${id}.${v.type==='photos'?'jpg':(blob.type.split('/')[1]||'mp4')}`,data:blob});toast('İndirildi')}catch(e){if(e&&e.code!=='cancelled')toast('İndirilemedi')}
}
function notInterested(id){D.prefs.hidden[id]=now();const v=vById(id);const r=D.prefs.interests[ikey(v)];if(r){r.skip+=2;r.n+=2}savePrefs(0);closeSheet();toast('Bu tarz videoları daha az göstereceğiz');const s=$(`#feed .slide[data-id="${id}"]`);if(s)s.style.opacity=.25}
function blockUser(uid){D.prefs.blocked[uid]=now();delete local.follows.m[uid];saveOwn('follows');savePrefs(0);closeSheet();toast(`@${person(uid).handle} engellendi`);buildFeed()}
function toggleMute(uid){D.prefs.muted[uid]?delete D.prefs.muted[uid]:D.prefs.muted[uid]=now();savePrefs(0);closeSheet();toast(D.prefs.muted[uid]?`@${person(uid).handle} sessize alındı. Takip akışında görünmeyecek.`:'Sessizden çıkarıldı')}
async function report(vid,reason,label){
  closeSheet();if(needAccount())return;
  if(App.db){try{await App.db.doc(`reports/${App.uid}/items/${rid()}`).set({vid,reason,label,at:now(),owner:vById(vid)?.owner||null,status:'open'})}catch(e){dbErr(e)}}
  toast('Şikayetin alındı. İnceleyeceğiz.');
}
function setConsent(on){D.prefs.consent=on&&D.prefs.adult;D.prefs.consentAt=now();savePrefs(0);saveSignals();SHEETS.settings();toast(on?'Rızan kaydedildi.':'Rızan geri alındı. Reklam verilerin silindi.')}

/* ---------------- analiz, ayarlar, gizlilik ---------------- */
SHEETS.analytics=function(){
  const ints=interests(),log=D.prefs.log.slice(-14).reverse(),n=D.prefs.log.length;
  sheet('İlgi analizim',`
   <p class="s muted" style="line-height:1.5">Videoları kaydırdıkça kaç saniye izlediğin, hangilerini 2 saniyede geçtiğin ve neyi tekrar izlediğin ölçülür. Akışın buna göre sıralanır. Reklam verenler bu listeyi görmez.</p>
   ${D.prefs.consent?'':`<div class="banner" style="margin-top:12px">Kişiselleştirilmiş reklam kapalı. Bu veriler yalnızca akışını sıralamak için kullanılıyor.</div>`}
   <div class="kpis" style="margin-top:14px"><div><b>${n}</b><span>izlenen video</span></div><div><b>${n?(D.prefs.log.reduce((a,e)=>a+e.ms,0)/n/1000).toFixed(1).replace('.',','):'0'} sn</b><span>ortalama izleme</span></div><div><b>${Math.round(usageToday()/60000)} dk</b><span>bugün</span></div></div>
   <h2 class="sec">İlgi puanların</h2>
   ${ints.length?ints.map(r=>`<div class="int"><div class="top-l"><b>${esc(ilabel(r.k))}</b><span class="score ${r.aff>=50?'hi':r.aff>=25?'mid':''}">${r.aff}</span></div><div class="bar"><i style="width:${r.aff}%;background:${r.aff>=50?'var(--mint)':r.aff>=25?'var(--brass)':'#B9BDC7'}"></i></div><div class="xs muted" style="margin-top:6px">${r.n} video, ortalama ${r.avg.toFixed(1).replace('.',',')} sn, yüzde ${r.skipPct} geçildi, yüzde ${r.compPct} bitirildi${r.loops?`, ${r.loops} tekrar`:''}</div></div>`).join(''):'<div class="empty"><h3>Henüz veri yok</h3>Akışta birkaç video kaydır, sonra buraya dön.</div>'}
   ${log.length?`<h2 class="sec">Son izlemeler</h2><div class="log">${log.map(e=>{const v=vById(e.v);return `${esc((v?(v.cap||'Video'):'Silinmiş video').slice(0,28))}: ${(e.ms/1000).toFixed(1).replace('.',',')} sn ${e.ms<2000?'<span class="sk">geçti</span>':''}${e.l?` <span class="cp">${e.l} tekrar</span>`:''}`}).join('<br>')}</div>`:''}`);
};
const tg=(on,dis)=>`<span class="toggle" role="switch" aria-checked="${!!on}" ${dis?'aria-disabled="true" style="opacity:.4"':''}></span>`;
SHEETS.settings=function(){
  sheet('Ayarlar',`
   <div class="group">
    <button class="opt-row" onclick="${D.prefs.adult?'setConsent(!D.prefs.consent)':''}"><span class="grow"><div class="b">Kişiselleştirilmiş reklam</div><div class="help">İzleme alışkanlıklarımın reklam seçmek için kullanılmasına açık rıza veriyorum.${D.prefs.adult?'':' 18 yaş altına kapalı.'}</div></span>${tg(D.prefs.consent,!D.prefs.adult)}</button>
   </div>
   <div class="group" style="margin-top:12px">
    <button class="list-btn" onclick="editProfile()">${I.doc}Profili düzenle${I.chev}</button>
    <button class="list-btn" onclick="openSheet('privacy')">${I.lock}Gizlilik ve etkileşim${I.chev}</button>
    <button class="list-btn" onclick="openSheet('wellbeing')">${I.timer}Ekran süresi ve rahat izleme${I.chev}</button>
    <button class="list-btn" onclick="openSheet('city')">${I.globe}Şehir: ${esc((D.me&&D.me.city)||'seçilmedi')}${I.chev}</button>
    <button class="list-btn" onclick="openSheet('colls')">${I.bookmarkO}Koleksiyonlar${I.chev}</button>
    <button class="list-btn" onclick="openSheet('requests')">${I.users}Takip istekleri${I.chev}</button>
   </div>
   <div class="group" style="margin-top:12px">
    <button class="list-btn" onclick="openSheet('studio')">${I.speed}Üretici stüdyosu${I.chev}</button>
    <button class="list-btn" onclick="openSheet('shop')">${I.bag}Mağazam${I.chev}</button>
    <button class="list-btn" onclick="openSheet('playlists')">${I.list}Oynatma listelerim ve dizilerim${I.chev}</button>
    <button class="list-btn" onclick="openSheet('bulletin')">${I.mega}Duyuru panosu${I.chev}</button>
    <button class="list-btn" onclick="openSheet('insights')">${I.globe}Arama içgörüleri${I.chev}</button>
   </div>
   <div class="group" style="margin-top:12px">
    <button class="list-btn" onclick="openSheet('terms')">${I.doc}Kullanım şartları${I.chev}</button>
    <button class="list-btn" onclick="openSheet('kvkk')">${I.lock}KVKK aydınlatma metni${I.chev}</button>
   </div>
   ${App.admin?`<div class="group" style="margin-top:12px">
    <button class="list-btn" onclick="openSheet('admin')">${I.shield}Yönetici paneli${I.chev}</button>
    <button class="list-btn" onclick="openSheet('advertiser')">${I.mega}Reklam veren paneli${I.chev}</button></div>`:''}
   ${window.APP_LOGOUT?`<button class="btn soft full" style="margin-top:12px" onclick="window.APP_LOGOUT()">Çıkış yap</button>`:''}
   <p class="help" style="margin-top:16px">${App.online?'Verilerin kaydediliyor.':'Bu görünümde veritabanına bağlanılamadı. Yaptıkların kaydedilmiyor.'}</p>`);
};
function setMe(path,val){if(!D.me)return;D.me.set=D.me.set||{};if(path==='private')D.me.private=val;else D.me.set[path]=val;D.profiles[App.uid]=D.me;saveProfile()}
SHEETS.privacy=function(){
  const s=(D.me&&D.me.set)||{},pv=!!(D.me&&D.me.private);
  const opt=(k,label,help)=>`<button class="opt-row" onclick="setMe('${k}',${s[k]===false});SHEETS.privacy()"><span class="grow"><div class="b">${label}</div><div class="help">${help}</div></span>${tg(s[k]!==false)}</button>`;
  sheet('Gizlilik ve etkileşim',`<div class="group">
    <button class="opt-row" onclick="setMe('private',${!pv});SHEETS.privacy()"><span class="grow"><div class="b">Gizli hesap</div><div class="help">Videolarını sadece onayladığın takipçiler görür.</div></span>${tg(pv)}</button>
    ${opt('duet','Düete izin ver','Başkaları videonla yan yana video çekebilir.')}
    ${opt('stitch','Stitch’e izin ver','Başkaları videonun bir parçasını kendi videosunda kullanabilir.')}
    ${opt('download','İndirmeye izin ver','Başkaları videolarını cihazına indirebilir.')}
   </div>
   <span class="lbl">Kimler yorum yapabilir?</span>
   <div class="seg">${[['all','Herkes'],['followers','Takipçiler'],['none','Kimse']].map(([k,t])=>`<button aria-pressed="${(s.comments||'all')===k}" onclick="setMe('comments','${k}');SHEETS.privacy()">${t}</button>`).join('')}</div>
   <label class="lbl" for="fw">Yorum filtresi <small>virgülle ayır</small></label>
   <input class="field" id="fw" value="${esc((s.filter||[]).join(', '))}" placeholder="Örneğin spam, reklam" onchange="setMe('filter',this.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,30));toast('Filtre kaydedildi')">
   <p class="help">Bu kelimeleri içeren yorumlar videolarında gizlenir.</p>
   <h2 class="sec">Sessize alınanlar</h2>${Object.keys(D.prefs.muted).map(id=>{const p=person(id);return `<div class="person">${avaHTML(p)}<b class="grow">@${esc(p.handle)}</b><button class="follow" aria-pressed="true" onclick="delete D.prefs.muted['${esc(id)}'];savePrefs(0);SHEETS.privacy()">Kaldır</button></div>`}).join('')||'<p class="s muted">Kimse yok.</p>'}
   <h2 class="sec">Engellenenler</h2>${Object.keys(D.prefs.blocked).map(id=>{const p=person(id);return `<div class="person">${avaHTML(p)}<b class="grow">@${esc(p.handle)}</b><button class="follow" aria-pressed="true" onclick="delete D.prefs.blocked['${esc(id)}'];savePrefs(0);SHEETS.privacy()">Engeli kaldır</button></div>`}).join('')||'<p class="s muted">Kimse yok.</p>'}`);
};
SHEETS.wellbeing=function(){
  sheet('Ekran süresi',`<div class="kpis"><div><b>${Math.round(usageToday()/60000)} dk</b><span>bugün izledin</span></div><div><b>${D.prefs.limitMin?D.prefs.limitMin+' dk':'Yok'}</b><span>günlük sınır</span></div><div><b>${D.prefs.calm?'Açık':'Kapalı'}</b><span>rahat izleme</span></div></div>
   <span class="lbl">Günlük sınır</span><div class="seg">${[0,30,60,90,120].map(m=>`<button aria-pressed="${(D.prefs.limitMin||0)===m}" onclick="D.prefs.limitMin=${m};limitShown=false;savePrefs(0);SHEETS.wellbeing()">${m?m+' dk':'Yok'}</button>`).join('')}</div>
   <div class="group" style="margin-top:14px"><button class="opt-row" onclick="D.prefs.calm=!D.prefs.calm;$('#app').classList.toggle('calm',D.prefs.calm);savePrefs(0);SHEETS.wellbeing()"><span class="grow"><div class="b">Rahat izleme</div><div class="help">Örnek videolardaki hareketli ve yanıp sönen efektleri durdurur. Işığa duyarlı kullanıcılar için.</div></span>${tg(D.prefs.calm)}</button></div>`);
};
SHEETS.requests=function(){
  const pending=Object.entries(D.follows).filter(([u,d])=>u!==App.uid&&d&&d.m&&d.m[App.uid]&&!local.approvals.m[u]);
  const pv=!!(D.me&&D.me.private);
  sheet('Takip istekleri',`${pv?'':'<div class="banner">Hesabın gizli değil. Takip eden herkes içeriğini görür.</div>'}
   ${pending.length?pending.map(([u])=>{const p=person(u);return `<div class="person">${avaHTML(p)}<b class="grow">@${esc(p.handle)}</b><button class="follow" onclick="approveFollow('${esc(u)}')">Onayla</button></div>`}).join(''):'<div class="empty"><h3>Bekleyen istek yok</h3></div>'}`);
};
function approveFollow(u){local.approvals.m[u]=now();saveOwn('approvals');SHEETS.requests();toast('Onaylandı')}
SHEETS.terms=()=>sheet('Kullanım şartları',`<div style="font-size:14.5px;line-height:1.6">
   <p><b>İçerik sorumluluğu.</b> Yüklediğin her içerikten sen sorumlusun. Başkasına ait video, müzik veya görüntüyü izinsiz yükleyemezsin.</p><br>
   <p><b>Yasak içerik.</b> Çıplaklık, şiddet, nefret söylemi, taciz, çocukları tehlikeye atan içerik ve yasa dışı her şey yasaktır.</p><br>
   <p><b>1 ₺ kampanyası ve hediyeler.</b> Ödül yalnızca onaylanan orijinal videolara verilir. Hediyeler bakiyeden düşer ve geri alınmaz. Çalıntı içerik tespit edilirse ödül geri alınır.</p><br>
   <p><b>Mağaza.</b> Ürün satışları satıcının kendi sitesinde yapılır. Uygulama satış sözleşmesinin tarafı değildir.</p><br>
   <p><b>Kaldırma.</b> Hukuka aykırı olduğu bildirilen içerik incelenir ve yayından kaldırılır.</p><br>
   <p class="muted s">Bu metin taslaktır. Yayına almadan önce bir avukata kontrol ettir.</p></div>`);
SHEETS.kvkk=()=>sheet('KVKK aydınlatma metni',`<div style="font-size:14.5px;line-height:1.6">
   <p><b>Toplanan veriler.</b> Hesap bilgileri, şehir, telefon numarası (ödeme için), yüklenen içerik, izleme süreleri, beğeni, yorum, takip, repost ve hediye hareketleri.</p><br>
   <p><b>Mesajlar.</b> Özel mesajlar cihazında şifrelenir. Mesaj içeriğini uygulama sahibi dahil kimse okuyamaz; kimin kiminle yazıştığı ise görülebilir.</p><br>
   <p><b>Amaç.</b> Hizmeti sunmak, akışı sıralamak, kötüye kullanımı önlemek. Açık rıza verirsen ilgi alanına göre reklam seçmek.</p><br>
   <p><b>Reklam verenler.</b> Kimliğin paylaşılmaz. Yalnızca toplu ve anonim kitle sayıları gösterilir.</p><br>
   <p><b>Hakların.</b> Verilerine erişme, düzeltme, silme ve rızanı geri çekme hakkın var.</p><br>
   <p class="muted s">Bu metin taslaktır. Yayına almadan önce bir avukata kontrol ettir.</p></div>`);
