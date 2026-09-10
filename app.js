const state = {
  league: 'Sunday',
  homeLeague: 'Sunday',
  nextRaces: {
    Sunday: {
      date: 'SEP 13',
      iso: '2026-09-13T20:30:00-04:00',
      track: 'Kansas Speedway',
      series: 'Sunday League',
      time: '8:30 PM EST',
      broadcast: '#'
    },
    Monday: {
      date: 'SEP 14',
      iso: '2026-09-14T20:30:00-04:00',
      track: 'Bristol Motor Speedway',
      series: 'Monday League',
      time: '8:30 PM EST',
      broadcast: '#'
    }
  },
  standings: {
    Sunday: [
      ['Nicholas Baumann',307],['Trevor Haley',298],['Ryan Wilson21',254],['Chris James',245],['Ethan Eckert',231],['Jim Segredo',219],['Hunter Welborn',208],['Bryce Hinton2',201]
    ],
    Monday: [
      ['Ethan Eckert',67],['Trevor Haley',54],['Chris James',49],['Ryan Wilson21',45],['Hunter Welborn',41],['Jim Segredo',38]
    ]
  },
  schedule: [
    {date:'SEP 13',track:'Kansas Speedway',league:'Sunday',time:'8:30 PM EST'},
    {date:'SEP 14',track:'Bristol Motor Speedway',league:'Monday',time:'8:30 PM EST'},
    {date:'SEP 20',track:'Talladega Superspeedway',league:'Sunday',time:'8:30 PM EST'},
    {date:'SEP 21',track:'Charlotte Motor Speedway',league:'Monday',time:'8:30 PM EST'}
  ],
  latestResults: [
    {league:'Sunday', label:'Latest Sunday Race', winner:'Results ready to connect', detail:'Tap Results to add official finishing order'},
    {league:'Monday', label:'Latest Monday Race', winner:'Results ready to connect', detail:'Tap Results to add official finishing order'}
  ],
  announcements: [
    {tag:'APP',title:'HLRN mobile app is live',text:'Standings, schedules, drivers, results and league information are now in one place.',time:'New'},
    {tag:'RACE',title:'Race night reminder',text:'League sessions begin at 8:30 PM EST. Check the schedule for the next event.',time:'Race Week'}
  ],
  drivers: [
    ['Hunter Welborn','66','General Admin'],['Tommy Rogers','34','Owner'],['Jim Segredo','21','Lead Admin'],['Chris James','82','General Admin'],['Ryan Wilson','23','Admin'],['Trevor Haley','12','Admin'],['Kyle Kammeron','55','Driver'],['Bryce Hinton2','28','Driver'],['Brian Hebbard2','87','Driver'],['Evan Parry','72','Driver']
  ]
};

const app = document.querySelector('#app');
const nav = [...document.querySelectorAll('.nav-item')];
let countdownTimer;

function setView(view){
  clearInterval(countdownTimer);
  nav.forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  if(view==='home') renderHome();
  if(view==='standings') renderStandings();
  if(view==='schedule') renderSchedule();
  if(view==='drivers') renderDrivers();
  if(view==='more') renderMore();
  window.scrollTo({top:0,behavior:'smooth'});
}

nav.forEach(n=>n.addEventListener('click',()=>setView(n.dataset.view)));

