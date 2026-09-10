const HOSTED_SHEET = '1YfY22x2dnI9T6Fi69pT3L91NAkmVQWdvL0IWbWhB-tM';

const LIVE = {
  standingsSheet: '1yWa2-nHM4VnUXDS8EQwB0G2k0ockpAU55Xuj9MPccJo',
  newsroomSheet: '1_o7gV4CDMDDmm6XfqXBqlxJPuoK8FBV1Rcf3ugg0v8M',
  configSheet: '1dbootrGi_ppHA90xF0OXv5XW2oOGfMNOwlPbsYdMEvw'
};

const state = {
  league: 'Sunday',
  homeLeague: 'Sunday',
  currentView: 'home',
  liveStatus: 'Connecting…',
  lastUpdated: null,
  nextRaces: {
    Sunday: {date:'SEP 13', iso:'2026-09-13T20:30:00-04:00', track:'Kansas Speedway', series:'Sunday League', time:'8:30 PM EST', broadcast:''},
    Monday: {date:'SEP 14', iso:'2026-09-14T20:30:00-04:00', track:'Bristol Motor Speedway', series:'Monday League', time:'8:30 PM EST', broadcast:''}
  },
  standings: { Sunday: [], Monday: [] },
  schedule: [],
  results: { Sunday: [], Monday: [] },
  latestResults: [],
  announcements: [],
  drivers: [],
  hostedDrivers: [],
  hostedRaceRows: [],
  hostedDataStatus: 'Connecting…',
  links: {},
  appVersion: '4.0'
};

const fallback = {
  standings: {
    Sunday: [['Trevor Haley',387],['Nicholas Baumann',380],['Randy Showers',329],['Chris James',317],['Ethan Moreno',307]],
    Monday: [['Ethan Eckert',192],['Trevor Aswarnauth',148],['Bill Daniels',143],['Chris James',124],['Joshua McKinney2',123]]
  },
  schedule: [
    {league:'Sunday',date:'2026-09-13',time:'8:30 PM EST',track:'Kansas Speedway',status:'UPCOMING'},
    {league:'Monday',date:'2026-09-14',time:'8:30 PM EST',track:'Bristol Motor Speedway',status:'UPCOMING'},
    {league:'Sunday',date:'2026-09-20',time:'8:30 PM EST',track:'Talladega Superspeedway',status:'UPCOMING'},
    {league:'Monday',date:'2026-09-21',time:'8:30 PM EST',track:'Charlotte Motor Speedway',status:'UPCOMING'}
  ],
  announcements: [{tag:'APP',title:'HLRN mobile app is live',text:'Live HLRN data is being connected to the app.',time:'New'}]
};

state.standings = JSON.parse(JSON.stringify(fallback.standings));
state.schedule = JSON.parse(JSON.stringify(fallback.schedule));
state.announcements = JSON.parse(JSON.stringify(fallback.announcements));

const app = document.querySelector('#app');
const nav = [...document.querySelectorAll('.nav-item')];
let countdownTimer;

function setView(view){
  clearInterval(countdownTimer);
  state.currentView = view;
  nav.forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  if(view==='home') renderHome();
  if(view==='standings') renderStandings();
  if(view==='schedule') renderSchedule();
  if(view==='drivers') renderDrivers();
  if(view==='more') renderMore();
  window.scrollTo({top:0,behavior:'smooth'});
}
nav.forEach(n=>n.addEventListener('click',()=>setView(n.dataset.view)));

