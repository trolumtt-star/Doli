"use strict";
/* ================================================================
   DURUM
   ================================================================ */
const App={db:null,user:null,assets:null,sample:null,room:null,downloads:null,uid:null,admin:false,online:false,ready:false};
// Her kullanıcının kendi belgesi olan ortak koleksiyonlar: <koleksiyon>/<uid>
const OWN={
 likes:()=>({m:{}}),follows:()=>({m:{}}),reposts:()=>({m:{}}),views:()=>({m:{},w:{}}),comments:()=>({list:[]}),
 gifts:()=>({sent:[]}),pins:()=>({m:{}}),votes:()=>({poll:{},fn:{}}),footnotes:()=>({list:[]}),playlists:()=>({list:[]}),
 bulletins:()=>({list:[]}),shop:()=>({items:[]}),searches:()=>({m:{}}),stories:()=>({items:[]}),approvals:()=>({m:{}}),
};
const D={feed:{},profiles:{},ads:{},lives:{},chats:{},shared:{},myUploads:{},wallet:null,payouts:{},me:null,
 prefs:{saves:{},blocked:{},hidden:{},muted:{},interests:{},log:[],consent:false,adult:false,birthYear:null,termsAt:null,seenNotifs:0,
  colls:{},limitMin:0,usage:{d:'',ms:0},calm:false,autoscroll:false,chatSeen:{},storySeen:{},searchHist:[]}};
for(const k of Object.keys(OWN))D[k]={};
const local={};for(const [k,f] of Object.entries(OWN))local[k]=f();
const UI={feedType:'foryou',cat:null,game:null,pfTab:'videos',muted:true,measure:false,lastBalance:null,speed:1,inboxTab:'notifs'};

