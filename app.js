const HOSTED_SHEET = '1YfY22x2dnI9T6Fi69pT3L91NAkmVQWdvL0IWbWhB-tM';

const HLRN_PUSH = {
  worker: 'https://hlrn-push.hunterwelborn32.workers.dev',
  publicKey: 'BGqE3R4fp3FmoakzhQtYU9PzWHiM7NkGbop8CSnC7nr921m-x47JafontNA7Eg5a95ROaOhek2TvNNDtifJdwxk'
};

const HLRN_ENDPOINTS = {
  leagueApi: 'https://script.google.com/macros/s/AKfycbwo4C9RyV-H-F4ekKFcgmrYVpyOUsh9dmFf2jVhJwvieCTKpKzAR_k6lNcppBuehj58/exec',
  announcements: 'https://hlrn-discord.hunterwelborn32.workers.dev/api/announcements'
};

const LIVE = {
  standingsSheet: '1yWa2-nHM4VnUXDS8EQwB0G2k0ockpAU55Xuj9MPccJo',
  newsroomSheet: '1_o7gV4CDMDDmm6XfqXBqlxJPuoK8FBV1Rcf3ugg0v8M',
  configSheet: '1dbootrGi_ppHA90xF0OXv5XW2oOGfMNOwlPbsYdMEvw'
};

const FULL_SCHEDULE = {
  Sunday: [
    {race:1,date:'2026-06-14',track:'Daytona',car:'Gen 7',laps:100,setup:'HLRN'},
    {race:2,date:'2026-06-28',track:'Iowa',car:'Trucks',laps:200,setup:'HLRN'},
    {race:3,date:'2026-07-12',track:'Chicagoland',car:'ARCA',laps:175,setup:'HLRN'},
    {race:4,date:'2026-07-19',track:'Echo Park',car:'Gen 6',laps:175,setup:'HLRN'},
    {race:5,date:'2026-08-09',track:'Charloette',car:'Gen 7',laps:175,setup:'HLRN'},
    {race:6,date:'2026-08-16',track:'Texas',car:'Trucks',laps:175,setup:'HLRN'},
    {race:7,date:'2026-08-23',track:'Auto Club',car:'ARCA',laps:125,setup:'HLRN'},
    {race:8,date:'2026-08-30',track:'Talladega',car:'Gen 6',laps:100,setup:'HLRN'},
    {race:9,date:'2026-09-13',track:'Homestead Miami',car:'Gen 7',laps:175,setup:'HLRN'},
    {race:10,date:'2026-09-20',track:'Michigan',car:'Trucks',laps:125,setup:'HLRN'},
    {race:11,date:'2026-09-27',track:'Indianapolis',car:'ARCA',laps:100,setup:'HLRN'},
    {race:12,date:'2026-10-04',track:'IRSS',car:'Gen 6',laps:100,setup:'HLRN'},
    {race:13,date:'2026-10-11',track:'Kansas',car:'Gen 7',laps:175,setup:'HLRN'},
    {race:14,date:'2026-10-18',track:'Las Vegas',car:'Trucks',laps:175,setup:'HLRN'},
    {race:15,date:'2026-10-25',track:'Daytona',car:'ARCA',laps:100,setup:'HLRN'},
    {race:16,date:'2026-11-01',track:'Talladega',car:'Gen 6',laps:100,setup:'HLRN'}
  ],
  Monday: [
    {race:1,date:'2026-08-17',track:'Daytona',car:'Gen 7',laps:100,setup:'Fixed'},
    {race:2,date:'2026-08-24',track:'Iowa',car:'Trucks',laps:150,setup:'Fixed'},
    {race:3,date:'2026-08-31',track:'Chicagoland',car:'ARCA',laps:125,setup:'Fixed'},
    {race:4,date:'2026-09-14',track:'Echo Park',car:'Gen 7',laps:125,setup:'Fixed'},
    {race:5,date:'2026-09-21',track:'Charloette',car:'Gen 7',laps:125,setup:'Fixed'},
    {race:6,date:'2026-09-28',track:'Texas',car:'Trucks',laps:125,setup:'Fixed'},
    {race:7,date:'2026-10-05',track:'Auto Club',car:'ARCA',laps:75,setup:'Fixed'},
    {race:8,date:'2026-10-12',track:'Talladega',car:'Trucks',laps:75,setup:'Fixed'},
    {race:9,date:'2026-10-19',track:'Homestead Miami',car:'Gen 7',laps:125,setup:'Fixed'},
    {race:10,date:'2026-10-26',track:'Michigan',car:'Trucks',laps:125,setup:'Fixed'},
    {race:11,date:'2026-11-02',track:'Indianapolis',car:'ARCA',laps:80,setup:'Fixed'},
    {race:12,date:'2026-11-09',track:'IRSS',car:'Trucks',laps:75,setup:'Fixed'},
    {race:13,date:'2026-11-16',track:'Kansas',car:'Gen 7',laps:125,setup:'Fixed'},
    {race:14,date:'2026-11-23',track:'Las Vegas',car:'Trucks',laps:125,setup:'Fixed'},
    {race:15,date:'2026-11-30',track:'Daytona',car:'ARCA',laps:100,setup:'Fixed'},
    {race:16,date:'2026-12-07',track:'Talladega',car:'Gen 7',laps:100,setup:'Fixed'}
  ]
};

function safeStoredArray(key){
  try{
    const v=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(v)?v:[];
  }catch(e){
    try{localStorage.removeItem(key);}catch(_){}
    return [];
  }
}

const state = {
  league: 'Sunday',
  homeLeague: 'Sunday',
  currentView: 'home',
  scheduleLeague: 'Sunday',
  resultsLeague: 'Sunday',
  selectedRaceKey: '',
  liveStatus: 'Connecting…',
  lastUpdated: null,
  nextRaces: {
    Sunday: {date:'SEP 13', iso:'2026-09-13T20:30:00-04:00', track:'Homestead Miami', series:'Sunday League', time:'8:30 PM EST', broadcast:''},
    Monday: {date:'SEP 14', iso:'2026-09-14T20:30:00-04:00', track:'Echo Park', series:'Monday League', time:'8:30 PM EST', broadcast:''}
  },
  standings: { Sunday: [], Monday: [] },
  schedule: [],
  results: { Sunday: [], Monday: [] },
  latestResults: [],
  announcements: [],
  drivers: [],
  hostedDrivers: [],
  hostedRaceRows: [],
  hostedLatest: null,
  hostedDataStatus: 'Connecting…',
  links: {},
  appVersion: '11.2.4',
  featureView: 'records',
  favorites: safeStoredArray('hlrn-favorites'),
  teamStandings: {Sunday: [], Monday: []},
  announcementsStatus: 'Connecting…',
  rulesQuery: '',
  pushStatus: 'CHECKING',
  driverProfileReturn: 'drivers',
  driverPage: 1
};

const fallback = {
  standings: {
    Sunday: [['Trevor Haley',387],['Nicholas Baumann',380],['Randy Showers',329],['Chris James',317],['Ethan Moreno',307]],
    Monday: [['Ethan Eckert',192],['Trevor Aswarnauth',148],['Bill Daniels',143],['Chris James',124],['Joshua McKinney2',123]]
  },
  schedule: [
    {league:'Sunday',date:'2026-09-13',time:'8:30 PM EST',track:'Homestead Miami',status:'UPCOMING'},
    {league:'Monday',date:'2026-09-14',time:'8:30 PM EST',track:'Echo Park',status:'UPCOMING'},
    {league:'Sunday',date:'2026-09-20',time:'8:30 PM EST',track:'Michigan',status:'UPCOMING'},
    {league:'Monday',date:'2026-09-21',time:'8:30 PM EST',track:'Charloette',status:'UPCOMING'}
  ],
  announcements: [{tag:'APP',title:'HLRN mobile app is live',text:'Live HLRN data is being connected to the app.',time:'New'}]
};

state.standings = {
  Sunday: fallback.standings.Sunday.map((x,i)=>({name:x[0],rank:i+1,points:x[1],races:0,wins:0,top5:0,top10:0,avgFinish:0,driverId:''})),
  Monday: fallback.standings.Monday.map((x,i)=>({name:x[0],rank:i+1,points:x[1],races:0,wins:0,top5:0,top10:0,avgFinish:0,driverId:''}))
};
state.schedule = JSON.parse(JSON.stringify(fallback.schedule));
state.announcements = JSON.parse(JSON.stringify(fallback.announcements));

const app = document.querySelector('#app');
const nav = [...document.querySelectorAll('.nav-item')];
let countdownTimer;

const HLRN_HISTORY={restoring:false,ready:false};

function hlrnRouteState(route,replace=false){
  if(HLRN_HISTORY.restoring) return;
  const payload={hlrn:true,route,scrollY:window.scrollY||0};
  try{
    sessionStorage.setItem('hlrn-last-route',JSON.stringify(route));
    sessionStorage.setItem('hlrn-last-scroll',String(window.scrollY||0));
  }catch(e){}
  try{
    if(replace) history.replaceState(payload,'',location.href);
    else history.pushState(payload,'',location.href);
    HLRN_HISTORY.ready=true;
  }catch(e){}
}

function hlrnBack(fallback='home'){
  try{
    if(history.state?.hlrn){
      history.back();
      return;
    }
  }catch(e){}
  setView(fallback,{history:false});
}

function restoreHLRNRoute(route){
  if(!route){ setView('home',{history:false}); return; }
  HLRN_HISTORY.restoring=true;
  try{
    if(route.kind==='feature'){
      openFeature(route.name,false);
    }else if(route.kind==='results'){
      state.resultsLeague=route.league||state.resultsLeague||'Sunday';
      state.selectedRaceKey=route.key||'';
      renderResults(false);
    }else if(route.kind==='driver'){
      openHLRNDriverProfile(route.name,false);
    }else{
      setView(route.view||'home',{history:false});
    }
  }finally{
    HLRN_HISTORY.restoring=false;
  }
}


function persistCurrentHLRNRoute(){
  try{
    const route=history.state?.hlrn ? history.state.route : null;
    if(route) sessionStorage.setItem('hlrn-last-route',JSON.stringify(route));
    sessionStorage.setItem('hlrn-last-scroll',String(window.scrollY||0));
  }catch(e){}
}

window.addEventListener('beforeunload',persistCurrentHLRNRoute);
window.addEventListener('pagehide',persistCurrentHLRNRoute);

window.addEventListener('popstate',e=>{
  const route=e.state?.hlrn?e.state.route:null;
  restoreHLRNRoute(route);
});

function setView(view,opts={}){
  clearInterval(countdownTimer);
  document.body.dataset.view=view;
  state.currentView=view;
  nav.forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  try{
    if(view==='home') renderHome();
    else if(view==='standings') renderStandings();
    else if(view==='schedule') renderSchedule();
    else if(view==='drivers') renderDrivers();
    else if(view==='socials' || view==='more') renderSocials();
    else renderHome();
    addPageMotion();
    if(opts.history!==false) hlrnRouteState({kind:'view',view});
  }catch(err){
    console.error('HLRN view failed:',view,err);
    app.innerHTML=`${networkBar()}<section class="coming-live"><span>⚠️</span><h3>${escapeHtml(view)} screen hit an error</h3><p>The app is still running. Tap retry while live data finishes loading.</p><button class="btn primary" onclick="setView('${String(view).replace(/'/g,'')}')">RETRY</button><button class="btn" onclick="hlrnBack('home')">HOME</button></section>`;
  }
  window.scrollTo({top:0,behavior:'auto'});
}


function hlrnAndroidTapFallback(){
  if(window.__hlrnAndroidTapFallback) return;
  window.__hlrnAndroidTapFallback=true;

  document.addEventListener('click',function(e){
    const navBtn=e.target.closest && e.target.closest('.nav-item[data-view]');
    if(navBtn){
      e.preventDefault();
      e.stopPropagation();
      setView(navBtn.dataset.view);
      return;
    }

    const action=e.target.closest && e.target.closest('[data-hlrn-action]');
    if(!action) return;
    const type=action.dataset.hlrnAction;
    const value=action.dataset.hlrnValue||'';
    if(type==='feature'){ e.preventDefault(); openFeature(value); }
    else if(type==='results'){ e.preventDefault(); state.resultsLeague=value||'Sunday'; renderResults(); }
    else if(type==='view'){ e.preventDefault(); setView(value||'home'); }
  },false);
}

window.hlrnNav=function(view){
  try{if(navigator.vibrate)navigator.vibrate(8);}catch(e){}
  setView(view);
};
hlrnAndroidTapFallback();

function addPageMotion(){
  attachHLRNEasterEgg();
  updateSoundButton();
  requestAnimationFrame(()=>{
    app.classList.remove('view-enter');
    void app.offsetWidth;
    app.classList.add('view-enter');

    // Stagger high-value cards so pages feel like a broadcast package loading in.
    const animated = app.querySelectorAll(
      '.quick-card,.result-card,.announcement-card,.feature-launchpad button,.podium-card,.standing-row,.schedule-card,.driver-list-card,.record-card,.track-card,.career-stat,.archive-race-chip,.profile-recent-row,.profile-track-row,.social-card,.notification-bulletin,.rulebook-section'
    );
    animated.forEach((el,i)=>{
      el.classList.remove('hlrn-reveal');
      el.style.setProperty('--hlrn-delay', `${Math.min(i,18)*28}ms`);
      requestAnimationFrame(()=>el.classList.add('hlrn-reveal'));
    });

    // Count-up animation for numeric stat tiles.
    app.querySelectorAll('.career-stat strong,.record-card b,.snapshot-card strong,.pulse-card strong').forEach(el=>{
      const raw=(el.textContent||'').trim();
      if(!/^\d+(\.\d+)?%?$/.test(raw)) return;
      const hasPct=raw.endsWith('%');
      const target=parseFloat(raw);
      if(!Number.isFinite(target)) return;
      const decimals=(raw.includes('.')?raw.split('.')[1].replace('%','').length:0);
      const duration=520;
      const start=performance.now();
      const tick=(now)=>{
        const p=Math.min(1,(now-start)/duration);
        const eased=1-Math.pow(1-p,3);
        const val=target*eased;
        el.textContent=(decimals?val.toFixed(decimals):Math.round(val).toString())+(hasPct?'%':'');
        if(p<1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    // Animated meters/progress bars.
    app.querySelectorAll('.progress-fill,.bar-fill,.meter-fill,.championship-fill').forEach(el=>{
      const width=el.style.width || getComputedStyle(el).width;
      if(!width) return;
      el.dataset.finalWidth=width;
      el.style.width='0';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ el.style.width=el.dataset.finalWidth; }));
    });

    setupScrollReveal();
  });
}

let hlrnRevealObserver=null;
function setupScrollReveal(){
  if(!('IntersectionObserver' in window)) return;
  if(hlrnRevealObserver) hlrnRevealObserver.disconnect();

  hlrnRevealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('hlrn-inview');
        hlrnRevealObserver.unobserve(entry.target);
      }
    });
  },{threshold:.12,rootMargin:'0px 0px -25px 0px'});

  app.querySelectorAll(
    '.section-head,.feature-page>*,.driver-profile-hero,.race-hero,.home-masthead,.team-command-card,.rules-command,.push-control'
  ).forEach((el,i)=>{
    el.classList.add('hlrn-scroll-reveal');
    el.style.setProperty('--scroll-delay',`${Math.min(i,10)*35}ms`);
    hlrnRevealObserver.observe(el);
  });
}

function racePulse(){
  document.documentElement.classList.remove('hlrn-race-pulse');
  void document.documentElement.offsetWidth;
  document.documentElement.classList.add('hlrn-race-pulse');
  setTimeout(()=>document.documentElement.classList.remove('hlrn-race-pulse'),900);
}function refreshNow(){
  const btn=document.querySelector('#refreshDataBtn');
  if(btn) btn.classList.add('spinning');
  Promise.allSettled([refreshLiveData(),refreshHostedData(false),refreshTeamStandings(),refreshDiscordAnnouncements()]).finally(()=>{
    setTimeout(()=>{btn?.classList.remove('spinning'); playHLRNSound('refresh');},500);
  });
}
function seasonWeek(league){
  const rows=FULL_SCHEDULE[league]||[];
  const now=new Date(); now.setHours(0,0,0,0);
  const next=rows.find(r=>new Date(`${r.date}T12:00:00`)>=now);
  return next?.race || rows.length;
}
function seasonCompleted(league){
  const rows=FULL_SCHEDULE[league]||[];
  const now=new Date(); now.setHours(0,0,0,0);
  return rows.filter(r=>new Date(`${r.date}T12:00:00`)<now).length;
}
function networkBar(){ return ''; }


function rerenderCurrent(){
  const y=window.scrollY||0;
  if(state.currentView==='results') renderResults(false);
  else if(state.currentView==='feature') renderFeature(state.featureView);
  else setView(state.currentView,{history:false});
  requestAnimationFrame(()=>window.scrollTo(0,y));
}


const HLRN_EXPERIENCE = {
  soundOn: localStorage.getItem('hlrnSound') !== 'off',
  audioReady: false,
  audioCtx: null,
  logoTapCount: 0,
  logoTapTimer: null
};

function hlrnAudioContext(){
  if(!HLRN_EXPERIENCE.audioCtx){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx) return null;
    HLRN_EXPERIENCE.audioCtx=new Ctx();
  }
  return HLRN_EXPERIENCE.audioCtx;
}

async function unlockHLRNAudio(){
  if(!HLRN_EXPERIENCE.soundOn) return;
  const ctx=hlrnAudioContext();
  if(!ctx) return;
  try{
    if(ctx.state==='suspended') await ctx.resume();
    HLRN_EXPERIENCE.audioReady=ctx.state==='running';
  }catch(e){}
}

function hlrnTone(freq=440,duration=.06,type='sine',volume=.035,delay=0){
  if(!HLRN_EXPERIENCE.soundOn) return;
  const ctx=hlrnAudioContext();
  if(!ctx || ctx.state!=='running') return;
  const t=ctx.currentTime+delay;
  const osc=ctx.createOscillator();
  const gain=ctx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,t);
  gain.gain.setValueAtTime(0.0001,t);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),t+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t+duration+.02);
}

function playHLRNSound(kind='tap'){
  if(!HLRN_EXPERIENCE.soundOn) return;
  if(kind==='tap'){
    hlrnTone(620,.045,'square',.018);
  }else if(kind==='select'){
    hlrnTone(520,.05,'sine',.024);
    hlrnTone(760,.06,'sine',.018,.035);
  }else if(kind==='refresh'){
    hlrnTone(410,.055,'triangle',.022);
    hlrnTone(620,.055,'triangle',.022,.055);
    hlrnTone(850,.08,'triangle',.022,.11);
  }else if(kind==='light'){
    hlrnTone(260,.075,'square',.027);
  }else if(kind==='go'){
    hlrnTone(620,.08,'sawtooth',.026);
    hlrnTone(930,.13,'sawtooth',.022,.045);
  }else if(kind==='winner'){
    hlrnTone(523,.08,'triangle',.025);
    hlrnTone(659,.08,'triangle',.025,.08);
    hlrnTone(784,.14,'triangle',.028,.16);
  }else if(kind==='easter'){
    [330,440,554,659,880].forEach((f,i)=>hlrnTone(f,.09,'square',.022,i*.065));
  }
}

function updateSoundButton(){
  const btn=document.getElementById('soundToggleBtn');
  if(!btn) return;
  btn.textContent=HLRN_EXPERIENCE.soundOn?'🔊':'🔇';
  btn.setAttribute('aria-label',HLRN_EXPERIENCE.soundOn?'Turn sound effects off':'Turn sound effects on');
  btn.classList.toggle('sound-off',!HLRN_EXPERIENCE.soundOn);
}

async function toggleHLRNSound(){
  HLRN_EXPERIENCE.soundOn=!HLRN_EXPERIENCE.soundOn;
  localStorage.setItem('hlrnSound',HLRN_EXPERIENCE.soundOn?'on':'off');
  updateSoundButton();
  if(HLRN_EXPERIENCE.soundOn){
    await unlockHLRNAudio();
    playHLRNSound('select');
  }
}