function rerenderCurrent(){
  if(state.currentView==='results') renderResults();
  else setView(state.currentView);
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
  const announcementHtml = state.announcements.slice(0,4).map(a=>`
    <article class="announcement-card"><div class="announcement-top"><span class="mini-tag">${escapeHtml(a.tag||'NEWS')}</span><time>${escapeHtml(a.time||'')}</time></div>
    <h4>${escapeHtml(a.title)}</h4><p>${escapeHtml(a.text)}</p></article>`).join('');
  const resultsHtml = state.latestResults.length ? state.latestResults.map((r,i)=>`
    <button class="result-card" onclick="renderResults()"><div class="result-position">${i+1}</div><div><small>${escapeHtml(r.league.toUpperCase())} LEAGUE</small><strong>${escapeHtml(r.track)}</strong><span>Winner: ${escapeHtml(r.winner)}</span></div><b>›</b></button>`).join('') :
    `<div class="empty">Race results will appear here when live data finishes loading.</div>`;

  app.innerHTML = `
    <section class="brand-strip"><img class="home-logo" src="hlrn-logo-4k.png" alt="HLRN"><div>${liveBadge()}</div></section>
    <div class="home-league-switch" role="tablist"><button class="${state.homeLeague==='Sunday'?'active':''}" onclick="switchHomeLeague('Sunday')">SUNDAY</button><button class="${state.homeLeague==='Monday'?'active':''}" onclick="switchHomeLeague('Monday')">MONDAY</button></div>
    <section class="race-hero"><div class="race-hero-top"><div><span class="overline">NEXT HLRN EVENT</span><h2>${escapeHtml(race.track)}</h2></div><div class="track-badge">🏁</div></div>
      <p>${escapeHtml(race.series)} <span>•</span> ${escapeHtml(race.date)} <span>•</span> ${escapeHtml(race.time)}</p><div class="countdown-label">GREEN FLAG COUNTDOWN</div>${countdownMarkup()}
      <div class="hero-actions"><button class="btn btn-light" onclick="setView('schedule')">Full Schedule</button><button class="btn btn-glass" onclick="openBroadcast('${state.homeLeague}')">📺 Watch Broadcast</button></div>
    </section>
    <div class="section-head"><h3>Race Central</h3><span>Quick Access</span></div>
    <section class="grid"><button class="quick-card" onclick="setView('standings')"><span class="ico">🏆</span><strong>Standings</strong><small>Live Sunday + Monday</small></button><button class="quick-card" onclick="setView('schedule')"><span class="ico">🗓️</span><strong>Schedule</strong><small>Upcoming races</small></button><button class="quick-card" onclick="setView('drivers')"><span class="ico">🏎️</span><strong>Drivers</strong><small>Live roster + stats</small></button><button class="quick-card" onclick="renderResults()"><span class="ico">📊</span><strong>Results</strong><small>Latest finishes</small></button></section>
    <div class="section-head"><h3>Latest Results</h3><button class="text-link" onclick="renderResults()">View all</button></div><section class="results-stack">${resultsHtml}</section>
    <div class="section-head"><h3>HLRN Updates</h3><span>Newsroom</span></div><section class="announcement-grid">${announcementHtml}</section>
    <section class="broadcast-banner"><div><span class="overline">LIVE COVERAGE</span><h3>HLRN Broadcast Center</h3><p>Sunday and Monday race broadcasts in one spot.</p></div><button onclick="openBroadcast('${state.homeLeague}')">Open →</button></section>`;
  startCountdown(race.iso);
}
function switchHomeLeague(name){ state.homeLeague=name; renderHome(); }

function openBroadcast(league){
  const url = state.links[`${league} Broadcast`];
  if(url) window.open(url,'_blank');
  else alert(`${league} broadcast link is not filled in yet. Add it to the HLRN App Live Config sheet.`);
}

function renderStandings(){
  state.currentView='standings';
  const rows = state.standings[state.league].map((x)=>`<tr><td class="rank">${x.rank}</td><td><strong>${escapeHtml(x.name)}</strong><small class="table-sub">${x.wins} W • ${x.top5} T5 • ${x.top10} T10</small></td><td><strong>${x.points}</strong></td></tr>`).join('');
  app.innerHTML=`<div class="page-title-row"><div><h2 class="page-title">Standings</h2><p class="page-sub">Current championship points</p></div>${liveBadge()}</div>
    <div class="tabs"><button class="tab ${state.league==='Sunday'?'active':''}" onclick="switchLeague('Sunday')">Sunday</button><button class="tab ${state.league==='Monday'?'active':''}" onclick="switchLeague('Monday')">Monday</button></div>
    <section class="card"><table class="table"><thead><tr><th>#</th><th>Driver</th><th>Pts</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Loading standings…</td></tr>'}</tbody></table></section>`;
}
function switchLeague(name){state.league=name;renderStandings();}

