"use strict";
/* ================================================================
   BAĞLILIK: günlük seri, görevler, XP/seviye, rozetler, çerçeveler,
   haftalık özet, haftanın yıldızları
   Kişisel veriler D.prefs.r içinde (gizli); seviye/çerçeve/seri
   herkese açık profilde görünür.
   ================================================================ */
const dayDiff=(a,b)=>Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5);
const LEVEL_NAMES=['Çaylak','Meraklı','Gezgin','Sohbetçi','Yükselen','Parlayan','Yıldız','Süperstar','Efsane','Doli Efsanesi'];
const lvlOf=xp=>Math.floor((Math.sqrt(1+8*xp/60)-1)/2)+1;            // her seviye 60, 120, 180… XP ister
const xpFor=l=>60*(l-1)*l/2;
const lvlName=l=>LEVEL_NAMES[Math.min(LEVEL_NAMES.length-1,Math.floor((l-1)/3))];
const FRAMES=[
  {id:'neon',name:'Neon',lvl:3},{id:'fire',name:'Ateş',lvl:5},{id:'ice',name:'Buz',lvl:8},
  {id:'gold',name:'Altın',lvl:12},{id:'galaxy',name:'Galaksi',lvl:18},{id:'rainbow',name:'Gökkuşağı',lvl:25},
  {id:'flame',name:'Seri alevi',streak:7}];
const BADGES=[
  {id:'first',e:'🎬',name:'İlk video',d:'İlk videonu paylaştın'},
  {id:'s3',e:'🔥',name:'Kıvılcım',d:'3 günlük seri'},
  {id:'s7',e:'☄️',name:'Alev topu',d:'7 günlük seri'},
  {id:'s30',e:'🌋',name:'Yanardağ',d:'30 günlük seri'},
  {id:'like100',e:'❤️',name:'Kalp dağıtıcı',d:'100 beğeni verdin'},
  {id:'cm20',e:'💬',name:'Sohbet ustası',d:'20 yorum yaptın'},
  {id:'fol10',e:'🦋',name:'Sosyal kelebek',d:'10 kişiyi takip ettin'},
  {id:'owl',e:'🦉',name:'Gece kuşu',d:'Gece yarısından sonra izledin'},
  {id:'bird',e:'🐦',name:'Erkenci',d:'Sabah 8’den önce izledin'},
  {id:'chest7',e:'🧰',name:'Sandık avcısı',d:'7 günlük sandık açtın'},
  {id:'l10',e:'💎',name:'Elmas',d:'10. seviyeye ulaştın'}];
const MISSION_POOL=[
  {k:'watch',n:15,xp:20,t:n=>`${n} video izle`,e:'▶️'},
  {k:'like',n:5,xp:15,t:n=>`${n} videoyu beğen`,e:'❤️'},
  {k:'comment',n:2,xp:20,t:n=>`${n} yorum yaz`,e:'💬'},
  {k:'share',n:1,xp:15,t:n=>`${n} video paylaş`,e:'↗️'},
  {k:'follow',n:2,xp:15,t:n=>`${n} yeni hesap takip et`,e:'➕'},
  {k:'minutes',n:10,xp:20,t:n=>`${n} dakika izle`,e:'⏱️'},
  {k:'upload',n:1,xp:40,t:()=>`1 video paylaş, 1 ₺ kazan`,e:'🎬'}];
const XP_PER={watch:1,like:2,comment:5,share:5,follow:3,upload:30};
const XP_CAP={watch:60,like:40,comment:50,share:30,follow:30,upload:90};

function R(){
  const r=D.prefs.r ||= {};
  r.xp ||= 0;r.days ||= {};r.badges ||= [];r.streak ||= {n:0,last:'',best:0,freeze:1};r.chests ||= 0;r.tot ||= {};
  return r;
}
function today(){const r=R(),k=dayKey();const d=r.days[k] ||= {c:{},xp:{},claimed:[],cats:{},who:{},ms:0};
  // 21 günden eski günleri at
  const ks=Object.keys(r.days).sort();while(ks.length>21)delete r.days[ks.shift()];return d}