document.addEventListener('pointerdown',()=>{
  unlockHLRNAudio();
},{once:true,passive:true});

document.addEventListener('click',e=>{
  if(!HLRN_EXPERIENCE.soundOn) return;
  if(e.target.closest('#soundToggleBtn')) return;
  const interactive=e.target.closest('button,.nav-item,.driver-click,.h2h-list-name,.social-card,.archive-race-chip');
  if(interactive) playHLRNSound('tap');
},true);

function attachHLRNEasterEgg(){
  const logo=document.querySelector('.top-brand img');
  if(!logo || logo.dataset.easterReady) return;
  logo.dataset.easterReady='1';
  logo.style.cursor='pointer';
  logo.addEventListener('click',()=>{
    HLRN_EXPERIENCE.logoTapCount++;
    clearTimeout(HLRN_EXPERIENCE.logoTapTimer);
    HLRN_EXPERIENCE.logoTapTimer=setTimeout(()=>HLRN_EXPERIENCE.logoTapCount=0,1600);
    if(HLRN_EXPERIENCE.logoTapCount>=5){
      HLRN_EXPERIENCE.logoTapCount=0;
      triggerHLRNEasterEgg();
    }
  });
}

function triggerHLRNEasterEgg(){
  unlockHLRNAudio().then(()=>playHLRNSound('easter'));
  const egg=document.createElement('div');
  egg.className='hlrn-easter-egg';
  egg.innerHTML=`
    <div class="egg-checkers"></div>
    <div class="egg-smoke"></div>
    <div class="egg-copy"><small>SECRET MODE UNLOCKED</small><strong>FULL SEND</strong><span>HIGH LINE RACING NETWORK</span></div>
    <div class="egg-tire">◉</div>
  `;
  document.body.appendChild(egg);
  requestAnimationFrame(()=>egg.classList.add('active'));
  try{if(navigator.vibrate) navigator.vibrate([45,30,45,30,90]);}catch(e){}
  setTimeout(()=>egg.classList.add('exit'),2200);
  setTimeout(()=>egg.remove(),2900);
}

function showStartingLights(){
  if(sessionStorage.getItem('hlrnLightsShown')==='1') return;
  sessionStorage.setItem('hlrnLightsShown','1');

  const overlay=document.createElement('div');
  overlay.className='hlrn-start-overlay';
  overlay.innerHTML=`
    <div class="start-grid">
      <div class="start-brand">HLRN</div>
      <div class="start-sub">HIGH LINE RACING NETWORK</div>
      <div class="start-lights">
        ${[1,2,3,4,5].map(i=>`<span class="start-light" data-light="${i}"></span>`).join('')}
      </div>
      <div class="start-status">GET READY</div>
    </div>
  `;
  document.body.appendChild(overlay);

  [1,2,3,4,5].forEach((n,i)=>{
    setTimeout(()=>{
      overlay.querySelector(`[data-light="${n}"]`)?.classList.add('on');
      playHLRNSound('light');
      const status=overlay.querySelector('.start-status');
      if(status) status.textContent=`LIGHT ${n}`;
    },350+i*245);
  });

  setTimeout(()=>{
    overlay.classList.add('lights-out');
    const status=overlay.querySelector('.start-status');
    if(status) status.textContent='LIGHTS OUT';
    playHLRNSound('go');
  },1750);

  setTimeout(()=>overlay.classList.add('launch'),1980);
  setTimeout(()=>overlay.remove(),2550);
  setTimeout(()=>document.querySelectorAll('.hlrn-start-overlay').forEach(x=>x.remove()),4000);
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

function prettyName(name=''){
  if(!name.includes(',')) return name;
  const [last, first] = name.split(',').map(x=>x.trim());
  return `${first} ${last}`.trim();
}

function liveBadge(){
  const ok = state.liveStatus === 'LIVE';
  return `<div class="sync-badge ${ok?'live':''}"><i></i>${ok?'LIVE DATA':escapeHtml(state.liveStatus)}</div>`;
}

function countdownMarkup(){
  return `<div class="countdown" aria-label="Countdown to race">
    <div><strong id="cdDays">--</strong><small>DAYS</small></div><span>:</span>
    <div><strong id="cdHours">--</strong><small>HRS</small></div><span>:</span>
    <div><strong id="cdMins">--</strong><small>MIN</small></div><span>:</span>
    <div><strong id="cdSecs">--</strong><small>SEC</small></div>
  </div>`;
}

function startCountdown(iso){
  clearInterval(countdownTimer);
  const target = new Date(iso).getTime();
  const update = () => {
    const diff = target - Date.now();
    const els = ['cdDays','cdHours','cdMins','cdSecs'].map(id=>document.getElementById(id));
    if(els.some(x=>!x)) return;
    if(!Number.isFinite(target) || diff <= 0){
      els.forEach(x=>x.textContent='00');
      const label=document.querySelector('.countdown-label');
      if(label) label.textContent='RACE TIME';
      clearInterval(countdownTimer); return;
    }
    const vals=[Math.floor(diff/86400000),Math.floor((diff%86400000)/3600000),Math.floor((diff%3600000)/60000),Math.floor((diff%60000)/1000)];
    vals.forEach((v,i)=>els[i].textContent=String(v).padStart(2,'0'));
  };
  update(); countdownTimer=setInterval(update,1000);
}

function renderHome(){
  state.currentView='home';
  const race = state.nextRaces[state.homeLeague];
  const scheduleRace = FULL_SCHEDULE[state.homeLeague].find(r=>r.date===race.iso?.slice(0,10)) || FULL_SCHEDULE[state.homeLeague].find(r=>r.track===race.track) || {};
  const sundayLeader = state.standings.Sunday?.[0];
  const mondayLeader = state.standings.Monday?.[0];
  const sundayDone=seasonCompleted('Sunday');
  const mondayDone=seasonCompleted('Monday');
  const hostedRaces=hostedRaceGroups().length;
  const totalHostedDrivers=state.hostedDrivers.length;
  const announcementHtml = state.announcements.slice(0,4).map(a=>`
    <article class="announcement-card"><div class="announcement-top"><span class="mini-tag">${escapeHtml(a.tag||'NEWS')}</span><time>${escapeHtml(a.time||'')}</time></div>
    <h4>${escapeHtml(a.title)}</h4><p>${escapeHtml(a.text)}</p></article>`).join('');
  const leagueResultsHtml = state.latestResults.map((r)=>{
    const league = String(r.league||'').toLowerCase();
    const isSunday = league === 'sunday';
    const badge = isSunday ? 'S' : 'M';
    const cardClass = isSunday ? 'sunday-home-result' : 'monday-home-result';
    const badgeClass = isSunday ? 'sunday-result-badge' : 'monday-result-badge';
    return `
    <button class="result-card ${cardClass}" onclick="renderResults()"><div class="result-position ${badgeClass}">${badge}</div><div><small>${escapeHtml(r.league.toUpperCase())} LEAGUE</small><strong>${escapeHtml(r.track)}</strong><span>Winner: ${escapeHtml(r.winner)}</span></div><b>›</b></button>`;
  }).join('');
  const hostedResultsHtml = state.hostedLatest ? `
    <button class="result-card hosted-home-result" onclick="openHostedDriverProfile(decodeURIComponent('${encodeURIComponent(String(state.hostedLatest.winner||'')).replace(/'/g,'%27')}'))"><div class="result-position hosted-result-badge">H</div><div><small>HOSTED • LAST RACE</small><strong>${escapeHtml(state.hostedLatest.track||'HLRN Hosted Race')}</strong><span>Winner: ${escapeHtml(state.hostedLatest.winner||'')}</span>${state.hostedLatest.date?`<em>${escapeHtml(state.hostedLatest.date)}</em>`:''}</div><b>›</b></button>` : '';
  const resultsHtml = (leagueResultsHtml || hostedResultsHtml) ? leagueResultsHtml + hostedResultsHtml :
    `<div class="empty">Race results will appear here when live data finishes loading.</div>`;

  app.innerHTML = `
    ${networkBar()}
    <div class="home-league-switch" role="tablist"><button class="${state.homeLeague==='Sunday'?'active':''}" onclick="switchHomeLeague('Sunday')">SUNDAY</button><button class="${state.homeLeague==='Monday'?'active':''}" onclick="switchHomeLeague('Monday')">MONDAY</button></div>
    <section class="race-hero"><div class="race-hero-top"><div><span class="overline">NEXT HLRN EVENT • WEEK ${scheduleRace.race||"--"}</span><h2>${escapeHtml(race.track)}</h2></div><div class="track-badge">🏁</div></div>
      <p>${escapeHtml(race.series)} <span>•</span> ${escapeHtml(race.date)} <span>•</span> ${escapeHtml(race.time)}</p>
      <div class="hero-race-meta"><span>${escapeHtml(scheduleRace.car||'Race Car')}</span><span>${scheduleRace.laps?`${scheduleRace.laps} LAPS`:'LIVE EVENT'}</span><span>${escapeHtml(scheduleRace.setup||'HLRN')}</span></div>
      <div class="countdown-label">GREEN FLAG COUNTDOWN</div>${countdownMarkup()}
      <div class="hero-actions"><button class="btn btn-light" onclick="setView('schedule')">Full Schedule</button><button class="btn btn-glass" onclick="openBroadcast('${state.homeLeague}')">📺 Watch Broadcast</button></div>
    </section>
    <div class="section-head"><h3>Race Central</h3><span>Quick Access</span></div>
    <section class="grid"><button class="quick-card" onclick="setView('standings')"><span class="ico">🏆</span><strong>Standings</strong><small>Live Sunday + Monday</small></button><button class="quick-card" onclick="setView('schedule')"><span class="ico">🗓️</span><strong>Schedule</strong><small>Upcoming races</small></button><button class="quick-card" onclick="setView('drivers')"><span class="ico">🏎️</span><strong>Drivers</strong><small>Live roster + stats</small></button><button class="quick-card" onclick="renderResults()"><span class="ico">📊</span><strong>Results</strong><small>Latest finishes</small></button></section>

    <div class="section-head"><h3>HLRN Performance Center</h3><span>Explore the network</span></div>
    <section class="feature-launchpad">
      <button onclick="openFeature('records')"><span>🏆</span><strong>Records</strong><small>Wins • starts • laps led</small></button>
      <button onclick="openFeature('headtohead')"><span>⚔️</span><strong>Head-to-Head</strong><small>Compare any two drivers</small></button>
      <button onclick="openFeature('racestats')"><span>🧠</span><strong>Race Intelligence</strong><small>Full Sunday + Monday analytics</small></button>
      <button onclick="openFeature('power')"><span>⚡</span><strong>Power Rankings</strong><small>Recent hosted performance</small></button>
      <button onclick="openFeature('tracks')"><span>🛣️</span><strong>Track Hub</strong><small>History by track</small></button>
      <button onclick="openFeature('teams')"><span>👥</span><strong>Teams</strong><small>Team championship center</small></button>
      <button onclick="openFeature('spotlight')"><span>🔦</span><strong>Driver Spotlight</strong><small>Featured HLRN driver</small></button>
      <button onclick="openFeature('recap')"><span>📰</span><strong>Race Recap</strong><small>Sunday • Monday • Hosted</small></button>
      <button onclick="openFeature('incidents')"><span>🚨</span><strong>Incident Watch</strong><small>Hosted incident leaderboard</small></button>
      <button onclick="openFeature('achievements')"><span>🎖️</span><strong>Achievements</strong><small>Career milestone board</small></button>
      <button onclick="openFeature('favorites')"><span>★</span><strong>Favorites</strong><small>Your saved drivers</small></button>
      <button onclick="openFeature('sharecards')"><span>📣</span><strong>Share Cards</strong><small>Screenshot-ready stats</small></button>
      <button onclick="openFeature('notifications')"><span>🔔</span><strong>Notifications</strong><small>HLRN news & race updates</small></button>
      <button onclick="openFeature('rules')"><span>📕</span><strong>Official Rules</strong><small>Full searchable HLRN rulebook</small></button>
      <button onclick="openFeature('admin')"><span>🎛️</span><strong>Race Control</strong><small>Rules • incidents • operations</small></button>
    </section>

    <div class="section-head"><h3>Season Snapshot</h3><span>Live HLRN numbers</span></div>
    <section class="season-snapshot">
      <article class="snapshot-card sunday-snap"><small>SUNDAY</small><strong>${sundayDone}<em>/16</em></strong><span>races complete</span><i style="--p:${(sundayDone/16)*100}%"></i></article>
      <article class="snapshot-card monday-snap"><small>MONDAY</small><strong>${mondayDone}<em>/16</em></strong><span>races complete</span><i style="--p:${(mondayDone/16)*100}%"></i></article>
      <article class="snapshot-card hosted-snap"><small>HOSTED</small><strong>${hostedRaces}</strong><span>races archived</span><i style="--p:${Math.min(100,hostedRaces*3)}%"></i></article>
      <article class="snapshot-card driver-snap"><small>DRIVERS</small><strong>${totalHostedDrivers||'--'}</strong><span>hosted profiles</span><i style="--p:${Math.min(100,totalHostedDrivers)}%"></i></article>
    </section>
    <div class="section-head"><h3>Chase for a Championship</h3><span>Sunday + Monday leaders</span></div>
    <section class="pulse-grid">
      <button class="pulse-card league-pulse sunday" onclick="state.league='Sunday'; setView('standings')"><small>SUNDAY POINTS LEADER</small><strong>${escapeHtml(sundayLeader?.name||'Loading…')}</strong><span>${sundayLeader?`${sundayLeader.points} PTS • ${sundayLeader.wins} WINS`:'Live standings'}</span></button>
      <button class="pulse-card league-pulse monday" onclick="state.league='Monday'; setView('standings')"><small>MONDAY POINTS LEADER</small><strong>${escapeHtml(mondayLeader?.name||'Loading…')}</strong><span>${mondayLeader?`${mondayLeader.points} PTS • ${mondayLeader.wins} WINS`:'Live standings'}</span></button>
    </section>
    <div class="section-head"><h3>Latest Results</h3><button class="text-link" onclick="renderResults()">Open Archive</button></div><section class="results-stack">${resultsHtml}</section>
    <div class="section-head"><h3>HLRN Updates</h3><span>Newsroom</span></div><section class="announcement-grid">${announcementHtml}</section>
    <section class="broadcast-banner"><div><span class="overline">LIVE COVERAGE</span><h3>HLRN Broadcast Center</h3><p>Sunday and Monday race broadcasts in one spot.</p></div><button onclick="openBroadcast('${state.homeLeague}')">Open →</button></section>`;
  startCountdown(race.iso);
}
function switchHomeLeague(name){ state.homeLeague=name; renderHome(); }

function openBroadcast(league){
  const url = state.links[`${league} Broadcast`];
  if(url) openSocial(url);
  else alert(`${league} broadcast link is not filled in yet. Add it to the HLRN App Live Config sheet.`);
}

function renderStandings(){
  state.currentView='standings';
  const data=state.standings[state.league]||[];
  const rows = data.map((x)=>`<tr class="standing-row rank-${x.rank}"><td class="rank"><span>${x.rank}</span></td><td>${driverLink(x.name)}<small class="table-sub">${x.wins} W • ${x.top5} T5 • ${x.top10} T10</small></td><td><strong class="points-value">${x.points}</strong></td></tr>`).join('');
  const top=data.slice(0,3);
  const leader=data[0], second=data[1];
  const gap=leader&&second?Math.max(0,(leader.points||0)-(second.points||0)):0;
  const complete=seasonCompleted(state.league);
  const podium=top.length?`<section class="podium-grid ${state.league.toLowerCase()}">${top.map((x,i)=>`<article class="podium-card place-${i+1}"><div class="podium-place">${i===0?'1ST':i===1?'2ND':'3RD'}</div><div class="podium-avatar">${escapeHtml(x.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase())}</div>${driverLink(x.name,'','podium-driver-link')}<span>${x.points} PTS</span><small>${x.wins} wins • ${x.top5} top 5s</small></article>`).join('')}</section>`:'';
  app.innerHTML=`${networkBar()}<div class="page-title-row premium-page-head"><div><span class="page-kicker">CHAMPIONSHIP CENTER</span><h2 class="page-title">Standings</h2><p class="page-sub">The chase for the HLRN title</p></div>${liveBadge()}</div>
    <div class="tabs premium-tabs"><button class="tab ${state.league==='Sunday'?'active league-sunday':''}" onclick="switchLeague('Sunday')">Sunday</button><button class="tab ${state.league==='Monday'?'active league-monday':''}" onclick="switchLeague('Monday')">Monday</button></div>
    ${podium}
    <section class="championship-meter ${state.league.toLowerCase()}">
      <div><small>CHAMPIONSHIP GAP</small><strong>${gap}<em> PTS</em></strong><span>${leader&&second?`${escapeHtml(leader.name)} over ${escapeHtml(second.name)}`:'Waiting for live standings'}</span></div>
      <div class="champ-meter-right"><small>SEASON</small><strong>${complete}/16</strong><span>${Math.round((complete/16)*100)}% complete</span></div>
      <i style="--p:${(complete/16)*100}%"></i>
    </section>
    <div class="section-head compact-head"><h3>Full Standings</h3><span>${data.length} drivers</span></div>
    <section class="card standings-card"><table class="table"><thead><tr><th>#</th><th>Driver</th><th>Pts</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Loading standings…</td></tr>'}</tbody></table></section>`;
}
function switchLeague(name){state.league=name;renderStandings();}

function scheduleStatus(date,league){
  const today=new Date(); today.setHours(0,0,0,0);
  const d=new Date(`${date}T12:00:00`); d.setHours(0,0,0,0);
  if(d<today) return 'COMPLETED';
  const all=FULL_SCHEDULE[league].filter(x=>new Date(`${x.date}T12:00:00`)>=today).sort((a,b)=>a.date.localeCompare(b.date));
  return all.length && all[0].date===date ? 'NEXT' : 'UPCOMING';
}
function scheduleDateLabel(date){
  const d=new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}).toUpperCase();
}
function renderSchedule(){
  state.currentView='schedule';
  const tab=state.scheduleLeague||'Sunday';
  if(tab==='Hosted') ensureHostedData();
  const done=tab==='Hosted'?hostedRaceGroups().length:seasonCompleted(tab);
  const nextWeek=tab==='Hosted'?'OPEN':seasonWeek(tab);
  let content='';
  if(tab==='Hosted'){
    content=`<section class="hosted-schedule-hero"><span class="schedule-kicker">HLRN HOSTED RACING</span><h3>Race Your Way</h3><p>New hosted races can be posted daily — any track, any car, fixed setups, and race times throughout the week.</p><div class="hosted-info-grid"><div><span>🏁</span><strong>NASCAR CUP</strong><small>Gen 7 / Next Gen</small></div><div><span>🏎️</span><strong>CLASSIC NASCAR</strong><small>87s / 2000s</small></div><div><span>🚚</span><strong>TRUCKS</strong><small>Truck Series</small></div><div><span>⚙️</span><strong>FIXED SETUPS</strong><small>Everyone uses the same setup</small></div><div><span>📅</span><strong>NEW RACES</strong><small>Posted daily</small></div><div><span>⏱️</span><strong>RACE ANYTIME</strong><small>All week</small></div></div><div class="hosted-tagline">RACE YOUR WAY • ANY TRACK • ANY CAR</div></section>`;
  } else {
    const rows=FULL_SCHEDULE[tab];
    content=`<section class="schedule-list ${tab.toLowerCase()}">${rows.map(r=>{const st=scheduleStatus(r.date,tab);return `<article class="schedule-card ${st.toLowerCase()}"><div class="schedule-race-no"><small>RACE</small><strong>${r.race}</strong>${st==='NEXT'?'<em>NEXT</em>':''}</div><div class="schedule-main"><div class="schedule-date">${scheduleDateLabel(r.date)}</div><h3>${escapeHtml(r.track)}</h3><div class="schedule-meta"><span>${escapeHtml(r.car)}</span><span>${r.laps} LAPS</span><span>${escapeHtml(r.setup)}</span></div></div><div class="schedule-state">${st}</div></article>`}).join('')}</section>`;
  }
  app.innerHTML=`${networkBar()}<div class="page-title-row premium-page-head"><div><span class="page-kicker">RACE CALENDAR</span><h2 class="page-title">Schedule</h2><p class="page-sub">Every HLRN event in one place</p></div>${liveBadge()}</div>
    <section class="schedule-dashboard ${String(tab).toLowerCase()}"><div><small>${tab==='Hosted'?'HOSTED ARCHIVE':'CURRENT WEEK'}</small><strong>${tab==='Hosted'?done:`WEEK ${nextWeek}`}</strong></div><div><small>${tab==='Hosted'?'DRIVER PROFILES':'RACES COMPLETE'}</small><strong>${tab==='Hosted'?state.hostedDrivers.length:`${done}/16`}</strong></div><span>${tab==='Hosted'?'New races can be posted any day':`${Math.round((done/16)*100)}% of season complete`}</span></section>
    <div class="tabs schedule-tabs premium-tabs"><button class="tab ${tab==='Sunday'?'active sunday-tab':''}" onclick="switchScheduleLeague('Sunday')">Sunday</button><button class="tab ${tab==='Monday'?'active monday-tab':''}" onclick="switchScheduleLeague('Monday')">Monday</button><button class="tab ${tab==='Hosted'?'active hosted-tab':''}" onclick="switchScheduleLeague('Hosted')">Hosted</button></div>${content}`;
}
function switchScheduleLeague(name){state.scheduleLeague=name;renderSchedule();}

