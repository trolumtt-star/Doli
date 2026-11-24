"use strict";
/* ================================================================
   YÖNETİCİ PANELİ VE REKLAM VEREN PANELİ
   ================================================================ */
let ADM={tab:'queue',uploads:[],reports:[],payouts:[],wallets:{}};
const strip=o=>{const {uid,id,...r}=o;return r};
async function loadAdmin(){
  const db=App.db;const uids=[...new Set([...Object.keys(D.profiles),App.uid])];
  const get=async p=>{try{const s=await db.collection(p).get();return s.docs.map(d=>({id:d.id,...d.data()}))}catch{return []}};
  const [ups,reps,pays]=await Promise.all(['uploads/%/items','reports/%/items','payouts/%/req'].map(t=>Promise.all(uids.map(u=>get(t.replace('%',u)).then(l=>l.map(x=>({...x,uid:u})))))));
  ADM.uploads=ups.flat().sort((a,b)=>b.createdAt-a.createdAt);ADM.reports=reps.flat().sort((a,b)=>b.at-a.at);ADM.payouts=pays.flat().sort((a,b)=>b.at-a.at);
  ADM.wallets=Object.fromEntries((await get('wallet')).map(w=>[w.id,w]));
  await grantViewBonuses();
}
async function grantViewBonuses(){
  for(const [vid,f] of Object.entries(D.feed)){
    const v=vById(vid);if(!v||viewCount(v)<CFG.viewBonusAt)continue;
    const w=ADM.wallets[f.owner]||{balance:0,earned:0,items:[]};
    if((w.items||[]).some(i=>i.kind==='bonus'&&i.vid===vid))continue;
    const nw={balance:(w.balance||0)+CFG.viewBonus,earned:(w.earned||0)+CFG.viewBonus,items:[...(w.items||[]),{kind:'bonus',vid,amount:CFG.viewBonus,note:fmt(CFG.viewBonusAt)+' izlenme bonusu',at:now()}].slice(-200)};
    try{await App.db.doc(`wallet/${f.owner}`).set(nw);ADM.wallets[f.owner]=nw}catch(e){dbErr(e)}
  }
}
const userBalance=uid=>Math.round(((ADM.wallets[uid]&&ADM.wallets[uid].balance)||0)+received(uid)-sentTotal(uid));
SHEETS.admin=async function(arg,live){
  if(!App.admin)return sheet('Yönetici paneli','<div class="empty"><h3>Yetkin yok</h3>Bu bölüm yalnızca yöneticilere açık.</div>');
  if(!App.db)return sheet('Yönetici paneli','<div class="empty"><h3>Veritabanı yok</h3></div>');
  if(!live){sheet('Yönetici paneli','<div class="empty">Yükleniyor</div>');await loadAdmin()}
  const pend=ADM.uploads.filter(u=>u.status==='pending'),openR=ADM.reports.filter(r=>r.status==='open'),pendP=ADM.payouts.filter(p=>p.status==='pending');
  const spent=Object.values(ADM.wallets).reduce((a,w)=>a+(w.earned||0),0);
  const tabs=[['queue',`Onay (${pend.length})`],['reports',`Şikayet (${openR.length})`],['payouts',`Ödeme (${pendP.length})`]];
  let body='';
  if(ADM.tab==='queue')body=pend.length?pend.map(u=>{const p=person(u.uid),g=u.game&&game(u.game);
    const pv=u.type==='photos'?`<img src="${blobUrl(esc((u.assetIds||[])[0]))}" alt="" style="width:100%;height:100%;object-fit:cover">`:u.assetId?`<video src="${blobUrl(esc(u.assetId))}" ${u.thumbId?`poster="${blobUrl(esc(u.thumbId))}"`:''} controls muted playsinline preload="none" class="f-${esc((u.edit&&u.edit.filter)||'none')}"></video>`:'';
    const extra=[u.type==='photos'?`${(u.assetIds||[]).length} fotoğraf`:null,u.duetOf?'Düet':null,u.stitchOf?'Stitch':null,u.soundOf?'Ses kullanımı':null,u.replyTo?'Yorum yanıtı':null,u.addYours?'Senin sıran':null,u.aiLabel?'Yapay zekâ etiketi':null,u.scheduledAt?'Zamanlı: '+new Date(u.scheduledAt).toLocaleString('tr-TR'):null].filter(Boolean);
    return `<div class="q"><div class="pv">${pv}</div><div class="grow">
     <div class="b">@${esc(p.handle)}</div><div class="s muted" style="margin:2px 0 6px">${cat(u.cat).name}${g?', '+esc(g.name):''} · ${ago(u.createdAt)}</div>
     <div class="s" style="margin-bottom:6px">${esc(u.cap||'Açıklama yok')}</div>${extra.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}
     ${u.ai&&u.ai.unavailable?'<span class="pill warn">Yapay zekâ kontrolü yapılamadı</span>':u.ai?`<span class="pill ${u.ai.safe?'ok':'bad'}">${u.ai.safe?'Güvenli':'Riskli'}</span>${u.ai.game_ok===false?'<span class="pill bad">Oyun uyuşmuyor</span>':u.ai.game_ok?'<span class="pill ok">Oyun doğru</span>':''}${u.ai.category_ok===false?'<span class="pill warn">Kategori şüpheli</span>':''}<div class="xs muted" style="margin-top:4px">${esc(u.ai.summary||'')}</div>`:''}
     <div class="row" style="margin-top:10px"><button class="btn primary sm" onclick="approve('${esc(u.uid)}','${esc(u.id)}')">Onayla, ${tl(CFG.reward)} ver</button><button class="btn soft sm" onclick="rejectUp('${esc(u.uid)}','${esc(u.id)}')">Reddet</button></div></div></div>`}).join(''):'<div class="empty"><h3>Kuyruk boş</h3>Yeni gönderiler burada onay bekler.</div>';
  if(ADM.tab==='reports')body=openR.length?openR.map(r=>{const v=vById(r.vid);return `<div class="q" style="display:block"><div class="row"><b class="grow ell">${esc(v?(v.cap||'Video'):'Silinmiş video')}</b><span class="pill bad">${esc(r.label)}</span></div><div class="xs muted" style="margin-top:4px">@${esc(person(r.uid).handle)} şikayet etti · ${ago(r.at)}</div>
     <div class="row" style="margin-top:10px">${v&&v.real?`<button class="btn soft sm" onclick="closeSheet();playFrom('${esc(r.vid)}')">İzle</button><button class="btn primary sm" onclick="takeDown('${esc(r.vid)}','${esc(r.uid)}','${esc(r.id)}')">Kaldır</button>`:''}<button class="btn soft sm" onclick="closeReport('${esc(r.uid)}','${esc(r.id)}','dismissed')">Yoksay</button></div></div>`}).join(''):'<div class="empty"><h3>Açık şikayet yok</h3></div>';
  if(ADM.tab==='payouts')body=pendP.length?pendP.map(p=>{const bal=userBalance(p.uid);return `<div class="q" style="display:block"><div class="row"><b class="grow">@${esc(person(p.uid).handle)}</b><span class="b">${tl(p.amount)}</span></div><div class="xs muted">Telefon ${esc(p.phone)} · ${ago(p.at)}</div>
     <div class="xs" style="margin-top:4px">Hesaplanan bakiye: <b>${tl(bal)}</b> ${bal<p.amount?'<span class="pill bad">Bakiye tutmuyor, inceleyin</span>':'<span class="pill ok">Tutuyor</span>'}</div>
     <div class="row" style="margin-top:10px"><input class="field" style="height:40px" id="code-${esc(p.id)}" placeholder="Google Play kodu" autocomplete="off"><button class="btn primary sm" onclick="payOut('${esc(p.uid)}','${esc(p.id)}',${Number(p.amount)})">Gönder</button></div>
     <button class="btn soft sm" style="margin-top:6px" onclick="rejectPayout('${esc(p.uid)}','${esc(p.id)}')">Talebi reddet</button></div>`}).join(''):'<div class="empty"><h3>Bekleyen ödeme yok</h3></div>';
  sheet('Yönetici paneli',`
   <div class="kpis"><div><b>${pend.length}</b><span>onay bekliyor</span></div><div><b>${Object.keys(D.feed).length}</b><span>yayında</span></div><div><b>${tl(spent)}</b><span>${tl(CFG.budget)} bütçeden</span></div></div>
   <div class="tabs" role="tablist" style="position:static;background:none">${tabs.map(([k,t])=>`<button role="tab" aria-selected="${ADM.tab===k}" onclick="ADM.tab='${k}';SHEETS.admin(null,true)">${t}</button>`).join('')}</div>${body}`);
};
async function approve(uid,id){
  const u=ADM.uploads.find(x=>x.uid===uid&&x.id===id);if(!u)return;
  try{
    const keys=['type','assetId','assetIds','thumbId','cap','cat','game','dur','phash','createdAt','edit','duetOf','stitchOf','stitchSec','soundOf','soundName','replyTo','addYours','aiLabel','productId','playlistId','city','scheduledAt'];
    const f={owner:uid,approvedAt:now()};for(const k of keys)if(u[k]!==undefined&&u[k]!==null)f[k]=u[k];
    await App.db.doc(`feed/${id}`).set(f);
    await App.db.doc(`uploads/${uid}/items/${id}`).set({...strip(u),status:'approved',reviewedAt:now()});
    const w=await App.db.doc(`wallet/${uid}`).get();const cw=w.exists?w.data():{balance:0,earned:0,items:[]};
    const today=(cw.items||[]).filter(i=>i.kind==='upload'&&i.at>=dayStart()).length;
    const spent=Object.values(ADM.wallets).reduce((a,x)=>a+(x.earned||0),0);
    let msg='Onaylandı';
    if(today<CFG.dailyReward&&spent+CFG.reward<=CFG.budget){
      const nw={balance:(cw.balance||0)+CFG.reward,earned:(cw.earned||0)+CFG.reward,items:[...(cw.items||[]),{kind:'upload',vid:id,amount:CFG.reward,note:'Onaylanan video ödülü',at:now()}].slice(-200)};
      await App.db.doc(`wallet/${uid}`).set(nw);ADM.wallets[uid]=nw;msg+=`, ${tl(CFG.reward)} verildi`;
    }else msg+='. Günlük ödül sınırı dolu.';
    u.status='approved';toast(msg);SHEETS.admin(null,true);
  }catch(e){dbErr(e)}
}
async function rejectUp(uid,id){const u=ADM.uploads.find(x=>x.uid===uid&&x.id===id);if(!u)return;try{await App.db.doc(`uploads/${uid}/items/${id}`).set({...strip(u),status:'rejected',reason:'Kurallara uymuyor',reviewedAt:now()});u.status='rejected';toast('Reddedildi');SHEETS.admin(null,true)}catch(e){dbErr(e)}}
async function takeDown(vid,ruid,rid_){
  try{const f=D.feed[vid];await App.db.doc(`feed/${vid}`).delete();
    if(f){const up=await App.db.doc(`uploads/${f.owner}/items/${vid}`).get();if(up.exists)await App.db.doc(`uploads/${f.owner}/items/${vid}`).set({...up.data(),status:'rejected',reason:'Şikayet sonrası kaldırıldı',reviewedAt:now()})}
    await closeReport(ruid,rid_,'actioned');toast('Kaldırıldı')}catch(e){dbErr(e)}
}
async function closeReport(uid,id,st){const r=ADM.reports.find(x=>x.uid===uid&&x.id===id);if(!r)return;try{await App.db.doc(`reports/${uid}/items/${id}`).set({...strip(r),status:st});r.status=st;SHEETS.admin(null,true)}catch(e){dbErr(e)}}
async function payOut(uid,id,amount){
  const code=($('#code-'+id).value||'').trim();if(code.length<6)return toast('Kodu eksiksiz yaz');
  const p=ADM.payouts.find(x=>x.uid===uid&&x.id===id);
  try{const w=await App.db.doc(`wallet/${uid}`).get();const cw=w.exists?w.data():{balance:0,earned:0,items:[]};
    await App.db.doc(`wallet/${uid}`).set({...cw,balance:(cw.balance||0)-amount,items:[...(cw.items||[]),{kind:'payout',amount:-amount,note:'Google Play kodu',at:now()}].slice(-200)});
    await App.db.doc(`payouts/${uid}/req/${id}`).set({...strip(p),status:'paid',code,paidAt:now()});p.status='paid';toast('Kod gönderildi');SHEETS.admin(null,true)}catch(e){dbErr(e)}
}
async function rejectPayout(uid,id){const p=ADM.payouts.find(x=>x.uid===uid&&x.id===id);try{await App.db.doc(`payouts/${uid}/req/${id}`).set({...strip(p),status:'rejected'});p.status='rejected';SHEETS.admin(null,true)}catch(e){dbErr(e)}}