function missions(k=dayKey()){
  let h=0;for(const ch of k)h=(h*31+ch.charCodeAt(0))>>>0;
  const pool=MISSION_POOL.slice(1,6);const out=[MISSION_POOL[0]];
  while(out.length<4){const m=pool.splice(h%pool.length,1)[0];out.push(m);h=Math.floor(h/7)+13}
  out.push(MISSION_POOL[6]);return out;
}
function progressOf(m,d=today()){return m.k==='minutes'?Math.floor((d.ms||0)/60000):(d.c[m.k]||0)}
function level(){return lvlOf(R().xp)}

/* ---------- XP ve seviye ---------- */
function addXP(n,why){
  if(!n)return;const r=R(),before=lvlOf(r.xp);r.xp+=n;const after=lvlOf(r.xp);
  savePrefs();flyXP(n);
  if(after>before){setTimeout(()=>levelUp(after),500);if(after>=10)badge('l10')}
  syncPublic();
}
function syncPublic(){
  if(!D.me)return;const r=R(),l=lvlOf(r.xp),s=liveStreak();
  if(D.me.lvl!==l||D.me.streak!==s||(r.frame||null)!==(D.me.frame||null)){D.me.lvl=l;D.me.streak=s;D.me.frame=r.frame||null;saveProfile()}
}
function badge(id){const r=R();if(r.badges.includes(id))return;r.badges.push(id);savePrefs();const b=BADGES.find(x=>x.id===id);
  if(b)setTimeout(()=>celebrate({big:b.e,title:'Yeni rozet!',sub:`${b.name}: ${b.d}`,btn:'Harika'}),900)}

/* ---------- seri ---------- */
function liveStreak(){const s=R().streak;if(!s.last)return 0;const g=dayDiff(s.last,dayKey());return g<=1||(g===2&&s.freeze>0)?s.n:0}
function bumpStreak(){
  const r=R(),s=r.streak,k=dayKey();if(s.last===k)return false;
  const g=s.last?dayDiff(s.last,k):99;
  if(g===1)s.n++;
  else if(g===2&&s.freeze>0){s.freeze--;s.n++;toast('Seri koruyucu kullanıldı, serin devam ediyor 🧊')}
  else s.n=1;
  s.last=k;s.best=Math.max(s.best,s.n);
  if(s.n%7===0)s.freeze=Math.min(2,s.freeze+1);
  if(s.n>=3)badge('s3');if(s.n>=7)badge('s7');if(s.n>=30)badge('s30');
  savePrefs();syncPublic();return true;
}

/* ---------- etkinlik takibi ---------- */
function track(kind,amount=1,v){
  if(!App.ready||!D.prefs)return;
  const d=today(),r=R(),before=missions().map(m=>progressOf(m,d)>=m.n);
  if(kind==='watch'){const ms=amount;d.ms=(d.ms||0)+ms;if(ms<2000)return checkMissions(before);d.c.watch=(d.c.watch||0)+1;
    if(v){const ck=v.game?'g:'+v.game:'c:'+v.cat;d.cats[ck]=(d.cats[ck]||0)+ms;d.who[v.owner]=(d.who[v.owner]||0)+1}
    const h=new Date().getHours();if(h<5)badge('owl');else if(h>=5&&h<8)badge('bird')}
  else d.c[kind]=(d.c[kind]||0)+amount;
  r.tot[kind]=(r.tot[kind]||0)+amount;
  if(kind==='like'&&r.tot.like>=100)badge('like100');
  if(kind==='comment'&&r.tot.comment>=20)badge('cm20');
  if(kind==='follow'&&r.tot.follow>=10)badge('fol10');
  if(kind==='upload')badge('first');
  const per=XP_PER[kind]||0,got=d.xp[kind]||0;
  if(per&&got<XP_CAP[kind]){const g=Math.min(per,XP_CAP[kind]-got);d.xp[kind]=got+g;r.xp+=g;const L=lvlOf(r.xp);if(L>lvlOf(r.xp-g))setTimeout(()=>levelUp(L),400)}
  savePrefs();checkMissions(before);renderStreakPill();
}
function checkMissions(before){
  const d=today(),ms=missions();
  ms.forEach((m,i)=>{if(!before[i]&&progressOf(m,d)>=m.n){
    toast(`${m.e} Görev tamam: ${m.t(m.n)}. Ödülünü al!`);
    if(bumpStreak())setTimeout(streakCelebrate,600);
    renderStreakPill(true);
  }});
}