let hostedLazyLoading=false;
function ensureHostedData(){
  if(state.hostedDataStatus==='LIVE' || hostedLazyLoading) return;
  hostedLazyLoading=true;
  refreshHostedData(false).then(()=>{
    HLRN_AUTO_REFRESH.lastHosted=Date.now();
  }).catch(()=>{}).finally(()=>{
    hostedLazyLoading=false;
    // Never rerender the current screen automatically while the user is reading/scrolling.
    // Fresh Hosted data will be used the next time the screen is opened or explicitly changed.
  });
}

function driverDirectoryRowsHtml(list){
  return list.map(d=>{
    const initialsText=d.name.split(' ').filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase();
    const encoded=encodeURIComponent(d.name).replace(/'/g,'%27');
    return `<button class="driver-row driver-click" data-search-name="${escapeHtml(d.name.toLowerCase())}" onclick="openHLRNDriverProfile(decodeURIComponent('${encoded}'))">
      <div class="avatar">${escapeHtml(initialsText)}</div>
      <div class="driver-meta">
        <strong>${escapeHtml(d.name)}</strong>
        <small>${escapeHtml(d.leagues||'HLRN')} • ${d.races} starts • ${d.wins} wins • ${d.top5} T5 • ${d.top10} T10</small>
      </div>
      <div class="driver-chevron">›</div>
    </button>`;
  }).join('');
}

function updateDriverDirectoryPage(page=1,query=''){
  const source=window.HLRN_DRIVER_DIRECTORY||[];
  const q=String(query||'').trim().toLowerCase();
  const filtered=q?source.filter(d=>d.name.toLowerCase().includes(q)):source;
  const perPage=20;
  const totalPages=Math.max(1,Math.ceil(filtered.length/perPage));
  const safePage=Math.min(Math.max(1,Number(page)||1),totalPages);
  state.driverPage=safePage;

  const start=(safePage-1)*perPage;
  const pageRows=filtered.slice(start,start+perPage);

  const list=document.querySelector('.driver-list-card');
  if(list){
    list.innerHTML=pageRows.length
      ? driverDirectoryRowsHtml(pageRows)
      : `<div class="empty">${q?`No drivers match "${escapeHtml(query)}".`:'No drivers loaded.'}</div>`;
  }

  const pager=document.querySelector('.driver-pagination');
  if(pager){
    const pageButtons=Array.from({length:totalPages},(_,i)=>i+1)
      .map(n=>`<button type="button" class="${n===safePage?'active':''}" onclick="updateDriverDirectoryPage(${n},document.querySelector('#driverSearch')?.value||'')">${n}</button>`)
      .join('');

    pager.innerHTML=filtered.length?`
      <button type="button" class="driver-page-arrow" ${safePage===1?'disabled':''} onclick="updateDriverDirectoryPage(${safePage-1},document.querySelector('#driverSearch')?.value||'')">‹</button>
      <div class="driver-page-numbers">${pageButtons}</div>
      <button type="button" class="driver-page-arrow" ${safePage===totalPages?'disabled':''} onclick="updateDriverDirectoryPage(${safePage+1},document.querySelector('#driverSearch')?.value||'')">›</button>
      <span class="driver-page-count">${filtered.length} drivers • Page ${safePage} of ${totalPages}</span>
    `:'';
  }
}

function renderDrivers(filter=''){
  state.currentView='drivers';
  ensureHostedData();
  const f=filter.trim().toLowerCase();

  const names=new Set();
  (state.drivers||[]).forEach(d=>{if(d?.name)names.add(prettyName(String(d.name).trim()));});
  (state.hostedDrivers||[]).forEach(d=>{if(d?.name)names.add(prettyName(String(d.name).trim()));});
  ['Sunday','Monday'].forEach(league=>(state.standings[league]||[]).forEach(d=>{if(d?.name)names.add(prettyName(String(d.name).trim()));}));

  const source=[...names].map(name=>{
    const rows=driverProfileRows(name);
    const stats=profileStats(rows);
    const leagues=[];
    if(rows.some(r=>r.source==='Sunday'))leagues.push('Sunday');
    if(rows.some(r=>r.source==='Monday'))leagues.push('Monday');
    if(rows.some(r=>r.source==='Hosted'))leagues.push('Hosted');

    const hosted=(state.hostedDrivers||[]).find(d=>String(d.name||'').toLowerCase()===name.toLowerCase());
    const standingS=(state.standings.Sunday||[]).find(d=>String(d.name||'').toLowerCase()===name.toLowerCase());
    const standingM=(state.standings.Monday||[]).find(d=>String(d.name||'').toLowerCase()===name.toLowerCase());

    return {
      name,
      races:stats.starts || Number(hosted?.races||0) || Number(standingS?.races||0)+Number(standingM?.races||0),
      wins:stats.wins || Number(hosted?.wins||0) || Number(standingS?.wins||0)+Number(standingM?.wins||0),
      top5:stats.top5 || Number(hosted?.top5||0) || Number(standingS?.top5||0)+Number(standingM?.top5||0),
      top10:stats.top10 || Number(hosted?.top10||0) || Number(standingS?.top10||0)+Number(standingM?.top10||0),
      leagues:leagues.length?leagues.join(' • '):((standingS?'Sunday ':'')+(standingM?'Monday ':'')+(hosted?'Hosted':'')).trim()
    };
  }).filter(d=>d.name).sort((a,b)=>a.name.localeCompare(b.name));

  window.HLRN_DRIVER_DIRECTORY=source;

  const mostWins=[...source].sort((a,b)=>(b.wins||0)-(a.wins||0))[0];
  const mostStarts=[...source].sort((a,b)=>(b.races||0)-(a.races||0))[0];
  const live=source.length>0;

  app.innerHTML=`${networkBar()}
    <div class="page-title-row premium-page-head">
      <div><span class="page-kicker hosted-kicker">HLRN DRIVER DATABASE</span><h2 class="page-title">Drivers</h2><p class="page-sub">Sunday • Monday • Hosted career profiles</p></div>
      <div class="sync-badge ${live?'live':''}"><i></i>${live?'LIVE':'LOADING'}</div>
    </div>
    <section class="driver-database-banner">
      <div><small>DRIVER DATABASE</small><strong>${source.length}</strong><span>career profiles</span></div>
      <div><small>RACE RECORDS</small><strong>${(state.hostedRaceRows||[]).length+(state.results.Sunday||[]).length+(state.results.Monday||[]).length}</strong><span>loaded starts</span></div>
    </section>
    <section class="driver-leaderboard-mini">
      <div><small>MOST WINS</small>${mostWins?driverLink(mostWins.name):'<strong>--</strong>'}<span>${mostWins?.wins||0} wins</span></div>
      <div><small>MOST STARTS</small>${mostStarts?driverLink(mostStarts.name):'<strong>--</strong>'}<span>${mostStarts?.races||0} starts</span></div>
    </section>
    <div class="search-wrap"><span>⌕</span><input class="search" id="driverSearch" placeholder="Search every HLRN driver..." value="${escapeHtml(filter)}" /></div>
    <section class="card driver-list-card"></section>
    <nav class="driver-pagination" aria-label="Driver pages"></nav>`;

  updateDriverDirectoryPage(filter?1:(state.driverPage||1),filter);

  const input=document.querySelector('#driverSearch');
  if(input){
    input.addEventListener('input',e=>{
      state.driverPage=1;
      updateDriverDirectoryPage(1,e.target.value);
    });
    if(filter){
      input.focus();
      input.setSelectionRange(filter.length,filter.length);
    }
  }
}

function driverLink(name,label='',cls=''){
  const raw=prettyName(String(name||'').trim());
  const safe=escapeHtml(raw);
  const encoded=encodeURIComponent(raw).replace(/'/g,'%27');
  const text=escapeHtml(label||raw||'Unknown Driver');
  return `<button type="button" class="hlrn-driver-link ${cls}" onclick="event.stopPropagation();openHLRNDriverProfile(decodeURIComponent('${encoded}'))">${text}</button>`;
}

function leagueRowsForDriver(league,name){
  return (state.results[league]||[])
    .filter(r=>String(r.driver||'').trim().toLowerCase()===String(name||'').trim().toLowerCase())
    .map(r=>({
      source:league,
      raceNo:num(r.raceNo),
      date:String(r.date||''),
      track:String(r.track||''),
      start:num(r.start),
      finish:num(r.finish),
      lapsLed:num(r.lapsLed),
      incidents:num(r.incidents),
      points:num(r.points),
      carNumber:'',
      team:''
    }));
}

function hostedRowsForDriverCard(name){
  const target=prettyName(String(name||'').trim()).toLowerCase();
  return (state.hostedRaceRows||[])
    .filter(r=>prettyName(String(r.Driver||'').trim()).toLowerCase()===target)
    .map(r=>({
      source:'Hosted',
      raceNo:0,
      date:String(r['Race Date']||''),
      track:String(r.Track||''),
      start:num(r['Start Position']),
      finish:num(r['Finish Position']),
      lapsLed:num(r['Laps Led']),
      incidents:num(r.Incidents),
      points:num(r.Points),
      carNumber:String(r['Car #']||r['Car Number']||r.Number||''),
      team:String(r.Team||r.team||r.Organization||r.Club||'')
    }));
}

function driverProfileRows(name){
  return [
    ...leagueRowsForDriver('Sunday',name),
    ...leagueRowsForDriver('Monday',name),
    ...hostedRowsForDriverCard(name)
  ].filter(r=>r.finish>0).sort((a,b)=>{
    const da=Date.parse(a.date||0), db=Date.parse(b.date||0);
    if(Number.isFinite(da)&&Number.isFinite(db)&&da!==db)return da-db;
    if(a.source===b.source)return a.raceNo-b.raceNo;
    return 0;
  });
}

function profileStats(rows){
  const starts=rows.length;
  const wins=rows.filter(r=>r.finish===1).length;
  const top5=rows.filter(r=>r.finish<=5).length;
  const top10=rows.filter(r=>r.finish<=10).length;
  const poles=rows.filter(r=>r.start===1).length;
  const lapsLed=rows.reduce((a,r)=>a+r.lapsLed,0);
  const incidents=rows.reduce((a,r)=>a+r.incidents,0);
  const avgStart=starts?rows.reduce((a,r)=>a+(r.start||0),0)/Math.max(1,rows.filter(r=>r.start>0).length):0;
  const avgFinish=starts?rows.reduce((a,r)=>a+r.finish,0)/starts:0;
  const gainRows=rows.filter(r=>r.start>0&&r.finish>0);
  const avgGain=gainRows.length?gainRows.reduce((a,r)=>a+(r.start-r.finish),0)/gainRows.length:0;
  return {starts,wins,top5,top10,poles,lapsLed,incidents,avgStart,avgFinish,avgGain,
    winRate:starts?wins/starts*100:0,top5Rate:starts?top5/starts*100:0,incPerRace:starts?incidents/starts:0};
}

function trackProfile(rows){
  const m=new Map();
  rows.forEach(r=>{
    const track=String(r.track||'').trim(); if(!track)return;
    if(!m.has(track))m.set(track,{track,starts:0,wins:0,top5:0,finish:0,lapsLed:0,incidents:0});
    const t=m.get(track); t.starts++; t.finish+=r.finish; t.lapsLed+=r.lapsLed; t.incidents+=r.incidents;
    if(r.finish===1)t.wins++; if(r.finish<=5)t.top5++;
  });
  return [...m.values()].map(t=>({...t,avgFinish:t.finish/t.starts}))
    .sort((a,b)=>a.avgFinish-b.avgFinish||b.starts-a.starts);
}

function driverIntelligenceSummary(rows,name){
  if(!rows.length)return 'No completed race history is loaded yet.';
  const last5=rows.slice(-5);
  let winStreak=0,top5Streak=0;
  for(let i=rows.length-1;i>=0;i--){if(rows[i].finish===1)winStreak++;else break;}
  for(let i=rows.length-1;i>=0;i--){if(rows[i].finish<=5)top5Streak++;else break;}
  const wins5=last5.filter(r=>r.finish===1).length;
  const top55=last5.filter(r=>r.finish<=5).length;
  const avg5=last5.reduce((a,r)=>a+r.finish,0)/last5.length;
  if(winStreak>=2)return `${name} has won ${winStreak} races in a row and is one of the hottest drivers in HLRN.`;
  if(wins5>=3)return `${name} has won ${wins5} of the last ${last5.length} races with a ${avg5.toFixed(1)} average finish over that stretch.`;
  if(wins5===2)return `${name} has 2 wins in the last ${last5.length} races and is carrying major winning momentum.`;
  if(top5Streak>=4)return `${name} has finished Top 5 in ${top5Streak} straight races.`;
  if(top55>=4)return `${name} has ${top55} Top-5 finishes in the last ${last5.length} races.`;
  return `${name}'s last ${last5.length} finishes: ${last5.map(r=>'P'+r.finish).join(' • ')}. Recent average finish: ${avg5.toFixed(1)}.`;
}

function openHLRNDriverProfile(name,addHistory=true){
  try{name=decodeURIComponent(String(name||''));}catch(e){name=String(name||'');}
  name=prettyName(String(name||'').trim());
  const rows=driverProfileRows(name);
  if(!rows.length){
    // If only Hosted summary is loaded, fall back to the legacy Hosted profile.
    const hosted=(state.hostedDrivers||[]).find(d=>String(d.name||'').toLowerCase()===name.toLowerCase());
    if(hosted){ openHostedDriverProfile(name); return; }
    app.innerHTML=`${networkBar()}<button class="profile-back" onclick="hlrnBack('drivers')">← Drivers</button>
      <section class="coming-live"><span>👤</span><h3>Driver data is still loading</h3><p>We found ${escapeHtml(name)}, but the race history is still syncing. HLRN will update this profile automatically.</p><div class="auto-sync-note"><i></i>AUTO SYNC ACTIVE</div></section>`;
    return;
  }

  clearInterval(countdownTimer);
  state.currentView='driver-profile';
  nav.forEach(n=>n.classList.remove('active'));
  if(addHistory) hlrnRouteState({kind:'driver',name});

  const stats=profileStats(rows);
  const sunday=profileStats(rows.filter(r=>r.source==='Sunday'));
  const monday=profileStats(rows.filter(r=>r.source==='Monday'));
  const hosted=profileStats(rows.filter(r=>r.source==='Hosted'));
  const tracks=trackProfile(rows);
  const best=tracks[0]||null;
  const worst=[...tracks].sort((a,b)=>b.avgFinish-a.avgFinish||b.starts-a.starts)[0]||null;
  const recent=[...rows].slice(-5).reverse();
  const carNumber=[...rows].reverse().find(r=>r.carNumber)?.carNumber||'--';
  const team=[...rows].reverse().find(r=>r.team)?.team||'HLRN Driver';
  const intel=driverIntelligenceSummary(rows,name);

  const stat=(label,value,sub='')=>`<article class="dc-stat"><small>${label}</small><strong>${escapeHtml(value)}</strong>${sub?`<span>${escapeHtml(sub)}</span>`:''}</article>`;
  const recentForm=[...rows].slice(-5).map(r=>r.finish).join(' – ')||'--';

  const recentHtml=recent.map(r=>`<button class="dc-race-row" onclick="state.resultsLeague='${r.source}';state.selectedRaceKey='';renderResults()">
    <div class="dc-finish ${r.finish===1?'win':''}">P${r.finish}</div>
    <div><strong>${escapeHtml(r.track||'Unknown Track')}</strong><span>${escapeHtml(r.source)} • ${escapeHtml(r.date)} • Start P${r.start||'--'} • ${r.lapsLed} led • ${r.incidents} inc</span></div>
    <b>${r.start>0?(r.start-r.finish>0?'+':'')+(r.start-r.finish):'--'}</b>
  </button>`).join('');

  const historyHtml=[...rows].reverse().map(r=>`<article class="dc-history-row">
    <div><small>${escapeHtml(r.source.toUpperCase())}${r.raceNo?` • R${r.raceNo}`:''}</small><strong>${escapeHtml(r.track||'Unknown Track')}</strong><span>${escapeHtml(r.date)}</span></div>
    <div><b>P${r.finish}</b><small>FIN</small></div>
    <div><b>P${r.start||'--'}</b><small>START</small></div>
    <div><b>${r.lapsLed}</b><small>LED</small></div>
    <div><b>${r.incidents}</b><small>INC</small></div>
  </article>`).join('');

  const leagueCard=(label,s,cls)=>`<article class="dc-league-card ${cls}">
    <small>${label}</small><strong>${s.starts} starts • ${s.wins} wins</strong>
    <div><span>${s.top5} T5</span><span>${s.top10} T10</span><span>${s.avgFinish?s.avgFinish.toFixed(1):'--'} AVG</span></div>
  </article>`;

  app.innerHTML=`${networkBar()}
    <button class="profile-back" onclick="hlrnBack('drivers')">← Drivers</button>
    <section class="driver-card-hero">
      <div class="driver-card-number">#${escapeHtml(carNumber)}</div>
      <div class="driver-card-avatar">${escapeHtml(initials(name))}</div>
      <div class="driver-card-identity"><small>HLRN DRIVER CARD</small><h2>${escapeHtml(name)}</h2><p>${escapeHtml(team)}</p></div>
      <div class="driver-card-rating"><small>RECENT FORM</small><strong>${escapeHtml(recentForm)}</strong></div>
    </section>

    <section class="dc-intelligence"><span>🔥</span><div><small>RACE INTELLIGENCE</small><strong>${escapeHtml(intel)}</strong></div></section>

    <div class="dc-stat-grid">
      ${stat('CAREER STARTS',stats.starts)}
      ${stat('WINS',stats.wins,stats.winRate.toFixed(1)+'% win rate')}
      ${stat('TOP 5',stats.top5,stats.top5Rate.toFixed(1)+'%')}
      ${stat('TOP 10',stats.top10)}
      ${stat('POLES',stats.poles)}
      ${stat('LAPS LED',stats.lapsLed)}
      ${stat('AVG START',stats.avgStart?stats.avgStart.toFixed(1):'--')}
      ${stat('AVG FINISH',stats.avgFinish?stats.avgFinish.toFixed(1):'--')}
      ${stat('INC / RACE',stats.incPerRace.toFixed(1))}
      ${stat('AVG POS GAIN',(stats.avgGain>0?'+':'')+stats.avgGain.toFixed(1))}
      ${stat('BEST TRACK',best?.track||'--',best?`Avg ${best.avgFinish.toFixed(1)}`:'')}
      ${stat('WORST TRACK',worst?.track||'--',worst?`Avg ${worst.avgFinish.toFixed(1)}`:'')}
    </div>

    <div class="section-head"><h3>League Breakdown</h3><span>Sunday • Monday • Hosted</span></div>
    <div class="dc-league-grid">
      ${leagueCard('SUNDAY',sunday,'sun')}
      ${leagueCard('MONDAY',monday,'mon')}
      ${leagueCard('HOSTED',hosted,'hosted')}
    </div>

    <div class="section-head"><h3>Recent Form</h3><span>Latest 5</span></div>
    <section class="dc-recent-list">${recentHtml}</section>

    <div class="section-head"><h3>Track Profile</h3><span>${tracks.length} tracks</span></div>
    <section class="dc-track-grid">
      ${tracks.slice(0,12).map(t=>`<article><div><strong>${escapeHtml(t.track)}</strong><span>${t.starts} starts • ${t.wins} wins • ${t.top5} T5</span></div><b>${t.avgFinish.toFixed(1)}<small>AVG</small></b></article>`).join('')}
    </section>

    <div class="section-head"><h3>Career History</h3><span>${rows.length} races</span></div>
    <section class="dc-history">${historyHtml}</section>`;
  addPageMotion();
  window.scrollTo({top:0,behavior:'smooth'});
}


function openHostedDriverProfile(encodedName){
  try{
    const raw = String(encodedName||'');
    let name = raw;
    try{ name = decodeURIComponent(raw); }catch(e){}
    name = prettyName(String(name||'').trim());

    // Prefer full career rows because they contain the richest Hosted profile data.
    let careerRows = (state.hostedRaceRows||[]).filter(r=>prettyName(String(r.Driver||'').trim())===name);

    // Fallback to the driver summary list if the row-level feed has not finished loading.
    let summary = (state.hostedDrivers||[]).find(d=>prettyName(String(d.name||'').trim())===name);

    // If an exact pretty-name match fails, try a normalized case-insensitive match.
    if(!careerRows.length){
      const target=name.toLowerCase();
      careerRows=(state.hostedRaceRows||[]).filter(r=>prettyName(String(r.Driver||'').trim()).toLowerCase()===target);
    }
    if(!summary){
      const target=name.toLowerCase();
      summary=(state.hostedDrivers||[]).find(d=>prettyName(String(d.name||'').trim()).toLowerCase()===target);
    }

    // If data is still loading, show a proper loading state instead of "unable to load".
    if(!careerRows.length && !summary){
      app.innerHTML=`${networkBar()}
        <button class="profile-back" onclick="hlrnBack('drivers')">← Drivers</button>
        <section class="coming-live"><span>👤</span><h3>Hosted profile is loading</h3><p>We found the driver name, but the Hosted race database is still syncing. This profile will update automatically.</p><div class="auto-sync-note"><i></i>AUTO SYNC ACTIVE</div></section>`;
      return;
    }

    // Build career numbers safely from rows when available.
    const races = careerRows.length || Number(summary?.races||0);
    const finishes = careerRows.map(r=>num(r['Finish Position'])).filter(v=>v>0);
    const wins = careerRows.length ? careerRows.filter(r=>num(r['Finish Position'])===1).length : Number(summary?.wins||0);
    const top5 = careerRows.length ? careerRows.filter(r=>{const f=num(r['Finish Position']);return f>0&&f<=5}).length : Number(summary?.top5||0);
    const top10 = careerRows.length ? careerRows.filter(r=>{const f=num(r['Finish Position']);return f>0&&f<=10}).length : Number(summary?.top10||0);
    const avgFinish = finishes.length ? finishes.reduce((a,b)=>a+b,0)/finishes.length : Number(summary?.averageFinish||0);
    const lapsLed = careerRows.reduce((a,r)=>a+num(r['Laps Led']),0);
    const incidents = careerRows.reduce((a,r)=>a+num(r.Incidents),0);
    const avgInc = races ? incidents/races : 0;

    const sorted = [...careerRows].sort((a,b)=>String(b['Race Date']||'').localeCompare(String(a['Race Date']||'')));
    const recent = sorted.slice(0,5);

    const trackMap = new Map();
    careerRows.forEach(r=>{
      const track=String(r.Track||'').trim();
      if(!track) return;
      if(!trackMap.has(track)) trackMap.set(track,{track,races:0,wins:0,top5:0,finishes:[],lapsLed:0,incidents:0});
      const t=trackMap.get(track), f=num(r['Finish Position']);
      t.races++;
      if(f===1)t.wins++;
      if(f>0&&f<=5)t.top5++;
      if(f>0)t.finishes.push(f);
      t.lapsLed+=num(r['Laps Led']);
      t.incidents+=num(r.Incidents);
    });
    const tracks=[...trackMap.values()].map(t=>({...t,avgFinish:t.finishes.length?t.finishes.reduce((a,b)=>a+b,0)/t.finishes.length:0})).sort((a,b)=>b.races-a.races||a.track.localeCompare(b.track));

    const recentHtml = recent.length ? recent.map(r=>{
      const f=num(r['Finish Position']), s=num(r['Start Position']);
      const gain=(s>0&&f>0)?s-f:0;
      return `<article class="profile-recent-row">
        <div class="profile-finish ${f===1?'win':''}">P${f||'--'}</div>
        <div><strong>${escapeHtml(String(r.Track||'Unknown Track'))}</strong><span>${escapeHtml(String(r['Race Date']||''))} • Start P${s||'--'} • ${num(r['Laps Led'])} led • ${num(r.Incidents)} inc</span></div>
        <b class="${gain>0?'gain':gain<0?'loss':''}">${gain>0?'+'+gain:gain}</b>
      </article>`;
    }).join('') : `<div class="empty">Detailed recent-race rows are still loading.</div>`;

    const tracksHtml = tracks.length ? tracks.map(t=>`<article class="profile-track-row">
      <div><strong>${escapeHtml(t.track)}</strong><span>${t.races} races • ${t.wins} wins • ${t.top5} Top 5s</span></div>
      <div><b>${t.avgFinish.toFixed(1)}</b><small>AVG FIN</small></div>
      <div><b>${t.lapsLed}</b><small>LED</small></div>
    </article>`).join('') : `<div class="empty">Track-by-track detail will appear when the full Hosted race feed is loaded.</div>`;

    app.innerHTML=`${networkBar()}
      <button class="profile-back" onclick="hlrnBack('drivers')">← Drivers</button>
      <section class="driver-profile-hero">
        <div class="driver-profile-avatar">${escapeHtml(initials(name))}</div>
        <div><small>HLRN HOSTED DRIVER</small><h2>${escapeHtml(name)}</h2><p>${races} career starts • ${wins} wins</p></div>
      </section>

      <div class="career-stats-grid">
        <article class="career-stat"><small>STARTS</small><strong>${races}</strong></article>
        <article class="career-stat"><small>WINS</small><strong>${wins}</strong></article>
        <article class="career-stat"><small>TOP 5</small><strong>${top5}</strong></article>
        <article class="career-stat"><small>TOP 10</small><strong>${top10}</strong></article>
        <article class="career-stat"><small>AVG FINISH</small><strong>${avgFinish?avgFinish.toFixed(1):'--'}</strong></article>
        <article class="career-stat"><small>LAPS LED</small><strong>${lapsLed}</strong></article>
        <article class="career-stat"><small>INCIDENTS</small><strong>${incidents}</strong></article>
        <article class="career-stat"><small>AVG INC</small><strong>${avgInc.toFixed(1)}</strong></article>
      </div>

      <div class="section-head"><h3>Recent Hosted Races</h3><span>Latest 5</span></div>
      <div class="profile-recent-list">${recentHtml}</div>

      <div class="section-head"><h3>Track History</h3><span>${tracks.length} tracks</span></div>
      <div class="profile-track-list">${tracksHtml}</div>`;
    addPageMotion();
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(err){
    console.error('Hosted profile error',err);
    app.innerHTML=`${networkBar()}
      <button class="profile-back" onclick="hlrnBack('drivers')">← Drivers</button>
      <section class="coming-live"><span>⚠️</span><h3>Hosted profile hit a loading error</h3><p>The driver profile data is temporarily unavailable. HLRN will retry automatically.</p><div class="auto-sync-note"><i></i>AUTO SYNC RETRYING</div></section>`;
  }
}

function fmt1(v){ const n=Number(v); return Number.isFinite(n)?n.toFixed(1):'--'; }
function ordinal(n){ n=Number(n); if(!Number.isFinite(n)||n<=0)return '--'; const s=['th','st','nd','rd'],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }

function initials(name){
  return String(name||'')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part=>part[0]||'')
    .slice(0,2)
    .join('')
    .toUpperCase() || 'HL';
}

function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }

function careerBadges(races,wins,top5,top10,lapsLed){
  return [
    {icon:'🏁',label:'Race Winner',earned:wins>=1,need:'Win a race'},
    {icon:'🔥',label:'5 Wins',earned:wins>=5,need:`${Math.max(0,5-wins)} to go`},
    {icon:'🏆',label:'10 Wins',earned:wins>=10,need:`${Math.max(0,10-wins)} to go`},
    {icon:'⭐',label:'25 Starts',earned:races>=25,need:`${Math.max(0,25-races)} to go`},
    {icon:'💯',label:'50 Starts',earned:races>=50,need:`${Math.max(0,50-races)} to go`},
    {icon:'👑',label:'100 Starts',earned:races>=100,need:`${Math.max(0,100-races)} to go`},
    {icon:'⚡',label:'100 Laps Led',earned:lapsLed>=100,need:`${Math.max(0,100-lapsLed)} to go`},
    {icon:'🎯',label:'25 Top 10s',earned:top10>=25,need:`${Math.max(0,25-top10)} to go`}
  ];
}

function renderHostedDriverProfileFromRows(driver,rows){
  const races=rows.length;
  const wins=rows.filter(r=>num(r['Finish Position'])===1).length;
  const top5=rows.filter(r=>num(r['Finish Position'])>=1&&num(r['Finish Position'])<=5).length;
  const top10=rows.filter(r=>num(r['Finish Position'])>=1&&num(r['Finish Position'])<=10).length;
  const finishRows=rows.filter(r=>num(r['Finish Position'])>0);
  const startRows=rows.filter(r=>num(r['Start Position'])>0);
  const avgFinish=finishRows.length?finishRows.reduce((a,r)=>a+num(r['Finish Position']),0)/finishRows.length:0;
  const avgStart=startRows.length?startRows.reduce((a,r)=>a+num(r['Start Position']),0)/startRows.length:0;
  const lapsLed=rows.reduce((a,r)=>a+num(r['Laps Led']),0);
  const incidents=rows.reduce((a,r)=>a+num(r.Incidents),0);
  const avgInc=races?incidents/races:0;
  const winRate=races?wins/races*100:0, top5Rate=races?top5/races*100:0, top10Rate=races?top10/races*100:0;
  const sorted=[...rows].sort((a,b)=>{
    const ad=Date.parse(a['Race Date']||''),bd=Date.parse(b['Race Date']||'');
    if(Number.isFinite(ad)&&Number.isFinite(bd)) return bd-ad;
    return 0;
  });
  const latestIR=sorted.find(r=>String(r.iRating||'').trim())?.iRating||'--';
  const bestFinish=finishRows.length?Math.min(...finishRows.map(r=>num(r['Finish Position']))):0;
  const bestStart=startRows.length?Math.min(...startRows.map(r=>num(r['Start Position']))):0;
  const cleanRaces=rows.filter(r=>num(r.Incidents)===0).length;
  const cleanRate=races?cleanRaces/races*100:0;
  const stat=(l,v)=>`<div class="career-stat"><small>${l}</small><strong>${v}</strong></div>`;
  const recentHtml=sorted.slice(0,10).map(r=>`<div class="profile-race-row"><div><strong>${escapeHtml(r.Track||'Unknown Track')}</strong><small>${escapeHtml(r['Race Date']||'')} • Start ${escapeHtml(r['Start Position']||'--')} • ${escapeHtml(r['Laps Led']||0)} led</small></div><div class="profile-finish">${escapeHtml(ordinal(r['Finish Position']))}<small>${escapeHtml(r.Incidents||0)} INC</small></div></div>`).join('');

  const tm=new Map();
  rows.forEach(r=>{
    const name=String(r.Track||'Unknown Track').trim()||'Unknown Track';
    const key=name.toLowerCase();
    const t=tm.get(key)||{name,races:0,wins:0,top5:0,top10:0,finish:0,finishCount:0,inc:0,led:0};
    const f=num(r['Finish Position']); t.races++; if(f===1)t.wins++; if(f>=1&&f<=5)t.top5++; if(f>=1&&f<=10)t.top10++; if(f>0){t.finish+=f;t.finishCount++;} t.inc+=num(r.Incidents); t.led+=num(r['Laps Led']); tm.set(key,t);
  });
  const tracks=[...tm.values()].sort((a,b)=>b.races-a.races);
  const trackHtml=tracks.map(t=>`<div class="track-history-row"><div><strong>${escapeHtml(t.name)}</strong><small>${t.races} races • ${t.wins} wins • ${t.top5} Top 5s • ${t.top10} Top 10s • ${t.led} laps led</small></div><b>Avg ${t.finishCount?(t.finish/t.finishCount).toFixed(1):'--'}</b></div>`).join('');
  app.innerHTML=`${networkBar()}<button class="profile-back" onclick="hlrnBack('drivers')">← Drivers</button><section class="driver-profile-hero"><div class="driver-profile-kicker">HLRN HOSTED CAREER • ALL IMPORTED RACES</div><h2>${escapeHtml(driver)}</h2><p>${races} races • ${wins} wins • ${top10Rate.toFixed(1)}% Top-10 rate${latestIR!=='--'?` • Latest iRating ${escapeHtml(latestIR)}`:''}</p></section><section class="career-stats-grid">${stat('RACES',races)}${stat('WINS',wins)}${stat('TOP 5',top5)}${stat('TOP 10',top10)}${stat('AVG START',fmt1(avgStart))}${stat('AVG FINISH',fmt1(avgFinish))}${stat('WIN RATE',winRate.toFixed(1)+'%')}${stat('TOP-5 RATE',top5Rate.toFixed(1)+'%')}${stat('LAPS LED',lapsLed)}${stat('INCIDENTS',incidents)}${stat('INC / RACE',fmt1(avgInc))}${stat('TOP-10 RATE',top10Rate.toFixed(1)+'%')}${stat('BEST FINISH',ordinal(bestFinish))}${stat('BEST START',ordinal(bestStart))}${stat('CLEAN RATE',cleanRate.toFixed(1)+'%')}</section><div class="profile-section-title"><h3>Career Badges</h3><span>Milestones</span></div><section class="badge-grid">${careerBadges(races,wins,top5,top10,lapsLed).map(b=>`<div class="career-badge ${b.earned?'earned':''}"><span>${b.icon}</span><strong>${b.label}</strong><small>${b.earned?'EARNED':b.need}</small></div>`).join('')}</section><div class="profile-section-title"><h3>Recent Hosted Races</h3><span>Latest 10</span></div><section class="card profile-races">${recentHtml}</section><div class="profile-section-title"><h3>Track History</h3><span>Career breakdown</span></div><section class="card">${trackHtml}</section>`;
}

async function refreshHostedData(rerender=true){
  state.hostedDataStatus='Connecting…';
  try{
    const [rankT,dataT,latestMetaT,latestResultsT]=await Promise.all([
      loadGviz(HOSTED_SHEET,'DRIVER RANKINGS','A1:G1000'),
      loadGviz(HOSTED_SHEET,'DRIVER DATA','A1:M20000'),
      loadGviz(HOSTED_SHEET,'LATEST SESSION','A3:B5'),
      loadGviz(HOSTED_SHEET,'LATEST SESSION','A7:K50')
    ]);
    const rankings=tableRows(rankT); // kept available for compatibility, but NOT used to limit the driver directory
    const latestMetaRows=tableRows(latestMetaT);
    const latestRaceRows=tableRows(latestResultsT);
    const metaKey=(latestMetaT.cols?.[0]?.label || latestMetaT.cols?.[0]?.id || '').trim();
    const metaValueKey=(latestMetaT.cols?.[1]?.label || latestMetaT.cols?.[1]?.id || '').trim();
    const trackRow=latestMetaRows.find(r=>String(r[metaKey]||'').trim().toLowerCase()==='track');
    const dateRow=latestMetaRows.find(r=>String(r[metaKey]||'').trim().toLowerCase()==='date');
    const winnerRow=latestRaceRows.find(r=>Number(r.Pos)===1) || latestRaceRows[0];
    state.hostedLatest = winnerRow && winnerRow.Driver ? {
      winner: prettyName(String(winnerRow.Driver)),
      track: String(trackRow?.[metaValueKey]||'HLRN Hosted Race'),
      date: String(dateRow?.[metaValueKey]||''),
      car: String(winnerRow.Car||''),
      carNumber: String(winnerRow['Car #']||'')
    } : null;
    state.hostedRaceRows=tableRows(dataT).filter(r=>String(r.Driver||'').trim());
    const m=new Map();
    state.hostedRaceRows.forEach(r=>{
      const name=prettyName(String(r.Driver||'')).trim(); if(!name)return;
      const key=name.toLowerCase();
      const d=m.get(key)||{name,races:0,wins:0,top5:0,top10:0,finish:0,finishCount:0};
      const f=num(r['Finish Position']); d.races++; if(f===1)d.wins++; if(f>=1&&f<=5)d.top5++; if(f>=1&&f<=10)d.top10++; if(f>0){d.finish+=f;d.finishCount++;} m.set(key,d);
    });
    state.hostedDrivers=[...m.values()].map(d=>({...d,averageFinish:d.finishCount?d.finish/d.finishCount:0})).sort((a,b)=>a.name.localeCompare(b.name));
    state.hostedDataStatus='LIVE';
  }catch(err){
    console.warn('HLRN hosted database connection failed:',err);
    state.hostedDataStatus='HOSTED DATA OFFLINE';
  }
  if(rerender && state.currentView==='drivers') renderDrivers(document.querySelector('#driverSearch')?.value||'');
  else if(rerender && state.currentView==='home') renderHome();
}

function raceGroupsForLeague(league){
  const rows=state.results[league]||[];
  const groups=new Map();
  rows.forEach(r=>{
    const key=String(r.raceNo||`${r.date}|${r.track}`);
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(r);
  });
  return [...groups.entries()].map(([key,rows])=>({key,rows:rows.sort((a,b)=>a.finish-b.finish),raceNo:rows[0]?.raceNo||0,track:rows[0]?.track||'',date:rows[0]?.date||''})).sort((a,b)=>b.raceNo-a.raceNo);
}
function hostedRaceGroups(){
  const groups=new Map();
  state.hostedRaceRows.forEach(r=>{
    const key=String(r['Race ID']||`${r['Race Date']}|${r.Track}`);
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(r);
  });
  return [...groups.entries()].map(([key,rows])=>({key,rows,track:String(rows[0]?.Track||''),date:String(rows[0]?.['Race Date']||'')})).sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0));
}
function switchResultsLeague(league){ state.resultsLeague=league; state.selectedRaceKey=''; renderResults(false); hlrnRouteState({kind:'results',league:state.resultsLeague,key:state.selectedRaceKey},true); }
function selectRace(key){ state.selectedRaceKey=decodeURIComponent(key); renderResults(false); hlrnRouteState({kind:'results',league:state.resultsLeague,key:state.selectedRaceKey},true); }
function renderResults(addHistory=true){
  clearInterval(countdownTimer); state.currentView='results'; nav.forEach(n=>n.classList.remove('active'));
  const league=state.resultsLeague||'Sunday';
  if(addHistory) hlrnRouteState({kind:'results',league,key:state.selectedRaceKey||''});
  const groups=league==='Hosted'?hostedRaceGroups():raceGroupsForLeague(league);
  const selected=groups.find(g=>g.key===state.selectedRaceKey)||groups[0];
  if(selected && !state.selectedRaceKey) state.selectedRaceKey=selected.key;
  const selector=groups.map((g,i)=>`<button class="archive-race-chip ${selected?.key===g.key?'active':''}" onclick="selectRace('${encodeURIComponent(g.key)}')"><small>${league==='Hosted'?'HOSTED':`RACE ${g.raceNo}`}</small><strong>${escapeHtml(g.track||'Race')}</strong><span>${escapeHtml(g.date||'')}</span></button>`).join('');
  let rowsHtml='';
  let summary='No race selected';
  let winnerSpotlight='';
  if(selected){
    if(league==='Hosted'){
      const ordered=[...selected.rows].sort((a,b)=>num(a['Finish Position'])-num(b['Finish Position']));
      const winner=ordered[0]; summary=`${selected.track} • ${selected.date} • ${ordered.length} drivers`;
      winnerSpotlight=winner?`<section class="winner-spotlight hosted-win"><div class="winner-crown">🏆</div><div><small>RACE WINNER</small><strong>${escapeHtml(prettyName(String(winner.Driver||'')))}</strong><span>${escapeHtml(selected.track)} • ${escapeHtml(selected.date)}</span></div><div class="winner-number">#${escapeHtml(winner['Car #']||'--')}</div></section>`:'';
      rowsHtml=ordered.map(r=>{const name=prettyName(String(r.Driver||'')); const gain=num(r['Start Position'])-num(r['Finish Position']); return `<button class="archive-result-row" onclick="openHLRNDriverProfile(decodeURIComponent('${encodeURIComponent(name).replace(/'/g,'%27')}'))"><div class="archive-pos">${escapeHtml(r['Finish Position']||'--')}</div><div class="archive-driver"><strong>${escapeHtml(name)}</strong><small>Start ${escapeHtml(r['Start Position']||'--')} • ${escapeHtml(r['Laps Led']||0)} led • ${escapeHtml(r.Incidents||0)} inc</small></div><div class="archive-gain ${gain>0?'up':gain<0?'down':''}">${gain>0?'+':''}${gain}</div></button>`}).join('');
    }else{
      const ordered=selected.rows; summary=`Race ${selected.raceNo} • ${selected.track} • ${selected.date} • ${ordered.length} drivers`;
      const winner=ordered[0];
      winnerSpotlight=winner?`<section class="winner-spotlight ${league.toLowerCase()}-win"><div class="winner-crown">🏆</div><div><small>RACE WINNER</small><strong>${escapeHtml(winner.driver)}</strong><span>${escapeHtml(selected.track)} • Race ${selected.raceNo}</span></div><div class="winner-number">P1</div></section>`:'';
      rowsHtml=ordered.map(r=>{const gain=r.start-r.finish; return `<button class="archive-result-row" onclick="openHLRNDriverProfile('${encodeURIComponent(r.driver)}')"><div class="archive-pos">${r.finish}</div><div class="archive-driver"><strong>${escapeHtml(r.driver)}</strong><small>Start ${r.start} • ${r.lapsLed} led • ${r.points} pts • ${r.incidents} inc</small></div><div class="archive-gain ${gain>0?'up':gain<0?'down':''}">${gain>0?'+':''}${gain}</div></button>`}).join('');
    }
  }
  app.innerHTML=`${networkBar()}<div class="page-title-row premium-page-head"><div><span class="page-kicker">OFFICIAL RESULTS</span><h2 class="page-title">Race Archive</h2><p class="page-sub">Every loaded HLRN race, one place</p></div>${liveBadge()}</div>
    <div class="tabs results-tabs"><button class="tab ${league==='Sunday'?'active sunday-result-tab':''}" onclick="switchResultsLeague('Sunday')">Sunday</button><button class="tab ${league==='Monday'?'active monday-result-tab':''}" onclick="switchResultsLeague('Monday')">Monday</button><button class="tab ${league==='Hosted'?'active hosted-result-tab':''}" onclick="switchResultsLeague('Hosted')">Hosted</button></div>
    <div class="archive-scroller">${selector||'<div class="empty">No races loaded yet.</div>'}</div>
    ${winnerSpotlight}
    <div class="section-head"><h3>${selected?escapeHtml(selected.track):'Race Results'}</h3><span>${escapeHtml(summary)}</span></div>
    <section class="card archive-table">${rowsHtml||'<div class="empty">No race results loaded.</div>'}</section><button class="back-home" onclick="hlrnBack('home')">← Back Home</button>`;
}


