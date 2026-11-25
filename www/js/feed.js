"use strict";
/* ================================================================
   AKIŞ
   ================================================================ */
let feedItems=[],active=-1,t0=0,loops=0,paused=false,pausedAt=0,pausedFor=0,raf=0,io=null,limitShown=false;
function visible(v){return !D.prefs.blocked[v.owner]&&!D.prefs.hidden[v.id]}
const promoted=vid=>Object.entries(D.gifts).some(([u,d])=>((u===App.uid?local.gifts:d).sent||[]).some(g=>g.kind==='promote'&&g.vid===vid&&g.until>now()))||local.gifts.sent.some(g=>g.kind==='promote'&&g.vid===vid&&g.until>now());
function rankForYou(){
  const ints=Object.fromEntries(interests().map(r=>[r.k,r.aff]));
  const seen={};for(const e of D.prefs.log)seen[e.v]=(seen[e.v]||0)+1;
  return allVideos().filter(visible).map(v=>({v,s:(ints[ikey(v)]??20)*2+Math.log(1+likeCount(v)*3+commentCount(v)*4+viewCount(v))*10
    +(v.real?(now()-v.at<172800000?150:40):0)+(promoted(v.id)?120:0)-(seen[v.id]?35*seen[v.id]:0)+Math.random()*15}))
    .sort((a,b)=>b.s-a.s).map(x=>x.v);
}
function friendsOf(){return Object.keys(local.follows.m).filter(u=>followsMe(u))}
function feedList(){
  const all=allVideos().filter(visible);
  switch(UI.feedType){
    case 'following':{
      const reposted=new Map();for(const u of Object.keys(local.follows.m)){if(D.prefs.muted[u])continue;for(const [vid,at] of Object.entries(ownDoc('reposts',u).m||{}))reposted.set(vid,{by:u,at:typeof at==='object'?at.at:at,note:typeof at==='object'?at.note:''})}
      return all.filter(v=>(iFollow(v.owner)&&!D.prefs.muted[v.owner])||reposted.has(v.id)).map(v=>reposted.has(v.id)&&!iFollow(v.owner)?{...v,repostBy:reposted.get(v.id)}:v).sort((a,b)=>b.at-a.at);}
    case 'friends':{const fr=new Set(friendsOf());return all.filter(v=>fr.has(v.owner)).sort((a,b)=>b.at-a.at)}
    case 'nearby':{const city=(D.me&&D.me.city)||'';if(!city)return null;return all.filter(v=>v.city===city).sort((a,b)=>b.at-a.at)}
  }
  return rankForYou();
}
function pickAd(){
  const pool=[...Object.entries(D.ads).filter(([,a])=>a.status==='active').map(([id,a])=>({id,...a,live:true})),...HOUSE_ADS];
  const top=interests()[0];
  if(D.prefs.consent&&D.prefs.adult&&top&&top.n>=2){
    const g=top.k[0]==='g'?+top.k.slice(1):null,c=g?2:+top.k.slice(1);
    const hit=pool.find(a=>(g&&a.game===g)||(!g&&a.cat===c&&!a.game)||(g&&a.cat===2&&!a.game));
    if(hit)return {ad:hit,why:'İlgi alanına göre: '+ilabel(top.k)};
  }
  return {ad:pool.find(a=>!a.cat)||pool[0],why:D.prefs.consent?'Henüz yeterli izleme verisi yok':'Kişiselleştirilmiş reklam kapalı'};
}
const EMPTY={
 following:['Takip ettiğin kimse henüz paylaşım yapmadı','Senin için sekmesinden beğendiğin hesapları takip et.'],
 friends:['Henüz arkadaşın yok','Karşılıklı takipleştiğin kişiler arkadaşın olur. Onların videoları burada görünür.'],
 nearby:['Şehrini seç','Yakındaki videoları görmek için profilinde şehrini belirle.'],
 nearbyEmpty:['Şehrinde henüz video yok','Şehrinden ilk videoyu sen paylaş.'],
};
function buildFeed(keepPos){
  commitWatch();
  const list=feedList();
  feedItems=[];(list||[]).forEach((v,i)=>{feedItems.push({v});if(UI.feedType==='foryou'&&i%5===4)feedItems.push(pickAd())});
  const f=$('#feed');
  if(!feedItems.length){
    const [h,p]=list===null?EMPTY.nearby:UI.feedType==='nearby'?EMPTY.nearbyEmpty:EMPTY[UI.feedType]||EMPTY.following;
    f.innerHTML=`<div class="feed-empty"><span class="coin" style="--s:64px"><span class="face">1₺</span></span><h3 style="font-size:20px">${h}</h3><p>${p}</p>${list===null?`<button class="btn primary" onclick="openSheet('city')">Şehrini seç</button>`:`<button class="btn primary" onclick="setFeed('foryou')">Senin için sekmesine geç</button>`}</div>`;active=-1;updateMuteBtn();return}
  f.innerHTML=feedItems.map((it,i)=>it.ad?adHTML(it,i):slideHTML(it.v,i)).join('');
  if(!keepPos)f.scrollTop=0;active=-1;observe();
}
function sceneHTML(s){
  switch(s.tpl){
   case 'meme':return `<div class="scene sc-meme"><div class="top">${esc(s.top)}</div><div class="emo">${esc(s.e)}</div><div class="bot">${esc(s.bot)}</div></div>`;
   case 'hud':return `<div class="scene sc-hud"><div class="ground"></div><div class="zone"><i></i></div><div class="alive">${s.kills?4+s.kills.length:3} hayatta</div><div class="cross"></div><div class="feedlog">${(s.kills||[]).map((k,i)=>`<span style="animation-delay:${1+i*2.4}s">${k}</span>`).join('')}</div><div class="title">${esc(s.title||s.sceneTitle||'')}</div></div>`;
   case 'recipe':return `<div class="scene sc-recipe"><div class="plate">${esc(s.e)}</div>${(s.steps||['Malzemeleri hazırla','Pişir','Afiyet olsun']).map((t,i)=>`<div class="step"><b>${i+1}</b><span>${esc(t)}</span></div>`).join('')}</div>`;
   case 'scenic':return `<div class="scene sc-scenic"><div class="title">${esc(s.title)}</div><div class="sun"></div><div class="m1"></div><div class="m2"></div></div>`;
   case 'pet':return `<div class="scene sc-pet"><div class="title">${esc(s.title)}</div><div class="shadow"></div><div class="emo">${esc(s.e)}</div></div>`;
   case 'dance':return `<div class="scene sc-dance"><div class="title">${esc(s.title||s.sceneTitle||'')}</div><div class="emo">${esc(s.e)}</div><div class="bars">${'<i></i>'.repeat(13)}</div></div>`;
  }
  return '';
}
const LIGHT=['#FFFFFF','#D9A520','#F3F4F7'];
function textCss(t){const c=/^#[0-9a-fA-F]{6}$/.test(t.color||'')?t.color:'#FFFFFF';return t.style==='bg'?`background:${c};color:${LIGHT.includes(c.toUpperCase())?'#16141C':'#fff'}`:`color:${c}`}
function editLayer(e){return e&&e.texts?e.texts.map(t=>`<div class="overlay-text ${t.style==='bg'?'bg':'sh'}" style="left:${+t.x||50}%;top:${+t.y||50}%;${textCss(t)}">${esc(t.t)}</div>`).join(''):''}
function mediaHTML(v,role='main'){
  if(!v)return '<div class="scene" style="background:#111"></div>';
  if(!v.real)return sceneHTML(v);
  const fc='f-'+((v.edit&&v.edit.filter)||'none');
  if(v.type==='photos')return `<div class="carousel ${fc}" data-role="${role}">${v.imgs.map(u=>`<img src="${esc(u)}" alt="" draggable="false">`).join('')}</div>${v.imgs.length>1?`<div class="dots">${v.imgs.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div>`:''}${editLayer(v.edit)}`;
  return `<video class="vid ${fc}" data-role="${role}" src="${esc(v.src)}" poster="${esc(v.thumb||BLANK)}" playsinline loop muted preload="metadata"></video>${editLayer(v.edit)}`;
}
function slideMedia(v){
  if(v.duetOf){const o=vById(v.duetOf);return `<div class="duet"><div>${mediaHTML(o,'ref')}</div><div>${mediaHTML(v)}</div></div><div class="ref-chip">Düet: @${esc(o?person(o.owner).handle:'video')}</div>`}
  if(v.stitchOf){const o=vById(v.stitchOf);return `<div class="media stitch-ref" style="position:absolute;inset:0">${mediaHTML(o,'ref')}</div><div class="media stitch-main" style="position:absolute;inset:0;visibility:hidden">${mediaHTML(v)}</div><div class="ref-chip">Stitch: @${esc(o?person(o.owner).handle:'video')}</div>`}
  return mediaHTML(v)+(v.soundOf&&vById(v.soundOf)&&vById(v.soundOf).real?`<video class="snd" poster="${BLANK}" src="${esc(vById(v.soundOf).src)}" muted loop playsinline preload="none" style="display:none"></video>`:'');
}
function plOf(v){
  if(!v.playlist)return null;
  const own=v.real?ownDoc('playlists',v.owner).list||[]:(SAMPLE_PLAYLISTS[v.owner]||[]);
  return own.find(p=>p.id===v.playlist)||null;
}
function seriesLocked(v){const pl=plOf(v);if(!pl||!pl.price||v.owner===App.uid)return false;if(pl.vids[0]===v.id)return false;return !local.gifts.sent.some(g=>g.kind==='series'&&g.pl===pl.id)}
function productOf(v){if(!v.productId)return null;const items=v.real?ownDoc('shop',v.owner).items||[]:(SAMPLE_SHOP[v.owner]||[]);return items.find(p=>p.id===v.productId)||null}
function bestFootnote(v){
  if(v.footnote&&!v.real)return {t:v.footnote};
  let best=null;
  for(const [u,d] of Object.entries({...D.footnotes,[App.uid]:local.footnotes})){for(const f of (d&&d.list)||[]){if(f.vid!==v.id)continue;
    const sc=sumOthers('votes',x=>x.fn&&x.fn[f.id]||0);if(sc>=1&&(!best||sc>best.sc))best={...f,sc}}}
  return best;
}
function slideHTML(v,i){
  const p=person(v.owner),c=cat(v.cat),g=v.game&&game(v.game),me=v.owner===App.uid,liked=!!local.likes.m[v.id],saved=!!D.prefs.saves[v.id];
  const pl=plOf(v),prod=productOf(v),fn=bestFootnote(v),locked=seriesLocked(v);
  const chainN=v.addYours?allVideos().filter(x=>x.addYours===v.addYours).length:0;
  return `<article class="slide" data-i="${i}" data-id="${esc(v.id)}" aria-label="${esc(p.handle)} videosu">
   <div class="media">${slideMedia(v)}</div>
   <div class="fade"></div><div class="bigplay">${I.play}</div><div class="measure"></div>
   ${v.replyTo?`<div class="ref-chip">@${esc(person(v.replyTo.u).handle)} yorumuna yanıt: “${esc((v.replyTo.text||'').slice(0,40))}”</div>`:''}
   ${locked?`<div class="lock"><h3>${esc(pl.name)}</h3><p>Bu dizinin ilk bölümü ücretsiz. Diğer bölümler için ${tl(pl.price)}.</p><button class="btn brass" onclick="buySeries('${esc(v.owner)}','${esc(pl.id)}',${+pl.price})">Diziyi aç, ${tl(pl.price)}</button></div>`:''}
   <div class="rail">
     <div class="creator"><button onclick="openSheet('user','${esc(v.owner)}')" aria-label="${esc(p.handle)} profili">${avaHTML(p)}</button>
       ${me?'':`<button class="fol ${iFollow(v.owner)?'done':''}" data-fol="${esc(v.owner)}" onclick="toggleFollow('${esc(v.owner)}')" aria-label="${iFollow(v.owner)?'Takibi bırak':'Takip et'}">${iFollow(v.owner)?I.check:I.plus}</button>`}</div>
     <button class="rb like" data-id="${esc(v.id)}" aria-pressed="${liked}" aria-label="Beğen" onclick="toggleLike('${esc(v.id)}')">${I.heart}<span data-c="like">${fmt(likeCount(v))}</span></button>
     <button class="rb" aria-label="Yorumlar" onclick="openSheet('comments','${esc(v.id)}')">${I.bubble}<span data-c="cm">${fmt(commentCount(v))}</span></button>
     <button class="rb save" aria-pressed="${saved}" aria-label="Kaydet" onclick="toggleSave('${esc(v.id)}')">${I.bookmark}<span data-c="save">${fmt(saveCount(v))}</span></button>
     ${me?'':`<button class="rb gift" aria-label="Hediye gönder" onclick="openSheet('gift',{to:'${esc(v.owner)}',vid:'${esc(v.id)}'})">${I.gift}<span>Hediye</span></button>`}
     <button class="rb" aria-label="Paylaş" onclick="openSheet('share','${esc(v.id)}')">${I.share}<span>${fmt(shareCount(v))}</span></button>
     <button class="rb" aria-label="Diğer seçenekler" onclick="openSheet('more','${esc(v.id)}')">${I.more}</button>
     <button class="disc" aria-label="Ses: ${esc(v.sound)}" onclick="openSheet('sound','${esc(v.soundOf||v.id)}')">${avaHTML(p)}</button>
   </div>
   <div class="meta">
     ${v.repostBy?`<div class="xs b" style="margin-bottom:4px">↻ @${esc(person(v.repostBy.by).handle)} repostladı${v.repostBy.note?': '+esc(v.repostBy.note):''}</div>`:''}
     <div class="who"><button onclick="openSheet('user','${esc(v.owner)}')">@${esc(p.handle)}</button>${p.sample?'<span class="flag">Örnek</span>':''}${v.aiLabel?'<span class="badge-ai">Yapay zekâ ile üretildi</span>':''}${promoted(v.id)?'<span class="flag">Öne çıkarıldı</span>':''}</div>
     ${local.reposts.m[v.id]?'<div class="xs b" style="margin-top:4px">Repostladın</div>':''}
     <div class="cap" onclick="this.classList.toggle('open')">${mentionHTML(v.cap)}</div>
     <div class="tags"><button class="tag" onclick="go('discover');setCat(${c.id})">${c.e} ${esc(c.name)}</button>${g?`<button class="tag game" onclick="go('discover');setCat(2,${g.id})">${I.pad} ${esc(g.name)}</button>`:''}${v.city&&UI.feedType==='nearby'?`<span class="tag">${esc(v.city)}</span>`:''}</div>
     ${pl?`<button class="pl-chip" onclick="openSheet('playlist',{owner:'${esc(v.owner)}',id:'${esc(pl.id)}'})">${I.list.replace('<svg','<svg width="14" height="14"')} ${esc(pl.name)} · ${pl.vids.indexOf(v.id)+1}/${pl.vids.length}${pl.price?' · Dizi':''}</button>`:''}
     ${v.addYours?`<button class="chain" onclick="openSheet('chain','${esc(v.addYours)}')">Senin sıran: ${esc(v.addYours)} · ${chainN}</button>`:''}
     ${prod?`<button class="product" onclick="openSheet('product',{owner:'${esc(v.owner)}',id:'${esc(prod.id)}'})">${prod.img?`<img src="${esc(prod.img)}" alt="">`:`<span class="pi">${esc(prod.e||'🛍️')}</span>`}<span class="grow"><span class="pn ell" style="display:block">${esc(prod.name)}</span><span class="pp">${tl(prod.price)}</span></span>${I.bag.replace('<svg','<svg width="22" height="22"')}</button>`:''}
     ${fn?`<button class="footnote" onclick="openSheet('footnotes','${esc(v.id)}')"><b>Bağlam notu</b>${esc(fn.t)}</button>`:''}
     <div class="sound">${I.note}<span style="overflow:hidden"><span class="run">${esc(v.sound)}&emsp;&emsp;${esc(v.sound)}&emsp;&emsp;</span></span></div>
   </div>
   <div class="prog"><i></i></div></article>`;
}
function adHTML(it,i){
  const a=it.ad;const vv=a.vid&&vById(a.vid);
  return `<article class="slide" data-i="${i}" data-ad="${esc(a.id)}" aria-label="Reklam">
   <div class="media">${vv?mediaHTML(vv):sceneHTML({...a,title:a.sceneTitle||a.title,tpl:a.tpl||'dance',e:a.e||'📣'})}</div><div class="fade"></div><div class="bigplay">${I.play}</div><div class="measure"></div>
   <div class="meta" style="right:16px">
     <div class="who">${esc(a.brand)} <span class="flag ad">Sponsorlu</span>${a.live?'':'<span class="flag">Örnek</span>'}</div>
     <div class="cap">${esc(a.title)}</div>
     <div class="why">Neden bu reklam: ${esc(it.why)}</div>
     <button class="ad-cta" onclick="adClick()">${esc(a.cta||'Daha fazla')}</button>
   </div><div class="prog"><i></i></div></article>`;
}
function refreshCounts(){
  $$('#feed .slide[data-id]').forEach(s=>{const v=vById(s.dataset.id);if(!v)return;
    s.querySelector('[data-c=like]').textContent=fmt(likeCount(v));s.querySelector('[data-c=cm]').textContent=fmt(commentCount(v));
    s.querySelector('.rb.like').setAttribute('aria-pressed',!!local.likes.m[v.id]);
    const fb=s.querySelector('.fol');if(fb){const on=iFollow(v.owner);fb.classList.toggle('done',on);fb.innerHTML=on?I.check:I.plus}});
}
function observe(){
  io&&io.disconnect();
  io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting&&e.intersectionRatio>=.6)activate(+e.target.dataset.i)},{root:$('#feed'),threshold:[.6]});
  $$('#feed .slide').forEach(s=>{io.observe(s);bindTap(s);const car=s.querySelector('.carousel');if(car)car.addEventListener('scroll',()=>{const n=Math.round(car.scrollLeft/car.clientWidth);s.querySelectorAll('.dots i').forEach((d,j)=>d.classList.toggle('on',j===n))},{passive:true})});
}
const cur=()=>$(`#feed .slide[data-i="${active}"]`);
const elapsed=()=>(paused?pausedAt:performance.now())-t0-pausedFor;
const durOf=it=>it.ad?12:(it.v.realDur||(it.v.type==='photos'?Math.max(6,it.v.imgs.length*3):it.v.dur)||15);
function commitWatch(){
  if(active<0||!feedItems[active])return;
  const it=feedItems[active],ms=Math.round(elapsed());active=-1;
  addUsage(ms);
  if(ms<250||it.ad)return;
  if(typeof track==='function')track('watch',ms,it.v);
  const v=it.v,d=durOf(it)*1000,k=ikey(v);
  const r=D.prefs.interests[k] ||= {n:0,watch:0,cap:0,skip:0,comp:0,loops:0};
  r.n++;r.watch+=ms;r.cap+=Math.min(ms,30000);r.skip+=ms<2000?1:0;r.comp+=(ms>=d*.9||loops>0)?1:0;r.loops+=loops;
  D.prefs.log.push({v:v.id,ms,l:loops,t:now()});if(D.prefs.log.length>60)D.prefs.log.splice(0,20);
  local.views.m[v.id]=(local.views.m[v.id]||0)+1;local.views.w=local.views.w||{};local.views.w[v.id]=(local.views.w[v.id]||0)+ms;
  savePrefs();saveOwn('views',4000);saveSignals();
}
function vidsIn(el){return el?[...el.querySelectorAll('video')]:[]}
function activate(i){
  if(i===active)return;
  const prev=cur();commitWatch();
  if(prev){prev.classList.remove('paused');vidsIn(prev).forEach(v=>v.pause())}
  active=i;t0=performance.now();loops=0;paused=false;pausedFor=0;
  const el=cur(),it=feedItems[i];
  if(el&&it&&!it.ad&&seriesLocked(it.v)){updateMuteBtn();return}
  if(el){
    const st=el.querySelector('.stitch-ref');
    if(st){ // stitch: önce orijinalden parça, sonra yeni video
      const ref=st.querySelector('video'),main=el.querySelector('.stitch-main');const mv=main.querySelector('video');
      st.style.visibility='visible';main.style.visibility='hidden';
      const go2=()=>{st.style.visibility='hidden';main.style.visibility='visible';if(ref)ref.pause();if(mv){mv.currentTime=0;mv.muted=UI.muted;mv.play().catch(()=>{})}};
      if(ref){ref.muted=UI.muted;ref.currentTime=0;ref.play().catch(()=>{});ref.ontimeupdate=()=>{if(ref.currentTime>=(it.v.stitchSec||5))go2()}}
      else setTimeout(go2,(it.v.stitchSec||5)*1000);
    }else{
      vidsIn(el).forEach(v=>{const isSnd=v.classList.contains('snd');v.muted=isSnd?UI.muted:(it&&it.v&&it.v.soundOf?true:UI.muted);
        if(v.dataset.role==='ref'&&!isSnd)v.muted=true;
        v.playbackRate=UI.speed*((it&&it.v&&it.v.edit&&it.v.edit.speed)||1);v.currentTime=0;v.play().catch(()=>{})});
      const mv=el.querySelector('video[data-role=main]');
      if(mv)mv.onloadedmetadata=()=>{if(it&&it.v&&isFinite(mv.duration))it.v.realDur=mv.duration};
    }
  }
  cancelAnimationFrame(raf);tick();updateMuteBtn();
}
function tick(){
  const el=cur(),it=feedItems[active];if(!el||!it)return;
  const vid=el.querySelector('video[data-role=main]');let p;const e=elapsed(),d=durOf(it)*1000;
  if(vid&&vid.duration&&!el.querySelector('.stitch-ref')){p=vid.currentTime/vid.duration}else{p=(e%d)/d}
  if(e>=d*(loops+1)){loops++;if(D.prefs.autoscroll&&!sheetKind){const f=$('#feed');f.scrollBy({top:f.clientHeight,behavior:'smooth'})}}
  el.querySelector('.prog i').style.width=(p*100).toFixed(2)+'%';
  if(UI.measure)el.querySelector('.measure').textContent=`İzleme ${(e/1000).toFixed(1)} sn · tekrar ${loops}${e<2000?' · 2 sn altı geçmiş sayılır':''}`;
  if(D.prefs.limitMin&&!limitShown&&usageToday()+e>D.prefs.limitMin*60000){limitShown=true;if(!paused)togglePause(el);openSheet('limit')}
  raf=requestAnimationFrame(tick);
}
function bindTap(s){
  let last=0,tm;
  s.addEventListener('click',ev=>{
    if(ev.target.closest('button,.meta,.rail,.lock'))return;
    const t=now();if(t-last<300){clearTimeout(tm);burst(s,ev);last=0;return}
    last=t;tm=setTimeout(()=>togglePause(s),300);
  });
}
function togglePause(s){
  if(!s||+s.dataset.i!==active)return;paused=!paused;s.classList.toggle('paused',paused);
  if(paused){pausedAt=performance.now();vidsIn(s).forEach(v=>v.pause())}
  else{pausedFor+=performance.now()-pausedAt;vidsIn(s).forEach(v=>{if(v.closest('.stitch-main')&&v.closest('.stitch-main').style.visibility==='hidden')return;if(v.closest('.stitch-ref')&&v.closest('.stitch-ref').style.visibility==='hidden')return;v.play().catch(()=>{})})}
}
function burst(s,ev){
  const r=s.getBoundingClientRect(),h=document.createElement('div');h.className='heart-burst';h.innerHTML=I.heartRed;
  h.style.left=(ev.clientX-r.left)+'px';h.style.top=(ev.clientY-r.top)+'px';s.appendChild(h);setTimeout(()=>h.remove(),950);
  if(s.dataset.id&&!local.likes.m[s.dataset.id])toggleLike(s.dataset.id);
}
function updateMuteBtn(){const it=feedItems[active],b=$('#muteBtn');const show=currentScreen()==='home'&&!!(it&&it.v&&it.v.real);b.style.visibility=show?'visible':'hidden';b.innerHTML=UI.muted?I.volOff:I.volOn;b.setAttribute('aria-label',UI.muted?'Sesi aç':'Sesi kapat')}
$('#muteBtn').onclick=()=>{UI.muted=!UI.muted;const el=cur(),it=feedItems[active];vidsIn(el).forEach(v=>{if(v.classList.contains('snd'))v.muted=UI.muted;else if(v.dataset.role==='ref'&&!el.querySelector('.stitch-ref'))v.muted=true;else if(it&&it.v&&it.v.soundOf)v.muted=true;else v.muted=UI.muted});updateMuteBtn()};
function setFeed(t){UI.feedType=t;anim($('#feed'),'swap');$$('.feed-tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.feed===t));buildFeed()}
$$('.feed-tabs button').forEach(b=>b.onclick=()=>setFeed(b.dataset.feed));

/* ekran süresi */
function usageToday(){return D.prefs.usage&&D.prefs.usage.d===dayKey()?D.prefs.usage.ms:0}
function addUsage(ms){if(!D.prefs.usage||D.prefs.usage.d!==dayKey())D.prefs.usage={d:dayKey(),ms:0};D.prefs.usage.ms+=ms}

/* ---------------- etkileşimler ---------------- */
function needAccount(){if(!D.prefs.termsAt){showOnboarding();return true}return false}
function toggleLike(id){if(needAccount())return;if(local.likes.m[id])delete local.likes.m[id];else local.likes.m[id]=now();saveOwn('likes');refreshCounts();$$(`.rb.like[data-id="${id}"]`).forEach(b=>anim(b,'pop'))}
function toggleSave(id){
  if(needAccount())return;
  const on=!D.prefs.saves[id];on?D.prefs.saves[id]=now():delete D.prefs.saves[id];savePrefs(0);
  const s=$(`#feed .slide[data-id="${id}"] .rb.save`);if(s){s.setAttribute('aria-pressed',on);const v=vById(id);s.querySelector('span').textContent=fmt(saveCount(v))}
  toast(on?'Kaydedilenlere eklendi':'Kaydedilenlerden çıkarıldı');
}
function toggleFollow(uid,btn){
  if(needAccount())return;
  const on=!local.follows.m[uid];on?local.follows.m[uid]=now():delete local.follows.m[uid];saveOwn('follows');
  refreshCounts();if(btn){btn.setAttribute('aria-pressed',on);btn.textContent=on?(person(uid).private&&!ownDoc('approvals',uid).m[App.uid]?'İstek gönderildi':'Takiptesin'):'Takip et'}
  toast(on?(person(uid).private?'Takip isteği gönderildi':`@${person(uid).handle} takip ediliyor`):'Takip bırakıldı');
}
function toggleRepost(id,note){
  if(needAccount())return;
  const on=!local.reposts.m[id];on?local.reposts.m[id]={at:now(),note:(note||'').slice(0,120)}:delete local.reposts.m[id];saveOwn('reposts');closeSheet();
  toast(on?'Repostlandı. Takipçilerinin akışında görünecek.':'Repost geri alındı');
}
function adClick(){toast('Reklam tıklaması kaydedildi')}