/* ---------------- reklam veren ---------------- */
let ADV={cat:2,game:111469,min:40,signals:null,vid:null};
SHEETS.advertiser=async function(arg,live){
  if(!App.admin||!App.db)return sheet('Reklam veren paneli','<div class="empty"><h3>Yetkin yok</h3></div>');
  if(!live){sheet('Reklam veren paneli','<div class="empty">Yükleniyor</div>');try{const s=await App.db.collection('signals').get();ADV.signals=s.docs.map(d=>d.data().interests||{})}catch{ADV.signals=[]}}
  const reals=allVideos().filter(v=>v.real&&v.type!=='photos');
  sheet('Reklam veren paneli',`
   <p class="s muted" style="line-height:1.5">Hedef kitleyi seç. Sayılar yalnızca açık rıza veren 18 yaş üstü kullanıcılardan hesaplanır.</p>
   <span class="lbl">Kategori</span><div class="chips">${CATS.map(c=>`<button class="chip" aria-pressed="${ADV.cat===c.id}" onclick="ADV.cat=${c.id};if(${c.id}!==2)ADV.game=null;SHEETS.advertiser(null,true)">${c.e} ${c.name}</button>`).join('')}</div>
   ${ADV.cat===2?`<label class="lbl" for="advG">Oyun</label><select class="field" id="advG" onchange="ADV.game=+this.value||null;SHEETS.advertiser(null,true)"><option value="">Tüm oyunlar</option>${GAMES.map(g=>`<option value="${g.id}" ${ADV.game===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select>`:''}
   <label class="lbl" for="advMin">En düşük ilgi puanı: <span id="advMinV">${ADV.min}</span></label><input type="range" class="range" id="advMin" min="0" max="90" step="5" value="${ADV.min}">
   <div class="card" style="margin-top:14px" id="advOut"></div>
   <h2 class="sec">Kampanya oluştur</h2>
   <label class="lbl" for="adB">Marka</label><input class="field" id="adB" maxlength="40">
   <label class="lbl" for="adT">Reklam metni</label><input class="field" id="adT" maxlength="80">
   <label class="lbl" for="adC">Buton yazısı</label><input class="field" id="adC" maxlength="20" placeholder="Daha fazla">
   ${reals.length?`<label class="lbl" for="adV">Görsel <small>bir videoyu reklama çevir</small></label><select class="field" id="adV"><option value="">Otomatik görsel</option>${reals.map(v=>`<option value="${esc(v.id)}">@${esc(person(v.owner).handle)}: ${esc((v.cap||'Video').slice(0,30))}</option>`).join('')}</select>`:''}
   <button class="btn dark full" style="margin-top:14px" onclick="createAd()">Kampanyayı yayına al</button>
   <h2 class="sec">Kampanyalar</h2>
   ${Object.entries(D.ads).length?Object.entries(D.ads).map(([id,a])=>`<div class="ledger"><div><div class="b">${esc(a.brand)}</div><div class="xs muted">${esc(a.title)}${a.vid?' · video reklam':''}</div></div><button class="btn soft sm" onclick="toggleAd('${esc(id)}')">${a.status==='active'?'Durdur':'Başlat'}</button></div>`).join(''):'<p class="s muted">Henüz kampanya yok.</p>'}`);
  const calc=()=>{const min=ADV.min,k=ADV.game?'g'+ADV.game:null;let n=0,w=0,a=0;
    for(const ints of ADV.signals||[]){let r=null;if(k)r=ints[k];else if(ADV.cat===2){const gs=Object.entries(ints).filter(([kk])=>kk[0]==='g').map(([,v])=>v);if(gs.length)r=gs.reduce((x,y)=>({n:x.n+y.n,watch:x.watch+y.watch,cap:x.cap+y.cap,skip:x.skip+y.skip,comp:x.comp+y.comp,loops:x.loops+y.loops}))}else r=ints['c'+ADV.cat];
      if(r&&r.n){const s=score(r);if(s>=min){n++;w+=r.watch/r.n/1000;a+=s}}}
    $('#advMinV').textContent=min;
    $('#advOut').innerHTML=`<div class="kpis"><div><b>${n}</b><span>kişilik kitle</span></div><div><b>${n?(w/n).toFixed(1).replace('.',','):'0'} sn</b><span>ortalama izleme</span></div><div><b>${n?Math.round(a/n):'0'}</b><span>ortalama ilgi</span></div></div>
     <p class="help" style="margin-top:10px">${(ADV.signals||[]).length} kullanıcı reklam için rıza verdi.${n<5?' Kitle henüz küçük.':''}</p>`};
  $('#advMin').oninput=e=>{ADV.min=+e.target.value;calc()};calc();
};
async function createAd(){
  const b=$('#adB').value.trim(),t=$('#adT').value.trim(),c=$('#adC').value.trim()||'Daha fazla',vid=$('#adV')?.value||null;
  if(!b||!t)return toast('Marka ve reklam metnini yaz');
  const tpl={2:'hud',5:'recipe',1:'meme',9:'pet',12:'scenic'}[ADV.cat]||'dance';
  try{await App.db.doc(`ads/${rid()}`).set({brand:b,title:t,cta:c,cat:ADV.cat,game:ADV.cat===2?ADV.game:null,minAff:ADV.min,tpl,e:cat(ADV.cat).e,top:t,bot:b,sceneTitle:b,vid,status:'active',createdAt:now()});toast('Kampanya yayında');SHEETS.advertiser(null,true)}catch(e){dbErr(e)}
}
async function toggleAd(id){const a=D.ads[id];try{await App.db.doc(`ads/${id}`).set({...a,status:a.status==='active'?'paused':'active'})}catch(e){dbErr(e)}setTimeout(()=>SHEETS.advertiser(null,true),300)}