/* =========================================================
   HLRN 7.0 PERFORMANCE CENTER
   ========================================================= */

function isFavorite(name){ return state.favorites.includes(name); }
function toggleFavorite(name){
  if(isFavorite(name)) state.favorites=state.favorites.filter(x=>x!==name);
  else state.favorites=[...state.favorites,name];
  localStorage.setItem('hlrn-favorites',JSON.stringify(state.favorites));
}

function openFeature(name,addHistory=true){
  clearInterval(countdownTimer);
  document.body.dataset.view='feature';
  document.body.dataset.feature=name;
  state.featureView=name;
  state.currentView='feature';
  nav.forEach(n=>n.classList.remove('active'));
  try{
    renderFeature(name);
  }catch(err){
    console.error('Feature open failed:',name,err);
    featureShell('HLRN Feature','The feature hit a loading error.',`<section class="coming-live"><span>⚠️</span><h3>Could not open this feature</h3><p>Tap Home and try again after the live data finishes loading.</p><button class="btn primary" onclick="setView('home')">BACK HOME</button></section>`,'feature-error-page');
  }
  addPageMotion();
  if(addHistory) hlrnRouteState({kind:'feature',name});
  window.scrollTo({top:0,behavior:'smooth'});
}
function featureBack(){ document.body.removeAttribute('data-feature'); hlrnBack('home'); }