/* ---------- akıştaki seri rozeti ---------- */
function renderStreakPill(pulse){
  const el=$('#streakPill');if(!el)return;const s=liveStreak(),d=today(),done=R().streak.last===dayKey();
  const ms=missions(),ready=ms.filter(m=>progressOf(m,d)>=m.n&&!d.claimed.includes(m.k)).length;
  el.innerHTML=`<span class="fl ${done?'':'cold'}">🔥</span><b>${s}</b>${ready?`<i>${ready}</i>`:''}`;
  el.setAttribute('aria-label',`${s} günlük seri. Görevler`);
  if(pulse)anim(el,'pop');
}

/* ---------- görevler sayfası ---------- */
SHEETS.missions=function(){
  const r=R(),d=today(),l=lvlOf(r.xp),lo=xpFor(l),hi=xpFor(l+1),pct=Math.round((r.xp-lo)/(hi-lo)*100);
  const ms=missions(),s=liveStreak(),done=r.streak.last===dayKey();
  const allClaimed=ms.slice(0,4).every(m=>d.claimed.includes(m.k));const chestOpen=d.claimed.includes('chest');
  const week=[...Array(7)].map((_,i)=>{const t=Date.now()-(6-i)*864e5,k=dayKey(t);const on=r.streak.last&&dayDiff(k,r.streak.last)>=0&&dayDiff(k,r.streak.last)<r.streak.n&&dayDiff(r.streak.last,dayKey())<=1;return {k,on,today:i===6,l:'PPSÇPCC'[new Date(t).getDay()]}});
  sheet('Görevler ve seri',`
   <div class="lv-card">
     <div class="lv-ring" style="--p:${pct}">${frameWrap(avaHTML(myProfile()),r.frame)}</div>
     <div class="grow"><div class="lv-name">Seviye <b data-count="${l}">${l}</b> · ${lvlName(l)}</div>
      <div class="xpbar"><i style="--w:${pct}%"></i></div>
      <div class="xs" style="opacity:.8;margin-top:6px">${r.xp-lo} / ${hi-lo} XP · sonraki seviyeye ${hi-r.xp} XP</div></div>
   </div>
   <div class="streak-card ${done?'':'cold'}">
     <div class="sc-top"><span class="big-fl">🔥</span><div class="grow"><div class="sc-n"><b data-count="${s}">${s}</b> günlük seri</div><div class="xs">${done?'Bugün serini korudun. Yarın görüşürüz!':'Serini korumak için bugün 1 görev tamamla.'} En iyi: ${r.streak.best} gün · 🧊 ${r.streak.freeze} koruyucu</div></div></div>
     <div class="week">${week.map(w=>`<div class="wd ${w.on?'on':''} ${w.today?'now':''}"><span>${w.on?'🔥':''}</span><small>${w.l}</small></div>`).join('')}</div>
   </div>
   <h2 class="sec">Bugünün görevleri</h2>
   <div class="missions">${ms.map(m=>{const p=Math.min(m.n,progressOf(m,d)),ok=p>=m.n,cl=d.claimed.includes(m.k);
     return `<div class="ms ${ok?'ok':''} ${cl?'cl':''}"><span class="me">${m.e}</span><div class="grow"><div class="mt">${m.t(m.n)}</div><div class="mbar"><i style="--w:${p/m.n*100}%"></i></div><div class="xs muted">${p}/${m.n} · +${m.xp} XP</div></div>
       ${cl?'<span class="mdone">✓</span>':ok?`<button class="btn primary sm" onclick="claimMission('${m.k}',this)">Al</button>`:m.k==='upload'?`<button class="btn soft sm" onclick="closeSheet();openUpload()">Yükle</button>`:''}</div>`}).join('')}</div>
   <button class="chest ${allClaimed&&!chestOpen?'ready':''} ${chestOpen?'open':''}" ${allClaimed&&!chestOpen?'':'disabled'} onclick="openChest(this)">
     <span class="ch-ic">${chestOpen?'📭':'🎁'}</span><div class="grow" style="text-align:left"><b>Günlük sandık</b><div class="xs">${chestOpen?'Bugünkü sandığı açtın. Yarın yenisi gelir.':allClaimed?'Hazır! Açmak için dokun: +60 XP':'İlk 4 görevin ödülünü alınca açılır'}</div></div>
   </button>
   <h2 class="sec">Çerçeveler</h2>
   <div class="frames">${FRAMES.map(f=>{const own=f.lvl?l>=f.lvl:r.streak.best>=f.streak;const on=r.frame===f.id;
     return `<button class="frm ${own?'':'locked'}" aria-pressed="${on}" ${own?`onclick="setFrame('${f.id}')"`:'disabled'}>${frameWrap(`<span class="ava" style="width:52px;height:52px;font-size:26px;background:${esc(myProfile().c)};color:#fff">${esc(myProfile().e)}</span>`,f.id)}<small>${own?f.name:f.lvl?'Seviye '+f.lvl:f.streak+' gün seri'}</small></button>`}).join('')}
     <button class="frm" aria-pressed="${!r.frame}" onclick="setFrame(null)"><span class="ava" style="width:52px;height:52px;font-size:20px;background:var(--soft);color:var(--muted)">∅</span><small>Yok</small></button></div>
   <h2 class="sec">Rozetler <span class="muted" style="font-weight:600">${r.badges.length}/${BADGES.length}</span></h2>
   <div class="bdgs">${BADGES.map(b=>{const own=r.badges.includes(b.id);return `<div class="bdg ${own?'':'locked'}" title="${esc(b.d)}"><span>${own?b.e:'🔒'}</span><b>${b.name}</b><small>${b.d}</small></div>`}).join('')}</div>
   <button class="btn soft full" style="margin-top:18px" onclick="openRecap()">Haftalık özetini izle</button>`);
  countUps($('#shBody'));
};
function claimMission(k,btn){
  const d=today();if(d.claimed.includes(k))return;const m=missions().find(x=>x.k===k);if(!m||progressOf(m,d)<m.n)return;
  d.claimed.push(k);const rb=btn.getBoundingClientRect();burstAt(rb.left+rb.width/2,rb.top+rb.height/2);addXP(m.xp);
  setTimeout(()=>{SHEETS.missions();renderStreakPill()},450);
}
function openChest(btn){
  const d=today();if(d.claimed.includes('chest'))return;d.claimed.push('chest');const r=R();r.chests++;if(r.chests>=7)badge('chest7');
  btn.classList.add('shake');setTimeout(()=>{confetti();celebrate({big:'🎁',title:'+60 XP',sub:'Günlük sandığı açtın. Yarın yine gel, seri devam etsin!',btn:'Topla'});addXP(60);SHEETS.missions()},700);
}
function setFrame(id){R().frame=id||undefined;if(!id)delete R().frame;savePrefs();syncPublic();SHEETS.missions();renderProfile&&currentScreen()==='profile'&&renderProfile()}
function frameWrap(html,id){return id?`<span class="fr fr-${esc(id)}">${html}</span>`:html}

