"use strict";
/* ================================================================
   SABİTLER VE ÖRNEK İÇERİK
   ================================================================ */
const CFG={reward:1,dailyUpload:5,dailyReward:3,viewBonusAt:1000,viewBonus:5,payoutAt:50,budget:10000,maxMB:window.APP_MAXMB||20,storyHours:24,promoteHours:24,autoApprove:true};
const CATS=[
 {id:1,slug:'komedi',name:'Komedi',e:'😂'},{id:2,slug:'oyun',name:'Oyun',e:'🎮'},{id:3,slug:'muzik',name:'Müzik',e:'🎵'},
 {id:4,slug:'dans',name:'Dans',e:'💃'},{id:5,slug:'yemek',name:'Yemek',e:'🍳'},{id:6,slug:'spor',name:'Spor',e:'⚽'},
 {id:7,slug:'egitim',name:'Eğitim',e:'📚'},{id:8,slug:'gunluk',name:'Günlük',e:'📱'},{id:9,slug:'hayvanlar',name:'Hayvanlar',e:'🐾'},
 {id:10,slug:'guzellik',name:'Güzellik',e:'💄'},{id:11,slug:'teknoloji',name:'Teknoloji',e:'💻'},{id:12,slug:'seyahat',name:'Seyahat',e:'🧭'}];
const STEM=[7,11];
const GAMES=[
 [111469,'PUBG Mobile'],[27789,'PUBG: Battlegrounds'],[1905,'Fortnite'],[126459,'Valorant'],[242408,'Counter-Strike 2'],
 [1020,'Grand Theft Auto V'],[121,'Minecraft'],[115,'League of Legends'],[17000,'Brawl Stars'],[1942,'The Witcher 3: Wild Hunt'],
 [119133,'Elden Ring'],[300976,'EA Sports FC 25'],[25076,'Red Dead Redemption 2'],[11198,'Rocket League'],[136,'Clash Royale'],
 [2155,'Dota 2'],[114795,'Apex Legends'],[7346,'Zula'],[26758,'Among Us'],[133236,'Call of Duty: Warzone'],[1877,'Cyberpunk 2077'],
 [18866,'Roblox'],[119171,'Genshin Impact'],[11133,'Dark Souls III'],[140000,'Mobile Legends: Bang Bang'],[217590,'Free Fire MAX'],
 [96217,'Clash of Clans'],[126098,'Euro Truck Simulator 2'],[205780,'Wuthering Waves'],[37030,'Subway Surfers']
].map(([id,name])=>({id,name}));
const CITIES=['İstanbul','Ankara','İzmir','Bursa','Antalya','Adana','Konya','Gaziantep','Şanlıurfa','Kocaeli','Mersin','Diyarbakır','Kayseri','Eskişehir','Samsun','Trabzon','Rize','Erzurum','Malatya','Van','Denizli','Sakarya','Muğla','Tekirdağ','Diğer'];
const COLORS=['#E11D48','#16141C','#D9A520','#0F9F66','#3B5BDB','#7048E8','#E8590C','#0C8599'];
const GIFTS=[ // fiyatlar ₺
 {id:'gul',e:'🌹',name:'Gül',p:0.5},{id:'kalp',e:'💖',name:'Kalp',p:1},{id:'cay',e:'🫖',name:'Çay',p:2},{id:'jeton',e:'🪙',name:'Jeton',p:5},
 {id:'tac',e:'👑',name:'Taç',p:10},{id:'roket',e:'🚀',name:'Roket',p:20},{id:'aslan',e:'🦁',name:'Aslan',p:50},{id:'gezegen',e:'🪐',name:'Gezegen',p:100}];
const FILTERS=[['none','Normal'],['sicak','Sıcak'],['soguk','Soğuk'],['canli','Canlı'],['sb','Siyah beyaz'],['retro','Retro']];
const STICKERS=['😂','🔥','😍','👏','💀','🥹','😭','🤯','🫡','👀','💯','🎉'];
const SPEEDS=[0.5,1,1.5,2];

const cat=id=>CATS.find(c=>c.id===id)||CATS[7];
const game=id=>GAMES.find(g=>g.id===id);
const gift=id=>GIFTS.find(g=>g.id===id);