function featureShell(title,subtitle,body,cls=''){
  app.innerHTML=`${networkBar()}
  <section class="feature-hero-shell">
    <button class="profile-back feature-back" onclick="featureBack()">← HOME</button>
    <div class="feature-hero-copy"><span class="page-kicker">HLRN PERFORMANCE CENTER</span><h2 class="page-title">${title}</h2><p class="page-sub">${subtitle}</p></div>
    <div class="feature-hero-live">${liveBadge()}</div>
    <div class="feature-speed-lines" aria-hidden="true"><i></i><i></i><i></i></div>
  </section>
  <section class="feature-page ${cls}">${body}</section>`;
}

function hostedDriverStats(){
  const map=new Map();
  state.hostedRaceRows.forEach(r=>{
    const name=prettyName(String(r.Driver||'').trim()); if(!name) return;
    if(!map.has(name)) map.set(name,{name,races:0,wins:0,top5:0,top10:0,lapsLed:0,incidents:0,starts:[],finishes:[],pointsGain:0,tracks:new Set(),clean:0});
    const d=map.get(name), finish=num(r['Finish Position']), start=num(r['Start Position']);
    d.races++; if(finish===1)d.wins++; if(finish>0&&finish<=5)d.top5++; if(finish>0&&finish<=10)d.top10++;
    d.lapsLed+=num(r['Laps Led']); d.incidents+=num(r.Incidents); if(num(r.Incidents)===0)d.clean++;
    if(start>0)d.starts.push(start); if(finish>0)d.finishes.push(finish); if(start>0&&finish>0)d.pointsGain+=start-finish;
    if(r.Track)d.tracks.add(String(r.Track));
  });
  return [...map.values()].map(d=>({...d,avgFinish:d.finishes.length?d.finishes.reduce((a,b)=>a+b,0)/d.finishes.length:0,avgStart:d.starts.length?d.starts.reduce((a,b)=>a+b,0)/d.starts.length:0,avgInc:d.races?d.incidents/d.races:0,cleanRate:d.races?d.clean/d.races*100:0}));
}
function recordCard(icon,label,d,value,sub=''){
  return `<article class="record-card"><span>${icon}</span><small>${label}</small><strong>${escapeHtml(d?.name||'--')}</strong><b>${escapeHtml(value??'--')}</b><em>${escapeHtml(sub)}</em></article>`;
}
function renderRecords(){
  const ds=hostedDriverStats();
  const top=(key,low=false)=>[...ds].sort((a,b)=>low?(a[key]||999)-(b[key]||999):(b[key]||0)-(a[key]||0))[0];
  const minAvg=[...ds].filter(d=>d.races>=3&&d.avgFinish>0).sort((a,b)=>a.avgFinish-b.avgFinish)[0];
  const body=`<div class="feature-summary"><strong>${ds.length}</strong><span>HOSTED DRIVERS IN RECORD BOOK</span></div>
  <div class="record-grid">
    ${recordCard('🏆','MOST WINS',top('wins'),top('wins')?.wins,'career hosted wins')}
    ${recordCard('🏁','MOST STARTS',top('races'),top('races')?.races,'career starts')}
    ${recordCard('🔥','MOST LAPS LED',top('lapsLed'),top('lapsLed')?.lapsLed,'laps led')}
    ${recordCard('🎯','BEST AVG FINISH',minAvg,minAvg?.avgFinish?.toFixed(1),'minimum 3 starts')}
    ${recordCard('🥇','MOST TOP 5s',top('top5'),top('top5')?.top5,'Top-5 finishes')}
    ${recordCard('💪','MOST TOP 10s',top('top10'),top('top10')?.top10,'Top-10 finishes')}
    ${recordCard('✨','CLEANEST RATE',[...ds].filter(d=>d.races>=3).sort((a,b)=>b.cleanRate-a.cleanRate)[0],[...ds].filter(d=>d.races>=3).sort((a,b)=>b.cleanRate-a.cleanRate)[0]?.cleanRate?.toFixed(1)+'%','zero-incident race rate')}
    ${recordCard('🚀','BIGGEST NET MOVER',top('pointsGain'),top('pointsGain')?.pointsGain,'career positions gained')}
  </div>`;
  featureShell('Records & Milestones','All-time hosted career leaders from every imported race.',body,'records-page');
}

function compareDriver(name){
  return hostedDriverStats().find(d=>d.name===name)||null;
}
function h2hSafeDrivers(){
  try{
    const career=hostedDriverStats();
    if(Array.isArray(career) && career.length){
      return career.filter(d=>d && d.name).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    }
  }catch(e){ console.warn('H2H career stats fallback',e); }

  return (state.hostedDrivers||[])
    .filter(d=>d && d.name)
    .map(d=>({
      name:String(d.name),
      races:Number(d.races||0),
      wins:Number(d.wins||0),
      top5:Number(d.top5||0),
      top10:Number(d.top10||0),
      lapsLed:Number(d.lapsLed||0),
      avgFinish:Number(d.averageFinish||0),
      avgInc:Number(d.avgInc||0),
      cleanRate:Number(d.cleanRate||0)
    }))
    .sort((a,b)=>a.name.localeCompare(b.name));
}

function h2hOptionList(side,query=''){
  const drivers=h2hSafeDrivers();
  const selected=side==='A'?state.h2hA:state.h2hB;
  const q=String(query||'').trim().toLowerCase();
  const filtered=drivers.filter(d=>!q || d.name.toLowerCase().includes(q));
  return filtered.map(d=>`<button class="h2h-list-name ${d.name===selected?'selected':''}"
      onclick="h2hPick('${side}','${encodeURIComponent(d.name)}')">
      <span class="h2h-list-avatar">${escapeHtml(initials(d.name))}</span>
      <span class="h2h-list-copy"><strong>${escapeHtml(d.name)}</strong><small>${d.races||0} starts • ${d.wins||0} wins</small></span>
      <b>${d.name===selected?'✓':'›'}</b>
    </button>`).join('') || `<div class="h2h-no-results">No drivers found</div>`;
}

function h2hFilter(side,value){
  const box=document.getElementById(`h2hList${side}`);
  const count=document.getElementById(`h2hCount${side}`);
  if(!box) return;
  box.innerHTML=h2hOptionList(side,value);
  if(count){
    const total=h2hSafeDrivers().filter(d=>!value || d.name.toLowerCase().includes(String(value).toLowerCase())).length;
    count.textContent=`${total} driver${total===1?'':'s'}`;
  }
}

function h2hPick(side,encodedName){
  playHLRNSound('select');
  const name=decodeURIComponent(encodedName);
  if(side==='A') state.h2hA=name; else state.h2hB=name;
  renderHeadToHead();
}

function h2hMetricsHtml(a,b){
  const metric=(label,av,bv,fmt=v=>v,lower=false)=>{
    const aa=Number(av||0), bb=Number(bv||0);
    const aLead=lower ? (aa<bb) : (aa>bb);
    const bLead=lower ? (bb<aa) : (bb>aa);
    return `<div class="h2h-metric">
      <strong class="${aLead?'lead':''}">${fmt(aa)}</strong>
      <span>${label}</span>
      <b class="${bLead?'lead':''}">${fmt(bb)}</b>
    </div>`;
  };
  return [
    metric('STARTS',a.races,b.races),
    metric('WINS',a.wins,b.wins),
    metric('TOP 5',a.top5,b.top5),
    metric('TOP 10',a.top10,b.top10),
    metric('LAPS LED',a.lapsLed,b.lapsLed),
    metric('AVG FINISH',a.avgFinish,b.avgFinish,v=>v.toFixed(1),true),
    metric('AVG INCIDENTS',a.avgInc,b.avgInc,v=>v.toFixed(1),true),
    metric('CLEAN RATE',a.cleanRate,b.cleanRate,v=>v.toFixed(1)+'%')
  ].join('');
}

function filterH2HList(input,side){
  const q=String(input?.value||'').trim().toLowerCase();
  const root=input?.closest('.h2h-driver-section');
  if(!root)return;
  root.querySelectorAll('[data-driver-name]').forEach(el=>{
    const name=String(el.dataset.driverName||'').toLowerCase();
    el.hidden=!!q && !name.includes(q);
  });
}

function renderHeadToHead(){
  // Render a visible page immediately so this feature can never fail silently.
  featureShell(
    'Head-to-Head',
    'Search a driver or scroll the complete Hosted driver list.',
    `<section class="h2h-loading-shell"><span>⚔️</span><strong>Loading Head-to-Head…</strong></section>`,
    'headtohead-page'
  );

  try{
    const drivers=h2hSafeDrivers();

    if(drivers.length<2){
      const body=`<section class="coming-live"><span>⚔️</span><h3>Hosted driver database is loading</h3><p>Head-to-Head needs at least two Hosted drivers. Tap refresh and the lists will populate as soon as the Hosted data finishes loading.</p><button class="btn primary" onclick="refreshHostedData().then(()=>renderHeadToHead())">REFRESH HOSTED DATA</button></section>`;
      featureShell('Head-to-Head','Search a driver or scroll the complete Hosted driver list.',body,'headtohead-page');
      return;
    }

    if(!state.h2hA || !drivers.some(d=>d.name===state.h2hA)) state.h2hA=drivers[0].name;
    if(!state.h2hB || !drivers.some(d=>d.name===state.h2hB) || state.h2hB===state.h2hA){
      state.h2hB=(drivers.find(d=>d.name!==state.h2hA)||drivers[1]).name;
    }

    const a=drivers.find(d=>d.name===state.h2hA) || drivers[0];
    const b=drivers.find(d=>d.name===state.h2hB) || drivers[1];

    const body=`
      <p class="feature-note">You can type a name to filter the list, or just scroll through every Hosted driver and tap one.</p>

      <section class="h2h-driver-section driver-a">
        <div class="h2h-side-title"><div><small>DRIVER 1</small>${driverLink(a.name)}</div><span>A</span></div>
        <div class="h2h-search-row"><span>⌕</span><input placeholder="Search Driver 1…" autocomplete="off" oninput="h2hFilter('A',this.value)"></div>
        <div class="h2h-full-list" id="h2hListA">${h2hOptionList('A')}</div>
        <div class="h2h-list-total" id="h2hCountA">${drivers.length} drivers</div>
      </section>

      <div class="h2h-big-vs">VS</div>

      <section class="h2h-driver-section driver-b">
        <div class="h2h-side-title"><div><small>DRIVER 2</small>${driverLink(b.name)}</div><span>B</span></div>
        <div class="h2h-search-row"><span>⌕</span><input placeholder="Search Driver 2…" autocomplete="off" oninput="h2hFilter('B',this.value)"></div>
        <div class="h2h-full-list" id="h2hListB">${h2hOptionList('B')}</div>
        <div class="h2h-list-total" id="h2hCountB">${drivers.length} drivers</div>
      </section>

      <section class="h2h-comparison-head">
        <div><small>DRIVER 1</small>${driverLink(a.name)}</div>
        <span>CAREER COMPARISON</span>
        <div><small>DRIVER 2</small>${driverLink(b.name)}</div>
      </section>
      <div class="h2h-board">${h2hMetricsHtml(a,b)}</div>`;

    featureShell('Head-to-Head','Search a driver or scroll the complete Hosted driver list.',body,'headtohead-page');
  }catch(err){
    console.error('Head-to-Head render error',err);
    featureShell(
      'Head-to-Head',
      'Search a driver or scroll the complete Hosted driver list.',
      `<section class="coming-live"><span>⚠️</span><h3>Head-to-Head could not load</h3><p>The rest of the app is still available. Tap below to reload Hosted data and try again.</p><button class="btn primary" onclick="refreshHostedData().then(()=>renderHeadToHead())">RELOAD DRIVER DATA</button></section>`,
      'headtohead-page'
    );
  }
}
function renderRaceStats(){
  const body=`<div class="intelligence-launch"><div><small>HLRN ANALYTICS ENGINE</small><strong>Sunday + Monday Race Intelligence</strong><p>Full live intelligence dashboard with league switching, command-center metrics, stories and deeper race analysis.</p></div><div class="auto-sync-note compact"><i></i>AUTO SYNC</div></div><iframe id="raceIntelFrame" class="race-intelligence-frame" src="race-intelligence.html?v=10.4&app=1" title="HLRN Race Intelligence"></iframe>`;
  featureShell('Race Intelligence','Full HLRN Sunday and Monday analytics dashboard.',body,'race-intelligence-page');
}
function recentRowsFor(name,n=5){
  return state.hostedRaceRows.filter(r=>prettyName(String(r.Driver||''))===name).sort((a,b)=>String(b['Race Date']||'').localeCompare(String(a['Race Date']||''))).slice(0,n);
}
function powerScoreDetails(d){
  const rr=recentRowsFor(d.name,10);
  const finishes=rr.map(r=>num(r['Finish Position'])).filter(Boolean);
  if(!rr.length)return {score:0,races:0,avgFinish:0,wins:0,top5:0,top10:0,avgInc:0,totalInc:0,highInc:0};

  const races=rr.length;
  const avgFinish=finishes.length?finishes.reduce((a,b)=>a+b,0)/finishes.length:40;
  const wins=rr.filter(r=>num(r['Finish Position'])===1).length;
  const top5=rr.filter(r=>{const f=num(r['Finish Position']);return f>0&&f<=5}).length;
  const top10=rr.filter(r=>{const f=num(r['Finish Position']);return f>0&&f<=10}).length;
  const totalInc=rr.reduce((a,r)=>a+num(r.Incidents),0);
  const avgInc=totalInc/races;
  const highInc=rr.filter(r=>num(r.Incidents)>=8).length;

  // Recent speed matters, but incidents now carry a real penalty.
  // A driver cannot stay near the top simply by finishing well while piling up incidents.
  const raw=
    100
    - avgFinish*1.55
    + wins*12
    + top5*3.5
    + top10*1.25
    - avgInc*4.25
    - highInc*3;

  return {
    score:Math.max(0,Math.round(raw)),
    races,avgFinish,wins,top5,top10,avgInc,totalInc,highInc
  };
}
function powerScore(d){ return powerScoreDetails(d).score; }

function renderPowerRankings(){
  const ranked=hostedDriverStats()
    .filter(d=>d.races>=10)
    .map(d=>({...d,powerData:powerScoreDetails(d)}))
    .filter(d=>d.powerData.races>=1)
    .map(d=>({...d,power:d.powerData.score}))
    .sort((a,b)=>b.power-a.power || a.powerData.avgInc-b.powerData.avgInc || a.powerData.avgFinish-b.powerData.avgFinish)
    .slice(0,20);

  const body=`<p class="feature-note"><strong>LAST 10 RACES.</strong> Minimum 10 Hosted starts. Power Rankings now use each driver's latest 10 Hosted races. Finishes, wins, Top 5s and Top 10s help the score, while incidents have a much stronger negative effect. High-incident races (8x+) receive an extra penalty.</p>
  <div class="power-list">${ranked.map((d,i)=>`<button onclick="openHostedDriverProfile('${encodeURIComponent(d.name)}')" class="power-row upgraded-power">
    <b>${i+1}</b>
    <div>
      <strong>${escapeHtml(d.name)}</strong>
      <span>Last 10: ${d.powerData.wins} W • ${d.powerData.top5} T5 • ${d.powerData.top10} T10 • Avg Fin ${d.powerData.avgFinish.toFixed(1)}</span>
      <small>${d.powerData.avgInc.toFixed(1)} avg incidents • ${d.powerData.totalInc} total incidents${d.powerData.highInc?` • ${d.powerData.highInc} high-incident race${d.powerData.highInc===1?'':'s'}`:''}</small>
    </div>
    <em>${d.power}</em>
  </button>`).join('')}</div>`;
  featureShell('Driver Power Rankings','Who is hottest — and cleanest — over the last 10 Hosted races?',body,'power-page');
}

