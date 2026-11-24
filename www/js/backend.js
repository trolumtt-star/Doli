"use strict";
/* ================================================================
   APK BAĞLANTI KATMANI
   Uygulama kodu claude.ai'deki gibi window.claude.use(...) ile konuşur.
   Bu dosya aynı arayüzü Supabase üzerinde sağlar:
   db (belge deposu + anlık güncelleme), user (giriş), assets (dosya), room (canlı oda).
   ================================================================ */
(function(){
  const C=window.APP_CONFIG;
  const sb=window.supabase.createClient(C.url,C.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  window.BLOB_BASE=C.url+'/storage/v1/object/public/media/';
  window.APP_MAXMB=50;
  let session=null,isAdmin=false;
  const colOf=p=>p.slice(0,p.lastIndexOf('/'));
  const clone=o=>o==null?o:JSON.parse(JSON.stringify(o));
  const err=e=>{const code=(e&&(e.code==='42501'||/row-level security|permission/i.test(e.message||'')))?'invalid_argument':'unavailable';return {code,message:(e&&e.message)||String(e)}};

  /* ---------------- giriş ekranı ---------------- */
  const authReady=new Promise(resolve=>{
    sb.auth.getSession().then(({data})=>{
      if(data.session){session=data.session;resolve()}
      else showAuth(resolve);
    });
  });
  sb.auth.onAuthStateChange((ev,s)=>{session=s;if(ev==='SIGNED_OUT')location.reload()});
  window.APP_LOGOUT=async()=>{await sb.auth.signOut();try{localStorage.clear()}catch{}location.reload()};
  function showAuth(done){
    const w=document.createElement('div');
    w.className='onb';w.style.zIndex=120;
    let mode='signup';
    const draw=(msg='',kind='')=>{
      w.innerHTML=`<div class="hero"><span class="coin" style="--s:72px"><span class="face">1₺</span></span></div>
       <h1>${mode==='signup'?'Hesap oluştur':'Tekrar hoş geldin'}</h1>
       <p class="lead">${mode==='signup'?'Kısa videolar izle, kendi videonla kazan.':'E-posta ve şifrenle giriş yap.'}</p>
       <label class="lbl" for="auE">E-posta</label><input class="field" id="auE" type="email" autocomplete="email" inputmode="email" autocapitalize="off">
       <label class="lbl" for="auP">Şifre</label><input class="field" id="auP" type="password" autocomplete="${mode==='signup'?'new-password':'current-password'}" placeholder="En az 6 karakter">
       ${msg?`<div class="result ${kind||'bad'}" style="margin-top:14px"><p style="margin:0">${msg}</p></div>`:''}
       <div style="flex:1;min-height:16px"></div>
       <button class="btn primary full" id="auGo">${mode==='signup'?'Kayıt ol':'Giriş yap'}</button>
       <button class="btn full" style="margin-top:6px;color:var(--muted)" id="auSw">${mode==='signup'?'Hesabın var mı? Giriş yap':'Hesabın yok mu? Kayıt ol'}</button>
       ${mode==='signin'?'<button class="btn full" style="color:var(--muted)" id="auFg">Şifremi unuttum</button>':''}`;
      w.querySelector('#auSw').onclick=()=>{mode=mode==='signup'?'signin':'signup';draw()};
      const fg=w.querySelector('#auFg');if(fg)fg.onclick=async()=>{const e=w.querySelector('#auE').value.trim();if(!e)return draw('Önce e-posta adresini yaz.');const {error}=await sb.auth.resetPasswordForEmail(e);draw(error?error.message:'Şifre sıfırlama bağlantısı e-postana gönderildi.',error?'bad':'ok')};
      w.querySelector('#auGo').onclick=async()=>{
        const e=w.querySelector('#auE').value.trim(),p=w.querySelector('#auP').value;
        if(!/^\S+@\S+\.\S+$/.test(e))return draw('Geçerli bir e-posta yaz.');
        if(p.length<6)return draw('Şifre en az 6 karakter olmalı.');
        const b=w.querySelector('#auGo');b.disabled=true;b.textContent='Bekle';
        const r=mode==='signup'?await sb.auth.signUp({email:e,password:p}):await sb.auth.signInWithPassword({email:e,password:p});
        if(r.error){const m=r.error.message||'';return draw(/Invalid login/i.test(m)?'E-posta ya da şifre yanlış.':/registered/i.test(m)?'Bu e-postayla zaten hesap var. Giriş yap.':/confirm/i.test(m)?'Önce e-postana gelen doğrulama bağlantısına tıkla.':m)}
        if(!r.data.session){mode='signin';return draw('Kayıt tamam. E-postana gelen doğrulama bağlantısına tıkla, sonra burada giriş yap.','ok')}
        session=r.data.session;w.remove();done();
      };
    };
    draw();
    const mount=()=>{const app=document.getElementById('app');if(app){app.appendChild(w);const l=document.getElementById('loading');if(l)l.style.display='none'}else setTimeout(mount,30)};mount();
  }

  /* ---------------- belge deposu ---------------- */
  const subs=new Set();          // {kind:'doc'|'col', path, next}
  const pending=new Map();
  function snapDoc(path,data){return {id:path.split('/').pop(),exists:data!==undefined&&data!==null,data:()=>clone(data)??undefined,metadata:{fromCache:false,hasPendingWrites:false}}}
  async function readDoc(path){const {data,error}=await sb.from('docs').select('data').eq('path',path).maybeSingle();if(error)throw err(error);return data?data.data:undefined}
  async function readCol(col){const {data,error}=await sb.from('docs').select('path,data').eq('col',col).limit(1000);if(error)throw err(error);
    const docs=(data||[]).sort((a,b)=>a.path<b.path?-1:1).map(r=>snapDoc(r.path,r.data));
    return {docs,size:docs.length,empty:!docs.length,docChanges:()=>docs.map(d=>({type:'added',doc:d,oldIndex:-1,newIndex:0})),metadata:{fromCache:false,hasPendingWrites:false}}}
  function deliver(s){(s.kind==='doc'?readDoc(s.path).then(d=>snapDoc(s.path,d)):readCol(s.path)).then(x=>{if(subs.has(s))s.next(x)}).catch(e=>console.warn('db',s.path,e))}
  function touch(path){
    const col=colOf(path);
    for(const s of subs)if((s.kind==='doc'&&s.path===path)||(s.kind==='col'&&s.path===col)){
      clearTimeout(pending.get(s));pending.set(s,setTimeout(()=>deliver(s),120));
    }
  }
  let rt=null;
  function realtime(){
    if(rt)return;
    rt=sb.channel('docs-changes').on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>{const path=(p.new&&p.new.path)||(p.old&&p.old.path);if(path)touch(path)}).subscribe();
    setInterval(()=>{for(const s of subs)if(s.kind==='col')deliver(s)},30000); // silinenler ve kaçanlar için
  }
  const dm=(a,b)=>{const o={...(a||{})};for(const [k,v] of Object.entries(b)){o[k]=(v&&typeof v==='object'&&!Array.isArray(v)&&o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k]))?dm(o[k],v):v}return o};
  function docRef(path){
    return {id:path.split('/').pop(),path,
      async get(){return snapDoc(path,await readDoc(path))},
      async set(data){const {error}=await sb.from('docs').upsert({path,col:colOf(path),data});if(error)throw err(error);touch(path)},
      async update(data){const cur=await readDoc(path);if(cur===undefined)throw {code:'invalid_argument',message:'Belge yok'};const {error}=await sb.from('docs').upsert({path,col:colOf(path),data:dm(cur,data)});if(error)throw err(error);touch(path)},
      async delete(){const {error}=await sb.from('docs').delete().eq('path',path);if(error)throw err(error);touch(path)},
      onSnapshot(next,onErr){realtime();const s={kind:'doc',path,next};subs.add(s);deliver(s);return ()=>subs.delete(s)},
      collection(sub){return colRef(path+'/'+sub)},
    };
  }
  function colRef(path){
    const q={path,
      doc(id){return docRef(path+'/'+(id||Math.random().toString(36).slice(2)+Date.now().toString(36)))},
      async add(data){const r=q.doc();await r.set(data);return r},
      get(){return readCol(path)},
      onSnapshot(next,onErr){realtime();const s={kind:'col',path,next};subs.add(s);deliver(s);return ()=>subs.delete(s)},
      where(){return q},orderBy(){return q},limit(){return q},
    };return q;
  }
  const db={doc:docRef,collection:colRef};

  /* ---------------- kullanıcı ---------------- */
  const user={
    async id(){await authReady;return session&&session.user.id},
    async canEdit(){await authReady;const {data}=await sb.rpc('is_app_admin');isAdmin=!!data;return isAdmin},
    async isOwner(){return user.canEdit()},
    async can(){return true},
    async me(){await authReady;const u=session&&session.user;return {id:u&&u.id,name:(u&&u.user_metadata&&u.user_metadata.name)||((u&&u.email)||'').split('@')[0]}},
    async profiles(){return {}},
  };

  /* ---------------- dosyalar ---------------- */
  const assets={
    async upload(blob){
      await authReady;const type=blob.type||'application/octet-stream';
      const ext=(type.split('/')[1]||'bin').split(';')[0].replace('quicktime','mov').replace('jpeg','jpg');
      const path=`${session.user.id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}.${ext}`;
      const {error}=await sb.storage.from('media').upload(path,blob,{contentType:type,upsert:false});
      if(error)throw err(error);
      return {id:path,url:window.BLOB_BASE+path,sizeBytes:blob.size,contentType:type};
    },
  };

  /* ---------------- canlı oda ---------------- */
  const TOPICS=['lchat','lheart','lgift','lmod'];
  const room={
    async join(name){
      await authReady;const uid=session.user.id;const peer=uid.slice(0,8)+Math.random().toString(36).slice(2,6);
      const ch=sb.channel('room:'+name,{config:{broadcast:{self:false},presence:{key:peer}}});
      const H={},PH=[];let peers=[];
      for(const t of TOPICS)ch.on('broadcast',{event:t},({payload})=>{(H[t]||[]).forEach(f=>f({topic:t,data:payload&&payload.data,by:payload&&payload.by,peer:payload&&payload.peer,isMe:false,sameTab:false,kind:'viewer',guest:false}))});
      ch.on('presence',{event:'sync'},()=>{const st=ch.presenceState();peers=Object.entries(st).map(([k,a])=>({peer:k,by:(a[0]||{}).by||null,isMe:k===peer,presence:a[0]||{}}));PH.forEach(f=>f({peers,joined:[],left:[],updated:[]}))});
      await new Promise((res,rej)=>{const t=setTimeout(()=>rej({code:'upstream_error'}),10000);ch.subscribe(st=>{if(st==='SUBSCRIBED'){clearTimeout(t);res()}})});
      await ch.track({by:uid});
      return {name,
        async emit(topic,data){(H[topic]||[]).forEach(f=>f({topic,data,by:uid,peer,isMe:true,sameTab:true,kind:'viewer',guest:false}));await ch.send({type:'broadcast',event:topic,payload:{data,by:uid,peer}})},
        on(t,f){(H[t]=H[t]||[]).push(f);return ()=>{H[t]=H[t].filter(x=>x!==f)}},
        async presence(p){await ch.track({...p,by:uid})},
        onPeers(f){PH.push(f);setTimeout(()=>f({peers,joined:[],left:[],updated:[]}),0);return ()=>{}},
        peers(){return peers},connected(){return true},
        async leave(){await sb.removeChannel(ch)},
      };
    },
  };

  window.claude={use:async n=>{await authReady;return ({db,user,assets,room})[n]||null}};
})();