/* ================================================================
   YARDIMCILAR
   ================================================================ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>{n=Math.max(0,Math.round(n||0));if(n>=1e6)return (n/1e6).toFixed(n>=1e7?0:1).replace('.',',').replace(',0','')+' Mn';if(n>=1e4)return Math.round(n/1e3)+' B';if(n>=1e3)return (n/1e3).toFixed(1).replace('.',',').replace(',0','')+' B';return String(n)};
const tl=n=>(Math.round((n||0)*100)/100).toLocaleString('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:2})+' ₺';
const now=()=>Date.now();
const dayStart=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};
const dayKey=(t=now())=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const ago=t=>{if(!t)return '';const s=(now()-t)/1000;if(s<60)return 'şimdi';if(s<3600)return Math.floor(s/60)+' dk';if(s<86400)return Math.floor(s/3600)+' sa';return Math.floor(s/86400)+' g'};
const rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9@._]+/g,' ').trim();
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600)}
const BLANK='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const blobUrl=id=>id?(window.BLOB_BASE||'/_blob/')+id:null;
function hashName(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}

const I={
 heart:'<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.6-4.7-9.6-9.4C1.1 8 2.9 4.4 6.6 4.4c2.1 0 3.6 1.2 5.4 3.3 1.8-2.1 3.3-3.3 5.4-3.3 3.7 0 5.5 3.6 4.2 6.7-2 4.7-9.6 9.4-9.6 9.4z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>',
 heartRed:'<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.6-4.7-9.6-9.4C1.1 8 2.9 4.4 6.6 4.4c2.1 0 3.6 1.2 5.4 3.3 1.8-2.1 3.3-3.3 5.4-3.3 3.7 0 5.5 3.6 4.2 6.7-2 4.7-9.6 9.4-9.6 9.4z" fill="#E11D48"/></svg>',
 bubble:'<svg viewBox="0 0 24 24"><path d="M12 3.2c-5.3 0-9.6 3.6-9.6 8.1 0 2.5 1.3 4.7 3.5 6.2l-.7 3.6 4.3-2.2c.8.2 1.6.3 2.5.3 5.3 0 9.6-3.6 9.6-8S17.3 3.2 12 3.2z" fill="#fff"/></svg>',
 bookmark:'<svg viewBox="0 0 24 24"><path d="M6.2 3.5h11.6v17.3L12 16.9l-5.8 3.9z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>',
 bookmarkO:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6.2 3.5h11.6v17.3L12 16.9l-5.8 3.9z"/></svg>',
 share:'<svg viewBox="0 0 24 24"><path d="M13.6 4.2v4.1C7.3 9 4 13.6 3 19.7c2.6-3.4 5.9-5 10.6-5v4.1l7.4-7.3z" fill="#fff"/></svg>',
 gift:'<svg viewBox="0 0 24 24" fill="#fff"><path d="M3.5 9h17v4h-17zM5 13h6v8H5zM13 13h6v8h-6zM11 9h2v12h-2z"/><path d="M12 9C10 5 6.5 4.6 6.3 6.6 6.1 8.4 9.5 9 12 9zm0 0c2-4 5.5-4.4 5.7-2.4.2 1.8-3.2 2.4-5.7 2.4z" fill="none" stroke="#fff" stroke-width="1.6"/></svg>',
 more:'<svg viewBox="0 0 24 24" fill="#fff"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>',
 play:'<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" fill="#fff"/></svg>',
 note:'<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M9 17.5V5l11-2v12.5" stroke="#fff" stroke-width="2" fill="none"/><circle cx="6.5" cy="17.5" r="2.8"/><circle cx="17.5" cy="15.5" r="2.8"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
 pad:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9h4M8 7v4M15 10h.01M18 8h.01"/><path d="M7.5 5h9A5.5 5.5 0 0 1 22 10.5v1.8a3.7 3.7 0 0 1-6.6 2.3L14.2 13H9.8l-1.2 1.6A3.7 3.7 0 0 1 2 12.3v-1.8A5.5 5.5 0 0 1 7.5 5z"/></svg>',
 eye:'<svg viewBox="0 0 24 24" fill="#fff"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
 volOff:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="m17 9 5 6M22 9l-5 6"/></svg>',
 volOn:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
 repost:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2.5 3.5 3.5L17 9.5"/><path d="M3.5 11V9.5a3.5 3.5 0 0 1 3.5-3.5h13.5"/><path d="M7 21.5 3.5 18 7 14.5"/><path d="M20.5 13v1.5a3.5 3.5 0 0 1-3.5 3.5H3.5"/></svg>',
 link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>',
 flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
 block:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/></svg>',
 hide:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 8.5 4.4 9.5 6-.4.7-1.3 1.9-2.6 3.1M6.6 6.7C4.6 8 3.2 9.9 2.5 12c1 1.6 4.5 6 9.5 6 1.7 0 3.2-.5 4.5-1.2"/></svg>',
 timer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>',
 chev:'<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
 backArrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/></svg>',
 mega:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3.5 10v4h3l8 4.5v-13l-8 4.5zM18 9.5a3.5 3.5 0 0 1 0 5"/></svg>',
 doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
 upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
 film:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M16 3v18M4 8h4M4 13h4M4 18h4M16 8h4M16 13h4M16 18h4"/></svg>',
 send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m10 13 4-4"/></svg>',
 duet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="8" height="16" rx="2"/><rect x="13" y="4" width="8" height="16" rx="2"/></svg>',
 stitch:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4v16M18 4v16M6 8h12M6 16h12" stroke-dasharray="3 2.5"/></svg>',
 sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 17.5V5l11-2v12.5"/><circle cx="6.5" cy="17.5" r="2.8"/><circle cx="17.5" cy="15.5" r="2.8"/></svg>',
 download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
 speed:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4-5"/></svg>',
 note2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
 bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 8h14l-1 13H6z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
 rocket:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 4c3 0 6 1 6 1s0 3-1 6l-6 6-5-5z"/><path d="M8 12 4.5 13 7 10M12 16l-1 3.5 3-2.5M6 18l-2 2"/></svg>',
 list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5 6.5-5s5.7 1.4 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.3 0 4 1.2 4.5 4"/></svg>',
 globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/></svg>',
};
const avaHTML=(p,cls='')=>`<span class="ava ${cls}" style="background:${esc(p.c)};color:#fff">${esc(p.e)}</span>`;
const mentionHTML=s=>esc(s).replace(/@([a-z0-9_.]{3,24})/g,(m,h)=>`<button class="mention" onclick="event.stopPropagation();openHandle('${h}')">@${h}</button>`);

/* ================================================================
   KİŞİLER, VİDEOLAR, SAYILAR
   ================================================================ */