function trackStats(){
  const map=new Map();
  state.hostedRaceRows.forEach(r=>{
    const track=String(r.Track||'').trim(); if(!track)return;
    if(!map.has(track))map.set(track,{track,rows:[],wins:new Map(),starts:0,incidents:0});
    const t=map.get(track); t.rows.push(r); t.starts++; t.incidents+=num(r.Incidents);
    if(num(r['Finish Position'])===1){const n=prettyName(String(r.Driver||''));t.wins.set(n,(t.wins.get(n)||0)+1);}
  });
  return [...map.values()].map(t=>{
    const topWinner=[...t.wins.entries()].sort((a,b)=>b[1]-a[1])[0];
    const unique=new Set(t.rows.map(r=>String(r['Race ID']||r['Race Date']||''))).size;
    return {...t,races:unique,topWinner:topWinner?.[0]||'--',topWins:topWinner?.[1]||0,avgInc:t.starts?t.incidents/t.starts:0};
  }).sort((a,b)=>b.races-a.races||a.track.localeCompare(b.track));
}
function renderTrackHub(){
  const ts=trackStats();
  const body=`<div class="track-grid">${ts.map(t=>`<article class="track-card"><div class="track-road">〰</div><small>HLRN TRACK HISTORY</small><strong>${escapeHtml(t.track)}</strong><span>${t.races} races • ${t.starts} driver starts</span><div><b>${escapeHtml(t.topWinner)}</b><em>${t.topWins} wins</em></div><footer>${t.avgInc.toFixed(1)} avg incidents / driver start</footer></article>`).join('')}</div>`;
  featureShell('Track Hub','Every hosted track, its race history and winningest driver.',body,'tracks-page');
}

function renderTeams(){
  const league=state.teamLeague||'Sunday';
  const data=state.teamStandings[league]||[];
  const rows=data.length?data.map((t,i)=>`<button class="team-standing-row">
    <b class="team-rank">${i+1}</b>
    <div><strong>${escapeHtml(t.name)}</strong><span>${t.drivers?escapeHtml(t.drivers):'HLRN TEAM'}</span></div>
    <div class="team-mini"><b>${t.wins||0}<small>WINS</small></b><b>${t.top5||0}<small>TOP 5</small></b></div>
    <em>${Number(t.points||0).toFixed(1).replace('.0','')}<small>PTS</small></em>
  </button>`).join(''):`<div class="empty">Connecting to ${league} team standings…</div>`;
  const body=`<div class="tabs premium-tabs team-tabs">
    <button class="${league==='Sunday'?'active':''}" onclick="state.teamLeague='Sunday';renderTeams()">SUNDAY</button>
    <button class="${league==='Monday'?'active':''}" onclick="state.teamLeague='Monday';renderTeams()">MONDAY</button>
  </div>
  <section class="team-command-card ${league.toLowerCase()}"><div><small>${league.toUpperCase()} TEAM CHAMPIONSHIP</small><strong>${data.length||'--'}</strong><span>teams loaded live</span></div><div><small>LEADER</small><strong>${escapeHtml(data[0]?.name||'Loading')}</strong><span>${data[0]?.points||'--'} points</span></div></section>
  <div class="team-standing-list">${rows}</div>`;
  featureShell('Team Standings','Live team championship data from the same Sunday and Monday feeds used by the HLRN website.',body,'teams-page');
}
function spotlightDriver(){
  const ds=hostedDriverStats().filter(d=>d.races>0); if(!ds.length)return null;
  const ranked=[...ds].sort((a,b)=>(b.wins*20+b.top5*5+b.top10*2+b.lapsLed*.1+b.cleanRate*.05)-(a.wins*20+a.top5*5+a.top10*2+a.lapsLed*.1+a.cleanRate*.05));
  const day=Math.floor(Date.now()/86400000); return ranked[day%Math.min(ranked.length,10)];
}
function renderSpotlight(){
  const d=spotlightDriver();
  if(!d){featureShell('Driver Spotlight','Featured HLRN racer.','<div class="empty">Hosted data is still loading. Tap refresh and try again.</div>');return;}
  const recent=recentRowsFor(d.name,5), recentAvg=recent.length?(recent.reduce((a,r)=>a+num(r['Finish Position']),0)/recent.length).toFixed(1):'--';
  const body=`<article class="spotlight-hero"><div class="spotlight-number">${initials(d.name)}</div><small>FEATURED HLRN DRIVER</small><h3>${escapeHtml(d.name)}</h3><p>${d.races} Hosted starts • ${d.wins} wins • ${d.top5} Top 5s • ${d.lapsLed} laps led</p><div class="spotlight-stats"><b>${d.avgFinish.toFixed(1)}<span>CAREER AVG</span></b><b>${recentAvg}<span>LAST 5 AVG</span></b><b>${d.cleanRate.toFixed(1)}%<span>CLEAN</span></b><b>${d.top10}<span>TOP 10</span></b></div><button class="btn primary" onclick="openHostedDriverProfile('${encodeURIComponent(d.name)}')">FULL DRIVER PROFILE</button></article>`;
  featureShell('Driver Spotlight','A rotating featured racer powered by all Hosted career data.',body,'spotlight-page');
}

function recapLeagueGroups(league){
  if(league==='Hosted') return hostedRaceGroups();
  return raceGroupsForLeague(league);
}

function recapNormalizeRows(league,group){
  if(!group) return [];
  if(league==='Hosted'){
    return [...group.rows].map(r=>({
      driver:prettyName(String(r.Driver||'')),
      finish:num(r['Finish Position']),
      start:num(r['Start Position']),
      incidents:num(r.Incidents),
      lapsLed:num(r['Laps Led']),
      points:num(r.Points),
      track:String(r.Track||group.track||''),
      date:String(r['Race Date']||group.date||''),
      raceNo:0
    })).filter(r=>r.finish>0).sort((a,b)=>a.finish-b.finish);
  }
  return [...group.rows].map(r=>({
    driver:r.driver,
    finish:num(r.finish),
    start:num(r.start),
    incidents:num(r.incidents),
    lapsLed:num(r.lapsLed),
    points:num(r.points),
    track:String(r.track||group.track||''),
    date:String(r.date||group.date||''),
    raceNo:num(r.raceNo||group.raceNo)
  })).filter(r=>r.finish>0).sort((a,b)=>a.finish-b.finish);
}

function recapDriverTrend(league,driver,raceNo){
  if(league==='Hosted') return null;
  const rows=(state.results[league]||[])
    .filter(r=>r.driver===driver && (!raceNo || r.raceNo<=raceNo) && r.finish>0)
    .sort((a,b)=>a.raceNo-b.raceNo);
  if(!rows.length) return null;

  let winStreak=0;
  for(let i=rows.length-1;i>=0;i--){
    if(rows[i].finish===1) winStreak++;
    else break;
  }
  let top5Streak=0;
  for(let i=rows.length-1;i>=0;i--){
    if(rows[i].finish<=5) top5Streak++;
    else break;
  }
  const last5=rows.slice(-5);
  const winsLast5=last5.filter(r=>r.finish===1).length;
  const top5Last5=last5.filter(r=>r.finish<=5).length;
  const avgLast5=last5.length?last5.reduce((a,r)=>a+r.finish,0)/last5.length:0;
  return {starts:rows.length,winStreak,top5Streak,winsLast5,top5Last5,avgLast5,last5};
}

function recapIntelligenceLine(league,driver,raceNo){
  const t=recapDriverTrend(league,driver,raceNo);
  if(!t) return '';
  if(t.winStreak>=2) return `${driver} has now won ${t.winStreak} races in a row.`;
  if(t.winsLast5>=3) return `${driver} has won ${t.winsLast5} of the last ${Math.min(5,t.starts)} races.`;
  if(t.winsLast5===2) return `${driver} owns 2 wins in the last ${Math.min(5,t.starts)} races.`;
  if(t.top5Streak>=4) return `${driver} has finished in the Top 5 in ${t.top5Streak} straight races.`;
  if(t.top5Last5>=4) return `${driver} has ${t.top5Last5} Top-5 finishes in the last ${Math.min(5,t.starts)} races.`;
  return '';
}

function buildRaceRecap(league,group){
  const rows=recapNormalizeRows(league,group);
  if(!rows.length) return null;

  const podium=rows.slice(0,3);
  const winner=podium[0];
  const pole=[...rows].filter(r=>r.start>0).sort((a,b)=>a.start-b.start)[0]||winner;
  const led=[...rows].sort((a,b)=>b.lapsLed-a.lapsLed)[0]||winner;
  const mover=[...rows].sort((a,b)=>(b.start-b.finish)-(a.start-a.finish))[0]||winner;
  const faller=[...rows].sort((a,b)=>(a.start-a.finish)-(b.start-b.finish))[0]||winner;
  const clean=rows.filter(r=>r.incidents===0);
  const totalInc=rows.reduce((a,r)=>a+r.incidents,0);
  const totalLed=rows.reduce((a,r)=>a+r.lapsLed,0);
  const gain=mover.start>0?mover.start-mover.finish:0;
  const loss=faller.start>0?faller.finish-faller.start:0;
  const raceNo=league==='Hosted'?0:num(group.raceNo||winner.raceNo);
  const track=group.track||winner.track||'HLRN Race';
  const date=group.date||winner.date||'';
  const winnerTrend=recapIntelligenceLine(league,winner.driver,raceNo);
  const runnerTrend=podium[1]?recapIntelligenceLine(league,podium[1].driver,raceNo):'';

  const highlights=[];
  highlights.push(`${winner.driver} won at ${track}${podium[1]?`, beating ${podium[1].driver}`:''}${podium[2]?` and ${podium[2].driver}`:''}.`);
  if(winnerTrend) highlights.push(winnerTrend);
  if(led && led.lapsLed>0) highlights.push(`${led.driver} led a race-high ${led.lapsLed} laps.`);
  if(gain>0) highlights.push(`${mover.driver} was the biggest mover, climbing ${gain} positions from P${mover.start} to P${mover.finish}.`);
  if(clean.length) highlights.push(`${clean.length} driver${clean.length===1?'':'s'} finished with zero incidents.`);
  if(runnerTrend && runnerTrend!==winnerTrend) highlights.push(runnerTrend);

  const storyParts=[
    `${winner.driver} came away with the ${league==='Hosted'?'Hosted ':''}victory at ${track}, leading a ${rows.length}-driver finishing order.`,
    podium[1]&&podium[2]?`${podium[1].driver} finished second with ${podium[2].driver} completing the podium.`:'',
    pole?`${pole.driver} started from the best grid position${pole.start?` at P${pole.start}`:''}.`:'',
    led&&led.lapsLed>0?`${led.driver} spent the most time out front with ${led.lapsLed} laps led${totalLed?` out of ${totalLed} recorded laps led across the field`:''}.`:'',
    gain>0?`${mover.driver} delivered the charge of the race, gaining ${gain} spots from P${mover.start} to P${mover.finish}.`:'',
    loss>0&&faller.driver!==mover.driver?`${faller.driver} had the biggest drop in track position, falling ${loss} spots from P${faller.start} to P${faller.finish}.`:'',
    `${clean.length} drivers recorded zero incidents, while the field totaled ${totalInc} incidents.`,
    winnerTrend,
    runnerTrend&&runnerTrend!==winnerTrend?runnerTrend:''
  ].filter(Boolean);

  const shortRecap=`${league}${raceNo?` Race ${raceNo}`:''} — ${track}: ${winner.driver} takes the win${podium[1]?`, ${podium[1].driver} P2`:''}${podium[2]?`, ${podium[2].driver} P3`:''}. ${gain>0?`${mover.driver} gained ${gain} spots. `:''}${led&&led.lapsLed>0?`${led.driver} led ${led.lapsLed} laps. `:''}${winnerTrend}`.replace(/\s+/g,' ').trim();

  return {
    league,raceNo,track,date,rows,podium,winner,pole,led,mover,faller,clean,totalInc,totalLed,gain,loss,
    winnerTrend,runnerTrend,highlights,story:storyParts.join(' '),shortRecap
  };
}

function switchRecapLeague(league){
  state.recapLeague=league;
  state.recapRaceKey='';
  renderRecap();
}
function selectRecapRace(key){
  state.recapRaceKey=decodeURIComponent(key);
  renderRecap();
}
async function copyRecap(type='discord'){
  const recap=window.HLRN_ACTIVE_RECAP;
  if(!recap) return;
  const title=`HLRN ${recap.league}${recap.raceNo?` Race ${recap.raceNo}`:''} — ${recap.track}`;
  const podium=recap.podium.map((r,i)=>`P${i+1}: ${r.driver}`).join('\n');
  const highlights=recap.highlights.map(x=>`• ${x}`).join('\n');
  const text=type==='show'
    ? `${title}\n${recap.date}\n\nOPEN:\n${recap.winner.driver} gets the win at ${recap.track}.\n\nKEY TALKING POINTS:\n${highlights}\n\nFULL STORY:\n${recap.story}\n\nNEXT SEGMENT:\nUse the Race Intelligence page for Hot Driver, Driver To Watch and championship context.`
    : `🏁 ${title}\n${recap.date}\n\n🏆 PODIUM\n${podium}\n\n📊 RACE NOTES\n${highlights}\n\n${recap.shortRecap}\n\nHigh Line Racing Network`;
  try{
    await navigator.clipboard.writeText(text);
    const btn=document.querySelector(`[data-recap-copy="${type}"]`);
    if(btn){
      const old=btn.textContent; btn.textContent='COPIED ✓'; btn.classList.add('copied');
      setTimeout(()=>{btn.textContent=old;btn.classList.remove('copied')},1400);
    }
  }catch(e){ alert('Could not copy recap on this device.'); }
}

function renderRecap(){
  state.currentView='feature'; state.featureView='recap';
  const league=state.recapLeague||'Sunday';
  const groups=recapLeagueGroups(league);
  const selected=groups.find(g=>g.key===state.recapRaceKey)||groups[0];

  if(selected && !state.recapRaceKey) state.recapRaceKey=selected.key;
  const recap=buildRaceRecap(league,selected);

  const tabs=`<div class="tabs premium-tabs recap-league-tabs">
    <button class="${league==='Sunday'?'active':''}" onclick="switchRecapLeague('Sunday')">SUNDAY</button>
    <button class="${league==='Monday'?'active':''}" onclick="switchRecapLeague('Monday')">MONDAY</button>
    <button class="${league==='Hosted'?'active':''}" onclick="switchRecapLeague('Hosted')">HOSTED</button>
  </div>`;

  const raceSelector=groups.length?`<div class="recap-race-strip">${groups.slice(0,16).map(g=>`
    <button class="${selected?.key===g.key?'active':''}" onclick="selectRecapRace('${encodeURIComponent(g.key)}')">
      <small>${league==='Hosted'?'HOSTED':`RACE ${g.raceNo}`}</small>
      <strong>${escapeHtml(g.track||'Race')}</strong>
      <span>${escapeHtml(g.date||'')}</span>
    </button>`).join('')}</div>`:'';

  if(!recap){
    featureShell('Race Recap','Automatic Sunday, Monday and Hosted race stories.',`${tabs}${raceSelector}<div class="empty">No completed ${league} race results are loaded yet.</div>`,'recap-page');
    return;
  }

  window.HLRN_ACTIVE_RECAP=recap;

  const podiumHtml=recap.podium.map((r,i)=>`<article class="recap-podium-card place-${i+1}">
    <div class="recap-place">${i===0?'WINNER':`P${i+1}`}</div>
    <div class="recap-driver-mark">${initials(r.driver)}</div>
    ${driverLink(r.driver)}
    <span>Start P${r.start||'--'} • ${r.incidents} INC • ${r.lapsLed} led</span>
  </article>`).join('');

  const highlights=recap.highlights.map((h,i)=>`<div class="recap-highlight"><b>${String(i+1).padStart(2,'0')}</b><span>${escapeHtml(h)}</span></div>`).join('');

  const body=`${tabs}
    ${raceSelector}
    <section class="recap-hero premium-recap ${league.toLowerCase()}">
      <div><small>${league.toUpperCase()} • ${recap.raceNo?`RACE ${recap.raceNo}`:'LATEST HOSTED'} • AUTOMATIC RECAP</small>
      <h3>${escapeHtml(recap.track)}</h3>
      <span>${escapeHtml(recap.date)} • ${recap.rows.length} drivers • ${recap.totalInc} total incidents</span></div>
      <div class="recap-winner-badge"><small>WINNER</small><strong>${escapeHtml(recap.winner.driver)}</strong></div>
    </section>

    <div class="recap-podium-grid">${podiumHtml}</div>

    <div class="recap-detail-grid upgraded">
      <article><small>🏁 POLE / BEST START</small><strong>${escapeHtml(recap.pole?.driver||'--')}</strong><span>P${recap.pole?.start||'--'}</span></article>
      <article><small>💨 MOST LAPS LED</small><strong>${escapeHtml(recap.led?.driver||'--')}</strong><span>${recap.led?.lapsLed||0} laps</span></article>
      <article><small>↗ BIGGEST MOVER</small><strong>${escapeHtml(recap.mover?.driver||'--')}</strong><span>+${Math.max(0,recap.gain)} positions</span></article>
      <article><small>✨ CLEAN FINISHERS</small><strong>${recap.clean.length}</strong><span>zero-incident drivers</span></article>
    </div>

    <div class="section-head"><h3>Race Highlights</h3><span>AUTO-GENERATED</span></div>
    <section class="recap-highlights">${highlights}</section>

    <article class="recap-story upgraded">
      <div class="recap-story-head"><div><small>FULL RACE STORY</small><h3>${escapeHtml(recap.winner.driver)} wins at ${escapeHtml(recap.track)}</h3></div><span>HLRN</span></div>
      <p>${escapeHtml(recap.story)}</p>
    </article>

    ${recap.winnerTrend?`<section class="recap-intel-callout"><span>🔥</span><div><small>RACE INTELLIGENCE TAKEAWAY</small><strong>${escapeHtml(recap.winnerTrend)}</strong></div></section>`:''}

    <div class="recap-actions">
      <button class="btn primary" data-recap-copy="discord" onclick="copyRecap('discord')">COPY FOR DISCORD</button>
      <button class="btn" data-recap-copy="show" onclick="copyRecap('show')">COPY FOR THE SHOW</button>
      <button class="btn" onclick="state.resultsLeague='${league}';renderResults()">OPEN FULL RESULTS</button>
    </div>`;

  featureShell('Race Recap','Automatic race stories for Sunday, Monday and Hosted Racing — built from the actual results.',body,'recap-page');
}

function renderIncidentWatch(){
  const ds=hostedDriverStats().filter(d=>d.races>=10).sort((a,b)=>b.avgInc-a.avgInc);
  const clean=[...ds].sort((a,b)=>a.avgInc-b.avgInc).slice(0,5);
  const body=`<div class="incident-callout"><span>🚨</span><div><small>HIGHER NUMBER = MORE INCIDENTS</small><strong>Hosted Incident Watch</strong></div></div>
  <div class="incident-list">${ds.slice(0,25).map((d,i)=>`<article><b>${i+1}</b><div><strong>${escapeHtml(d.name)}</strong><span>${d.races} races • ${d.incidents} total</span></div><em>${d.avgInc.toFixed(1)}<small>AVG</small></em></article>`).join('')}</div>
  <div class="section-head"><h3>Cleanest Regulars</h3><span>Minimum 10 Hosted starts</span></div>
  <div class="clean-grid">${clean.map(d=>`<button onclick="openHostedDriverProfile('${encodeURIComponent(d.name)}')"><strong>${escapeHtml(d.name)}</strong><span>${d.avgInc.toFixed(1)} avg inc</span></button>`).join('')}</div>`;
  featureShell('Incident Watch','Career Hosted incident averages for drivers with at least 10 starts.',body,'incidents-page');
}

