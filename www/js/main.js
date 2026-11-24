"use strict";
/* ================================================================
   KEŞFET
   ================================================================ */
function setCat(c,g){UI.cat=c;UI.game=g||null;renderDiscover()}
function renderDiscover(){
  $('#catChips').innerHTML=`<button class="chip" aria-pressed="${!UI.cat}" onclick="setCat(null)">Öne çıkan</button><button class="chip" aria-pressed="${UI.cat==='stem'}" onclick="setCat('stem')">🔬 STEM</button>`+CATS.map(c=>`<button class="chip" aria-pressed="${UI.cat===c.id}" onclick="setCat(${c.id})">${c.e} ${c.name}</button>`).join('');
  const raw=$('#q').value||'',t=norm(raw);let list=allVideos().filter(visible);let h='';
  if(t){
    const ppl=[...Object.keys(SU),...Object.keys(D.profiles)].filter(id=>id!==App.uid&&!D.prefs.blocked[id]).map(person).filter(p=>norm(p.handle).includes(t.replace('@',''))||norm(p.name).includes(t));
    const gs=GAMES.filter(g=>norm(g.name).includes(t));
    const sounds=[...new Map(allVideos().filter(v=>norm(v.sound).includes(t)).map(v=>[v.soundOf||v.sound,v])).values()];
    list=list.filter(v=>norm(v.cap).includes(t)||(v.game&&norm(game(v.game).name).includes(t))||norm(person(v.owner).handle).includes(t)||norm(cat(v.cat).name).includes(t)||(v.addYours&&norm(v.addYours).includes(t)));
    if(ppl.length)h+=`<h2 class="sec">Kişiler</h2>`+ppl.slice(0,5).map(personRow).join('');
    if(gs.length)h+=`<h2 class="sec">Oyunlar</h2><div class="chips wrapx">`+gs.slice(0,8).map(g=>`<button class="chip" onclick="$('#q').value='';setCat(2,${g.id})">${esc(g.name)}</button>`).join('')+'</div>';
    if(sounds.length)h+=`<h2 class="sec">Sesler</h2>`+sounds.slice(0,4).map(v=>`<button class="trend" onclick="openSheet('sound','${esc(v.soundOf||v.id)}')"><span class="ic">${I.sound.replace('<svg','<svg width="20" height="20"')}</span><span class="grow b ell">${esc(v.sound)}</span>${I.chev}</button>`).join('');
    h+=`<h2 class="sec">Videolar</h2>`+(list.length?`<div class="grid">${list.map(tileHTML).join('')}</div>`:`<div class="empty"><h3>Sonuç yok</h3>“${esc(raw)}” ile eşleşen video bulunamadı.</div>`);
  }else if(UI.cat){
    list=list.filter(v=>UI.cat==='stem'?STEM.includes(v.cat):v.cat===UI.cat&&(!UI.game||v.game===UI.game)).sort((a,b)=>viewCount(b)-viewCount(a));
    if(UI.cat==='stem')h+=`<p class="s muted" style="margin:4px 0 12px">Bilim, teknoloji, mühendislik ve matematik videoları.</p>`;
    if(UI.cat===2){const used=[...new Set(allVideos().filter(v=>v.game).map(v=>v.game))];h+=`<div class="chips" style="margin:6px -18px 14px">${[`<button class="chip" aria-pressed="${!UI.game}" onclick="setCat(2)">Tüm oyunlar</button>`,...used.map(g=>`<button class="chip" aria-pressed="${UI.game===g}" onclick="setCat(2,${g})">${esc(game(g).name)}</button>`)].join('')}</div>`}
    h+=list.length?`<div class="grid" style="margin-top:6px">${list.map(tileHTML).join('')}</div>`:`<div class="empty"><h3>Bu etikette video yok</h3>İlk videoyu sen yükle, onaylanınca ${tl(CFG.reward)} kazan.<br><button class="btn primary" style="margin-top:14px" onclick="openUpload()">Video yükle</button></div>`;
  }else{
    const tags=CATS.map(c=>({c,n:allVideos().filter(v=>v.cat===c.id).reduce((a,v)=>a+viewCount(v),0)})).filter(x=>x.n).sort((a,b)=>b.n-a.n).slice(0,5);
    const lives=liveActive();const chains=[...new Set(allVideos().filter(v=>v.addYours).map(v=>v.addYours))];
    h+=`<div class="campaign" style="margin-top:6px"><span class="coin"><span class="face">1₺</span></span><div class="grow"><h3>Videon onaylanınca ${tl(CFG.reward)} kazan</h3><p>${tl(CFG.payoutAt)} biriktirince Google Play kodu alırsın.</p></div></div>
      <button class="btn primary full" style="margin-top:10px" onclick="openUpload()">Video yükle</button>`;
    if(lives.length)h+=`<h2 class="sec">Şu an canlı</h2><div class="live-list">${lives.slice(0,4).map(([u,l])=>{const p=person(u),v=l.vid&&vById(l.vid);return `<button class="live-card" onclick="joinLive('${esc(u)}')">${v&&v.thumb?`<img src="${esc(v.thumb)}" alt="">`:`<div style="position:absolute;inset:0;background:${esc(p.c)}"></div>`}<span class="live-tag">CANLI</span><div class="info">@${esc(p.handle)}</div></button>`}).join('')}</div>`;
    if(chains.length)h+=`<h2 class="sec">Senin sıran zincirleri</h2><div class="chips wrapx">${chains.slice(0,6).map(c=>`<button class="chip" onclick="openSheet('chain',${JSON.stringify(c).replace(/"/g,'&quot;')})">${esc(c)}</button>`).join('')}</div>`;
    h+=`<h2 class="sec">En çok izlenen etiketler</h2>`+tags.map((x,i)=>`<button class="trend" onclick="setCat(${x.c.id})"><span class="n">${i+1}</span><span class="ic">${x.c.e}</span><span class="grow b">${x.c.name}</span><span class="s muted">${fmt(x.n)} izlenme</span></button>`).join('');
    const sug=[...Object.keys(D.profiles),...Object.keys(SU)].filter(id=>id!==App.uid&&!iFollow(id)&&!D.prefs.blocked[id]).slice(0,4);
    if(sug.length)h+=`<h2 class="sec">Takip edebileceğin hesaplar</h2>`+sug.map(id=>personRow(person(id))).join('');
    h+=`<h2 class="sec">Popüler</h2><div class="grid">${list.sort((a,b)=>viewCount(b)-viewCount(a)).map(tileHTML).join('')}</div>`;
  }
  $('#discoverBody').innerHTML=h;
}
function personRow(p){const on=iFollow(p.id);return `<div class="person"><button onclick="openSheet('user','${esc(p.id)}')">${avaHTML(p)}</button><button class="grow" style="text-align:left" onclick="openSheet('user','${esc(p.id)}')"><div class="b ell">@${esc(p.handle)}</div><div class="s muted ell">${fmt(followerCount(p.id))} takipçi${p.bio?', '+esc(p.bio):''}</div></button><button class="follow" aria-pressed="${on}" onclick="toggleFollow('${esc(p.id)}',this)">${on?'Takiptesin':'Takip et'}</button></div>`}
let qT;$('#q').oninput=()=>{clearTimeout(qT);qT=setTimeout(()=>{renderDiscover();recordSearch($('#q').value)},350)};
function playFrom(id){
  const v=vById(id);
  if(!v){const u=D.myUploads[id];if(u){if(u.status==='draft')return openDraft(id);return toast(u.status==='pending'?'Bu video incelemede':'Reddedildi: '+(u.reason||''))}return toast('Video bulunamadı')}
  closeSheet();if($('.layer.on'))closeLayers();if(currentScreen()!=='home')go('home');UI.feedType='foryou';$$('.feed-tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.feed==='foryou'));
  buildFeed();const i=feedItems.findIndex(it=>it.v&&it.v.id===id);
  if(i!==0){if(i>0){const [x]=feedItems.splice(i,1);feedItems.unshift(x)}else feedItems.unshift({v});$('#feed').innerHTML=feedItems.map((it,j)=>it.ad?adHTML(it,j):slideHTML(it.v,j)).join('');active=-1;observe()}
}

/* ================================================================
   PROFİL
   ================================================================ */
function myProfile(){return D.me?person(App.uid):{id:App.uid,handle:'sen',name:'Sen',e:'🙂',c:'#16141C',bio:''}}
function renderProfile(){
  const me=myProfile(),b=balance();
  $('#pfTitle').textContent='@'+me.handle;
  const ups=Object.entries(D.myUploads).map(([id,u])=>({id,owner:App.uid,cat:u.cat,game:u.game,cap:u.cap,status:u.status,thumb:blobUrl(u.thumbId),imgs:(u.assetIds||[]).map(blobUrl),src:blobUrl(u.assetId)||u.localUrl,V:0,at:u.createdAt,scheduledAt:u.scheduledAt})).sort((a,b)=>b.at-a.at);
  const tabs={videos:ups.filter(u=>u.status!=='draft'),drafts:ups.filter(u=>u.status==='draft'),reposts:allVideos().filter(v=>local.reposts.m[v.id]),saved:allVideos().filter(v=>D.prefs.saves[v.id]),liked:allVideos().filter(v=>local.likes.m[v.id])};
  const list=tabs[UI.pfTab]||[];const mine=activeStories(App.uid);const myLive=D.lives[App.uid]&&D.lives[App.uid].active;
  $('#profileBody').innerHTML=`
   <div class="pf-head"><button class="story-av" style="margin:0 auto;width:auto" onclick="${mine.length?`viewStories(['${esc(App.uid)}'])`:'openSheet(\'storyNew\')'}" aria-label="Hikâye"><span class="ring ${mine.length?'':'add'}" style="padding:3px">${avaHTML(me).replace('class="ava "','class="ava" style="width:96px;height:96px;font-size:48px;background:'+esc(me.c)+';color:#fff"')}</span></button>
    <h2>${esc(me.name)} ${D.me&&D.me.private?I.lock.replace('<svg','<svg width="16" height="16" style="display:inline;vertical-align:-2px"'):''}</h2>${me.bio||me.city?`<div class="bio">${esc(me.bio)}${me.city?(me.bio?' · ':'')+esc(me.city):''}</div>`:''}
    <div class="stats"><div><b>${followingCount()}</b><span>takip</span></div><div><b>${fmt(followerCount(App.uid))}</b><span>takipçi</span></div><div><b>${fmt(allVideos().filter(v=>v.owner===App.uid).reduce((a,v)=>a+likeCount(v),0))}</b><span>beğeni</span></div></div>
    <div class="row" style="justify-content:center;flex-wrap:wrap"><button class="btn soft" onclick="editProfile()">Profili düzenle</button><button class="btn soft" onclick="openSheet('studio')">Stüdyo</button><button class="btn soft" onclick="${myLive?`joinLive('${esc(App.uid)}')`:'openSheet(\'goLive\')'}">${myLive?'Yayına dön':'Canlı yayın'}</button></div>
   </div>
   <div style="padding:18px 18px 0"><button class="jar" onclick="openSheet('wallet')"><span class="coin" style="--s:52px"><span class="face">1₺</span></span><div class="grow"><div class="s" style="color:var(--money-ink)">Kumbaram</div><div class="amt">${tl(b)}</div><div class="meter"><i style="width:${Math.min(100,b/CFG.payoutAt*100)}%"></i></div><div class="xs" style="color:var(--money-ink);margin-top:5px">${b>=CFG.payoutAt?'Google Play kodu alabilirsin':`${tl(CFG.payoutAt)} olunca Google Play kodu`}</div></div></button></div>
   <div class="tabs" role="tablist" style="overflow-x:auto">${[['videos','Videolar'],['drafts',`Taslak${tabs.drafts.length?' ('+tabs.drafts.length+')':''}`],['reposts','Repost'],['saved','Kayıtlı'],['liked','Beğeni']].map(([k,t])=>`<button role="tab" aria-selected="${UI.pfTab===k}" onclick="UI.pfTab='${k}';renderProfile()">${t}</button>`).join('')}</div>
   ${UI.pfTab==='saved'?`<div style="padding:10px 18px 0"><button class="btn soft sm" onclick="openSheet('colls')">Koleksiyonlar (${Object.keys(D.prefs.colls||{}).length+Object.values(D.shared).filter(s=>(s.members||[]).includes(App.uid)).length})</button></div>`:''}
   ${list.length?`<div class="grid" style="padding:3px">${list.map(tileHTML).join('')}</div>`:`<div class="empty">${UI.pfTab==='videos'?`<h3>İlk videonu yükle</h3>Onaylanınca kumbarana ${tl(CFG.reward)} eklenir.<br><button class="btn primary" style="margin-top:14px" onclick="openUpload()">Video yükle</button>`:UI.pfTab==='drafts'?'<h3>Taslağın yok</h3>Yükleme ekranında “Taslak kaydet” dediğin gönderiler burada durur.':'<h3>Burası boş</h3>'}</div>`}`;
}
function editProfile(){
  const me=myProfile();let pickE=me.e,pickC=me.c;
  openSheet('blank');
  sheet('Profili düzenle',`
   <label class="lbl" for="pfU" style="margin-top:4px">Kullanıcı adı</label><input class="field" id="pfU" value="${esc(me.handle)}" maxlength="24" autocapitalize="off" autocomplete="off"><p class="help">3–24 karakter: küçük harf, rakam, alt çizgi ve nokta.</p>
   <label class="lbl" for="pfN">Ad</label><input class="field" id="pfN" value="${esc(me.name)}" maxlength="30">
   <label class="lbl" for="pfB">Hakkında</label><input class="field" id="pfB" value="${esc(me.bio)}" maxlength="80">
   <label class="lbl" for="pfCity">Şehir</label><select class="field" id="pfCity"><option value="">Seçilmedi</option>${CITIES.map(c=>`<option ${me.city===c?'selected':''}>${c}</option>`).join('')}</select>
   <span class="lbl">Avatar</span><div class="chips wrapx" id="pfE">${['🙂','😎','🤠','👽','🦊','🐼','🔥','🎧','🌸','⚡','🎮','🍕'].map(e=>`<button class="chip" style="font-size:20px" aria-pressed="${e===pickE}" data-e="${e}">${e}</button>`).join('')}</div>
   <div class="chips wrapx" id="pfC" style="margin-top:10px">${COLORS.map(c=>`<button class="chip" aria-label="Renk" aria-pressed="${c===pickC}" data-c="${c}" style="width:38px;padding:0;background:${c};border-color:${c};box-shadow:${c===pickC?'0 0 0 2px var(--paper),0 0 0 4px var(--ink)':'none'}"></button>`).join('')}</div>
   <button class="btn primary full" style="margin-top:20px" id="pfSave">Kaydet</button>`);
  $('#pfE').onclick=e=>{const b=e.target.closest('[data-e]');if(!b)return;pickE=b.dataset.e;$$('#pfE .chip').forEach(x=>x.setAttribute('aria-pressed',x===b))};
  $('#pfC').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;pickC=b.dataset.c;$$('#pfC .chip').forEach(x=>{const on=x===b;x.setAttribute('aria-pressed',on);x.style.boxShadow=on?'0 0 0 2px var(--paper),0 0 0 4px var(--ink)':'none'})};
  $('#pfSave').onclick=()=>{
    const h=$('#pfU').value.trim().toLowerCase();if(!/^[a-z0-9_.]{3,24}$/.test(h))return toast('Kullanıcı adı 3–24 karakter olmalı');
    if(Object.entries(D.profiles).some(([id,p])=>id!==App.uid&&p.handle===h)||Object.values(SU).some(p=>p.handle===h))return toast('Bu kullanıcı adı alınmış');
    D.me={...(D.me||{}),handle:h,name:$('#pfN').value.trim()||h,bio:$('#pfB').value.trim(),city:$('#pfCity').value,e:pickE,c:pickC,updatedAt:now()};
    D.profiles[App.uid]=D.me;saveProfile();allVideos.dirty=true;closeSheet();renderProfile();toast('Profil kaydedildi');
  };
}

