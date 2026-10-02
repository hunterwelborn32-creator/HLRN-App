(function(){
  'use strict';

  const FUSION_VERSION='18.0.0';
  const ACTIVITY_KEY='hlrn_fusion_activity_v1';
  const DIRECTOR_KEY='hlrn_fusion_director_pref_v1';
  let renderTimer=null;
  let previousLive={flag:'',leader:'',phase:'',lap:null};
  let fullScreenBound=false;

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }
  function n(v,fallback){
    const x=Number(v);
    return Number.isFinite(x)?x:(fallback==null?0:fallback);
  }
  function normalize(v){
    return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  }
  function pretty(v){
    try{return prettyName(String(v||''));}catch(e){return String(v||'');}
  }
  function readJSON(key,fallback){
    try{
      const x=JSON.parse(localStorage.getItem(key)||'null');
      return x==null?fallback:x;
    }catch(e){return fallback;}
  }
  function writeJSON(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}
  }
  function toast(text,tone){
    if(window.hlrnToast)window.hlrnToast(text,tone);
  }
  function feed(){
    return state.liveRace&&state.liveRace.feed?state.liveRace.feed:null;
  }
  function isLive(){
    return !!(state.liveRace&&state.liveRace.connected&&state.liveRace.driverCount>0);
  }
  function drivers(f){
    f=f||feed();
    try{return liveDrivers(f);}catch(e){
      return (Array.isArray(f?.drivers)?[...f.drivers]:[])
        .filter(function(d){return d&&d.position!=null;})
        .sort(function(a,b){return n(a.position,999)-n(b.position,999);});
    }
  }
  function nameOf(d){return pretty(d?.name||d?.driver||'Unknown');}
  function statusOf(d,f){
    try{return liveDriverStatus(d,f||feed());}
    catch(e){return String(d?.status||'ON TRACK').toUpperCase();}
  }
  function gapOf(d){
    try{return liveGapText(d);}
    catch(e){
      if(n(d?.position)===1)return 'LEADER';
      const g=Number(d?.gap);
      return Number.isFinite(g)?'+'+g.toFixed(3):'—';
    }
  }
  function lapTime(v){
    try{return liveLapTime(v);}
    catch(e){
      const x=Number(v);
      if(!Number.isFinite(x)||x<=0)return '—';
      const m=Math.floor(x/60),s=x-m*60;
      return m?m+':'+s.toFixed(3).padStart(6,'0'):s.toFixed(3);
    }
  }
  function currentLeague(){
    const text=String(feed()?.series||feed()?.sessionName||'').toLowerCase();
    if(text.includes('monday'))return 'Monday';
    if(text.includes('sunday'))return 'Sunday';
    return state.homeLeague||'Sunday';
  }
  function nextRace(){
    const l=state.homeLeague||'Sunday';
    return {league:l,race:(state.nextRaces||{})[l]||{}};
  }
  function raceDeltaMs(){
    const r=nextRace().race;
    const t=new Date(r.iso||'').getTime();
    return Number.isFinite(t)?t-Date.now():null;
  }
  function raceContext(){
    const f=feed();
    if(isLive()){
      let finished=false;
      try{finished=liveRaceFinished(f);}catch(e){finished=String(f?.flag||'').toUpperCase().includes('CHECKER');}
      if(finished)return {key:'postrace',label:'CHECKERED',detail:'Final workflow and results'};
      const phase=String(f?.phase||f?.sessionName||'').toLowerCase();
      const flag=String(f?.flag||'').toUpperCase();
      const rc=f?.raceControl||{};
      if(phase.includes('race')){
        if(rc.oneToGreen)return {key:'restart',label:'ONE TO GREEN',detail:'Restart sequence active'};
        if(rc.active||flag.includes('YELLOW')||flag.includes('CAUTION'))return {key:'caution',label:'CAUTION',detail:'Race Control active'};
        return {key:'green',label:'GREEN FLAG',detail:'Race in progress'};
      }
      if(phase.includes('qual'))return {key:'qualifying',label:'QUALIFYING',detail:'Grid being set'};
      if(phase.includes('practice'))return {key:'practice',label:'PRACTICE',detail:'Session live'};
      return {key:'live',label:'LIVE SESSION',detail:'Telemetry connected'};
    }
    const diff=raceDeltaMs();
    if(diff!=null&&diff>0&&diff<=6*3600000)return {key:'raceday',label:'RACE DAY',detail:'Green flag in '+humanCountdown(diff)};
    if(diff!=null&&diff>0&&diff<=48*3600000)return {key:'weekend',label:'RACE WEEKEND',detail:'Next event in '+humanCountdown(diff)};
    return {key:'network',label:'NETWORK MODE',detail:'Championship, media and intelligence'};
  }
  function humanCountdown(ms){
    if(ms==null||ms<=0)return 'now';
    const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000);
    if(d)return d+'d '+h+'h';
    if(h)return h+'h '+m+'m';
    return Math.max(1,m)+'m';
  }

  /* =========================================================
     ACTIVITY STREAM
     ========================================================= */
  function activity(){
    return readJSON(ACTIVITY_KEY,[]);
  }
  function saveActivity(rows){
    writeJSON(ACTIVITY_KEY,(rows||[]).slice(0,80));
  }
  function addActivity(type,title,text,meta,key){
    const rows=activity();
    if(key&&rows.some(function(x){return x.key===key;}))return;
    rows.unshift({
      id:'ACT-'+Date.now().toString(36),
      key:key||'',
      type:type||'system',
      title:String(title||'HLRN Update'),
      text:String(text||''),
      meta:String(meta||''),
      at:Date.now()
    });
    saveActivity(rows);
  }
  function seedActivity(){
    const rows=activity();
    if(rows.length)return;
    (state.latestResults||[]).slice(0,4).forEach(function(r){
      addActivity('result',(r.league||'HLRN')+' Result',pretty(r.winner||'Winner')+' won at '+String(r.track||'HLRN Event'),String(r.date||''),'seed-result-'+String(r.league||'')+'-'+String(r.track||''));
    });
    (state.announcements||[]).slice(0,3).forEach(function(a,i){
      addActivity('news',a.title||'Official Bulletin',a.text||'',a.time||'','seed-news-'+i+'-'+String(a.title||''));
    });
  }
  function recordLiveActivity(f){
    if(!f||!isLive())return;
    const list=drivers(f);
    const leader=list[0];
    const flag=String(f.flag||'').toUpperCase();
    const phase=String(f.phase||f.sessionName||'').toLowerCase();
    const lap=n(f.lap,null);

    if(previousLive.flag&&flag&&flag!==previousLive.flag){
      addActivity('flag','Flag Change',previousLive.flag+' → '+flag,'Lap '+(lap??'—'),'flag-'+flag+'-'+String(lap));
    }
    const leaderName=leader?nameOf(leader):'';
    if(previousLive.leader&&leaderName&&leaderName!==previousLive.leader){
      addActivity('lead','New Race Leader',leaderName+' moved to P1','#'+String(leader.number||'—')+' • Lap '+String(lap??'—'),'lead-'+normalize(leaderName)+'-'+String(lap));
    }
    if(previousLive.phase&&phase&&phase!==previousLive.phase){
      addActivity('session','Session Change',phase.replace(/_/g,' ').toUpperCase(),String(f.track||''),'phase-'+phase+'-'+Date.now());
    }
    previousLive={flag:flag,leader:leaderName,phase:phase,lap:lap};
  }

  function combinedActivity(){
    const dynamic=[];
    (state.announcements||[]).slice(0,5).forEach(function(a,i){
      dynamic.push({
        id:'news-'+i,
        type:'news',
        title:a.title||'HLRN Bulletin',
        text:a.text||'',
        meta:a.time||'',
        at:0,
        jumpUrl:a.jumpUrl||''
      });
    });
    (state.latestResults||[]).slice(0,4).forEach(function(r,i){
      dynamic.push({
        id:'result-'+i,
        type:'result',
        title:(r.league||'HLRN')+' Winner',
        text:pretty(r.winner||'Winner')+' • '+String(r.track||'HLRN Event'),
        meta:r.date||'',
        at:0
      });
    });
    return activity().slice(0,25).concat(dynamic);
  }

  window.clearFusionActivity=function(){
    saveActivity([]);
    renderActivityCenter();
  };
  window.renderActivityCenter=function(){
    seedActivity();
    const rows=combinedActivity();
    const context=raceContext();
    const body='<section class="fc-activity-hero '+esc(context.key)+'"><div><small>FUSION CONTEXT</small><strong>'+esc(context.label)+'</strong><span>'+esc(context.detail)+'</span></div><div><small>ACTIVITY ITEMS</small><strong>'+rows.length+'</strong><span>Live + network events</span></div><button onclick="clearFusionActivity()">CLEAR LOCAL HISTORY</button></section>'+
      '<section class="fc-activity-list">'+(rows.length?rows.map(function(x){
        return '<article class="'+esc(x.type)+'" '+(x.jumpUrl?'onclick="openSocial(\''+esc(x.jumpUrl)+'\')"':'')+'><span>'+activityIcon(x.type)+'</span><div><small>'+esc(x.meta||activityTypeLabel(x.type))+'</small><strong>'+esc(x.title)+'</strong><p>'+esc(x.text)+'</p></div><b>›</b></article>';
      }).join(''):'<div class="empty">No Connected Grid activity yet.</div>')+'</section>';
    featureShell('Activity Center','One stream for race events, results, announcements and Connected Grid changes.',body,'fc-activity-page');
  };
  function activityIcon(type){
    return ({flag:'⚑',lead:'P1',session:'▶',result:'🏁',news:'N',system:'•'}[type]||'•');
  }
  function activityTypeLabel(type){
    return ({flag:'RACE CONTROL',lead:'LIVE RACE',session:'SESSION',result:'RESULT',news:'BULLETIN'}[type]||'HLRN');
  }

  /* =========================================================
     LIVE FIELD VISUALIZATION
     This is scoring order / gap visualization, not a fake map.
     ========================================================= */
  function fieldRows(f){
    const list=drivers(f);
    const leaderGap=Math.max(1,...list.map(function(d){return n(d.gap,0);}));
    return list.map(function(d){
      const pos=n(d.position,999);
      const gap=pos===1?0:Math.max(0,n(d.gap,0));
      return {
        d:d,
        name:nameOf(d),
        pos:pos,
        gap:gap,
        x:pos===1?3:Math.min(96,3+(gap/leaderGap)*91),
        status:statusOf(d,f)
      };
    });
  }
  function fieldVisualization(f){
    const rows=fieldRows(f).slice(0,24);
    if(!rows.length)return '<div class="empty">Waiting for scored cars.</div>';
    return '<section class="fc-field-map"><header><div><small>SCORING GAP VISUALIZATION</small><strong>FIELD SPREAD</strong></div><span>LEFT = LEADER • RIGHT = FURTHER BEHIND</span></header><div class="fc-field-lane">'+
      rows.map(function(x){
        const hot=(function(){
          try{return liveBattles(f).some(function(b){return driverKeySafe(b.ahead)===driverKeySafe(x.d)||driverKeySafe(b.behind)===driverKeySafe(x.d);});}catch(e){return false;}
        })();
        return '<button class="'+(hot?'battle ':'')+(x.pos===1?'leader':'')+'" style="--x:'+x.x+'%" onclick="fusionFocusDriver(\''+encodeURIComponent(x.name)+'\')"><b>P'+x.pos+'</b><i></i><span>#'+esc(x.d.number||'—')+'</span><strong>'+esc(x.name)+'</strong><em>'+esc(x.pos===1?'LEADER':x.gap.toFixed(2)+'s')+'</em></button>';
      }).join('')+
    '</div><footer><span>Visualization uses reported scoring gaps only.</span><b>'+rows.length+' scored cars</b></footer></section>';
  }
  function driverKeySafe(d){
    try{return liveDriverKey(d);}catch(e){return normalize(nameOf(d))+'|'+String(d?.number||'');}
  }

  /* =========================================================
     FAVORITE DRIVER COMMAND FOCUS
     ========================================================= */
  function focusDriver(f){
    const favoriteNames=(state.favorites||[]).map(normalize);
    const list=drivers(f);
    const pinned=readJSON('hlrn-driver-os-profile',{}).pinnedDriver||'';
    return list.find(function(d){return normalize(nameOf(d))===normalize(pinned);})
      ||list.find(function(d){return favoriteNames.includes(normalize(nameOf(d)));})
      ||list[0]||null;
  }
  function recentRows(name){
    try{return (driverProfileRows(name)||[]).slice(-6);}catch(e){return [];}
  }
  function focusPanel(f,d){
    if(!d)return '<section class="fc-focus-empty"><strong>No scored driver yet</strong><span>Driver Command Focus will activate when telemetry arrives.</span></section>';
    const name=nameOf(d);
    const recent=recentRows(name);
    let ahead=null,behind=null;
    const list=drivers(f);
    const idx=list.findIndex(function(x){return driverKeySafe(x)===driverKeySafe(d);});
    if(idx>0)ahead=list[idx-1];
    if(idx>=0&&idx<list.length-1)behind=list[idx+1];
    return '<section class="fc-focus">'+
      driverPhotoMarkup(name,'fc-focus-photo','fc-focus-fallback')+
      '<div class="fc-focus-main"><small>DRIVER COMMAND FOCUS • #'+esc(d.number||'—')+'</small><h3>'+esc(name)+'</h3><p>'+esc(statusOf(d,f))+' • '+esc(gapOf(d))+'</p><div class="fc-focus-relatives"><span>AHEAD <b>'+esc(ahead?'#'+(ahead.number||'—')+' '+nameOf(ahead):'—')+'</b></span><span>BEHIND <b>'+esc(behind?'#'+(behind.number||'—')+' '+nameOf(behind):'—')+'</b></span></div></div>'+
      '<div class="fc-focus-pos"><small>RUNNING</small><strong>P'+esc(d.position||'—')+'</strong><span>START P'+esc(d.startPosition??d.start??'—')+'</span></div>'+
      '<div class="fc-focus-stats"><div><small>LAST</small><strong>'+esc(lapTime(d.lastLapTime))+'</strong></div><div><small>BEST</small><strong>'+esc(lapTime(d.bestLapTime))+'</strong></div><div><small>INC</small><strong>'+esc(d.incidents??d.incidentPoints??'—')+'</strong></div><div><small>RECENT</small><strong>'+esc(recent.map(function(r){return 'P'+r.finish;}).join(' • ')||'—')+'</strong></div></div>'+
      '<footer><button onclick="openHLRNDriverProfile(\''+encodeURIComponent(name)+'\')">DRIVER CARD</button><button onclick="openFeature(\'spotter\')">SPOTTER MODE</button><button onclick="openFeature(\'livechamp\')">LIVE CHAMPIONSHIP</button></footer>'+
    '</section>';
  }
  window.fusionFocusDriver=function(encoded){
    const name=decodeURIComponent(encoded);
    const p=readJSON('hlrn-driver-os-profile',{});
    p.pinnedDriver=name;
    writeJSON('hlrn-driver-os-profile',p);
    state.liveFocusKey='';
    renderRaceDirector();
  };

  /* =========================================================
     RACE DIRECTOR
     ========================================================= */
  function battleCards(f){
    let battles=[];
    try{battles=liveBattles(f);}catch(e){}
    if(!battles.length)return '<div class="empty">No top-10 green-flag battle is inside the current battle threshold.</div>';
    return battles.slice(0,6).map(function(b){
      const a=nameOf(b.ahead),d=nameOf(b.behind);
      return '<button onclick="fusionFocusDriver(\''+encodeURIComponent(d)+'\')"><span>P'+esc(b.behind.position)+'</span><div><small>'+Number(b.interval).toFixed(3)+' SEC</small><strong>#'+esc(b.behind.number||'—')+' '+esc(d)+'</strong><em>chasing #'+esc(b.ahead.number||'—')+' '+esc(a)+'</em></div><b>⚔</b></button>';
    }).join('');
  }
  function fastestCards(f){
    let rows=[];
    try{rows=liveFastestDrivers(f);}catch(e){}
    return rows.slice(0,5).map(function(d,i){
      return '<article><b>'+(i+1)+'</b><div><strong>'+esc(nameOf(d))+'</strong><span>#'+esc(d.number||'—')+'</span></div><em>'+esc(lapTime(d.bestLapTime))+'</em></article>';
    }).join('')||'<div class="empty">Fastest laps will populate once timed laps are available.</div>';
  }
  function recentTimeline(f){
    let rows=[];
    try{rows=liveEvents(f);}catch(e){}
    return rows.slice(-8).reverse().map(function(e){
      return '<article><b>L'+esc(e.lap??'—')+'</b><div><strong>'+esc(e.title||String(e.type||'Race Event').replace(/_/g,' '))+'</strong><span>'+esc(e.text||'')+'</span></div></article>';
    }).join('')||'<div class="empty">No recorded timeline events yet.</div>';
  }
  function directorHeader(f){
    const context=raceContext();
    const list=drivers(f);
    const leader=list[0];
    const rc=f?.raceControl||{};
    return '<section class="fc-director-hero '+esc(context.key)+'"><div><small>HLRN FUSION CONTROL</small><h2>'+esc(context.label)+'</h2><p>'+esc(f?.track||state.liveRace.track||'HLRN Live Session')+' • '+esc(String(f?.sessionName||f?.phase||'').replace(/_/g,' ').toUpperCase())+'</p><div><span>FLAG <b>'+esc(String(f?.flag||'—').toUpperCase())+'</b></span><span>LAP <b>'+esc(f?.lap??'—')+(f?.totalLaps?' / '+esc(f.totalLaps):'')+'</b></span><span>FIELD <b>'+list.length+'</b></span><span>CAUTIONS <b>'+esc(rc.cautionCount??0)+'</b></span></div></div>'+
      '<div class="fc-director-leader"><small>RACE LEADER</small><strong>'+esc(leader?nameOf(leader):'—')+'</strong><span>'+esc(leader?'#'+(leader.number||'—'):'WAITING')+'</span></div>'+
      '<button onclick="toggleFusionFullscreen()">FULLSCREEN TV</button></section>';
  }
  window.toggleFusionFullscreen=async function(){
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    }catch(e){toast('Fullscreen is not available in this browser');}
  };
  function directorBody(){
    const f=feed();
    if(!f||!isLive()){
      return '<section class="fc-director-standby"><span>FC</span><strong>Fusion Control is armed</strong><p>Start the HLRN live bridge. Race Director will automatically populate scoring order, battles, fastest laps, field spread, Race Control events and favorite-driver focus.</p><button onclick="openFeature(\'weekend\')">EVENT WEEKEND CENTER</button></section>';
    }
    const focus=focusDriver(f);
    return directorHeader(f)+
      '<section class="fc-director-grid"><div class="fc-director-main">'+fieldVisualization(f)+focusPanel(f,focus)+'</div><aside><div class="fc-director-side"><header><small>BATTLE CENTER</small><strong>Closest Fights</strong></header>'+battleCards(f)+'</div><div class="fc-director-side"><header><small>PACE BOARD</small><strong>Fastest Laps</strong></header>'+fastestCards(f)+'</div></aside></section>'+
      '<section class="fc-director-lower"><div><div class="section-head"><h3>Race Timeline</h3><span>RECORDED EVENTS</span></div><section class="fc-director-timeline">'+recentTimeline(f)+'</section></div><div><div class="section-head"><h3>Race Command</h3><span>CONNECTED TOOLS</span></div><section class="fc-command-grid"><button onclick="openFeature(\'racecontrol2\')"><span>RC</span><strong>Race Control 2.0</strong><small>Flags + restart + penalties</small></button><button onclick="openFeature(\'pitstrategy\')"><span>PIT</span><strong>Pit Strategy</strong><small>Stops + stints</small></button><button onclick="openFeature(\'livechamp\')"><span>PTS</span><strong>Live Championship</strong><small>Unofficial points</small></button><button onclick="openFeature(\'spotter\')"><span>🎧</span><strong>Spotter</strong><small>Relative timing</small></button></section></div></section>';
  }
  window.renderRaceDirector=function(){
    featureShell('Race Director','Unified live scoring, field spread, battles, pace, timeline and driver focus.',directorBody(),'fc-director-page');
  };

  /* =========================================================
     FUSION HOME — CONTEXTUAL CONTROL STRIP
     ========================================================= */
  function homeFusionPanel(){
    const ctx=raceContext();
    const f=feed();
    let primary,secondary;
    if(isLive()){
      primary={label:'OPEN RACE DIRECTOR',action:"openFeature('director')"};
      secondary={label:'LIVE CHAMPIONSHIP',action:"openFeature('livechamp')"};
    }else if(ctx.key==='raceday'||ctx.key==='weekend'){
      primary={label:'EVENT WEEKEND CENTER',action:"openFeature('weekend')"};
      secondary={label:'CHAMPIONSHIP CENTER',action:"setView('standings')"};
    }else{
      primary={label:'DRIVER INTELLIGENCE',action:"openFeature('records')"};
      secondary={label:'MEDIA CENTER',action:"openFeature('media')"};
    }

    const list=drivers(f);
    const leader=list[0];
    let battleCount=0;
    try{battleCount=liveBattles(f).length;}catch(e){}
    return '<section class="fc-home '+esc(ctx.key)+'"><header><div><small>HLRN APP 18 • FUSION CONTROL</small><strong>'+esc(ctx.label)+'</strong><span>'+esc(ctx.detail)+'</span></div><i></i></header><div class="fc-home-pulse"><article><small>CONTEXT</small><strong>'+esc(ctx.label)+'</strong><span>'+esc(nextRace().league)+'</span></article><article><small>'+esc(isLive()?'LEADER':'NEXT TRACK')+'</small><strong>'+esc(isLive()?(leader?nameOf(leader):'—'):(nextRace().race.track||'Loading'))+'</strong><span>'+esc(isLive()?(leader?'#'+(leader.number||'—'):''):(nextRace().race.date||''))+'</span></article><article><small>'+esc(isLive()?'BATTLES':'ACTIVITY')+'</small><strong>'+esc(isLive()?battleCount:combinedActivity().length)+'</strong><span>'+esc(isLive()?'top-10 close battles':'network items')+'</span></article></div><div class="fc-home-actions"><button onclick="'+primary.action+'"><span>01</span><strong>'+primary.label+'</strong><b>›</b></button><button onclick="'+secondary.action+'"><span>02</span><strong>'+secondary.label+'</strong><b>›</b></button><button onclick="openFeature(\'activity\')"><span>03</span><strong>ACTIVITY CENTER</strong><b>›</b></button><button onclick="openFeature(\'director\')"><span>04</span><strong>RACE DIRECTOR</strong><b>›</b></button></div></section>';
  }
  function injectFusionHome(){
    if(state.currentView!=='home'||document.querySelector('.fc-home'))return;
    const anchor=document.querySelector('.cg-home')||document.querySelector('.rnp-home-launcher')||document.querySelector('.cc-status-grid');
    if(anchor)anchor.insertAdjacentHTML('beforebegin',homeFusionPanel());
  }

  /* =========================================================
     MINI COMMAND BAR ON LIVE CENTER
     ========================================================= */
  function injectFusionLive(){
    if(state.currentView!=='live-center'||document.querySelector('.fc-live-command'))return;
    const anchor=document.querySelector('.native-live-head');
    if(!anchor)return;
    anchor.insertAdjacentHTML('afterend','<section class="fc-live-command"><button onclick="openFeature(\'director\')"><span>FC</span><strong>RACE DIRECTOR</strong></button><button onclick="openFeature(\'livechamp\')"><span>PTS</span><strong>LIVE TITLE</strong></button><button onclick="openFeature(\'pitstrategy\')"><span>PIT</span><strong>STRATEGY</strong></button><button onclick="openFeature(\'activity\')"><span>ACT</span><strong>ACTIVITY</strong></button></section>');
  }

  /* =========================================================
     INTEGRATION
     ========================================================= */
  const renderFeatureBefore18=renderFeature;
  renderFeature=function(name){
    if(name==='director')return renderRaceDirector();
    if(name==='activity')return renderActivityCenter();
    return renderFeatureBefore18(name);
  };

  const renderHomeBefore18=renderHome;
  renderHome=function(){
    renderHomeBefore18();
    seedActivity();
    injectFusionHome();
  };

  const renderLiveBefore18=renderLiveRaceCenter;
  renderLiveRaceCenter=function(preserveScroll,addHistory){
    renderLiveBefore18(preserveScroll,addHistory);
    injectFusionLive();
  };

  const applyLiveBefore18=applyLiveRaceState;
  applyLiveRaceState=function(f){
    recordLiveActivity(f);
    applyLiveBefore18(f);
    clearTimeout(renderTimer);
    renderTimer=setTimeout(function(){
      if(state.currentView==='feature'&&state.featureView==='director')renderRaceDirector();
      else if(state.currentView==='feature'&&state.featureView==='activity')renderActivityCenter();
      else if(state.currentView==='home'){
        document.querySelector('.fc-home')?.remove();
        injectFusionHome();
      }else if(state.currentView==='live-center'){
        document.querySelector('.fc-live-command')?.remove();
        injectFusionLive();
      }
    },850);
  };

  function injectPalette(){
    const grid=document.getElementById('hyperGridPaletteGrid');
    if(!grid||grid.querySelector('.fc-palette-command'))return;
    const items=[
      ['FC','Race Director','Unified live command',"openFeature('director')"],
      ['ACT','Activity Center','Race + network event stream',"openFeature('activity')"]
    ];
    items.forEach(function(x){
      const b=document.createElement('button');
      b.className='fc-palette-command';
      b.innerHTML='<span>'+x[0]+'</span><div><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div><b>›</b>';
      b.onclick=function(){
        if(window.closeHyperGridLauncher)closeHyperGridLauncher();
        if(x[0]==='FC')openFeature('director'); else openFeature('activity');
      };
      grid.appendChild(b);
    });
  }
  const openPaletteBefore18=window.openHyperGridLauncher;
  if(typeof openPaletteBefore18==='function'){
    window.openHyperGridLauncher=function(){
      openPaletteBefore18();
      setTimeout(injectPalette,0);
    };
  }

  function updateBrand(){
    document.documentElement.dataset.fusionControl='18';
    const edition=document.querySelector('.top-edition');if(edition)edition.textContent='18';
    const brand=document.querySelector('.top-brand h1 em');if(brand)brand.textContent='FUSION CONTROL';
  }

  function boot(){
    updateBrand();
    seedActivity();
    if(state.currentView==='home')injectFusionHome();
    if(state.currentView==='live-center')injectFusionLive();

    if(!fullScreenBound){
      fullScreenBound=true;
      document.addEventListener('fullscreenchange',function(){
        document.body.classList.toggle('fc-fullscreen',!!document.fullscreenElement);
      });
    }

    try{
      if(localStorage.getItem('hlrn-fusion-version')!==FUSION_VERSION){
        localStorage.setItem('hlrn-fusion-version',FUSION_VERSION);
        setTimeout(function(){toast('Fusion Control 18 online — Race Director and adaptive context added','good');},900);
      }
    }catch(e){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,0);
})();