function person(id){
  if(SU[id])return {id,...SU[id],sample:true};
  const p=D.profiles[id];
  if(p)return {id,handle:p.handle||'kullanici',name:p.name||p.handle||'Kullanıcı',e:p.e||'🙂',c:p.c||'#16141C',bio:p.bio||'',fol:0,city:p.city||'',private:!!p.private,set:p.set||{},pk:p.pk||null};
  return {id,handle:'kullanici',name:'Kullanıcı',e:'🙂',c:'#16141C',bio:'',fol:0,set:{}};
}
function byHandle(h){const id=[...Object.keys(SU),...Object.keys(D.profiles)].find(id=>person(id).handle===h);return id||null}
function openHandle(h){const id=byHandle(h);if(id)openSheet('user',id);else toast('@'+h+' bulunamadı')}
const ownDoc=(k,uid)=>uid===App.uid?local[k]:(D[k][uid]||OWN[k]());
function canSee(owner){
  if(owner===App.uid||SU[owner]||App.admin)return true;
  const p=person(owner);if(!p.private)return true;
  return !!(local.follows.m[owner]&&ownDoc('approvals',owner).m[App.uid]);
}
function feedDocToVideo(id,f){
  const p=person(f.owner);
  return {id,owner:f.owner,type:f.type||'video',cat:f.cat,game:f.game||null,dur:f.dur||15,cap:f.cap||'',
    sound:f.soundName||('orijinal ses · '+p.handle),soundOf:f.soundOf||null,
    src:blobUrl(f.assetId),imgs:(f.assetIds||[]).map(blobUrl),thumb:blobUrl(f.thumbId),phash:f.phash,
    at:f.approvedAt||f.createdAt||0,edit:f.edit||null,duetOf:f.duetOf||null,stitchOf:f.stitchOf||null,stitchSec:f.stitchSec||5,
    replyTo:f.replyTo||null,addYours:f.addYours||null,aiLabel:!!f.aiLabel,productId:f.productId||null,playlist:f.playlistId||null,
    city:f.city||p.city||'',scheduledAt:f.scheduledAt||0,visibility:f.visibility||'all',L:0,C:0,V:0,S:0,real:true};
}
let _vidsCache=null,_vidsKey='';
function allVideos(){
  const key=Object.keys(D.feed).length+':'+JSON.stringify(Object.keys(D.profiles).length)+':'+Math.floor(now()/60000);
  if(_vidsCache&&_vidsKey===key&&!allVideos.dirty)return _vidsCache;
  const real=Object.entries(D.feed).map(([id,f])=>feedDocToVideo(id,f)).filter(v=>(!v.scheduledAt||v.scheduledAt<=now()||v.owner===App.uid)&&canSee(v.owner)&&(v.owner===App.uid||v.visibility==='all'||(v.visibility==='followers'&&iFollow(v.owner))||App.admin&&v.visibility!=='me'));
  _vidsCache=[...real.sort((a,b)=>b.at-a.at),...SAMPLES.map(s=>({...s,city:SU[s.owner].city,at:0}))];_vidsKey=key;allVideos.dirty=false;
  return _vidsCache;
}
const vById=id=>allVideos().find(v=>v.id===id)||(D.feed[id]?feedDocToVideo(id,D.feed[id]):null);
function sumOthers(k,fn){let n=0;for(const [u,d] of Object.entries(D[k]))if(u!==App.uid&&d)n+=fn(d)||0;return n+(fn(local[k])||0)}
const likeCount=v=>(v.L||0)+sumOthers('likes',d=>d.m&&d.m[v.id]?1:0);
const viewCount=v=>(v.V||0)+sumOthers('views',d=>d.m&&d.m[v.id]);
const watchMs=v=>sumOthers('views',d=>d.w&&d.w[v.id]);
const saveCount=v=>(v.S?Math.round(v.S/2):0)+(D.prefs.saves[v.id]?1:0);
const shareCount=v=>(v.S||0)+sumOthers('reposts',d=>d.m&&d.m[v.id]?1:0);
function commentsOf(vid){
  const out=[];(SAMPLE_COMMENTS[vid]||[]).forEach(([u,t],i)=>out.push({id:'sc'+vid+i,u,t,at:0,kind:'text'}));
  for(const [u,d] of Object.entries(D.comments)){if(u===App.uid||!d||!Array.isArray(d.list))continue;for(const c of d.list)if(c&&c.vid===vid)out.push({...c,u})}
  for(const c of local.comments.list)if(c.vid===vid)out.push({...c,u:App.uid,mine:true});
  return out;
}
const commentCount=v=>(v.C||0)+commentsOf(v.id).filter(c=>c.at).length;
const commentLikes=cid=>sumOthers('likes',d=>d.m&&d.m['c:'+cid]?1:0);
function followerCount(uid){return (person(uid).fol||0)+sumOthers('follows',d=>d.m&&d.m[uid]?1:0)}
const iFollow=uid=>!!local.follows.m[uid];
const followsMe=uid=>!!(ownDoc('follows',uid).m||{})[App.uid];
const isFriend=uid=>iFollow(uid)&&followsMe(uid);
const followingCount=()=>Object.keys(local.follows.m).length;
const fanOf=(uid,owner)=>giftTotal(uid,owner)>=10;
function giftTotal(from,to){const d=ownDoc('gifts',from);return (d.sent||[]).filter(g=>g.to===to&&g.kind!=='promote').reduce((a,g)=>a+(g.amount||0),0)}