/* ---------- kutlama katmanları ---------- */
function celebrate({big,title,sub,btn='Devam',extra=''}){
  let el=$('#cele');if(el)el.remove();
  el=document.createElement('div');el.id='cele';el.className='cele';
  el.innerHTML=`<div class="cele-card"><div class="rays"></div><div class="cele-big">${big}</div><h2>${title}</h2><p>${sub}</p>${extra}<button class="btn primary full">${btn}</button></div>`;
  $('#app').appendChild(el);requestAnimationFrame(()=>el.classList.add('on'));
  const close=()=>{el.classList.remove('on');setTimeout(()=>el.remove(),300)};
  el.querySelector('button').onclick=close;el.onclick=e=>{if(e.target===el)close()};
}
function levelUp(l){
  confetti({n:160});
  const f=FRAMES.find(x=>x.lvl===l);
  celebrate({big:`<span class="lv-big">${l}</span>`,title:`Seviye ${l}!`,sub:`Artık “${lvlName(l)}” sın.${f?` ${f.name} çerçevesinin kilidi açıldı.`:''}`,btn:f?'Çerçeveyi tak':'Süper',
    extra:f?`<div style="margin:6px 0 14px">${frameWrap(`<span class="ava" style="width:72px;height:72px;font-size:36px;margin:auto;background:${esc(myProfile().c)};color:#fff">${esc(myProfile().e)}</span>`,f.id)}</div>`:''});
  if(f)$('#cele button').addEventListener('click',()=>setFrame(f.id));
}
function streakCelebrate(){
  const s=liveStreak();confetti({n:90,colors:['#FF8A00','#FF3B30','#FFD60A','#FF2D55']});
  celebrate({big:'<span class="fl-big">🔥</span>',title:`${s} günlük seri!`,sub:s===1?'Serin başladı. Her gün bir görev yap, alevi söndürme.':`Harika gidiyorsun. ${7-(s%7||7)?`${7-(s%7)} gün sonra seri koruyucu kazanırsın.`:'Bir seri koruyucu kazandın 🧊'}`,btn:'Devam'});
}
/* günün ilk açılışı: serini hatırlat */
function dailyWelcome(){
  const r=R(),k=dayKey();if(r.welcomed===k||!D.prefs.termsAt)return;r.welcomed=k;savePrefs();
  const s=liveStreak(),lost=r.streak.n>1&&s===0;
  const ms=missions();
  setTimeout(()=>celebrate({big:lost?'🥶':'<span class="fl-big">🔥</span>',
    title:lost?'Serin söndü':s?`${s} günlük serin var`:'Bugün seriye başla',
    sub:lost?`${r.streak.n} günlük serini kaybettin. Bugün bir görev yap, yeniden yak!`:'Serini korumak için bugün bir görev tamamla. Bugünün görevleri:',
    extra:`<div class="wl-ms">${ms.slice(0,4).map(m=>`<div>${m.e} ${m.t(m.n)} <b>+${m.xp}</b></div>`).join('')}</div>`,btn:'Hadi başlayalım'}),900);
}