function renderSchedule(){
  state.currentView='schedule';
  const rows = state.schedule.map(r=>{ const d=new Date(`${r.date}T12:00:00`); const mon=Number.isNaN(d)?'':d.toLocaleString('en-US',{month:'short'}).toUpperCase(); const day=Number.isNaN(d)?'':d.getDate(); return `<div class="race-row"><div class="race-date"><small>${mon}</small><strong>${day}</strong></div><div class="driver-meta"><strong>${escapeHtml(r.track)}</strong><small>${escapeHtml(r.league)} League • ${escapeHtml(r.time)}</small></div><span class="status">${escapeHtml(r.status||'UPCOMING')}</span></div>`}).join('');
  app.innerHTML=`<div class="page-title-row"><div><h2 class="page-title">Schedule</h2><p class="page-sub">Upcoming HLRN league races</p></div>${liveBadge()}</div><section class="card">${rows||'<div class="empty">No upcoming races entered.</div>'}</section>`;
}

function renderDrivers(filter=''){
  state.currentView='drivers';
  const f=filter.trim().toLowerCase();
  const source=state.hostedDrivers;
  const rows=source.filter(d=>String(d.name||'').toLowerCase().includes(f)).map(d=>{
    const initials=String(d.name||'').split(' ').filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase();
    return `<button class="driver-row driver-click" onclick="openHostedDriverProfile(decodeURIComponent('${encodeURIComponent(String(d.name||'')).replace(/'/g,'%27')}'))"><div class="avatar">${escapeHtml(initials)}</div><div class="driver-meta"><strong>${escapeHtml(d.name)}</strong><small>HLRN HOSTED • ${d.races} races • ${d.wins} wins • ${d.top5} T5 • ${d.top10} T10</small></div><div class="driver-chevron">›</div></button>`;
  }).join('');
  const status=state.hostedDataStatus==='LIVE'?'ALL HOSTED RACES':escapeHtml(state.hostedDataStatus);
  app.innerHTML=`<div class="page-title-row"><div><h2 class="page-title">Drivers</h2><p class="page-sub">Career stats from every HLRN hosted race</p></div><div class="sync-badge ${state.hostedDataStatus==='LIVE'?'live':''}"><i></i>${status}</div></div><input class="search" id="driverSearch" placeholder="Search every hosted driver..." value="${escapeHtml(filter)}" /><section class="card driver-list-card">${rows||`<div class="empty">${state.hostedDataStatus==='Connecting…'?'Loading hosted driver database…':'No drivers found'}</div>`}</section>`;
  const input=document.querySelector('#driverSearch'); input.addEventListener('input',e=>renderDrivers(e.target.value));
  if(filter){ input.focus(); input.setSelectionRange(filter.length,filter.length); }
}

async function openHostedDriverProfile(driver){
  clearInterval(countdownTimer);
  state.currentView='driverProfile';
  nav.forEach(n=>n.classList.remove('active'));
  app.innerHTML=`<button class="profile-back" onclick="setView('drivers')">← Drivers</button><section class="driver-profile-hero"><div class="driver-profile-kicker">HLRN HOSTED CAREER</div><h2>${escapeHtml(driver)}</h2><p>Building career stats from every imported hosted race…</p></section><div class="profile-loading">Loading career stats…</div>`;
  window.scrollTo({top:0,behavior:'smooth'});
  try{
    if(!state.hostedRaceRows.length) await refreshHostedData(false);
    const rows=state.hostedRaceRows.filter(r=>prettyName(String(r.Driver||'')).toLowerCase()===driver.toLowerCase());
    if(!rows.length) throw new Error('No hosted race history found for this driver.');
    renderHostedDriverProfileFromRows(driver,rows);
  }catch(err){
    app.innerHTML=`<button class="profile-back" onclick="setView('drivers')">← Drivers</button><section class="driver-profile-hero"><div class="driver-profile-kicker">HLRN HOSTED CAREER</div><h2>${escapeHtml(driver)}</h2><p>Unable to load the hosted-race profile.</p></section><div class="empty">${escapeHtml(err.message)}</div>`;
  }
}