/* ================================================================
   İLGİ PROFİLİ
   ================================================================ */
const ikey=v=>v.game?'g'+v.game:'c'+v.cat;
const ilabel=k=>k[0]==='g'?(game(+k.slice(1))?.name||'Oyun'):(cat(+k.slice(1)).e+' '+cat(+k.slice(1)).name);
function score(r){const avgCap=r.cap/r.n,comp=r.comp/r.n,skip=r.skip/r.n;return Math.max(0,Math.min(100,Math.round(avgCap/300*0.5+comp*30+Math.min(r.loops,10)*2-skip*30)))}
function interests(){return Object.entries(D.prefs.interests||{}).filter(([,r])=>r&&r.n).map(([k,r])=>({k,...r,aff:score(r),avg:r.watch/r.n/1000,skipPct:Math.round(r.skip/r.n*100),compPct:Math.round(r.comp/r.n*100)})).sort((a,b)=>b.aff-a.aff)}

/* ================================================================
   PARA: bakiye = yönetici cüzdanı + alınan hediyeler − gönderilenler
   ================================================================ */
function received(uid=App.uid){let n=0;for(const [u,d] of Object.entries(D.gifts)){if(u===uid)continue;for(const g of (u===App.uid?local.gifts.sent:(d&&d.sent)||[]))if(g.to===uid)n+=g.amount||0}
  if(uid!==App.uid)for(const g of local.gifts.sent)if(g.to===uid)n+=g.amount||0;return n}
const sentTotal=(uid=App.uid)=>(ownDoc('gifts',uid).sent||[]).reduce((a,g)=>a+(g.amount||0),0);
const walletBase=()=>(D.wallet&&typeof D.wallet.balance==='number')?D.wallet.balance:0;
const balance=()=>Math.round((walletBase()+received()-sentTotal())*100)/100;

/* ================================================================
   VERİTABANI YAZIMI — belge başına tek yazma, birleştirerek
   ================================================================ */
const W={};
function save(path,getData,delay=0){
  if(!App.db)return;
  const w=W[path] ||= {busy:false,dirty:false,t:null};
  w.get=getData;clearTimeout(w.t);
  const run=async()=>{if(w.busy){w.dirty=true;return}w.busy=true;w.dirty=false;
    try{const d=w.get();d===null?await App.db.doc(path).delete():await App.db.doc(path).set(d)}catch(e){dbErr(e)}
    finally{w.busy=false;if(w.dirty)run()}};
  delay?w.t=setTimeout(run,delay):run();
}
function dbErr(e){console.warn('db',e);if(e&&e.code==='quota_exceeded')toast('Depolama kotası doldu');else if(e&&e.code==='invalid_argument')toast('Bu işlem için yetkin yok');}
const saveOwn=(k,delay=0)=>{allVideos.dirty=true;save(`${k}/${App.uid}`,()=>local[k],delay)};
const savePrefs=(d=1500)=>save(`data/users/${App.uid}/prefs`,()=>({...D.prefs,log:D.prefs.log.slice(-40)}),d);
function saveSignals(){
  if(D.prefs.consent&&D.prefs.adult)save(`signals/${App.uid}`,()=>({interests:D.prefs.interests,updatedAt:now()}),5000);
  else save(`signals/${App.uid}`,()=>null);
}
const saveProfile=()=>{if(App.db&&D.me)save(`profiles/${App.uid}`,()=>D.me)};