/* ---------- XP uçuşu ---------- */
function flyXP(n){const el=document.createElement('div');el.className='xpfly';el.textContent=`+${n} XP`;$('#app').appendChild(el);setTimeout(()=>el.remove(),1300)}

/* ---------- haftalık özet (hikâye biçiminde) ---------- */
function weekStats(){
  const r=R(),ks=[...Array(7)].map((_,i)=>dayKey(Date.now()-i*864e5));let ms=0,watch=0,like=0,comment=0,share=0;const cats={},who={};
  for(const k of ks){const d=r.days[k];if(!d)continue;ms+=d.ms||0;watch+=d.c.watch||0;like+=d.c.like||0;comment+=d.c.comment||0;share+=d.c.share||0;
    for(const [c,v] of Object.entries(d.cats||{}))cats[c]=(cats[c]||0)+v;for(const [w,v] of Object.entries(d.who||{}))who[w]=(who[w]||0)+v}
  const tc=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0],tw=Object.entries(who).sort((a,b)=>b[1]-a[1])[0];
  let topCat=null;if(tc){const[t,id]=tc[0].split(':');topCat=t==='g'?{e:'🎮',name:(GAMES.find(g=>String(g[0])===id)||[0,'Oyun'])[1]}:cat(+id)}
  const days=ks.filter(k=>r.days[k]&&(r.days[k].c.watch||0)>0).length;
  return {min:Math.round(ms/60000),watch,like,comment,share,topCat,topWho:tw?person(tw[0]):null,topWhoN:tw?tw[1]:0,days,streak:liveStreak(),lvl:level()};
}
function openRecap(){
  closeSheet();const s=weekStats();
  const slides=[
    {bg:'g1',html:`<div class="rc-k">Senin haftan</div><div class="rc-h">Doli’de 7 gün</div><div class="rc-s">Kısa bir özet hazırladık. Dokunarak ilerle.</div><div class="rc-emoji">✨</div>`},
    {bg:'g2',html:`<div class="rc-k">Bu hafta</div><div class="rc-num" data-count="${s.watch}">${s.watch}</div><div class="rc-h">video izledin</div><div class="rc-s">Toplam ${s.min} dakika, ${s.days} farklı günde.</div>`},
    {bg:'g3',html:s.topCat?`<div class="rc-k">En çok baktığın</div><div class="rc-emoji">${s.topCat.e}</div><div class="rc-h">${esc(s.topCat.name)}</div><div class="rc-s">Akışın artık sana göre şekilleniyor.</div>`:`<div class="rc-k">Zevkin</div><div class="rc-emoji">🔍</div><div class="rc-h">Henüz keşfediyorsun</div><div class="rc-s">Biraz daha izle, akışını sana göre ayarlayalım.</div>`},
    {bg:'g4',html:s.topWho?`<div class="rc-k">Favori üreticin</div><div style="margin:18px auto">${frameWrap(avaHTML(s.topWho).replace('class="ava "','class="ava" style="width:110px;height:110px;font-size:56px;background:'+esc(s.topWho.c)+';color:#fff"'),s.topWho.frame||'rainbow')}</div><div class="rc-h">@${esc(s.topWho.handle)}</div><div class="rc-s">Bu hafta ${s.topWhoN} videosunu izledin.</div>`:`<div class="rc-k">Favori üreticin</div><div class="rc-emoji">👀</div><div class="rc-h">Daha seçmedin</div><div class="rc-s">Sevdiğin hesapları takip et, burada görünsünler.</div>`},
    {bg:'g5',html:`<div class="rc-k">Sevgi dağıttın</div><div class="rc-row"><div><b data-count="${s.like}">${s.like}</b><small>beğeni</small></div><div><b data-count="${s.comment}">${s.comment}</b><small>yorum</small></div><div><b data-count="${s.share}">${s.share}</b><small>paylaşım</small></div></div>`},
    {bg:'g6',html:`<div class="rc-k">Durumun</div><div class="rc-emoji">🔥 ${s.streak}</div><div class="rc-h">Seviye ${s.lvl} · ${lvlName(s.lvl)}</div><div class="rc-s">Seriyi bırakma, haftaya daha büyük bir özet seni bekliyor.</div><button class="btn primary" style="margin-top:22px" onclick="event.stopPropagation();closeRecap();openSheet('missions')">Görevlere git</button>`}];
  let i=0,tm;const L=document.createElement('div');L.className='recap';L.id='recap';
  const draw=()=>{clearTimeout(tm);L.className='recap on '+slides[i].bg;
    L.innerHTML=`<div class="rc-bars">${slides.map((_,j)=>`<i class="${j<i?'done':j===i?'run':''}"></i>`).join('')}</div><button class="rc-x" aria-label="Kapat" onclick="event.stopPropagation();closeRecap()">✕</button><div class="rc-body">${slides[i].html}</div><div class="blob b1"></div><div class="blob b2"></div>`;
    countUps(L);if(i===slides.length-1)confetti({n:120});tm=setTimeout(()=>{if(i<slides.length-1){i++;draw()}},5200)};
  L.onclick=e=>{const x=e.clientX-L.getBoundingClientRect().left;if(x<L.clientWidth*.3)i=Math.max(0,i-1);else if(i<slides.length-1)i++;else return closeRecap();draw()};
  L.className='recap';$('#app').appendChild(L);requestAnimationFrame(()=>requestAnimationFrame(draw));
  window.closeRecap=()=>{clearTimeout(tm);L.classList.remove('on');setTimeout(()=>L.remove(),300)};
}

