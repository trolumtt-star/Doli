"use strict";
/* ================================================================
   GÖRSEL EFEKTLER: konfeti, dalga, sayaç, kalp parçacıkları,
   menü göstergesi, yönlü ekran geçişleri, açılış animasyonu
   ================================================================ */
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- konfeti ---------- */
function confetti({n=110,colors=['#FF2D6F','#FF8A3D','#FFD60A','#7C4DFF','#22D3EE','#34D399'],x=.5,y=.35}={}){
  if(RM)return;const app=$('#app'),c=document.createElement('canvas');c.className='confetti';
  const W=c.width=app.clientWidth*devicePixelRatio,H=c.height=app.clientHeight*devicePixelRatio;app.appendChild(c);
  const g=c.getContext('2d'),P=[...Array(n)].map(()=>{const a=Math.random()*Math.PI*2,s=(6+Math.random()*12)*devicePixelRatio;
    return {x:W*x,y:H*y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-8*devicePixelRatio,r:Math.random()*6.28,vr:(Math.random()-.5)*.4,w:(5+Math.random()*6)*devicePixelRatio,h:(8+Math.random()*8)*devicePixelRatio,c:colors[Math.random()*colors.length|0],round:Math.random()<.3}});
  let t=0;(function f(){t++;g.clearRect(0,0,W,H);
    for(const p of P){p.vy+=.45*devicePixelRatio;p.vx*=.985;p.vy*=.985;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
      g.save();g.translate(p.x,p.y);g.rotate(p.r);g.globalAlpha=Math.max(0,1-t/150);g.fillStyle=p.c;
      if(p.round){g.beginPath();g.arc(0,0,p.w/2,0,7);g.fill()}else g.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.r*2)));g.restore()}
    if(t<150)requestAnimationFrame(f);else c.remove()})();
}
/* küçük ışık patlaması (ödül alırken) */
function burstAt(x,y){
  if(RM)return;const app=$('#app'),r=app.getBoundingClientRect();
  for(let i=0;i<14;i++){const s=document.createElement('i');s.className='spark';const a=i/14*Math.PI*2,d=40+Math.random()*30;
    s.style.cssText=`left:${x-r.left}px;top:${y-r.top}px;--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d}px;background:${['#FFD60A','#FF2D6F','#7C4DFF','#22D3EE'][i%4]}`;
    app.appendChild(s);setTimeout(()=>s.remove(),700)}
}
/* beğenide uçuşan kalpler */
function likeParticles(id){
  if(RM)return;const b=document.querySelector(`.slide.on .rb.like[data-id="${CSS.escape(id)}"]`)||document.querySelector(`.rb.like[data-id="${CSS.escape(id)}"]`);if(!b)return;
  const rb=b.getBoundingClientRect(),app=$('#app'),r=app.getBoundingClientRect();
  for(let i=0;i<7;i++){const h=document.createElement('i');h.className='lheart';h.textContent='❤';
    h.style.cssText=`left:${rb.left-r.left+rb.width/2}px;top:${rb.top-r.top+16}px;--dx:${(Math.random()-.5)*90}px;--dy:${-50-Math.random()*70}px;--rot:${(Math.random()-.5)*60}deg;animation-delay:${i*25}ms;font-size:${12+Math.random()*10}px`;
    app.appendChild(h);setTimeout(()=>h.remove(),1000)}
  const ring=document.createElement('i');ring.className='lring';ring.style.cssText=`left:${rb.left-r.left+rb.width/2}px;top:${rb.top-r.top+17}px`;app.appendChild(ring);setTimeout(()=>ring.remove(),600);
}

/* ---------- dokunma dalgası ---------- */
document.addEventListener('pointerdown',e=>{
  if(RM)return;const b=e.target.closest('.btn,.chip,.list-btn,.follow,.prow,.rt-card,.ms,.frm,.jar,.seg button,.tabs button');if(!b)return;
  const r=b.getBoundingClientRect(),s=document.createElement('span'),d=Math.max(r.width,r.height)*2;
  s.className='rip';s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
  b.appendChild(s);setTimeout(()=>s.remove(),650);
},{passive:true});

/* ---------- sayılar yukarı sayar ---------- */
function countUps(root){
  if(!root)return;root.querySelectorAll('[data-count]').forEach(el=>{const to=+el.dataset.count;if(!isFinite(to)||RM)return;const t0=performance.now(),dur=Math.min(1200,400+to*8);
    (function f(t){const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e).toLocaleString('tr-TR');if(k<1)requestAnimationFrame(f)})(t0)});
}

/* ---------- alt menü göstergesi + yönlü geçişler ---------- */
const NAV_ORDER=['home','discover','upload','inbox','profile'];
function navIndicator(name){
  const nav=$('#nav');let ind=$('#navInd');if(!ind){ind=document.createElement('i');ind.id='navInd';ind.className='nav-ind';nav.appendChild(ind)}
  const b=nav.querySelector(`button[data-go="${name}"]`);if(!b)return;const nr=nav.getBoundingClientRect(),br=b.getBoundingClientRect();
  ind.style.transform=`translateX(${br.left-nr.left+br.width/2-14}px)`;
}
function onGo(name,prev){
  const a=NAV_ORDER.indexOf(prev),b=NAV_ORDER.indexOf(name);const app=$('#app');
  app.classList.remove('go-l','go-r');void app.offsetWidth;if(a>=0&&b>=0&&a!==b)app.classList.add(b>a?'go-l':'go-r');
  navIndicator(name);
}
addEventListener('resize',()=>navIndicator(currentScreen()));

/* ---------- sayfa açılınca arkadaki ekran içeri çekilir ---------- */
(()=>{
  const o=window.openSheet,c=window.closeSheet;
  window.openSheet=function(...a){const r=o.apply(this,a);$('#app').classList.add('sheeted');return r};
  window.closeSheet=function(...a){$('#app').classList.remove('sheeted');return c.apply(this,a)};
  $('#scrim').onclick=()=>window.closeSheet();
})();

/* ---------- açılış animasyonu ---------- */
(()=>{const l=$('#loading');if(!l)return;l.innerHTML=`<div class="splash"><div class="sp-orb"></div><div class="sp-word">${'doli'.split('').map((c,i)=>`<span style="animation-delay:${i*90}ms">${c}</span>`).join('')}</div><div class="sp-sub">izle · paylaş · kazan</div></div>`})();