function fmt1(v){ const n=Number(v); return Number.isFinite(n)?n.toFixed(1):'--'; }
function ordinal(n){ n=Number(n); if(!Number.isFinite(n)||n<=0)return '--'; const s=['th','st','nd','rd'],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }

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
  app.innerHTML=`<button class="profile-back" onclick="setView('drivers')">← Drivers</button><section class="driver-profile-hero"><div class="driver-profile-kicker">HLRN HOSTED CAREER • ALL IMPORTED RACES</div><h2>${escapeHtml(driver)}</h2><p>${races} races • ${wins} wins • ${top10Rate.toFixed(1)}% Top-10 rate${latestIR!=='--'?` • Latest iRating ${escapeHtml(latestIR)}`:''}</p></section><section class="career-stats-grid">${stat('RACES',races)}${stat('WINS',wins)}${stat('TOP 5',top5)}${stat('TOP 10',top10)}${stat('AVG START',fmt1(avgStart))}${stat('AVG FINISH',fmt1(avgFinish))}${stat('WIN RATE',winRate.toFixed(1)+'%')}${stat('TOP-5 RATE',top5Rate.toFixed(1)+'%')}${stat('LAPS LED',lapsLed)}${stat('INCIDENTS',incidents)}${stat('INC / RACE',fmt1(avgInc))}${stat('TOP-10 RATE',top10Rate.toFixed(1)+'%')}</section><div class="profile-section-title"><h3>Recent Hosted Races</h3><span>Latest 10</span></div><section class="card profile-races">${recentHtml}</section><div class="profile-section-title"><h3>Track History</h3><span>Career breakdown</span></div><section class="card">${trackHtml}</section>`;
}

async function refreshHostedData(rerender=true){
  state.hostedDataStatus='Connecting…';
  try{
    const [rankT,dataT]=await Promise.all([
      loadGviz(HOSTED_SHEET,'DRIVER RANKINGS','A1:G1000'),
      loadGviz(HOSTED_SHEET,'DRIVER DATA','A1:M20000')
    ]);
    const rankings=tableRows(rankT);
    state.hostedRaceRows=tableRows(dataT).filter(r=>String(r.Driver||'').trim());
    state.hostedDrivers=rankings.map((r,i)=>({
      name:prettyName(String(r.Driver||'')),
      rank:Number(r.Rank)||i+1,
      races:Number(r.Races)||0,
      wins:Number(r.Wins)||0,
      top5:Number(r['Top 5'])||0,
      top10:Number(r['Top 10'])||0,
      averageFinish:Number(r['Average Finish'])||0
    })).filter(d=>d.name).sort((a,b)=>a.name.localeCompare(b.name));
    if(!state.hostedDrivers.length && state.hostedRaceRows.length){
      const m=new Map();
      state.hostedRaceRows.forEach(r=>{
        const name=prettyName(String(r.Driver||'')); if(!name)return;
        const d=m.get(name)||{name,races:0,wins:0,top5:0,top10:0,finish:0,finishCount:0};
        const f=num(r['Finish Position']); d.races++; if(f===1)d.wins++; if(f>=1&&f<=5)d.top5++; if(f>=1&&f<=10)d.top10++; if(f>0){d.finish+=f;d.finishCount++;} m.set(name,d);
      });
      state.hostedDrivers=[...m.values()].map(d=>({...d,averageFinish:d.finishCount?d.finish/d.finishCount:0})).sort((a,b)=>a.name.localeCompare(b.name));
    }
    state.hostedDataStatus='LIVE';
  }catch(err){
    console.warn('HLRN hosted database connection failed:',err);
    state.hostedDataStatus='HOSTED DATA OFFLINE';
  }
  if(rerender && state.currentView==='drivers') renderDrivers(document.querySelector('#driverSearch')?.value||'');
}

function renderResults(){
  clearInterval(countdownTimer); state.currentView='results'; nav.forEach(n=>n.classList.remove('active'));
  const leagueBlock = league => {
    const rows=state.results[league].slice(0,20).map(r=>`<div class="race-row"><div class="result-position">${r.finish}</div><div class="driver-meta"><strong>${escapeHtml(r.driver)}</strong><small>${escapeHtml(r.track)} • ${escapeHtml(r.date)} • ${r.points} pts</small></div><span class="track-tag">${r.incidents} INC</span></div>`).join('');
    return `<div class="section-head"><h3>${league} – Latest Race</h3><span>${state.results[league][0]?escapeHtml(state.results[league][0].track):''}</span></div><section class="card">${rows||'<div class="empty">No live results loaded.</div>'}</section>`;
  };
  app.innerHTML=`<div class="page-title-row"><div><h2 class="page-title">Race Results</h2><p class="page-sub">Latest official HLRN finishes</p></div>${liveBadge()}</div>${leagueBlock('Sunday')}${leagueBlock('Monday')}<button class="back-home" onclick="setView('home')">← Back Home</button>`;
}

