"use strict";
/* ================================================================
   PARA: kumbara, hediyeler, diziler, öne çıkarma, ödeme
   ================================================================ */
function ledgerItems(){
  const out=[...((D.wallet&&D.wallet.items)||[])];
  for(const g of local.gifts.sent){const lab=g.kind==='series'?'Dizi satın alındı':g.kind==='promote'?'Video öne çıkarıldı':`${gift(g.gift)?.name||'Hediye'} gönderildi, @${person(g.to).handle}`;out.push({amount:-g.amount,note:lab,at:g.at})}
  for(const [u,d] of Object.entries(D.gifts)){if(u===App.uid)continue;for(const g of (d&&d.sent)||[])if(g.to===App.uid)out.push({amount:g.amount,note:g.kind==='series'?`@${person(u).handle} dizini satın aldı`:`@${person(u).handle} ${gift(g.gift)?.name||'hediye'} gönderdi`,at:g.at})}
  return out.sort((a,b)=>b.at-a.at);
}
SHEETS.wallet=function(){
  const b=balance(),items=ledgerItems(),pend=Object.values(D.payouts).find(p=>p.status==='pending');
  sheet('Kumbaram',`
   <div class="jar" style="flex-direction:column;align-items:stretch">
     <div class="row"><span class="coin" style="--s:56px"><span class="face">1₺</span></span><div class="grow"><div class="s" style="color:#6b5208">Bakiye</div><div class="amt">${tl(b)}</div></div></div>
     <div class="meter"><i style="width:${Math.min(100,b/CFG.payoutAt*100)}%"></i></div>
     <div class="s" style="color:#6b5208;margin-top:6px">${b>=CFG.payoutAt?'Google Play kodu almaya hazırsın':`Google Play koduna ${tl(CFG.payoutAt-b)} kaldı`}</div>
   </div>
   <div class="kpis" style="margin-top:12px"><div><b>${tl((D.wallet&&D.wallet.earned)||0)}</b><span>video ödülleri</span></div><div><b>${tl(received())}</b><span>gelen hediye</span></div><div><b>${tl(sentTotal())}</b><span>harcanan</span></div></div>
   ${pend?`<div class="result warn"><h4>Kod talebin alındı</h4><p>${tl(pend.amount)} değerinde Google Play kodu hazırlanıyor.</p></div>`:
    `<div style="margin-top:12px"><label class="lbl" for="phone" style="margin-top:4px">Telefon numaran <small>kodu doğrulamak için</small></label><input class="field" id="phone" inputmode="tel" placeholder="05xx xxx xx xx" maxlength="16" ${b>=CFG.payoutAt?'':'disabled'}>
     <button class="btn brass full" style="margin-top:10px" ${b>=CFG.payoutAt?'':'disabled'} onclick="requestPayout()">Google Play kodu iste</button></div>`}
   ${Object.values(D.payouts).filter(p=>p.status==='paid').sort((a,b)=>b.at-a.at).map(p=>`<div class="card" style="margin-top:12px"><div class="row"><b class="grow">${tl(p.amount)} Google Play kodu</b><span class="pill ok">Teslim edildi</span></div><div class="code">${esc(p.code)}</div><p class="help">Play Store › Profil › Ödemeler › Kod kullan</p></div>`).join('')}
   <h2 class="sec">Kurallar</h2>
   <ul class="rules">
    <li>Onaylanan her video için ${tl(CFG.reward)}. Günde en fazla ${CFG.dailyReward} ödüllü video.</li>
    <li>Günde en fazla ${CFG.dailyUpload} video yükleyebilirsin.</li>
    <li>${fmt(CFG.viewBonusAt)} izlenmeyi geçen video için ${tl(CFG.viewBonus)} bonus.</li>
    <li>Gelen hediyeler ve dizi satışları kumbarana eklenir. Gönderdiğin hediyeler kumbarandan düşer.</li>
    <li>${tl(CFG.payoutAt)} biriktiğinde Google Play kodu isteyebilirsin.</li></ul>
   <h2 class="sec">Hareketler</h2>
   ${items.length?items.slice(0,60).map(l=>`<div class="ledger"><div><div class="b">${esc(l.note)}</div><div class="xs muted">${ago(l.at)}</div></div><div class="amt ${l.amount>0?'pos':'neg'}">${l.amount>0?'+':''}${tl(l.amount)}</div></div>`).join(''):'<p class="muted s">Henüz hareket yok.</p>'}`);
};
async function requestPayout(){
  const ph=($('#phone').value||'').replace(/\D/g,'');
  if(ph.length<10)return toast('Geçerli bir telefon numarası yaz');
  const b=balance();if(b<CFG.payoutAt)return;
  if(!App.db)return toast('Bu görünümde talep gönderilemiyor');
  try{await App.db.doc(`payouts/${App.uid}/req/${rid()}`).set({amount:b,phone:ph,status:'pending',at:now()});toast('Kod talebin alındı')}catch(e){dbErr(e)}
}
function coinDrop(n){
  const d=document.createElement('div');d.className='coin-drop';d.innerHTML=`<div class="plus">+${tl(n)}</div><span class="coin"><span class="face">1₺</span></span>`;
  $('#app').appendChild(d);setTimeout(()=>d.remove(),1700);
}
function giftFly(g,label){
  const d=document.createElement('div');d.className='gift-fly';d.innerHTML=`<div class="g">${esc(g.e)}</div><div class="l">${esc(label)}</div>`;
  $('#app').appendChild(d);setTimeout(()=>d.remove(),1900);
}
/* hediye */
let GIFT_PICK='kalp';
SHEETS.gift=function({to,vid,live}){
  const b=balance(),p=person(to);
  sheet(`@${p.handle} için hediye`,`
   <div class="row" style="margin-bottom:14px"><span class="coin" style="--s:36px"><span class="face">1₺</span></span><div class="grow"><div class="s muted">Bakiyen</div><div class="b">${tl(b)}</div></div>${p.sample?'<span class="pill warn">Örnek hesap</span>':''}</div>
   <div class="gifts">${GIFTS.map(g=>`<button aria-pressed="${GIFT_PICK===g.id}" onclick="GIFT_PICK='${g.id}';SHEETS.gift(sheetArg)"><span class="ge">${g.e}</span>${g.name}<span class="gp">${tl(g.p)}</span></button>`).join('')}</div>
   <button class="btn primary full" style="margin-top:16px" onclick="sendGift('${esc(to)}','${esc(vid||'')}',${live?'true':'false'})" ${b>=gift(GIFT_PICK).p?'':'disabled'}>${b>=gift(GIFT_PICK).p?`${gift(GIFT_PICK).name} gönder, ${tl(gift(GIFT_PICK).p)}`:'Bakiyen yetmiyor'}</button>
   <p class="help" style="text-align:center">${p.sample?'Örnek hesaplara gönderilen hediye bakiyenden düşer ama kimseye ulaşmaz.':'Hediyenin tamamı üreticinin kumbarasına geçer.'}</p>`);
};
function sendGift(to,vid,live){
  if(needAccount())return;const g=gift(GIFT_PICK);if(balance()<g.p)return toast('Bakiyen yetmiyor');
  local.gifts.sent.push({id:rid(),to,vid:vid||null,gift:g.id,amount:g.p,at:now(),kind:live?'live':'gift'});
  if(local.gifts.sent.length>500)local.gifts.sent=local.gifts.sent.slice(-500);
  saveOwn('gifts');closeSheet();giftFly(g,`${g.name} gönderildi`);
  if(live&&typeof liveGiftSent==='function')liveGiftSent(g);
}
function buySeries(owner,pl,price){
  if(needAccount())return;if(balance()<price)return toast(`Bu dizi için ${tl(price)} gerekiyor. Bakiyen yetmiyor.`);
  local.gifts.sent.push({id:rid(),to:owner,pl,amount:price,at:now(),kind:'series'});saveOwn('gifts');toast('Dizi açıldı');closeSheet();buildFeed(true);
}
SHEETS.promote=function(vid){
  const opts=[[5,'24 saat, yaklaşık 500 ek gösterim'],[10,'24 saat, yaklaşık 1.200 ek gösterim'],[25,'24 saat, yaklaşık 3.500 ek gösterim']];
  sheet('Öne çıkar',`<p class="s muted" style="line-height:1.5">Videon 24 saat boyunca Senin için akışında daha çok kişiye gösterilir. Ücret kumbarandan düşer.</p>
   <div class="group" style="margin-top:12px">${opts.map(([p,t])=>`<button class="opt-row" onclick="promote('${esc(vid)}',${p})"><span class="grow"><div class="b">${tl(p)}</div><div class="help">${t}</div></span>${I.chev}</button>`).join('')}</div>
   <p class="help">Bakiyen: ${tl(balance())}</p>`);
};
function promote(vid,p){if(balance()<p)return toast('Bakiyen yetmiyor');local.gifts.sent.push({id:rid(),to:'platform',vid,amount:p,at:now(),until:now()+CFG.promoteHours*3600e3,kind:'promote'});saveOwn('gifts');closeSheet();toast('Videon 24 saat öne çıkarılacak')}

