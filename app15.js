(function(){
  'use strict';

  const RACEOS_VERSION='15.0.0';
  let revealObserver=null;
  let decorating=false;

  function escapeLocal(v){
    return String(v??'').replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }

  function currentLeague(){
    if(state.currentView==='standings')return state.league||'Sunday';
    if(state.currentView==='schedule')return state.scheduleLeague||state.homeLeague||'Sunday';
    if(state.currentView==='results')return state.resultsLeague||state.homeLeague||'Sunday';
    return state.homeLeague||'Sunday';
  }

  function nextRace(){
    const league=currentLeague()==='Hosted'?(state.homeLeague||'Sunday'):currentLeague();
    return {league:league,race:(state.nextRaces||{})[league]||{}};
  }

  function raceOSViewLabel(){
    const view=String(state.currentView||'home');
    if(view==='feature')return String(state.featureView||'Performance').replace(/[-_]/g,' ');
    if(view==='driver-profile')return 'Driver Card';
    if(view==='live-center')return 'Live Race Center';
    if(view==='results')return 'Race Archive';
    return view.replace(/[-_]/g,' ');
  }

  function raceOSAccent(){
    const league=currentLeague();
    document.body.dataset.r15League=String(league||'HLRN').toLowerCase();
    document.body.dataset.r15View=String(state.currentView||'home').toLowerCase();
  }

  function ensureRaceOSChrome(){
    const shell=document.querySelector('.app-shell');
    const header=document.querySelector('.topbar');
    if(!shell||!header)return;

    let rail=document.getElementById('raceOSRail');
    if(!rail){
      rail=document.createElement('div');
      rail.id='raceOSRail';
      rail.className='r15-rail';
      header.insertAdjacentElement('afterend',rail);
    }

    let glow=document.getElementById('raceOSAmbient');
    if(!glow){
      glow=document.createElement('div');
      glow.id='raceOSAmbient';
      glow.className='r15-ambient';
      glow.setAttribute('aria-hidden','true');
      document.body.appendChild(glow);
    }

    let orb=document.getElementById('raceOSLiveOrb');
    if(!orb){
      orb=document.createElement('button');
      orb.id='raceOSLiveOrb';
      orb.className='r15-live-orb';
      orb.setAttribute('aria-label','Open live race center');
      orb.onclick=function(){openLiveRaceCenter();};
      orb.innerHTML='<i></i><span>LIVE</span>';
      document.body.appendChild(orb);
    }
  }

  function renderRaceOSRail(){
    const rail=document.getElementById('raceOSRail');
    if(!rail)return;
    const {league,race}=nextRace();
    const live=!!(state.liveRace&&state.liveRace.connected&&state.liveRace.driverCount>0);
    const flag=String(state.liveRace?.flag||'STANDBY').toUpperCase();
    const track=live?(state.liveRace.track||'HLRN LIVE'):(race.track||'Race schedule loading');
    const sync=state.lastUpdated?new Date(state.lastUpdated).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'—';

    rail.innerHTML=
      '<div class="r15-rail-view"><small>RACEOS</small><strong>'+escapeLocal(raceOSViewLabel().toUpperCase())+'</strong></div>'+
      '<div class="r15-rail-live '+(live?'active':'')+'"><i></i><span>'+(live?'LIVE • '+escapeLocal(flag):'NETWORK READY')+'</span></div>'+
      '<div class="r15-rail-event"><small>'+escapeLocal(String(league).toUpperCase())+'</small><strong>'+escapeLocal(track)+'</strong></div>'+
      '<div class="r15-rail-sync"><small>SYNC</small><strong>'+escapeLocal(sync)+'</strong></div>';
  }

  function decorateSectionHeads(){
    let i=0;
    document.querySelectorAll('#app .section-head').forEach(function(head){
      i++;
      if(!head.dataset.r15Index)head.dataset.r15Index=String(i).padStart(2,'0');
    });
  }

  function revealTargets(){
    if(!('IntersectionObserver' in window))return;
    if(!revealObserver){
      revealObserver=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('r15-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },{threshold:.06,rootMargin:'0px 0px -25px 0px'});
    }

    const selectors=[
      '#app > section',
      '#app > div:not(.network-bar):not(.page-title-row):not(.tabs)',
      '.cc-status-card','.cc-championship-card','.cc-winner-card',
      '.schedule-card','.driver-row','.podium-card','.archive-result-row',
      '.record-card','.social-card','.feature-launchpad button',
      '.os-track-card','.rnp-watch-card','.native-live-row'
    ].join(',');

    document.querySelectorAll(selectors).forEach(function(el,index){
      if(el.classList.contains('r15-reveal'))return;
      el.classList.add('r15-reveal');
      el.style.setProperty('--r15-delay',Math.min(index%8,7)*24+'ms');
      revealObserver.observe(el);
    });
  }

  function decoratePageTitle(){
    const title=document.querySelector('#app .premium-page-head');
    if(!title)return;
    title.classList.add('r15-page-hero');
    if(!title.querySelector('.r15-page-code')){
      const code=document.createElement('span');
      code.className='r15-page-code';
      code.textContent='RACEOS / '+String(raceOSViewLabel()).toUpperCase();
      title.appendChild(code);
    }
  }

  function decorateHome(){
    if(state.currentView!=='home')return;
    const top=document.querySelector('.cc-topline');
    if(top)top.classList.add('r15-command-hero');
    const race=document.querySelector('.cc-race-panel');
    if(race)race.classList.add('r15-race-hero');
    const live=document.querySelector('.cc-live-race');
    if(live)live.classList.add('r15-live-block');
  }

  function decorateLive(){
    if(state.currentView!=='live-center')return;
    document.querySelector('.native-live-head')?.classList.add('r15-live-hero');
    document.querySelector('.native-live-scoreboard')?.classList.add('r15-scoring-tower');
  }

  function decorateDriverDirectory(){
    if(state.currentView!=='drivers')return;
    document.querySelector('.driver-list-card')?.classList.add('r15-driver-grid');
  }

  function updateLiveOrb(){
    const orb=document.getElementById('raceOSLiveOrb');
    if(!orb)return;
    const live=!!(state.liveRace&&state.liveRace.connected&&state.liveRace.driverCount>0);
    orb.classList.toggle('show',live&&state.currentView!=='live-center');
    const span=orb.querySelector('span');
    if(span)span.textContent=live?'LIVE':'';
  }

  function decorate(){
    if(decorating)return;
    decorating=true;
    try{
      ensureRaceOSChrome();
      raceOSAccent();
      renderRaceOSRail();
      updateLiveOrb();
      decorateSectionHeads();
      decoratePageTitle();
      decorateHome();
      decorateLive();
      decorateDriverDirectory();
      revealTargets();
    }finally{
      decorating=false;
    }
  }

  function updateScrollProgress(){
    const root=document.documentElement;
    const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    root.style.setProperty('--r15-scroll',Math.max(0,Math.min(1,window.scrollY/max)));
  }

  function updateBrand(){
    const edition=document.querySelector('.top-edition');
    if(edition)edition.textContent='15';
    const name=document.querySelector('.top-brand h1 em');
    if(name)name.textContent='RACEOS';
    document.documentElement.dataset.raceos='15';
  }

  function boot(){
    updateBrand();
    ensureRaceOSChrome();
    decorate();
    updateScrollProgress();

    const appRoot=document.getElementById('app');
    if(appRoot){
      const observer=new MutationObserver(function(){
        requestAnimationFrame(decorate);
      });
      observer.observe(appRoot,{childList:true,subtree:true});
    }

    window.addEventListener('scroll',updateScrollProgress,{passive:true});
    window.addEventListener('resize',function(){requestAnimationFrame(decorate);},{passive:true});

    setInterval(function(){
      renderRaceOSRail();
      updateLiveOrb();
    },1500);

    try{
      const seen=localStorage.getItem('hlrn-raceos-seen');
      if(seen!==RACEOS_VERSION){
        localStorage.setItem('hlrn-raceos-seen',RACEOS_VERSION);
        setTimeout(function(){
          if(window.hlrnToast)window.hlrnToast('HLRN RaceOS 15 loaded — full interface overhaul','good');
        },850);
      }
    }catch(e){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,0);
})();