function renderMore(){
  state.currentView='more';
  const updated=state.lastUpdated?new Date(state.lastUpdated).toLocaleString():'Waiting for live connection';
  app.innerHTML=`<div class="page-title-row"><div><h2 class="page-title">More</h2><p class="page-sub">League information and links</p></div>${liveBadge()}</div><div class="more-list">
    <button class="more-row" onclick="openLink('HLRN Website')"><span>🌐 HLRN Website</span><span>›</span></button>
    <button class="more-row" onclick="openBroadcast('Sunday')"><span>📺 Sunday Broadcast</span><span>›</span></button>
    <button class="more-row" onclick="openBroadcast('Monday')"><span>📺 Monday Broadcast</span><span>›</span></button>
    <button class="more-row" onclick="setView('standings')"><span>🏆 Live Standings</span><span>›</span></button>
    <button class="more-row" onclick="renderResults()"><span>📈 Live Race Results</span><span>›</span></button>
  </div><div class="data-note">Last data refresh: ${escapeHtml(updated)}</div><div class="app-version">HLRN App • Version ${escapeHtml(state.appVersion)}</div>`;
}
function openLink(name){ const url=state.links[name]; if(url) window.open(url,'_blank'); }

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
  if(!rows.length) return [];
  const maxRace=Math.max(...rows.map(r=>Number(r['Race #'])||0));
  return rows.filter(r=>Number(r['Race #'])===maxRace).map(r=>({
    driver:driverMap[String(r['Driver ID'])]||`Driver ${r['Driver ID']}`,
    finish:Number(r.Finish)||0, start:Number(r.Start)||0, points:Number(r.Points)||0,
    track:String(r.Track||''), date:String(r.Date||''), incidents:Number(r.Incidents)||0, lapsLed:Number(r['Laps Led'])||0
  })).sort((a,b)=>a.finish-b.finish);
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
  if(rows.length){ state.schedule=rows.filter(r=>r.League&&r.Date&&r.Track).map(r=>({league:String(r.League),date:String(r.Date),time:String(r.Time||'8:30 PM EST'),track:String(r.Track),status:String(r.Status||'UPCOMING')})); }
  ['Sunday','Monday'].forEach(league=>{
    const upcoming=state.schedule.find(r=>r.league===league && String(r.status).toUpperCase()!=='COMPLETED');
    if(upcoming){
      const d=new Date(`${upcoming.date}T20:30:00-04:00`);
      state.nextRaces[league]={date:d.toLocaleString('en-US',{month:'short',day:'numeric'}).toUpperCase(),iso:d.toISOString(),track:upcoming.track,series:`${league} League`,time:upcoming.time,broadcast:state.links[`${league} Broadcast`]||''};
    }
  });
}

async function refreshLiveData(){
  state.liveStatus='Connecting…'; rerenderCurrent();
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
    state.latestResults=['Sunday','Monday'].map(league=>{const r=state.results[league][0]; return r?{league,track:r.track,winner:r.driver,date:r.date}:null;}).filter(Boolean);
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
    if(!state.drivers.length){
      state.standings.Sunday=state.standings.Sunday.map((x,i)=>Array.isArray(x)?{name:x[0],rank:i+1,points:x[1],wins:0,top5:0,top10:0}:x);
      state.standings.Monday=state.standings.Monday.map((x,i)=>Array.isArray(x)?{name:x[0],rank:i+1,points:x[1],wins:0,top5:0,top10:0}:x);
      buildDrivers();
    }
  }
  rerenderCurrent();
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; const btn=document.querySelector('#installBtn'); btn.hidden=false; btn.onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;btn.hidden=true;deferredPrompt=null;}; });

if('serviceWorker' in navigator){
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)return;refreshing=true;window.location.reload();});
  window.addEventListener('load',async()=>{
    try{
      const registration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}); await registration.update();
      if(registration.waiting) registration.waiting.postMessage({type:'SKIP_WAITING'});
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)worker.postMessage({type:'SKIP_WAITING'});});});
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){registration.update().catch(()=>{});refreshLiveData();}});
    }catch(err){console.warn('HLRN update check failed:',err);}
  });
}

renderHome();
refreshLiveData();
refreshHostedData();