/* ---------- haftanın yıldızları ---------- */
function starsHTML(){
  const by={};for(const v of allVideos()){if(v.ad)continue;(by[v.owner] ||= {id:v.owner,score:0,n:0});by[v.owner].score+=likeCount(v)+viewCount(v)/40;by[v.owner].n++}
  const top=Object.values(by).sort((a,b)=>b.score-a.score).slice(0,8).map(x=>({...x,p:person(x.id)}));if(top.length<3)return '';
  const pod=[top[1],top[0],top[2]];
  return `<h2 class="sec">Haftanın yıldızları</h2><div class="podium">${pod.map((t,j)=>`<button class="pd pd${[2,1,3][j]}" onclick="openSheet('user','${esc(t.id)}')">${[2,1,3][j]===1?'<span class="crown">👑</span>':''}${frameWrap(avaHTML(t.p),t.p.frame||(j===1?'gold':null))}<b class="ell">@${esc(t.p.handle)}</b><small>${fmt(Math.round(t.score))} puan</small><span class="step">${[2,1,3][j]}</span></button>`).join('')}</div>
   <div class="ranks">${top.slice(3).map((t,j)=>`<button class="rk" onclick="openSheet('user','${esc(t.id)}')"><span class="n">${j+4}</span>${avaHTML(t.p)}<b class="grow ell" style="text-align:left">@${esc(t.p.handle)}</b><small class="muted">${fmt(Math.round(t.score))}</small></button>`).join('')}</div>`;
}