function achievementLevel(d){
  const awards=[];
  if(d.races>=1)awards.push(['🏁','First Start']);
  if(d.wins>=1)awards.push(['🏆','Race Winner']);
  if(d.wins>=5)awards.push(['🔥','5 Wins']);
  if(d.wins>=10)awards.push(['👑','10 Wins']);
  if(d.races>=25)awards.push(['25','25 Starts']);
  if(d.races>=50)awards.push(['50','50 Starts']);
  if(d.races>=100)awards.push(['100','100 Starts']);
  if(d.lapsLed>=100)awards.push(['💨','100 Laps Led']);
  if(d.top10>=25)awards.push(['🎯','25 Top 10s']);
  if(d.cleanRate>=50&&d.races>=5)awards.push(['✨','Clean Racer']);
  return awards;
}
function renderAchievements(){
  const ds=hostedDriverStats().map(d=>({...d,awards:achievementLevel(d)})).sort((a,b)=>b.awards.length-a.awards.length||b.wins-a.wins);
  const body=`<div class="achievement-board">${ds.slice(0,30).map((d,i)=>`<article><header><b>${i+1}</b><div><strong>${escapeHtml(d.name)}</strong><span>${d.awards.length} achievements</span></div></header><div class="achievement-icons">${d.awards.length?d.awards.map(a=>`<span title="${escapeHtml(a[1])}">${a[0]}<small>${escapeHtml(a[1])}</small></span>`).join(''):'<em>Keep racing to unlock milestones</em>'}</div></article>`).join('')}</div>`;
  featureShell('Achievements','Career badges and milestones earned in Hosted Racing.',body,'achievements-page');
}

function renderFavorites(){
  const ds=hostedDriverStats().filter(d=>isFavorite(d.name));
  const body=ds.length?`<div class="favorite-list">${ds.map(d=>`<article><button class="favorite-star saved" onclick="toggleFavorite('${encodeURIComponent(d.name)}');renderFavorites()">★</button><div><strong>${escapeHtml(d.name)}</strong><span>${d.races} races • ${d.wins} wins • ${d.top10} Top 10s</span></div><button onclick="openHostedDriverProfile('${encodeURIComponent(d.name)}')">PROFILE ›</button></article>`).join('')}</div>`:`<section class="coming-live"><span>★</span><h3>No favorite drivers yet</h3><p>Go to Drivers and tap the star beside any Hosted driver. They will show up here on this device.</p><button class="btn primary" onclick="setView('drivers')">CHOOSE FAVORITES</button></section>`;
  featureShell('Favorite Drivers','Your personal HLRN watch list, saved on this device.',body,'favorites-page');
}

