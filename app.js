const state = {
  league: 'Sunday',
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
  drivers: [
    ['Hunter Welborn','66','General Admin'],['Tommy Rogers','34','Owner'],['Jim Segredo','21','Lead Admin'],['Chris James','82','General Admin'],['Ryan Wilson','23','Admin'],['Trevor Haley','12','Admin'],['Kyle Kammeron','55','Driver'],['Bryce Hinton2','28','Driver'],['Brian Hebbard2','87','Driver'],['Evan Parry','72','Driver']
  ]
}

const app = document.querySelector('#app');
const nav = [...document.querySelectorAll('.nav-item')];

function setView(view){
  nav.forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  if(view==='home') renderHome();
  if(view==='standings') renderStandings();
  if(view==='schedule') renderSchedule();
  if(view==='drivers') renderDrivers();
  if(view==='more') renderMore();
  window.scrollTo({top:0,behavior:'smooth'});
}

nav.forEach(n=>n.addEventListener('click',()=>setView(n.dataset.view)));

function renderHome(){
  app.innerHTML = `
    <section class="hero">
      <div class="badge">● NEXT HLRN RACE</div>
      <h2>Kansas Speedway</h2>
      <p>Sunday League • September 13 • 8:30 PM EST</p>
      <div class="hero-actions">
        <button class="btn btn-light" onclick="setView('schedule')">View Schedule</button>
        <button class="btn btn-dark" onclick="setView('standings')">Standings</button>
      </div>
    </section>

    <div class="section-head"><h3>Race Central</h3><span>HLRN</span></div>
    <section class="grid">
      <button class="quick-card" onclick="setView('standings')"><span class="ico">🏆</span><strong>Standings</strong><small>Sunday + Monday</small></button>
      <button class="quick-card" onclick="setView('schedule')"><span class="ico">🏁</span><strong>Schedule</strong><small>Upcoming races</small></button>
      <button class="quick-card" onclick="setView('drivers')"><span class="ico">👤</span><strong>Drivers</strong><small>Roster + admins</small></button>
      <button class="quick-card" onclick="renderResults()"><span class="ico">📊</span><strong>Results</strong><small>Latest finishes</small></button>
    </section>

    <div class="section-head"><h3>Latest News</h3><span>Announcements</span></div>
    <section class="card">
      <div class="news-item"><span class="dot"></span><div><p><strong>HLRN mobile app is live.</strong> This first build gives drivers one place for standings, schedules, driver info and league links.</p><time>Just added</time></div></div>
    </section>`;
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
  app.innerHTML=`<h2 class="page-title">Drivers</h2><p class="page-sub">HLRN roster and administration</p><input class="search" id="driverSearch" placeholder="Search drivers..." value="${filter}" /><section class="card">${rows||'<div class="empty">No drivers found</div>'}</section>`;
  document.querySelector('#driverSearch').addEventListener('input',e=>renderDrivers(e.target.value));
  const input=document.querySelector('#driverSearch'); input.focus(); input.setSelectionRange(filter.length,filter.length);
}

function renderResults(){
  nav.forEach(n=>n.classList.remove('active'));
  app.innerHTML=`<h2 class="page-title">Race Results</h2><p class="page-sub">Latest HLRN finishes</p><section class="card">
    <div class="race-row"><div class="avatar">1</div><div class="driver-meta"><strong>Latest Sunday Race</strong><small>Results importer ready to connect</small></div><span class="track-tag">VIEW</span></div>
    <div class="race-row"><div class="avatar">2</div><div class="driver-meta"><strong>Latest Monday Race</strong><small>Results importer ready to connect</small></div><span class="track-tag">VIEW</span></div>
  </section>`;
}

function renderMore(){
  app.innerHTML=`<h2 class="page-title">More</h2><p class="page-sub">League information and links</p><div class="more-list">
    <button class="more-row"><span>📘 League Rules</span><span>›</span></button>
    <button class="more-row"><span>📺 Broadcasts</span><span>›</span></button>
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

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}))}
renderHome();