/* ---- örnek hesaplar ve videolar: sayfanın içinde, veritabanında değil ---- */
const SU={
 's:efe':{handle:'kahkaha.efe',name:'Efe',e:'🤪',c:'#E8590C',bio:'Her gün bir skeç',fol:128400,city:'İstanbul'},
 's:reis':{handle:'pubg.reis',name:'Reis',e:'🎯',c:'#16141C',bio:'PUBG Mobile, Fatih Asya',fol:56200,city:'Ankara'},
 's:zeynep':{handle:'mutfakta.zeynep',name:'Zeynep',e:'👩‍🍳',c:'#E11D48',bio:'15 dakikalık tarifler',fol:301000,city:'İzmir'},
 's:ece':{handle:'valo.ece',name:'Ece',e:'👑',c:'#3B5BDB',bio:'Valorant klipleri',fol:42000,city:'İstanbul'},
 's:pati':{handle:'pati.dostlar',name:'Patiler',e:'🐱',c:'#0F9F66',bio:'Sokak hayvanları',fol:890000,city:'Bursa'},
 's:ritim':{handle:'dans.ritim',name:'Ritim',e:'🕺',c:'#7048E8',bio:'Koreografi',fol:240000,city:'Antalya'},
 's:ali':{handle:'gezgin.ali',name:'Ali',e:'🎒',c:'#0C8599',bio:'81 il turu',fol:77000,city:'Rize'},
 's:can':{handle:'mc.usta',name:'Can',e:'⛏️',c:'#2B8A3E',bio:'Minecraft yapıları',fol:18300,city:'Ankara'},
 's:hoca':{handle:'fizik.hoca',name:'Hoca',e:'🧪',c:'#3B5BDB',bio:'60 saniyede bilim',fol:156000,city:'Eskişehir'},
};
const SAMPLES=[
 {id:'s1',owner:'s:efe',cat:1,dur:12,tpl:'meme',top:'Annem: bilgisayardan kalk',bot:'Ben, kaydetmeden 3 saniye önce',e:'🫠',cap:'Her evde aynı senaryo. Sizde de oluyor mu? @pati.dostlar',sound:'orijinal ses · kahkaha.efe',L:48200,C:1240,V:612000,S:3100,addYours:'Annenin en çok söylediği cümle'},
 {id:'s2',owner:'s:reis',cat:2,game:111469,dur:16,tpl:'hud',title:'Son çember, 1v4',kills:['Reis <b>M416</b> → kartal_43','Reis <b>M416</b> → yağmur','Reis <b>AWM</b> → sniper.tr','Reis <b>bomba</b> → son_adam'],cap:'Takım düştü, ben düşmedim. Erangel son daire.',sound:'Epic Battle (telifsiz)',L:21900,C:830,V:240000,S:940,product:'p1'},
 {id:'s3',owner:'s:zeynep',cat:5,dur:15,tpl:'recipe',e:'🍝',steps:['Makarnayı haşla, suyundan 1 çay bardağı ayır','Tereyağında sarımsağı 1 dakika kavur','Krema, parmesan ve makarna suyunu karıştır'],cap:'3 malzemeli kremalı makarna. Ay sonu tarifi.',sound:'Lo-fi Kitchen',L:93100,C:3400,V:1300000,S:12800,playlist:'pl1'},
 {id:'s4',owner:'s:pati',cat:9,dur:10,tpl:'pet',e:'🐈',title:'Salatalığa karşı ikinci raunt',cap:'Bu sefer hazırlıklıydı.',sound:'orijinal ses · pati.dostlar',L:310000,C:8900,V:4200000,S:45000},
 {id:'s5',owner:'s:ece',cat:2,game:126459,dur:14,tpl:'hud',title:'Operator ile 4 leş',kills:['Ece <b>Operator</b> → jett_main','Ece <b>Operator</b> → reyna.tr','Ece <b>Sheriff</b> → sage_abi','Ece <b>Operator</b> → omen99'],cap:'Rakipler hâlâ nereden geldiğini arıyor.',sound:'Phonk Drift',L:15400,C:420,V:180000,S:610},
 {id:'s6',owner:'s:ritim',cat:4,dur:12,tpl:'dance',e:'🕺',title:'Yeni akım, 8 sayı',cap:'Yavaş versiyonu profilde.',sound:'Trend Remix 2026',L:58000,C:1900,V:890000,S:6200},
 {id:'s7',owner:'s:ali',cat:12,dur:14,tpl:'scenic',title:'Kaçkar, 05.42',cap:'Rize, Ayder yaylasında gün doğumu.',sound:'Kemençe, yöresel',L:34000,C:880,V:510000,S:5100},
 {id:'s8',owner:'s:efe',cat:1,dur:11,tpl:'meme',top:'Öğretmen: Bunu kim yaptı?',bot:'Bütün sınıf bana dönüyor',e:'🧍',cap:'Hep aynı kişi suçlanır.',sound:'orijinal ses · kahkaha.efe',L:67000,C:2100,V:980000,S:7800},
 {id:'s9',owner:'s:can',cat:2,game:121,dur:15,tpl:'hud',title:'Hayatta kalma, 47. gün',kills:['Can <b>elmas kazma</b> → creeper','Can <b>yay</b> → iskelet','Can <b>kılıç</b> → zombi'],cap:'Kale bitti. Sıradaki hedef ejderha.',sound:'C418 tarzı',L:8700,C:390,V:96000,S:230},
 {id:'s10',owner:'s:pati',cat:9,dur:9,tpl:'pet',e:'🐶',title:'Golden ilk kez kar görüyor',cap:'Mutluluk bu.',sound:'Happy Ukulele',L:410000,C:12000,V:5600000,S:61000},
 {id:'s11',owner:'s:hoca',cat:7,dur:14,tpl:'meme',top:'Ay neden hep aynı yüzünü gösterir?',bot:'Kütle çekim kilidi',e:'🌕',cap:'Ay, Dünya etrafında dönerken kendi ekseninde de aynı sürede döner.',sound:'orijinal ses · fizik.hoca',L:41000,C:1300,V:520000,S:9100,footnote:'Buna “eş zamanlı dönme” denir. Ay’ın yüzeyinin yaklaşık yüzde 59’u Dünya’dan görülebilir.'},
 {id:'s12',owner:'s:zeynep',cat:5,dur:15,tpl:'recipe',e:'🥐',steps:['Hazır yufkayı tereyağıyla kat kat sür','Üçgen kes, rulo yap','200 derecede 18 dakika pişir'],cap:'Hile yöntemiyle çıtır kruvasan. Dizinin 2. bölümü.',sound:'Lo-fi Kitchen',L:51000,C:1500,V:720000,S:9800,playlist:'pl1'},
];
const SAMPLE_COMMENTS={s1:[['s:ece','Kaydetmeden 3 saniye önce, çok gerçek'],['s:zeynep','Bizde de modem kapanıyor'],['s:ali','Efe yine döktürmüş']],s2:[['s:can','Son dairede nasıl o kadar sakin kaldın'],['s:efe','Hassasiyet ayarlarını paylaş reis']],s3:[['s:pati','Akşam denedim, efsane oldu'],['s:ritim','Krema yerine yoğurt olur mu?']]};
const SAMPLE_SHOP={'s:reis':[{id:'p1',name:'Oyuncu parmak eldiveni (2 çift)',price:89,e:'🧤',url:'https://www.trendyol.com'}],'s:zeynep':[{id:'p2',name:'Yapışmaz döküm tava 28 cm',price:649,e:'🍳',url:'https://www.trendyol.com'}]};
const SAMPLE_PLAYLISTS={'s:zeynep':[{id:'pl1',name:'Ay sonu tarifleri',vids:['s3','s12'],price:0}]};
const SAMPLE_STORIES={'s:efe':[{id:'st1',text:'Yeni skeç yarın 20.00’de',bg:'#E8590C',at:0}],'s:pati':[{id:'st2',text:'Bugün 3 kediyi sahiplendirdik',bg:'#0F9F66',at:0}],'s:ali':[{id:'st3',text:'Sıradaki durak: Mardin',bg:'#0C8599',at:0}]};
const HOUSE_ADS=[
 {id:'h1',brand:'MobilJeton',title:'PUBG Mobile UC %20 indirimli',cta:'İndirimi gör',cat:2,game:111469,tpl:'hud',sceneTitle:'Sezon pasını kap'},
 {id:'h2',brand:'TazeSepet',title:'İlk siparişe 150₺ indirim',cta:'Kodu al',cat:5,tpl:'recipe',e:'🛒'},
 {id:'h3',brand:'Kahkaha Sahnesi',title:'Cuma 21.00 stand-up gecesi',cta:'Bilet al',cat:1,tpl:'meme',top:'Cuma akşamı planın yok mu?',bot:'Artık var',e:'🎤'},
 {id:'h4',brand:'HızlıNet',title:'Oyuncu interneti, 1000 Mbps',cta:'Teklifi gör',cat:null,tpl:'dance',e:'📶',sceneTitle:'Ping 9 ms'},
];