/* ================================================================
   KARŞILAMA
   ================================================================ */
async function showOnboarding(){
  let name='';try{if(App.user){const m=await App.user.me();name=(m&&m.name)||''}}catch{}
  const sug=(norm(name).replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'')||'kullanici').slice(0,18)+(Math.floor(Math.random()*90)+10);
  const st={terms:false,consent:false};const o=$('#onb');
  o.innerHTML=`<div class="onb">
   <div class="hero"><span class="coin"><span class="face">1₺</span></span></div>
   <h1>Kısa videolar izle, kendi videonla kazan.</h1>
   <p class="lead">Onaylanan her videona ${tl(CFG.reward)}. ${tl(CFG.payoutAt)} biriktirince Google Play kodu senin.</p>
   <label class="lbl" for="obH">Kullanıcı adın</label><input class="field" id="obH" value="${esc(sug)}" maxlength="24" autocapitalize="off" autocomplete="off">
   <label class="lbl" for="obY">Doğum yılın</label><input class="field" id="obY" inputmode="numeric" maxlength="4" placeholder="Örneğin 2001" autocomplete="bday-year">
   <p class="help">18 yaşından küçüksen kişiselleştirilmiş reklam gösterilmez.</p>
   <label class="lbl" for="obCity">Şehrin <small>isteğe bağlı, Yakın akışı için</small></label><select class="field" id="obCity"><option value="">Seçme</option>${CITIES.map(c=>`<option>${c}</option>`).join('')}</select>
   <button class="check" role="checkbox" aria-checked="false" id="obT"><span class="bx">${I.check}</span><span><b>Kullanım şartlarını</b> okudum ve kabul ediyorum. Yüklediğim içeriklerin sorumluluğu bana ait. <span class="muted">Zorunlu.</span></span></button>
   <button class="check" role="checkbox" aria-checked="false" id="obC"><span class="bx">${I.check}</span><span>İzleme alışkanlıklarımın ilgi alanlarıma göre <b>reklam seçmek</b> için kullanılmasına açık rıza veriyorum. <span class="muted">İsteğe bağlı.</span></span></button>
   <div style="flex:1;min-height:16px"></div>
   <button class="btn primary full" id="obGo" disabled>Başla</button>
   <button class="btn full" style="margin-top:6px;color:var(--muted)" onclick="openSheet('terms')">Kullanım şartlarını oku</button></div>`;
  const upd=()=>{const y=+$('#obY').value,yr=new Date().getFullYear();$('#obGo').disabled=!(st.terms&&y>=1900&&y<=yr-10&&/^[a-z0-9_.]{3,24}$/.test($('#obH').value.trim().toLowerCase()))};
  $('#obY').oninput=upd;$('#obH').oninput=upd;
  $('#obT').onclick=e=>{st.terms=!st.terms;e.currentTarget.setAttribute('aria-checked',st.terms);upd()};
  $('#obC').onclick=e=>{st.consent=!st.consent;e.currentTarget.setAttribute('aria-checked',st.consent)};
  $('#obGo').onclick=async()=>{
    const y=+$('#obY').value,h=$('#obH').value.trim().toLowerCase();
    if(Object.entries(D.profiles).some(([id,p])=>id!==App.uid&&p.handle===h))return toast('Bu kullanıcı adı alınmış, başka bir tane dene');
    const adult=new Date().getFullYear()-y>=18;
    Object.assign(D.prefs,{birthYear:y,adult,consent:st.consent&&adult,consentAt:now(),termsAt:now()});
    D.me={handle:h,name:name||h,bio:'',city:$('#obCity').value,e:'🙂',c:COLORS[Math.floor(Math.random()*COLORS.length)],createdAt:now(),...(CRY.pk?{pk:CRY.pk}:{})};
    D.profiles[App.uid]=D.me;
    if(App.db){try{await App.db.doc(`profiles/${App.uid}`).set(D.me)}catch(e){dbErr(e)}savePrefs(0);saveSignals();initKeys()}
    o.innerHTML='';if(st.consent&&!adult)toast('18 yaşından küçük olduğun için kişiselleştirilmiş reklam kapalı');
    buildFeed();
  };
}