function escapeHtml(value=''){
  return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

function countdownMarkup(){
  return `
    <div class="countdown" aria-label="Countdown to race">
      <div><strong id="cdDays">--</strong><small>DAYS</small></div>
      <span>:</span>
      <div><strong id="cdHours">--</strong><small>HRS</small></div>
      <span>:</span>
      <div><strong id="cdMins">--</strong><small>MIN</small></div>
      <span>:</span>
      <div><strong id="cdSecs">--</strong><small>SEC</small></div>
    </div>`;
}

function startCountdown(iso){
  clearInterval(countdownTimer);
  const target = new Date(iso).getTime();
  const update = () => {
    const diff = target - Date.now();
    const ids = ['cdDays','cdHours','cdMins','cdSecs'];
    const els = ids.map(id=>document.getElementById(id));
    if(els.some(x=>!x)) return;
    if(diff <= 0){
      els[0].textContent='00'; els[1].textContent='00'; els[2].textContent='00'; els[3].textContent='00';
      const label=document.querySelector('.countdown-label');
      if(label) label.textContent='RACE TIME';
      clearInterval(countdownTimer);
      return;
    }
    const d=Math.floor(diff/86400000);
    const h=Math.floor((diff%86400000)/3600000);
    const m=Math.floor((diff%3600000)/60000);
    const s=Math.floor((diff%60000)/1000);
    [d,h,m,s].forEach((v,i)=>els[i].textContent=String(v).padStart(2,'0'));
  };
  update();
  countdownTimer=setInterval(update,1000);
}

function renderHome(){
  const race = state.nextRaces[state.homeLeague];
  const announcementHtml = state.announcements.map(a=>`
    <article class="announcement-card">
      <div class="announcement-top"><span class="mini-tag">${a.tag}</span><time>${a.time}</time></div>
      <h4>${a.title}</h4><p>${a.text}</p>
    </article>`).join('');

  const resultsHtml = state.latestResults.map((r,i)=>`
    <button class="result-card" onclick="renderResults()">
      <div class="result-position">${i+1}</div>
      <div><small>${r.league.toUpperCase()} LEAGUE</small><strong>${r.label}</strong><span>${r.winner}</span></div>
      <b>›</b>
    </button>`).join('');

  app.innerHTML = `
    <section class="brand-strip">
      <div class="hlrn-mark"><span>HIGH LINE</span><strong>HLRN</strong><em>RACING NETWORK</em></div>
      <div class="live-pill"><i></i> RACE WEEK</div>
    </section>

    <div class="home-league-switch" role="tablist" aria-label="Next race league">
      <button class="${state.homeLeague==='Sunday'?'active':''}" onclick="switchHomeLeague('Sunday')">SUNDAY</button>
      <button class="${state.homeLeague==='Monday'?'active':''}" onclick="switchHomeLeague('Monday')">MONDAY</button>
    </div>

    <section class="race-hero">
      <div class="race-hero-top">
        <div><span class="overline">NEXT HLRN EVENT</span><h2>${race.track}</h2></div>
        <div class="track-badge">🏁</div>
      </div>
      <p>${race.series} <span>•</span> ${race.date} <span>•</span> ${race.time}</p>
      <div class="countdown-label">GREEN FLAG COUNTDOWN</div>
      ${countdownMarkup()}
      <div class="hero-actions">
        <button class="btn btn-light" onclick="setView('schedule')">Full Schedule</button>
        <button class="btn btn-glass" onclick="showBroadcastNotice()">📺 Watch Broadcast</button>
      </div>
    </section>

    <div class="section-head"><h3>Race Central</h3><span>Quick Access</span></div>
    <section class="grid">
      <button class="quick-card" onclick="setView('standings')"><span class="ico">🏆</span><strong>Standings</strong><small>Sunday + Monday</small></button>
      <button class="quick-card" onclick="setView('schedule')"><span class="ico">🗓️</span><strong>Schedule</strong><small>Upcoming races</small></button>
      <button class="quick-card" onclick="setView('drivers')"><span class="ico">🏎️</span><strong>Drivers</strong><small>Roster + admins</small></button>
      <button class="quick-card" onclick="renderResults()"><span class="ico">📊</span><strong>Results</strong><small>Latest finishes</small></button>
    </section>

    <div class="section-head"><h3>Latest Results</h3><button class="text-link" onclick="renderResults()">View all</button></div>
    <section class="results-stack">${resultsHtml}</section>

    <div class="section-head"><h3>HLRN Updates</h3><span>Announcements</span></div>
    <section class="announcement-grid">${announcementHtml}</section>

    <section class="broadcast-banner">
      <div><span class="overline">LIVE COVERAGE</span><h3>HLRN Broadcast Center</h3><p>Sunday and Monday race broadcasts in one spot.</p></div>
      <button onclick="showBroadcastNotice()">Open →</button>
    </section>`;

  startCountdown(race.iso);
}

function switchHomeLeague(name){ state.homeLeague=name; renderHome(); }

function showBroadcastNotice(){
  alert('Broadcast buttons are ready. Send me your Sunday and Monday YouTube links and I will wire them directly into the app.');
}

function renderStandings(){
  const rows = state.standings[state.league].map((x,i)=>`<tr><td class="rank">${i+1}</td><td>${x[0]}</td><td><strong>${x[1]}</strong></td></tr>`).join('');
  app.innerHTML = `
    <h2 class="page-title">Standings</h2><p class="page-sub">Current championship points</p>
    <div class="tabs"><button class="tab ${state.league==='Sunday'?'active':''}" onclick="switchLeague('Sunday')">Sunday</button><button class="tab ${state.league==='Monday'?'active':''}" onclick="switchLeague('Monday')">Monday</button></div>
    <section class="card"><table class="table"><thead><tr><th>#</th><th>Driver</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}
function switchLeague(name){state.league=name;renderStandings()}

function renderSchedule(){
  const rows = state.schedule.map(r=>{const [mon,day]=r.date.split(' ');return `<div class="race-row"><div class="race-date"><small>${mon}</small><strong>${day}</strong></div><div class="driver-meta"><strong>${r.track}</strong><small>${r.league} League • ${r.time}</small></div><span class="status">UPCOMING</span></div>`}).join('');
  app.innerHTML=`<h2 class="page-title">Schedule</h2><p class="page-sub">Upcoming HLRN league races</p><section class="card">${rows}</section>`;
}

function renderDrivers(filter=''){
  const f=filter.toLowerCase();
  const rows=state.drivers.filter(d=>d.join(' ').toLowerCase().includes(f)).map(d=>`<div class="driver-row"><div class="avatar">${d[0].split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div class="driver-meta"><strong>${d[0]}</strong><small>${d[2]}</small></div><div class="num">#${d[1]}</div></div>`).join('');
  app.innerHTML=`<h2 class="page-title">Drivers</h2><p class="page-sub">HLRN roster and administration</p><input class="search" id="driverSearch" placeholder="Search drivers..." value="${escapeHtml(filter)}" /><section class="card">${rows||'<div class="empty">No drivers found</div>'}</section>`;
  const input=document.querySelector('#driverSearch');
  input.addEventListener('input',e=>renderDrivers(e.target.value));
  if(filter){ input.focus(); input.setSelectionRange(filter.length,filter.length); }
}

function renderResults(){
  clearInterval(countdownTimer);
  nav.forEach(n=>n.classList.remove('active'));
  app.innerHTML=`<h2 class="page-title">Race Results</h2><p class="page-sub">Latest HLRN finishes</p><section class="card">
    <div class="race-row"><div class="avatar">S</div><div class="driver-meta"><strong>Latest Sunday Race</strong><small>Official results can be connected here</small></div><span class="track-tag">RESULTS</span></div>
    <div class="race-row"><div class="avatar">M</div><div class="driver-meta"><strong>Latest Monday Race</strong><small>Official results can be connected here</small></div><span class="track-tag">RESULTS</span></div>
  </section><button class="back-home" onclick="setView('home')">← Back Home</button>`;
}

function renderMore(){
  app.innerHTML=`<h2 class="page-title">More</h2><p class="page-sub">League information and links</p><div class="more-list">
    <button class="more-row"><span>📘 League Rules</span><span>›</span></button>
    <button class="more-row" onclick="showBroadcastNotice()"><span>📺 Broadcasts</span><span>›</span></button>
    <button class="more-row"><span>👥 Meet the Team</span><span>›</span></button>
    <button class="more-row"><span>⚠️ Incident Watch</span><span>›</span></button>
    <button class="more-row"><span>📈 Driver Statistics</span><span>›</span></button>
    <button class="more-row"><span>ℹ️ About HLRN</span><span>›</span></button>
  </div>`;
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt=e;
  const btn=document.querySelector('#installBtn'); btn.hidden=false;
  btn.onclick=async()=>{deferredPrompt.prompt(); await deferredPrompt.userChoice; btn.hidden=true; deferredPrompt=null}
});

if ('serviceWorker' in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' });

      // Ask GitHub Pages for the newest service worker every time the app opens.
      await registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // iPhone PWAs can stay open for a long time. Re-check when returning to the app.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    } catch (err) {
      console.warn('HLRN update check failed:', err);
    }
  });
}
renderHome();
