(function(){
  'use strict';

  const HYPERGRID_VERSION='16.0.0';
  let appObserver=null;
  let pageStamp='';
  let tickerTimer=null;
  let navTimer=null;
  let pointerRAF=0;
  let lastFlag='';

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }

  function liveFeed(){
    return state.liveRace&&state.liveRace.feed?state.liveRace.feed:null;
  }

  function isLive(){
    return !!(state.liveRace&&state.liveRace.connected&&state.liveRace.driverCount>0);
  }

  function league(){
    if(state.currentView==='standings')return state.league||'Sunday';
    if(state.currentView==='schedule')return state.scheduleLeague||state.homeLeague||'Sunday';
    if(state.currentView==='results')return state.resultsLeague||state.homeLeague||'Sunday';
    if(state.currentView==='feature'&&state.weekendLeague)return state.weekendLeague;
    return state.homeLeague||'Sunday';
  }

  function viewLabel(){
    const view=String(state.currentView||'home');
    if(view==='feature')return String(state.featureView||'Performance').replace(/[-_]/g,' ');
    if(view==='driver-profile')return 'Driver Profile';
    if(view==='live-center')return 'Live Race Center';
    if(view==='results')return 'Race Archive';
    return view.replace(/[-_]/g,' ');
  }

  function nextRaceInfo(){
    const l=league()==='Hosted'?(state.homeLeague||'Sunday'):league();
    return {league:l,race:(state.nextRaces||{})[l]||{}};
  }

  function currentFlag(){
    if(!isLive())return 'OFF';
    return String(state.liveRace.flag||liveFeed()?.flag||'GREEN').trim().toUpperCase();
  }

  function normalizedFlag(flag){
    const f=String(flag||'').toUpperCase();
    if(f.includes('YELLOW')||f.includes('CAUTION'))return 'yellow';
    if(f.includes('RED'))return 'red';
    if(f.includes('CHECKER'))return 'checkered';
    if(f.includes('GREEN'))return 'green';
    if(f.includes('WHITE'))return 'white';
    return 'live';
  }

  function sessionLabel(){
    const feed=liveFeed();
    if(!feed)return '';
    if(typeof liveRaceFinished==='function'&&liveRaceFinished(feed))return 'FINAL';
    return String(feed.phase||feed.sessionName||state.liveRace.sessionName||'LIVE').replace(/_/g,' ').toUpperCase();
  }

  function ensureChrome(){
    const header=document.querySelector('.topbar');
    if(!header)return;

    let ticker=document.getElementById('hyperGridTicker');
    if(!ticker){
      ticker=document.createElement('section');
      ticker.id='hyperGridTicker';
      ticker.className='hg-ticker';
      const rail=document.getElementById('raceOSRail');
      if(rail)rail.insertAdjacentElement('afterend',ticker);
      else header.insertAdjacentElement('afterend',ticker);
    }

    let launcher=document.getElementById('hyperGridLauncher');
    if(!launcher){
      launcher=document.createElement('button');
      launcher.id='hyperGridLauncher';
      launcher.className='hg-launcher';
      launcher.setAttribute('aria-label','Open HyperGrid command launcher');
      launcher.innerHTML='<span class="hg-launch-icon"><i></i><i></i><i></i></span><b>GRID</b>';
      launcher.onclick=openHyperGridLauncher;
      document.body.appendChild(launcher);
    }

    let palette=document.getElementById('hyperGridPalette');
    if(!palette){
      palette=document.createElement('div');
      palette.id='hyperGridPalette';
      palette.className='hg-palette';
      palette.setAttribute('aria-hidden','true');
      palette.innerHTML=
        '<div class="hg-palette-backdrop" onclick="closeHyperGridLauncher()"></div>'+
        '<section class="hg-palette-sheet">'+
          '<header><div><small>HLRN HYPERGRID</small><strong>COMMAND LAUNCHER</strong></div><kbd>ESC</kbd><button onclick="closeHyperGridLauncher()" aria-label="Close launcher">×</button></header>'+
          '<div class="hg-palette-status" id="hyperGridPaletteStatus"></div>'+
          '<div class="hg-palette-grid" id="hyperGridPaletteGrid"></div>'+
        '</section>';
      document.body.appendChild(palette);
    }

    let scene=document.getElementById('hyperGridScene');
    if(!scene){
      scene=document.createElement('div');
      scene.id='hyperGridScene';
      scene.className='hg-scene';
      scene.setAttribute('aria-hidden','true');
      scene.innerHTML='<i class="hg-beam a"></i><i class="hg-beam b"></i><i class="hg-beam c"></i><div class="hg-noise"></div>';
      document.body.appendChild(scene);
    }

    let navIndicator=document.getElementById('hyperGridNavIndicator');
    const nav=document.querySelector('.bottom-nav');
    if(nav&&!navIndicator){
      navIndicator=document.createElement('i');
      navIndicator.id='hyperGridNavIndicator';
      navIndicator.className='hg-nav-indicator';
      nav.appendChild(navIndicator);
    }

    if(!document.getElementById('hyperGridTopAction')){
      const actions=document.querySelector('.top-actions');
      if(actions){
        const btn=document.createElement('button');
        btn.id='hyperGridTopAction';
        btn.className='icon-btn hg-grid-top';
        btn.setAttribute('aria-label','Open HyperGrid');
        btn.innerHTML='<span>⌘</span>';
        btn.onclick=openHyperGridLauncher;
        actions.insertBefore(btn,actions.firstChild);
      }
    }
  }

  function commandItems(){
    const items=[
      {icon:'⌂',label:'Command Center',sub:'Home dashboard',run:function(){setView('home');}},
      {icon:'●',label:'Live Race Center',sub:isLive()?'LIVE NOW • '+currentFlag():'Telemetry + scoring',run:function(){openLiveRaceCenter();},live:isLive()},
      {icon:'◫',label:'Standings',sub:'Championship center',run:function(){setView('standings');}},
      {icon:'▦',label:'Schedule',sub:'Race calendar',run:function(){setView('schedule');}},
      {icon:'◉',label:'Drivers',sub:'Driver database',run:function(){setView('drivers');}},
      {icon:'🏁',label:'Race Archive',sub:'Results + winners',run:function(){renderResults();}},
      {icon:'🎧',label:'Spotter Mode',sub:'Race Night Pro',run:function(){openFeature('spotter');}},
      {icon:'★',label:'Live Watchlist',sub:'Favorite drivers',run:function(){openFeature('watchlist');}},
      {icon:'∑',label:'Championship Simulator',sub:'Scenario math',run:function(){openFeature('simulator');}},
      {icon:'⌕',label:'Search HLRN',sub:'Drivers • teams • tracks',run:function(){if(window.openHLRNSearch)openHLRNSearch();}},
      {icon:'▣',label:'Share Studio',sub:'Post-ready graphics',run:function(){openFeature('graphics');}},
      {icon:'⚙',label:'Operations',sub:'System + data health',run:function(){openFeature('admin');}}
    ];
    return items;
  }

  function renderPalette(){
    const status=document.getElementById('hyperGridPaletteStatus');
    const grid=document.getElementById('hyperGridPaletteGrid');
    if(!status||!grid)return;

    const feed=liveFeed();
    const n=nextRaceInfo();
    status.innerHTML=
      '<div class="'+(isLive()?'live':'')+'"><i></i><span><small>NETWORK</small><strong>'+(isLive()?'LIVE • '+esc(currentFlag()):'READY')+'</strong></span></div>'+
      '<div><small>'+esc(String(n.league).toUpperCase())+' NEXT</small><strong>'+esc(isLive()?(feed?.track||state.liveRace.track||'HLRN LIVE'):(n.race.track||'Loading…'))+'</strong></div>'+
      '<div><small>VIEW</small><strong>'+esc(viewLabel().toUpperCase())+'</strong></div>';

    grid.innerHTML=commandItems().map(function(item,index){
      return '<button class="'+(item.live?'live':'')+'" data-hg-command="'+index+'">'+
        '<span>'+item.icon+'</span><div><strong>'+esc(item.label)+'</strong><small>'+esc(item.sub)+'</small></div><b>›</b>'+
      '</button>';
    }).join('');

    grid.querySelectorAll('[data-hg-command]').forEach(function(btn){
      btn.addEventListener('click',function(){
        const item=commandItems()[Number(btn.dataset.hgCommand)];
        closeHyperGridLauncher();
        if(item&&item.run)item.run();
      });
    });
  }

  window.openHyperGridLauncher=function(){
    ensureChrome();
    renderPalette();
    const palette=document.getElementById('hyperGridPalette');
    if(!palette)return;
    palette.classList.add('open');
    palette.setAttribute('aria-hidden','false');
    document.body.classList.add('hg-palette-open');
    try{navigator.vibrate&&navigator.vibrate(8);}catch(e){}
  };

  window.closeHyperGridLauncher=function(){
    const palette=document.getElementById('hyperGridPalette');
    if(!palette)return;
    palette.classList.remove('open');
    palette.setAttribute('aria-hidden','true');
    document.body.classList.remove('hg-palette-open');
  };

  function tickerContent(){
    const feed=liveFeed();
    const n=nextRaceInfo();
    const live=isLive();
    const leader=live&&Array.isArray(feed?.drivers)
      ?[...feed.drivers].filter(function(d){return d&&d.position!=null;}).sort(function(a,b){return Number(a.position)-Number(b.position);})[0]
      :null;
    const bits=[];
    if(live){
      bits.push('<b class="live">LIVE</b>');
      bits.push('<span>'+esc(currentFlag())+'</span>');
      bits.push('<strong>'+esc(feed?.track||state.liveRace.track||'HLRN Race')+'</strong>');
      bits.push('<span>'+esc(sessionLabel())+'</span>');
      if(feed?.lap!=null)bits.push('<span>LAP '+esc(feed.lap)+(feed.totalLaps?' / '+esc(feed.totalLaps):'')+'</span>');
      if(leader)bits.push('<span>LEADER #'+esc(leader.number||'—')+' '+esc(prettyName(String(leader.name||leader.driver||'')))+'</span>');
    }else{
      bits.push('<b>'+esc(String(n.league).toUpperCase())+'</b>');
      bits.push('<strong>'+esc(n.race.track||'Next HLRN Event')+'</strong>');
      if(n.race.date)bits.push('<span>'+esc(n.race.date)+'</span>');
      if(n.race.time)bits.push('<span>'+esc(n.race.time)+'</span>');
      bits.push('<span>RACEOS HYPERGRID</span>');
    }
    return bits.join('<i></i>');
  }

  function renderTicker(){
    const ticker=document.getElementById('hyperGridTicker');
    if(!ticker)return;
    const html=tickerContent();
    ticker.classList.toggle('live',isLive());
    ticker.innerHTML='<div class="hg-ticker-track">'+html+'</div><div class="hg-ticker-track clone" aria-hidden="true">'+html+'</div>';
  }

  function updateBodyState(){
    document.documentElement.dataset.hypergrid='16';
    document.body.dataset.hgLeague=String(league()||'HLRN').toLowerCase();
    document.body.dataset.hgView=String(state.currentView||'home').toLowerCase();
    document.body.dataset.hgFlag=normalizedFlag(currentFlag());
    const flag=currentFlag();
    if(flag!==lastFlag){
      lastFlag=flag;
      document.body.classList.remove('hg-flag-flash');
      void document.body.offsetWidth;
      if(isLive())document.body.classList.add('hg-flag-flash');
    }
  }

  function moveNavIndicator(){
    const nav=document.querySelector('.bottom-nav');
    const indicator=document.getElementById('hyperGridNavIndicator');
    const active=nav?.querySelector('.nav-item.active');
    if(!nav||!indicator||!active)return;
    const navRect=nav.getBoundingClientRect();
    const rect=active.getBoundingClientRect();
    indicator.style.width=rect.width+'px';
    indicator.style.transform='translateX('+(rect.left-navRect.left)+'px)';
  }

  function addHeroCorners(){
    document.querySelectorAll([
      '.cc-topline',
      '.cc-race-panel',
      '.premium-page-head',
      '.feature-hero-shell',
      '.native-live-head',
      '.driver-card-hero',
      '.winner-spotlight',
      '.rnp-spotter-hero',
      '.rnp-weekend-hero'
    ].join(',')).forEach(function(el){
      if(el.querySelector(':scope > .hg-corners'))return;
      const c=document.createElement('span');
      c.className='hg-corners';
      c.innerHTML='<i></i><i></i><i></i><i></i>';
      c.setAttribute('aria-hidden','true');
      el.appendChild(c);
    });
  }

  function addCardSheen(){
    document.querySelectorAll([
      '.cc-status-card','.cc-championship-card','.cc-winner-card',
      '.schedule-card','.driver-row','.podium-card','.archive-result-row',
      '.record-card','.social-card','.os-track-card','.rnp-watch-card',
      '.native-live-row','.native-battle-card'
    ].join(',')).forEach(function(el){
      el.classList.add('hg-surface');
    });
  }

  function decorateNumbers(){
    document.querySelectorAll('.countdown strong,.points-value,.snapshot-card strong,.dc-stat strong,.career-stat strong,.native-live-scoreboard strong,.rnp-spotter-pos strong').forEach(function(el){
      el.classList.add('hg-data-number');
    });
  }

  function decorateImages(){
    document.querySelectorAll([
      '.cc-leader-photo','.cc-winner-photo','.driver-row-photo',
      '.podium-driver-photo','.driver-card-photo','.winner-driver-photo',
      '.result-driver-photo','.native-focus-photo','.nl-driver-photo',
      '.rnp-spotter-photo','.rnp-watch-photo'
    ].join(',')).forEach(function(img){
      img.classList.add('hg-driver-image');
    });
  }

  function addViewStamp(){
    const app=document.getElementById('app');
    if(!app)return;
    const stamp=String(state.currentView||'home')+'|'+String(state.featureView||'')+'|'+String(league());
    if(stamp===pageStamp)return;
    pageStamp=stamp;
    app.classList.remove('hg-page-enter');
    void app.offsetWidth;
    app.classList.add('hg-page-enter');
  }

  function decorate(){
    ensureChrome();
    updateBodyState();
    renderTicker();
    renderPalette();
    moveNavIndicator();
    addHeroCorners();
    addCardSheen();
    decorateNumbers();
    decorateImages();
    addViewStamp();

    const edition=document.querySelector('.top-edition');
    if(edition)edition.textContent='16';
    const brand=document.querySelector('.top-brand h1 em');
    if(brand)brand.textContent='HYPERGRID';
  }

  function pointerMove(event){
    if(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches)return;
    if(pointerRAF)return;
    pointerRAF=requestAnimationFrame(function(){
      pointerRAF=0;
      const x=event.clientX/window.innerWidth;
      const y=event.clientY/window.innerHeight;
      document.documentElement.style.setProperty('--hg-x',(x*100).toFixed(2)+'%');
      document.documentElement.style.setProperty('--hg-y',(y*100).toFixed(2)+'%');
      document.documentElement.style.setProperty('--hg-tilt-x',((x-.5)*2).toFixed(3));
      document.documentElement.style.setProperty('--hg-tilt-y',((y-.5)*2).toFixed(3));
    });
  }

  function installKeyboard(){
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){
        closeHyperGridLauncher();
        return;
      }
      if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){
        e.preventDefault();
        openHyperGridLauncher();
      }
    });
  }

  function boot(){
    ensureChrome();
    decorate();
    installKeyboard();
    window.addEventListener('pointermove',pointerMove,{passive:true});
    window.addEventListener('resize',function(){
      clearTimeout(navTimer);
      navTimer=setTimeout(moveNavIndicator,50);
    },{passive:true});

    const app=document.getElementById('app');
    if(app){
      appObserver=new MutationObserver(function(){
        requestAnimationFrame(decorate);
      });
      appObserver.observe(app,{subtree:true,childList:true,attributes:false});
    }

    const nav=document.querySelector('.bottom-nav');
    if(nav){
      new MutationObserver(function(){requestAnimationFrame(moveNavIndicator);})
        .observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
    }

    tickerTimer=setInterval(function(){
      renderTicker();
      updateBodyState();
      moveNavIndicator();
    },1000);

    try{
      if(localStorage.getItem('hlrn-hypergrid-version')!==HYPERGRID_VERSION){
        localStorage.setItem('hlrn-hypergrid-version',HYPERGRID_VERSION);
        setTimeout(function(){
          if(window.hlrnToast)window.hlrnToast('HLRN HyperGrid 16 loaded — cinematic interface online','good');
        },900);
      }
    }catch(e){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,0);
})();