/* ================================================================
   GEZİNME VE AÇILIŞ
   ================================================================ */
function currentScreen(){const s=$('.screen.on');return s?s.id.slice(2):'home'}
function go(name,opt={}){
  if(name==='upload')return openUpload();
  if(name!=='home'&&currentScreen()==='home'){commitWatch();cancelAnimationFrame(raf);$$('#feed video').forEach(v=>v.pause())}
  $$('.screen').forEach(s=>s.classList.toggle('on',s.id==='s-'+name));
  $$('.nav>button[data-go]').forEach(b=>{if(b.dataset.go===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  $('#nav').classList.toggle('on-video',name==='home');
  $('meta[name=theme-color]').content=name==='home'?'#000000':'#FFFFFF';
  if(name==='home')buildFeed();else updateMuteBtn();
  if(name==='discover'){renderDiscover();if(opt.focus)setTimeout(()=>$('#q').focus(),50)}
  if(name==='inbox'){renderInbox();const mx=Math.max(0,...notifications().map(n=>n.at));if(mx>(D.prefs.seenNotifs||0))setTimeout(()=>{D.prefs.seenNotifs=mx;savePrefs();renderBadge()},1200)}
  if(name==='profile')renderProfile();
}
$$('.nav>button[data-go]').forEach(b=>b.onclick=()=>{anim(b,'bounce');go(b.dataset.go)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(currentScreen()==='home'&&active>=0&&!paused)togglePause(cur());commitWatch();savePrefs(0)}});
async function boot(){
  await connect();
  if(App.online)await subscribeAll();
  App.ready=true;
  $('#app').classList.toggle('calm',!!D.prefs.calm);
  UI.lastBalance=balance();
  $('#loading').style.opacity=0;setTimeout(()=>$('#loading').remove(),320);
  if(!D.prefs.termsAt)showOnboarding();else initKeys();
  renderBadge();buildFeed();
  const h=location.hash.match(/^#v-([\w-]+)$/);if(h)setTimeout(()=>playFrom(h[1]),300);
}
boot();