/* ---------- profilde seviye kartı ---------- */
function retainCardHTML(){
  const r=R(),l=lvlOf(r.xp),lo=xpFor(l),hi=xpFor(l+1),pct=Math.round((r.xp-lo)/(hi-lo)*100),s=liveStreak(),d=today();
  const left=missions().filter(m=>!d.claimed.includes(m.k)).length;
  return `<button class="rt-card" onclick="openSheet('missions')"><div class="rt-l"><span class="rt-fl ${r.streak.last===dayKey()?'':'cold'}">🔥</span><b>${s}</b><small>gün seri</small></div>
   <div class="grow" style="text-align:left"><div class="rt-t">Seviye ${l} · ${lvlName(l)}</div><div class="xpbar"><i style="--w:${pct}%"></i></div><div class="xs" style="margin-top:5px;opacity:.85">${left?`${left} görev seni bekliyor`:'Bugünün bütün görevleri tamam'} · ${r.badges.length} rozet</div></div>${I.chev}</button>
   <button class="recap-btn" onclick="openRecap()"><span>✨</span><b>Haftalık özetin hazır</b><small>İzle</small></button>`;
}

function retainBoot(){
  if(!$('#streakPill')){const b=document.createElement('button');b.id='streakPill';b.className='streak-pill';b.onclick=()=>openSheet('missions');$('#s-home').appendChild(b)}
  today();renderStreakPill();syncPublic();dailyWelcome();
}

/* ---------- mevcut eylemlere bağlan ---------- */
(()=>{
  const wrap=(name,fn)=>{const o=window[name];if(typeof o!=='function')return;window[name]=function(...a){return fn(o,...a)}};
  wrap('toggleLike',(o,id)=>{const was=!!local.likes.m[id];const r=o(id);if(!was&&local.likes.m[id]){track('like');likeParticles(id)}return r});
  wrap('toggleFollow',(o,uid,btn)=>{const was=iFollow(uid);const r=o(uid,btn);if(!was)setTimeout(()=>{if(iFollow(uid)||local.follows.m[uid])track('follow')},50);return r});
  wrap('addComment',(o,...a)=>{const r=o(...a);track('comment');return r});
  wrap('copyLink',(o,...a)=>{track('share');return o(...a)});
  wrap('downloadVideo',(o,...a)=>{track('share');return o(...a)});
  wrap('sendMsg',(o,cid,p)=>{if(p&&p.vid)track('share');return o(cid,p)});
})();