function shareDriverCardName(){
  return hostedDriverStats().sort((a,b)=>b.wins-a.wins)[0]?.name||'';
}
async function shareDriverStats(name){
  const d=compareDriver(name); if(!d)return;
  const text=`HLRN Driver Card — ${d.name}\n${d.races} Hosted starts • ${d.wins} wins • ${d.top5} Top 5s • ${d.top10} Top 10s • ${d.avgFinish.toFixed(1)} avg finish`;
  try{if(navigator.share){await navigator.share({title:`HLRN — ${d.name}`,text});}else{await navigator.clipboard.writeText(text);alert('Driver stats copied to your clipboard.');}}catch(e){}
}
function renderShareCards(chosen=''){
  const ds=hostedDriverStats().sort((a,b)=>a.name.localeCompare(b.name));
  const name=chosen||document.querySelector('#shareDriver')?.value||state.shareDriver||shareDriverCardName();
  const d=compareDriver(name)||ds[0]; if(d)state.shareDriver=d.name;
  const select=`<select id="shareDriver" onchange="state.shareDriver=this.value;renderShareCards(this.value)">${ds.map(x=>`<option ${d&&x.name===d.name?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select>`;
  const body=d?`${select}<article class="share-stat-card" id="shareStatCard"><div class="share-brand">HLRN <span>DRIVER CARD</span></div><div class="share-driver-mark">${initials(d.name)}</div><small>HIGH LINE RACING NETWORK • HOSTED CAREER</small><h3>${escapeHtml(d.name)}</h3><div class="share-card-stats"><b>${d.races}<span>STARTS</span></b><b>${d.wins}<span>WINS</span></b><b>${d.top5}<span>TOP 5</span></b><b>${d.avgFinish.toFixed(1)}<span>AVG FIN</span></b></div><footer>RACING PEOPLE TOGETHER</footer></article><div class="share-actions"><button class="btn primary" onclick="shareDriverStats('${encodeURIComponent(d.name)}'.includes('%')?decodeURIComponent('${encodeURIComponent(d.name)}'):'${escapeHtml(d.name)}')">SHARE DRIVER STATS</button><button class="btn" onclick="openHostedDriverProfile('${encodeURIComponent(d.name)}')">OPEN PROFILE</button></div><p class="feature-note">The card now stays on the selected driver. Use Share Driver Stats for the phone share sheet, then screenshot the card for a graphic post.</p>`:'<div class="empty">No driver data loaded.</div>';
  featureShell('Share Cards','Working screenshot-ready HLRN driver cards with native sharing.',body,'sharecards-page');
}


function isStandaloneApp(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
}
function isIOSDevice(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function pushSupported(){
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
async function getPushSubscription(){
  if(!pushSupported()) return null;
  const reg=await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

function defaultPushPrefs(){
  return {announcements:true,reminders:true,results:true,schedule:true,recaps:true,sunday:true,monday:true,hosted:true};
}
function getPushPrefs(){
  try{
    const saved=JSON.parse(localStorage.getItem('hlrnPushPrefs')||'null');
    return {...defaultPushPrefs(),...(saved||{})};
  }catch(e){
    return defaultPushPrefs();
  }
}
function getPushTopics(){
  const p=getPushPrefs();
  return ['prefs-v2',...Object.keys(p).filter(k=>p[k])];
}
async function savePushPrefs(nextPrefs){
  localStorage.setItem('hlrnPushPrefs',JSON.stringify(nextPrefs));
  const sub=await getPushSubscription().catch(()=>null);
  if(sub){
    const r=await fetch(HLRN_PUSH.worker+'/subscribe',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscription:sub.toJSON(),topics:getPushTopics()})
    });
    if(!r.ok) throw new Error('Could not update notification preferences');
  }
}
async function togglePushPref(key){
  const p=getPushPrefs();
  p[key]=!p[key];
  try{
    await savePushPrefs(p);
    renderNotifications();
  }catch(e){
    alert('Could not update notification preferences right now.');
  }
}
function pushPrefRow(key,icon,title,desc,accent=''){
  const p=getPushPrefs();
  return `<button class="push-pref-row ${accent}" onclick="togglePushPref('${key}')">
    <span class="push-pref-icon">${icon}</span>
    <div><strong>${title}</strong><small>${desc}</small></div>
    <span class="push-switch ${p[key]?'on':''}"><i></i></span>
  </button>`;
}

async function refreshPushStatus(){
  if(!pushSupported()){ state.pushStatus='UNSUPPORTED'; return; }
  if(isIOSDevice() && !isStandaloneApp()){ state.pushStatus='ADD_TO_HOME'; return; }
  if(Notification.permission==='denied'){ state.pushStatus='BLOCKED'; return; }
  const sub=await getPushSubscription().catch(()=>null);
  state.pushStatus=sub?'ENABLED':(Notification.permission==='granted'?'READY':'OFF');
  if(sub){
    fetch(HLRN_PUSH.worker+'/subscribe',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscription:sub.toJSON(),topics:getPushTopics()})
    }).catch(()=>{});
  }
}
async function enablePushNotifications(){
  if(!pushSupported()){
    alert('Push notifications are not supported on this device/browser.');
    return;
  }
  if(isIOSDevice() && !isStandaloneApp()){
    alert('On iPhone, add HLRN to your Home Screen first, open it from the HLRN icon, then enable notifications.');
    return;
  }
  try{
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){
      state.pushStatus=permission==='denied'?'BLOCKED':'OFF';
      renderNotifications();
      return;
    }
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(HLRN_PUSH.publicKey)
      });
    }
    const response=await fetch(HLRN_PUSH.worker+'/subscribe',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscription:sub.toJSON(),topics:getPushTopics()})
    });
    if(!response.ok) throw new Error('Push server '+response.status);
    state.pushStatus='ENABLED';
    if('setAppBadge' in navigator) navigator.setAppBadge(0).catch(()=>{});
    renderNotifications();
  }catch(err){
    console.warn('HLRN push subscribe failed:',err);
    state.pushStatus='ERROR';
    renderNotifications();
  }
}
async function disablePushNotifications(){
  try{
    const sub=await getPushSubscription();
    if(sub){
      await fetch(HLRN_PUSH.worker+'/subscribe',{
        method:'DELETE',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({endpoint:sub.endpoint})
      }).catch(()=>{});
      await sub.unsubscribe();
    }
    state.pushStatus='OFF';
    renderNotifications();
  }catch(err){
    state.pushStatus='ERROR';
    renderNotifications();
  }
}
async function sendTestNotification(){
  try{
    const sub=await getPushSubscription();
    if(!sub){ alert('Enable notifications first.'); return; }
    const r=await fetch(HLRN_PUSH.worker+'/test',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({endpoint:sub.endpoint})
    });
    if(!r.ok) throw new Error('Test failed');
  }catch(err){
    alert('Test notification could not be sent yet. Make sure the HLRN Push Worker is deployed.');
  }
}
function pushStatusCopy(){
  if(state.pushStatus==='ENABLED') return ['ON','Phone alerts are enabled. Choose exactly which HLRN alerts you want below.'];
  if(state.pushStatus==='ADD_TO_HOME') return ['IPHONE SETUP','Add HLRN to your Home Screen, then open the app and enable notifications.'];
  if(state.pushStatus==='BLOCKED') return ['BLOCKED','Notifications are blocked in your device settings.'];
  if(state.pushStatus==='UNSUPPORTED') return ['NOT SUPPORTED','This browser does not support Web Push.'];
  if(state.pushStatus==='ERROR') return ['CONNECTION ISSUE','The push server is not connected yet.'];
  return ['OFF','Turn on phone alerts for new official HLRN announcements.'];
}

function renderNotifications(){
  const nextSun=state.nextRaces.Sunday,nextMon=state.nextRaces.Monday;
  const push=pushStatusCopy();
  const raceItems=[
    {icon:'S',type:'NEXT SUNDAY',title:nextSun.track,text:`${nextSun.date} • ${nextSun.time}`,cls:'sun'},
    {icon:'M',type:'NEXT MONDAY',title:nextMon.track,text:`${nextMon.date} • ${nextMon.time}`,cls:'mon'}
  ];
  const bulletinHtml=state.announcements.slice(0,15).map((a,i)=>`<article class="notification-bulletin ${i===0?'latest':''}" ${a.jumpUrl?`onclick="openSocial('${escapeHtml(a.jumpUrl)}')"`:''}>
    <div class="notification-avatar">${a.avatar?`<img src="${escapeHtml(a.avatar)}" alt="">`:'HLRN'}</div>
    <div><small>${i===0?'LATEST OFFICIAL BULLETIN':escapeHtml(a.author||'HLRN')}</small><strong>${escapeHtml(a.title)}</strong><p>${escapeHtml(a.text)}</p><em>${escapeHtml(a.time)}</em></div>
    ${a.jumpUrl?'<b>›</b>':''}
  </article>`).join('');
  const pushActions=state.pushStatus==='ENABLED'
    ? `<button class="push-test" onclick="sendTestNotification()">TEST ALERT</button><button class="push-disable" onclick="disablePushNotifications()">TURN OFF</button>`
    : `<button class="push-enable" onclick="enablePushNotifications()">ENABLE PHONE ALERTS</button>`;
  const body=`<section class="push-control ${state.pushStatus==='ENABLED'?'enabled':''}">
    <div class="push-bell">🔔</div><div><small>HLRN PUSH NOTIFICATIONS</small><strong>${push[0]}</strong><p>${push[1]}</p></div><div class="push-actions">${pushActions}</div>
  </section>
  <section class="push-preferences">
    <div class="push-pref-head"><div><small>NOTIFICATION PREFERENCES</small><strong>Choose Your Alerts</strong></div><span>1 HR + 15 MIN RACE REMINDERS</span></div>
    ${pushPrefRow('announcements','📣','Announcements','Official HLRN Discord announcements')}
    ${pushPrefRow('reminders','⏱️','Race Reminders','1-hour and 15-minute race alerts')}
    ${pushPrefRow('results','🏆','Results Posted','New Sunday, Monday and Hosted race results')}
    ${pushPrefRow('schedule','🗓️','Schedule Changes','Alerts when HLRN schedule data changes')}
    ${pushPrefRow('recaps','📝','New Race Recap','Automatic recap is ready after new results')}
    <div class="push-pref-divider"><span>LEAGUES</span></div>
    ${pushPrefRow('sunday','S','Sunday League','Receive Sunday-specific alerts','sun')}
    ${pushPrefRow('monday','M','Monday League','Receive Monday-specific alerts','mon')}
    ${pushPrefRow('hosted','H','Hosted Racing','Receive Hosted-specific alerts','hosted')}
  </section>
  <section class="notification-status"><span class="${state.announcementsStatus==='LIVE'?'live':''}"></span><div><small>DISCORD ANNOUNCEMENT BRIDGE</small><strong>${escapeHtml(state.announcementsStatus)}</strong></div><div class="auto-sync-note compact"><i></i>AUTO SYNC</div></section>
  <div class="notification-races">${raceItems.map(x=>`<article class="${x.cls}"><b>${x.icon}</b><div><small>${x.type}</small><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.text)}</span></div></article>`).join('')}</div>
  <div class="section-head"><h3>Official Bulletins</h3><span>${state.announcements.length} loaded</span></div>
  <div class="notification-list">${bulletinHtml||'<div class="empty">Connecting to HLRN announcements…</div>'}</div>`;
  featureShell('Notifications','Live race dates, official HLRN bulletins and phone push alerts.',body,'notifications-page');
  refreshPushStatus().then(()=>{
    const current=document.querySelector('.push-control');
    if(current && state.currentView==='feature' && state.featureView==='notifications'){
      const status=current.querySelector('strong');
      if(status) status.textContent=pushStatusCopy()[0];
    }
  }).catch(()=>{});
}
function ruleMatches(section,query){
  if(!query) return true;
  const hay=[section.title,...section.rules.flatMap(r=>[r.title,...r.lines])].join(' ').toLowerCase();
  return hay.includes(query.toLowerCase());
}

function filterRulesInPlace(query=''){
  state.rulesQuery=query;
  const q=String(query||'').trim().toLowerCase();
  const sections=[...document.querySelectorAll('.rulebook-section')];
  let visibleRules=0;

  sections.forEach(section=>{
    const rules=[...section.querySelectorAll('.rulebook-rule')];
    let sectionVisible=0;

    rules.forEach(rule=>{
      const hay=String(rule.dataset.ruleSearch||rule.textContent||'').toLowerCase();
      const match=!q || hay.includes(q);
      rule.style.display=match?'':'none';
      if(match){sectionVisible++;visibleRules++;}
    });

    section.style.display=sectionVisible?'':'none';
    if(q && sectionVisible) section.classList.add('open');

    const arrow=section.querySelector('.rulebook-section-head b');
    if(arrow) arrow.textContent=section.classList.contains('open')?'⌃':'⌄';
  });

  const meta=document.querySelector('.rule-search-meta');
  if(meta){
    meta.innerHTML=`<strong>${visibleRules}</strong> ${q?'matching rules':'rules indexed'} • Published HLRN rulebook`;
  }

  let empty=document.querySelector('.rule-search-empty');
  const rulebook=document.querySelector('.rulebook');
  if(!visibleRules && q){
    if(!empty && rulebook){
      empty=document.createElement('div');
      empty.className='empty rule-search-empty';
      empty.textContent='No rules match that search.';
      rulebook.appendChild(empty);
    }
  }else if(empty){
    empty.remove();
  }
}


function toggleRuleSection(btn){
  const section=btn?.closest('.rulebook-section');
  if(!section) return;
  section.classList.toggle('open');

  const arrow=btn.querySelector('b');
  if(arrow){
    arrow.textContent=section.classList.contains('open')?'⌃':'⌄';
  }
}

function renderRules(query=''){
  state.rulesQuery=query;
  const q=String(query||'').trim().toLowerCase();
  const sections=(typeof HLRN_RULES!=='undefined'?HLRN_RULES:[]);
  let matchCount=0;
  const sectionHtml=sections.map((s,si)=>{
    const rules=s.rules;
    matchCount+=rules.length;
    return `<section class="rulebook-section" data-rule-section="${si}"><button type="button" class="rulebook-section-head" onclick="toggleRuleSection(this)"><span>${si+1}</span><div><small>OFFICIAL HLRN RULEBOOK</small><strong>${escapeHtml(s.title.replace(/^Section\s*\d+\s*\|\s*/i,''))}</strong></div><b>⌄</b></button><div class="rulebook-rules">${rules.map(r=>`<article class="rulebook-rule" data-rule-search="${escapeHtml([r.title,...r.lines].join(' ').toLowerCase())}"><h3>${escapeHtml(r.title)}</h3>${r.lines.map(line=>`<p>${escapeHtml(line)}</p>`).join('')}</article>`).join('')}</div></section>`;
  }).join('');
  const body=`<section class="rules-command"><div><small>OFFICIAL RULE BOOK</small><strong>7 SECTIONS</strong><span>48 HR protest window • 3 wreck levels • 2 GWC attempts</span></div><button onclick="openFeature('admin')">RACE CONTROL ›</button></section>
  <div class="rule-search"><input id="ruleSearchInput" value="${escapeHtml(query)}" placeholder="Search caution, restart, yellow line, protest..." oninput="filterRulesInPlace(this.value)"><span>⌕</span></div>
  <div class="rule-search-meta"><strong>${matchCount}</strong> ${q?'matching rules':'rules indexed'} • Published HLRN rulebook</div>
  <div class="rulebook">${sectionHtml||'<div class="empty">No rules match that search.</div>'}</div>`;
  featureShell('Official Rules','Full searchable HLRN rulebook — conduct, procedures, penalties, protests, championship, broadcast and officials.',body,'rules-page');
  if(query){
    requestAnimationFrame(()=>{
      filterRulesInPlace(query);
      const input=document.querySelector('#ruleSearchInput');
      if(input){
        input.focus();
        const end=input.value.length;
        input.setSelectionRange(end,end);
      }
    });
  }
}

function renderAdmin(){
  const body=`<section class="admin-command"><div class="admin-status"><span></span><div><small>HLRN RACE CONTROL</small><strong>Operations Center</strong></div></div>
  <div class="admin-tools">
    <button onclick="openFeature('rules')"><span>📕</span><strong>Official Rulebook</strong><small>Search all 7 published rule sections</small></button>
    <button onclick="setView('schedule')"><span>🗓️</span><strong>Schedule Control</strong><small>Sunday Week ${seasonWeek('Sunday')} • Monday Week ${seasonWeek('Monday')}</small></button>
    <button onclick="openFeature('incidents')"><span>🚨</span><strong>Incident Watch</strong><small>Hosted incident review and clean-racing data</small></button>
    <button onclick="openFeature('racestats')"><span>📊</span><strong>Race Intelligence</strong><small>Latest Hosted race breakdown</small></button>
    <button onclick="openFeature('notifications')"><span>🔔</span><strong>Official Bulletins</strong><small>Live Discord-connected announcements</small></button>
    <button onclick="openSocial(state.links['HLRN Website']||'https://sites.google.com/view/highlineracingnetwork/home')"><span>🌐</span><strong>HLRN Website</strong><small>Open official network site</small></button>
  </div>
  <div class="admin-note"><strong>PUBLIC RACE CONTROL REFERENCE</strong><p>The app shows published rules, schedules, incidents and official bulletins. Private steward notes and private administrative information are not exposed.</p></div></section>`;
  featureShell('Race Control','Official rules, race-week operations, incident intelligence and HLRN bulletins.',body,'admin-page');
}

function renderFeature(name){
  const map={
    records:renderRecords,headtohead:renderHeadToHead,racestats:renderRaceStats,power:renderPowerRankings,
    tracks:renderTrackHub,teams:renderTeams,spotlight:renderSpotlight,recap:renderRecap,incidents:renderIncidentWatch,
    achievements:renderAchievements,favorites:renderFavorites,sharecards:renderShareCards,notifications:renderNotifications,
    rules:renderRules,admin:renderAdmin
  };
  (map[name]||renderRecords)();
}

function renderSocials(){
  state.currentView='socials';
  const youtubeLogo = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z"/></svg>`;
  const facebookLogo = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.7 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.5c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.3H6.8V13h3.1v9h3.8Z"/></svg>`;
  const discordLogo = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.5 5.3A17.2 17.2 0 0 0 15.3 4l-.5 1a15.6 15.6 0 0 0-5.6 0l-.5-1a17 17 0 0 0-4.2 1.3C1.8 9.3 1.1 13.2 1.5 17a17 17 0 0 0 5.2 2.6l1.3-1.8-1.9-.9.5-.4c3.6 1.7 7.5 1.7 11 0l.6.4-2 .9 1.3 1.8a17 17 0 0 0 5.1-2.6c.6-4.4-.9-8.3-3.1-11.7ZM8.3 14.7c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm7.4 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z"/></svg>`;
  const globeLogo = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.2-2.4 3.4-5.4 3.4-9S14.2 5.4 12 3c-2.2 2.4-3.4 5.4-3.4 9s1.2 6.6 3.4 9ZM3.5 9h17M3.5 15h17"/></svg>`;
  app.innerHTML=`${networkBar()}<div class="page-title-row premium-page-head socials-head"><div><span class="page-kicker">HIGH LINE RACING NETWORK</span><h2 class="page-title">Socials</h2><p class="page-sub">Stay connected • Follow • Join • Be part of HLRN</p></div>${liveBadge()}</div>
    <section class="socials-intro-card"><div class="socials-intro-mark">HLRN</div><div><small>RACING BRINGS US TOGETHER</small><strong>Connect with the HLRN community</strong></div></section>
    <div class="section-head socials-section-head"><h3>Watch HLRN</h3><span>YOUTUBE</span></div>
    <div class="social-grid">
      <button class="social-card youtube-card" onclick="openSocial('https://www.youtube.com/@High_Line_Racing')"><span class="social-platform-icon">${youtubeLogo}</span><span class="social-card-copy"><small>YOUTUBE</small><strong>High Line Racing Network</strong><em>Races • Highlights • HLRN content</em></span><span class="social-go">›</span></button>
      <button class="social-card youtube-card" onclick="openSocial('https://www.youtube.com/@rsibroadcasting')"><span class="social-platform-icon">${youtubeLogo}</span><span class="social-card-copy"><small>YOUTUBE</small><strong>RSI Broadcasting</strong><em>Live races • Replays • Monday League</em></span><span class="social-go">›</span></button>
    </div>
    <div class="section-head socials-section-head community-head"><h3>Join the Community</h3><span>CONNECT</span></div>
    <div class="social-grid">
      <button class="social-card facebook-card" onclick="openSocial('https://www.facebook.com/share/1F8o3B6HV2/?mibextid=wwXIfr')"><span class="social-platform-icon">${facebookLogo}</span><span class="social-card-copy"><small>FACEBOOK</small><strong>HLRNZone</strong><em>News • Discussions • Community</em></span><span class="social-go">›</span></button>
      <button class="social-card discord-card" onclick="openSocial('https://discord.gg/cJhxrChaV')"><span class="social-platform-icon">${discordLogo}</span><span class="social-card-copy"><small>DISCORD</small><strong>HLRN Hangout</strong><em>Chat • Race talk • HLRN community</em></span><span class="social-go">›</span></button>
      <button class="social-card website-card" onclick="openSocial(state.links['HLRN Website'] || 'https://sites.google.com/view/highlineracingnetwork/home')"><span class="social-platform-icon">${globeLogo}</span><span class="social-card-copy"><small>OFFICIAL WEBSITE</small><strong>High Line Racing Network</strong><em>Schedules • Results • Driver profiles • More</em></span><span class="social-go">›</span></button>
    </div>
    <div class="socials-footer-line"><span></span>RACING BRINGS US TOGETHER<span></span></div>`;
}

function openSocial(url){
  if(!url)return;
  try{
    // Same-context navigation avoids iOS's blank external-browser sheet.
    // Browser history keeps HLRN directly behind the external page.
    window.location.assign(url);
  }catch(e){
    window.location.href=url;
  }
}
function openLink(name){
  const url=state.links[name];
  if(url) openSocial(url);
}

// Google Visualization JSONP loader: works without exposing any API keys.
function loadGviz(sheetId, sheetName, range){
  return new Promise((resolve,reject)=>{
    const cb=`hlrn_cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const timer=setTimeout(()=>{cleanup(); reject(new Error('timeout'));},12000);
    function cleanup(){ clearTimeout(timer); delete window[cb]; script.remove(); }
    window[cb]=(payload)=>{ cleanup(); if(payload && payload.table) resolve(payload.table); else reject(new Error('bad response')); };
    const script=document.createElement('script');
    const tqx=encodeURIComponent(`out:json;responseHandler:${cb}`);
    script.src=`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&range=${encodeURIComponent(range)}&headers=1&tqx=${tqx}&_=${Date.now()}`;
    script.onerror=()=>{cleanup();reject(new Error('load failed'));}; document.head.appendChild(script);
  });
}
function tableRows(table){
  const headers=(table.cols||[]).map(c=>String(c.label||c.id||'').trim());
  return (table.rows||[]).map(r=>{ const o={}; headers.forEach((h,i)=>{ if(!h) return; const cell=r.c&&r.c[i]; o[h]=cell?(cell.f ?? cell.v ?? ''):''; }); return o; });
}

function normalizeStandings(rows){
  return rows.filter(r=>r.Driver).map(r=>({
    name:prettyName(String(r.Driver)), rank:Number(r.Rank)||0, change:Number(r.Change)||0, points:Number(r.Points)||0,
    races:Number(r.Races)||0, wins:Number(r.Wins)||0, top5:Number(r['Top 5'])||0, top10:Number(r['Top 10'])||0,
    avgFinish:Number(r['Avg Finish'])||0, driverId:String(r['Driver ID']||'')
  })).sort((a,b)=>a.rank-b.rank);
}
function normalizeResults(rows, driverMap){
  return rows.filter(r=>Number(r['Race #'])>0).map(r=>({
    raceNo:Number(r['Race #'])||0,
    driverId:String(r['Driver ID']||''),
    driver:driverMap[String(r['Driver ID'])]||prettyName(String(r.Driver||''))||`Driver ${r['Driver ID']}`,
    finish:Number(r.Finish)||0, start:Number(r.Start)||0, points:Number(r.Points)||0,
    track:String(r.Track||''), date:String(r.Date||''), incidents:Number(r.Incidents)||0, lapsLed:Number(r['Laps Led'])||0
  })).sort((a,b)=>b.raceNo-a.raceNo || a.finish-b.finish);
}

function latestLeagueRace(league){
  const rows=state.results[league]||[];
  if(!rows.length) return [];
  const maxRace=Math.max(...rows.map(r=>r.raceNo||0));
  return rows.filter(r=>r.raceNo===maxRace).sort((a,b)=>a.finish-b.finish);
}
function buildDrivers(){
  const map=new Map();
  ['Sunday','Monday'].forEach(league=>state.standings[league].forEach(d=>{
    const cur=map.get(d.name)||{name:d.name,leagues:[],wins:0,points:0};
    cur.leagues.push(league); cur.wins+=d.wins; cur.points+=d.points; map.set(d.name,cur);
  }));
  state.drivers=[...map.values()].map(d=>({...d,leagues:d.leagues.join(' + ')})).sort((a,b)=>a.name.localeCompare(b.name));
}
function applySchedule(rows){
  // The full league schedules are built into the app from the official HLRN schedule.
  // The Config sheet can still supply times/links without replacing the 16-race schedules.
  ['Sunday','Monday'].forEach(league=>{
    const now=new Date(); now.setHours(0,0,0,0);
    const upcoming=FULL_SCHEDULE[league].find(r=>new Date(`${r.date}T12:00:00`)>=now);
    if(upcoming){
      const timeRow=(rows||[]).find(r=>String(r.League||'')===league && String(r.Date||'')===upcoming.date);
      const time=String(timeRow?.Time||'8:30 PM EST');
      const d=new Date(`${upcoming.date}T20:30:00-04:00`);
      state.nextRaces[league]={date:d.toLocaleString('en-US',{month:'short',day:'numeric'}).toUpperCase(),iso:d.toISOString(),track:upcoming.track,series:`${league} League`,time,broadcast:state.links[`${league} Broadcast`]||''};
    }
  });
}


function loadEndpointJsonp(url){
  return new Promise((resolve,reject)=>{
    const callback='HLRNAPP_'+Date.now()+'_'+Math.floor(Math.random()*100000);
    const script=document.createElement('script');
    const timer=setTimeout(()=>cleanup(new Error('Team standings timed out')),12000);
    function cleanup(err,data){
      clearTimeout(timer);
      try{delete window[callback]}catch(e){window[callback]=undefined}
      script.remove();
      if(err) reject(err); else resolve(data);
    }
    window[callback]=(data)=>cleanup(null,data);
    script.onerror=()=>cleanup(new Error('Team standings connection failed'));
    const sep=url.includes('?')?'&':'?';
    script.src=url+sep+'callback='+encodeURIComponent(callback)+'&_='+Date.now();
    document.head.appendChild(script);
  });
}

function normalizeTeamRows(payload){
  const source=Array.isArray(payload)?payload:
    Array.isArray(payload?.teams)?payload.teams:
    Array.isArray(payload?.data)?payload.data:[];
  return source.map((t,i)=>{
    if(Array.isArray(t)){
      return {name:String(t[0]||`Team ${i+1}`),points:Number(t[1]||0),wins:Number(t[2]||0),top5:Number(t[3]||0),drivers:String(t[4]||'')};
    }
    return {
      name:String(t.team||t.Team||t.name||t.Name||`Team ${i+1}`),
      points:Number(t.points||t.Points||t.pts||0),
      wins:Number(t.wins||t.Wins||0),
      top5:Number(t.top5||t['Top 5']||t.top_5||0),
      drivers:String(t.drivers||t.Drivers||t.roster||'')
    };
  }).filter(t=>t.name && t.name!=='undefined').sort((a,b)=>b.points-a.points);
}

async function refreshTeamStandings(){
  const base=HLRN_ENDPOINTS.leagueApi;
  const [su,mo]=await Promise.allSettled([
    loadEndpointJsonp(base+'?action=teams&league=sunday'),
    loadEndpointJsonp(base+'?action=teams&league=monday')
  ]);
  if(su.status==='fulfilled') state.teamStandings.Sunday=normalizeTeamRows(su.value);
  if(mo.status==='fulfilled') state.teamStandings.Monday=normalizeTeamRows(mo.value);
}


function plainDiscordText(v){
  return String(v||'').replace(/\*\*/g,'').replace(/\*/g,'').replace(/\s+/g,' ').trim();
}
function discordAnnouncementTime(ts){
  if(!ts) return '';
  const d=new Date(ts);
  if(Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
async function refreshDiscordAnnouncements(){
  try{
    const r=await fetch(HLRN_ENDPOINTS.announcements+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data=await r.json();
    const rows=Array.isArray(data?.announcements)?data.announcements:[];
    if(!data?.success && !rows.length) throw new Error(data?.error||'Announcement feed unavailable');
    state.announcements=rows.map((a,i)=>({
      tag:i===0?'LATEST':'HLRN',
      title:a?.author?.username?`${a.author.username} • HLRN`:'HLRN Announcement',
      text:plainDiscordText(a.content || a?.embeds?.[0]?.description || a?.embeds?.[0]?.title || ''),
      time:discordAnnouncementTime(a.timestamp),
      jumpUrl:a.jump_url||'',
      author:a?.author?.username||'HLRN',
      avatar:a?.author?.avatar||''
    })).filter(a=>a.text||a.title);
    state.announcementsStatus='LIVE';
  }catch(e){
    state.announcementsStatus='OFFLINE';
  }
}

async function refreshLiveData(rerender=true){
  state.liveStatus='Connecting…';
  try{
    const [sunT,monT,sunRT,monRT,newsT,scheduleT,configT,linksT]=await Promise.all([
      loadGviz(LIVE.standingsSheet,'Sunday Drivers','A1:J250'), loadGviz(LIVE.standingsSheet,'Monday Drivers','A1:J250'),
      loadGviz(LIVE.standingsSheet,'Sunday Results','A1:K1000'), loadGviz(LIVE.standingsSheet,'Monday Results','A1:K1000'),
      loadGviz(LIVE.newsroomSheet,'News','A4:J250'), loadGviz(LIVE.configSheet,'Schedule','A1:E250'),
      loadGviz(LIVE.configSheet,'Config','A1:B100'), loadGviz(LIVE.configSheet,'Links','A1:B100')
    ]);
    state.standings.Sunday=normalizeStandings(tableRows(sunT));
    state.standings.Monday=normalizeStandings(tableRows(monT));
    const idMap={}; [...state.standings.Sunday,...state.standings.Monday].forEach(d=>{if(d.driverId) idMap[d.driverId]=d.name;});
    state.results.Sunday=normalizeResults(tableRows(sunRT),idMap); state.results.Monday=normalizeResults(tableRows(monRT),idMap);
    state.latestResults=['Sunday','Monday'].map(league=>{const latest=latestLeagueRace(league); const r=latest[0]; return r?{league,track:r.track,winner:r.driver,date:r.date,raceNo:r.raceNo}:null;}).filter(Boolean);
    const newsRows=tableRows(newsT);
    state.announcements=newsRows.filter(r=>String(r.Publish).toUpperCase()==='TRUE').map(r=>({tag:r.Category||'NEWS',title:r.Title||'HLRN Update',text:r.Summary||'',time:r.Date||''})).reverse();
    if(!state.announcements.length) state.announcements=JSON.parse(JSON.stringify(fallback.announcements));
    const linkRows=tableRows(linksT); state.links={}; linkRows.forEach(r=>{ if(r.Name) state.links[String(r.Name)]=String(r.URL||''); });
    const cfg=tableRows(configT); cfg.forEach(r=>{ if(r.Key==='App Version' && r.Value) state.appVersion=String(r.Value); });
    applySchedule(tableRows(scheduleT)); buildDrivers();
    state.liveStatus='LIVE'; state.lastUpdated=Date.now();
  }catch(err){
    console.warn('HLRN live data connection failed:',err);
    state.liveStatus='OFFLINE DATA';
    // Keep the built-in fallback so the app remains usable.
    buildDrivers();
  }
  await Promise.allSettled([refreshDiscordAnnouncements(),refreshTeamStandings()]);
  if(rerender) rerenderCurrent();
}


const HLRN_AUTO_REFRESH={
  liveEvery:180000,      // 3 minutes
  hostedEvery:600000,    // 10 minutes
  lastLive:0,
  lastHosted:0,
  liveBusy:false,
  hostedBusy:false
};

function inputIsActive(){
  const el=document.activeElement;
  return !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

async function autoRefreshLive(force=false){
  if(document.visibilityState==='hidden' || HLRN_AUTO_REFRESH.liveBusy) return;
  if(!force && Date.now()-HLRN_AUTO_REFRESH.lastLive<HLRN_AUTO_REFRESH.liveEvery) return;
  HLRN_AUTO_REFRESH.liveBusy=true;
  try{
    // Silent refresh avoids closing the keyboard or rebuilding the current screen.
    await refreshLiveData(false);
    HLRN_AUTO_REFRESH.lastLive=Date.now();
  }finally{
    HLRN_AUTO_REFRESH.liveBusy=false;
  }
}

async function autoRefreshHosted(force=false){
  if(document.visibilityState==='hidden' || HLRN_AUTO_REFRESH.hostedBusy) return;
  const hostedRelevant=
    state.hostedDataStatus==='LIVE' ||
    state.currentView==='drivers' ||
    state.resultsLeague==='Hosted' ||
    state.scheduleLeague==='Hosted';
  if(!hostedRelevant) return;
  if(!force && Date.now()-HLRN_AUTO_REFRESH.lastHosted<HLRN_AUTO_REFRESH.hostedEvery) return;
  HLRN_AUTO_REFRESH.hostedBusy=true;
  try{
    await refreshHostedData(false);
    HLRN_AUTO_REFRESH.lastHosted=Date.now();
  }finally{
    HLRN_AUTO_REFRESH.hostedBusy=false;
  }
}

function startHLRNAutoRefresh(){
  setInterval(()=>{
    autoRefreshLive(false);
    autoRefreshHosted(false);
  },60000);
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; const btn=document.querySelector('#installBtn'); btn.hidden=false; btn.onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;btn.hidden=true;deferredPrompt=null;}; });

if('serviceWorker' in navigator){
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(refreshing)return;
  refreshing=true;
  persistCurrentHLRNRoute();

  if(document.visibilityState==='hidden'){
    window.location.reload();
  }else{
    // Do not kick an active user back to the top mid-scroll.
    const reloadWhenHidden=()=>{
      if(document.visibilityState==='hidden'){
        document.removeEventListener('visibilitychange',reloadWhenHidden);
        window.location.reload();
      }
    };
    document.addEventListener('visibilitychange',reloadWhenHidden);
  }
});
  window.addEventListener('load',async()=>{
    try{
      const registration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}); await registration.update();
      if(registration.waiting) registration.waiting.postMessage({type:'SKIP_WAITING'});
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)worker.postMessage({type:'SKIP_WAITING'});});});
      document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){
    persistCurrentHLRNRoute();
    return;
  }
  if(document.visibilityState==='visible'){
    registration.update().catch(()=>{});
    autoRefreshLive(false);
    autoRefreshHosted(false);
    updateSoundButton();
  }
});
    }catch(err){console.warn('HLRN update check failed:',err);}
  });
}

const startParams=new URLSearchParams(location.search);
let restoredRoute=null;
try{
  const saved=sessionStorage.getItem('hlrn-last-route');
  if(saved) restoredRoute=JSON.parse(saved);
}catch(e){}

const forcedView=startParams.get('view');

if(forcedView==='notifications'){
  openFeature('notifications',false);
  hlrnRouteState({kind:'feature',name:'notifications'},true);
}else if(forcedView==='recap'){
  state.recapLeague=startParams.get('league')||'Sunday';
  openFeature('recap',false);
  hlrnRouteState({kind:'feature',name:'recap'},true);
}else if(forcedView==='results'){
  state.resultsLeague=startParams.get('league')||'Sunday';
  renderResults(false);
  hlrnRouteState({kind:'results',league:state.resultsLeague,key:''},true);
}else if(restoredRoute){
  restoreHLRNRoute(restoredRoute);
  hlrnRouteState(restoredRoute,true);
  requestAnimationFrame(()=>{
    try{
      const y=Number(sessionStorage.getItem('hlrn-last-scroll')||0);
      if(Number.isFinite(y) && y>0) window.scrollTo(0,y);
    }catch(e){}
  });
}else{
  renderHome();
  hlrnRouteState({kind:'view',view:'home'},true);
}
refreshPushStatus().catch(()=>{});
buildDrivers();
// The screen is already rendered above. Update data silently so a completed fetch
// cannot redraw the page and jump the user back to the top while scrolling.
refreshLiveData(false).finally(()=>{
  HLRN_AUTO_REFRESH.lastLive=Date.now();
  startHLRNAutoRefresh();
});
// Hosted database loads only when a Hosted/Drivers screen is opened and then refreshes automatically.