/* ---------------- mağaza ---------------- */
SHEETS.shop=function(){
  const items=local.shop.items;
  sheet('Mağazam',`<p class="s muted" style="line-height:1.5">Ürünlerini ekle, videolarına etiketle. İzleyiciler ürünü videonun altında görür ve senin siten üzerinden satın alır.</p>
   ${items.map(it=>`<div class="product" style="border:1px solid var(--line);margin-top:8px">${it.img?`<img src="${esc(it.img)}" alt="">`:`<span class="pi">🛍️</span>`}<span class="grow"><span class="pn" style="display:block">${esc(it.name)}</span><span class="pp">${tl(it.price)}</span></span><button class="btn soft sm" onclick="local.shop.items=local.shop.items.filter(x=>x.id!=='${esc(it.id)}');saveOwn('shop');SHEETS.shop()">Sil</button></div>`).join('')}
   <h2 class="sec">Ürün ekle</h2>
   <label class="lbl" for="prN">Ürün adı</label><input class="field" id="prN" maxlength="60">
   <label class="lbl" for="prP">Fiyat (₺)</label><input class="field" id="prP" inputmode="decimal" maxlength="9">
   <label class="lbl" for="prU">Satış bağlantısı <small>https ile başlamalı</small></label><input class="field" id="prU" placeholder="https://" maxlength="300" autocapitalize="off">
   <label class="lbl" for="prI">Görsel <small>isteğe bağlı</small></label><input type="file" id="prI" accept="image/*" class="field" style="padding-top:12px">
   <button class="btn dark full" style="margin-top:14px" onclick="addProduct()">Ürünü ekle</button>`);
};
async function addProduct(){
  const n=$('#prN').value.trim(),p=parseFloat(($('#prP').value||'').replace(',','.')),u=$('#prU').value.trim(),f=$('#prI').files[0];
  if(!n||!(p>0))return toast('Ürün adı ve fiyatı yaz');if(u&&!/^https:\/\//.test(u))return toast('Bağlantı https:// ile başlamalı');
  let img=null;if(f&&App.assets){try{const a=await App.assets.upload(f);img=blobUrl(a.id)}catch{toast('Görsel yüklenemedi')}}
  local.shop.items.push({id:rid(),name:n,price:Math.round(p*100)/100,url:u,img});saveOwn('shop');SHEETS.shop();toast('Ürün eklendi');
}

/* ---------------- oynatma listeleri ve diziler ---------------- */
SHEETS.playlists=function(){
  const mine=Object.entries(D.feed).filter(([,f])=>f.owner===App.uid).map(([id])=>vById(id)).filter(Boolean);
  sheet('Oynatma listelerim',`<p class="s muted" style="line-height:1.5">Videolarını listelerde topla. Fiyat koyarsan liste diziye dönüşür: ilk bölüm ücretsiz, diğerleri için izleyici ödeme yapar.</p>
   ${local.playlists.list.map(pl=>`<div class="card" style="margin-top:10px"><div class="row"><b class="grow">${esc(pl.name)}</b><span class="s muted">${pl.vids.length} video${pl.price?' · '+tl(pl.price):''}</span></div>
     <div class="chips wrapx" style="margin-top:8px">${mine.map(v=>`<button class="chip" aria-pressed="${pl.vids.includes(v.id)}" onclick="togglePl('${esc(pl.id)}','${esc(v.id)}')">${esc((v.cap||'Video').slice(0,18))}</button>`).join('')||'<span class="s muted">Önce video yükle.</span>'}</div>
     <button class="btn soft sm" style="margin-top:8px" onclick="local.playlists.list=local.playlists.list.filter(x=>x.id!=='${esc(pl.id)}');saveOwn('playlists');SHEETS.playlists()">Listeyi sil</button></div>`).join('')}
   <h2 class="sec">Yeni liste</h2>
   <label class="lbl" for="plN">Liste adı</label><input class="field" id="plN" maxlength="40">
   <label class="lbl" for="plP">Dizi fiyatı (₺) <small>boş bırakırsan ücretsiz</small></label><input class="field" id="plP" inputmode="decimal" maxlength="6">
   <button class="btn dark full" style="margin-top:14px" onclick="newPl()">Oluştur</button>`);
};
function newPl(){const n=$('#plN').value.trim();if(!n)return toast('Listeye bir ad ver');const p=parseFloat(($('#plP').value||'0').replace(',','.'))||0;local.playlists.list.push({id:rid(),name:n,vids:[],price:Math.max(0,Math.round(p*100)/100)});saveOwn('playlists');SHEETS.playlists()}
function togglePl(id,vid){const pl=local.playlists.list.find(p=>p.id===id);pl.vids.includes(vid)?pl.vids=pl.vids.filter(x=>x!==vid):pl.vids.push(vid);saveOwn('playlists');SHEETS.playlists()}

/* ---------------- duyuru panosu ---------------- */
SHEETS.bulletin=function(){
  sheet('Duyuru panosu',`<p class="s muted" style="line-height:1.5">Takipçilerine duyuru gönder. Profilinde ve takipçilerinin gelen kutusunda görünür.</p>
   <textarea class="field" id="bbIn" rows="3" maxlength="280" placeholder="Örneğin Cuma akşamı 21.00'de canlı yayındayım" style="margin-top:12px"></textarea>
   <button class="btn dark full" style="margin-top:10px" onclick="postBulletin()">Paylaş</button>
   <h2 class="sec">Önceki duyurular</h2>${local.bulletins.list.slice().reverse().map(b=>`<div class="card" style="margin-bottom:8px"><div style="font-size:14.5px">${mentionHTML(b.t)}</div><div class="row xs muted" style="margin-top:6px"><span class="grow">${ago(b.at)}</span><button onclick="local.bulletins.list=local.bulletins.list.filter(x=>x.id!=='${esc(b.id)}');saveOwn('bulletins');SHEETS.bulletin()">Sil</button></div></div>`).join('')||'<p class="s muted">Henüz duyuru yok.</p>'}`);
};
function postBulletin(){const t=$('#bbIn').value.trim();if(!t)return;local.bulletins.list.push({id:rid(),t,at:now()});local.bulletins.list=local.bulletins.list.slice(-30);saveOwn('bulletins');SHEETS.bulletin();toast('Duyuru paylaşıldı')}

/* ---------------- arama içgörüleri ---------------- */
function recordSearch(t){const k=norm(t).slice(0,40);if(k.length<2||!App.online)return;local.searches.m[k]=(local.searches.m[k]||0)+1;saveOwn('searches',3000)}
function topSearches(){const m={};for(const [u,d] of Object.entries({...D.searches,[App.uid]:local.searches}))for(const [k,n] of Object.entries((d&&d.m)||{}))m[k]=(m[k]||0)+(n>0?1:0);return Object.entries(m).sort((a,b)=>b[1]-a[1])}
SHEETS.insights=function(){
  const top=topSearches().slice(0,20);
  sheet('Arama içgörüleri',`<p class="s muted" style="line-height:1.5">İnsanların uygulamada en çok aradığı şeyler. Sonucu az olan aramalar için video yapmak kolay izlenme getirir.</p>
   ${top.length?`<table class="tbl" style="margin-top:12px"><tr><th>Arama</th><th class="r">Kişi</th><th class="r">Video</th></tr>${top.map(([k,n])=>{const vc=allVideos().filter(v=>norm(v.cap).includes(k)||(v.game&&norm(game(v.game).name).includes(k))).length;return `<tr><td>${esc(k)}</td><td class="r">${n}</td><td class="r">${vc}${vc<2?' <span class="pill warn">fırsat</span>':''}</td></tr>`}).join('')}</table>`:'<div class="empty"><h3>Henüz arama yok</h3>Keşfet’te yapılan aramalar burada toplanır.</div>'}`);
};

/* ---------------- üretici stüdyosu ---------------- */
SHEETS.studio=function(){
  const mine=Object.entries(D.feed).filter(([,f])=>f.owner===App.uid).map(([id])=>vById(id)).filter(Boolean);
  const rows=mine.map(v=>{const vc=viewCount(v);return {v,vc,avg:vc?watchMs(v)/vc/1000:0,lk:likeCount(v),cm:commentCount(v),sh:shareCount(v),gf:Object.entries(D.gifts).reduce((a,[u,d])=>a+((d&&d.sent)||[]).filter(g=>g.vid===v.id&&g.to===App.uid).reduce((x,g)=>x+g.amount,0),0)}}).sort((a,b)=>b.vc-a.vc);
  const tot=k=>rows.reduce((a,r)=>a+r[k],0);const max=Math.max(1,...rows.map(r=>r.vc));
  sheet('Üretici stüdyosu',`
   <div class="kpis"><div><b>${fmt(tot('vc'))}</b><span>izlenme</span></div><div><b>${fmt(followerCount(App.uid))}</b><span>takipçi</span></div><div><b>${tl(received())}</b><span>gelen hediye</span></div></div>
   <div class="kpis" style="margin-top:8px"><div><b>${fmt(tot('lk'))}</b><span>beğeni</span></div><div><b>${fmt(tot('cm'))}</b><span>yorum</span></div><div><b>${rows.length?(rows.reduce((a,r)=>a+r.avg,0)/rows.length).toFixed(1).replace('.',','):'0'} sn</b><span>ort. izleme</span></div></div>
   ${rows.length?`<h2 class="sec">Videoların</h2><div class="spark" style="${rows.length<3?'display:none':''}">${rows.slice(0,20).map(r=>`<i style="height:${Math.max(3,r.vc/max*100)}%" title="${r.vc}"></i>`).join('')}</div>
   <table class="tbl" style="margin-top:12px"><tr><th>Video</th><th class="r">İzl.</th><th class="r">Ort. sn</th><th class="r">Beğ.</th><th class="r">Hediye</th></tr>
   ${rows.map(r=>`<tr><td><button style="text-align:left" onclick="playFrom('${esc(r.v.id)}')">${esc((r.v.cap||'Video').slice(0,22))}</button></td><td class="r">${fmt(r.vc)}</td><td class="r">${r.avg.toFixed(1).replace('.',',')}</td><td class="r">${fmt(r.lk)}</td><td class="r">${tl(r.gf)}</td></tr>`).join('')}</table>`:'<div class="empty"><h3>Henüz yayında videon yok</h3>Videoların onaylanınca istatistikler burada görünür.</div>'}
   <div class="group" style="margin-top:16px">
    <button class="list-btn" onclick="openSheet('insights')">${I.globe}Arama içgörüleri${I.chev}</button>
    <button class="list-btn" onclick="openSheet('playlists')">${I.list}Oynatma listeleri ve diziler${I.chev}</button>
    <button class="list-btn" onclick="openSheet('shop')">${I.bag}Mağazam${I.chev}</button>
    <button class="list-btn" onclick="openSheet('bulletin')">${I.mega}Duyuru panosu${I.chev}</button>
   </div>`);
};