/* ================================================================
   BAĞLANTI VE ABONELİKLER
   ================================================================ */
async function connect(){
  const c=window.claude;
  if(c&&c.use){
    const names=['db','user','assets','sample','room','downloads'];
    const got=await Promise.all(names.map(n=>c.use(n).catch(()=>null)));
    names.forEach((n,i)=>App[n]=got[i]);
    if(App.db&&App.user){App.uid=await App.user.id().catch(()=>null);App.admin=!!(await App.user.canEdit().catch(()=>false))}
  }
  App.online=!!(App.db&&App.uid);
  if(!App.online)App.uid='yerel';
}
function subscribeAll(){
  return new Promise(resolve=>{
    const db=App.db,uid=App.uid;let pending=2,done=false;
    const fin=()=>{if(!done){done=true;resolve()}};
    const tm=setTimeout(()=>{toast('Veriler henüz yüklenemedi, tekrar bağlanıyor');fin()},10000);
    const one=()=>{if(--pending<=0){clearTimeout(tm);fin()}};
    const col=(path,cb)=>db.collection(path).onSnapshot(s=>{const o={};s.docs.forEach(d=>o[d.id]=d.data());cb(o,s)},e=>console.warn(path,e));
    let gotPrefs=false;
    db.doc(`data/users/${uid}/prefs`).onSnapshot(s=>{if(!gotPrefs&&(!s.metadata.fromCache||s.exists)){gotPrefs=true;if(s.exists)D.prefs={...D.prefs,...s.data()};one()}},()=>{if(!gotPrefs){gotPrefs=true;one()}});
    let gotMe=false;
    db.doc(`profiles/${uid}`).onSnapshot(s=>{if(!gotMe&&!s.metadata.fromCache){gotMe=true;if(s.exists)D.me=s.data();one()}},()=>one());
    col('feed',o=>{D.feed=o;allVideos.dirty=true;soft('feed')});
    col('profiles',o=>{D.profiles=o;if(D.me)D.profiles[uid]=D.me;allVideos.dirty=true;soft()});
    for(const k of Object.keys(OWN)){let init=false;
      col(k,(o,s)=>{D[k]=o;if(!init&&!s.metadata.fromCache){init=true;if(o[uid])local[k]={...OWN[k](),...o[uid]}}allVideos.dirty=true;soft(k)})}
    col('ads',o=>{D.ads=o});
    col('lives',o=>{D.lives=o;soft('lives')});
    col('chats',o=>{D.chats=o;soft('chats')});
    col('shared',o=>{D.shared=o});
    col(`uploads/${uid}/items`,o=>{D.myUploads=o;soft()});
    col(`payouts/${uid}/req`,o=>{D.payouts=o;soft()});
    db.doc(`wallet/${uid}`).onSnapshot(s=>{D.wallet=s.exists?s.data():null;soft('wallet')},()=>{});
  });
}
let softT;const softKinds=new Set();
function soft(kind){
  if(!App.ready)return;if(kind)softKinds.add(kind);clearTimeout(softT);
  softT=setTimeout(()=>{
    const kinds=new Set(softKinds);softKinds.clear();
    const b=balance();if(UI.lastBalance!==null&&b>UI.lastBalance+0.001)coinDrop(b-UI.lastBalance);UI.lastBalance=b;
    renderBadge();
    const scr=currentScreen();
    if(scr==='discover')renderDiscover();
    if(scr==='inbox')renderInbox();
    if(scr==='profile')renderProfile();
    if(scr==='home'){if(kinds.has('feed')&&!feedItems.some(i=>i.v&&i.v.real))buildFeed(true);else refreshCounts()}
    if(sheetKind&&LIVE_SHEETS.includes(sheetKind))SHEETS[sheetKind](sheetArg,true);
    if(kinds.has('chats')||kinds.has('profiles'))chatSoft();
    if(kinds.has('lives'))liveSoft();
  },150);
}
const LIVE_SHEETS=['comments','wallet','user'];
