(function(){
  const DRIVER_OS_VERSION='13.0.0';
  const PROFILE_KEY='hlrn-driver-os-profile';
  const SNAPSHOT_KEY='hlrn-app13-offline-snapshot';
  const ALERT_KEY='hlrn-app13-alerts';
  const MAX_ALERTS=80;
  const FEATURE_NAMES=[
    ['myhlrn','My HLRN','Personal dashboard, favorites and preferences'],
    ['simulator','Championship Simulator','Run finish-position points scenarios'],
    ['replay','Race Replay','Scrub the current or frozen race timeline'],
    ['graphics','Share Studio','Generate post-ready HLRN graphics'],
    ['teams','Team Garage','Team championship and driver garages'],
    ['tracks','Track Intelligence','History, winners and driver performance'],
    ['achievements','Achievements','Career badges and milestones'],
    ['recap','Race Recap','Automatic post-race story'],
    ['headtohead','Head-to-Head','Compare HLRN drivers'],
    ['power','Power Rankings','Hosted performance rankings'],
    ['records','Records','HLRN career record book'],
    ['notifications','Notifications','Push alerts and bulletins'],
    ['admin','Operations','HLRN data and race-night health']
  ];

  function readJSON(key,fallback){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      return parsed==null?fallback:parsed;
    }catch(e){return fallback;}
  }
  function writeJSON(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}
  }
  function driverOSProfile(){
    const raw=readJSON(PROFILE_KEY,{});
    return {
      homeLeague:raw.homeLeague==='Monday'?'Monday':'Sunday',
      favoriteTeamLeague:raw.favoriteTeamLeague==='Monday'?'Monday':'Sunday',
      favoriteTeam:String(raw.favoriteTeam||''),
      pinnedDriver:String(raw.pinnedDriver||''),
      favoriteAlerts:raw.favoriteAlerts!==false,
      raceDayTakeover:raw.raceDayTakeover!==false,
      haptics:raw.haptics!==false
    };
  }
  function saveDriverOSProfile(patch){
    const next=Object.assign({},driverOSProfile(),patch||{});
    writeJSON(PROFILE_KEY,next);
    if(next.homeLeague)state.homeLeague=next.homeLeague;
    return next;
  }
  function decodeSafe(value){
    try{return decodeURIComponent(String(value||''));}catch(e){return String(value||'');}
  }
  function slug(value){
    return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function vibrate(pattern){
    if(driverOSProfile().haptics===false)return;
    try{if(navigator.vibrate)navigator.vibrate(pattern||8);}catch(e){}
  }
  function toast(message,tone){
    let root=document.getElementById('hlrnToastStack');
    if(!root){
      root=document.createElement('div');
      root.id='hlrnToastStack';
      root.className='os-toast-stack';
      document.body.appendChild(root);
    }
    const el=document.createElement('div');
    el.className='os-toast '+(tone||'');
    el.innerHTML='<i></i><span>'+escapeHtml(String(message||''))+'</span>';
    root.appendChild(el);
    requestAnimationFrame(function(){el.classList.add('show');});
    setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove();},260);},3600);
  }
  window.hlrnToast=toast;

  function combinedDriverNames(){
    const names=new Set();
    (state.drivers||[]).forEach(function(d){if(d&&d.name)names.add(prettyName(String(d.name)));});
    ['Sunday','Monday'].forEach(function(league){
      (state.standings[league]||[]).forEach(function(d){if(d&&d.name)names.add(prettyName(String(d.name)));});
      (state.results[league]||[]).forEach(function(r){if(r&&r.driver)names.add(prettyName(String(r.driver)));});
    });
    (state.hostedDrivers||[]).forEach(function(d){if(d&&d.name)names.add(prettyName(String(d.name)));});
    return Array.from(names).filter(Boolean).sort(function(a,b){return a.localeCompare(b);});
  }

  function resultRowsForName(name){
    try{return driverProfileRows(name)||[];}catch(e){return [];}
  }
  function allTrackNames(){
    const set=new Set();
    ['Sunday','Monday'].forEach(function(league){
      (FULL_SCHEDULE[league]||[]).forEach(function(r){if(r.track)set.add(String(r.track));});
      (state.results[league]||[]).forEach(function(r){if(r.track)set.add(String(r.track));});
    });
    (state.hostedRaceRows||[]).forEach(function(r){if(r.Track)set.add(String(r.Track));});
    return Array.from(set).filter(Boolean).sort(function(a,b){return a.localeCompare(b);});
  }

  function sparklineSVG(values,invert){
    const nums=(values||[]).map(Number).filter(Number.isFinite);
    if(!nums.length)return '<div class="os-chart-empty">NO DATA</div>';
    const w=260,h=64,pad=5;
    let min=Math.min.apply(null,nums),max=Math.max.apply(null,nums);
    if(min===max){min-=1;max+=1;}
    const pts=nums.map(function(v,i){
      const x=pad+(nums.length===1?0:(i/(nums.length-1))*(w-pad*2));
      let ratio=(v-min)/(max-min);
      if(invert)ratio=1-ratio;
      const y=pad+(1-ratio)*(h-pad*2);
      return x.toFixed(1)+','+y.toFixed(1);
    }).join(' ');
    return '<svg class="os-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-hidden="true"><polyline points="'+pts+'"/></svg>';
  }

  function driverAchievements(name){
    const rows=resultRowsForName(name);
    const awards=[];
    if(!rows.length)return awards;
    const wins=rows.filter(function(r){return Number(r.finish)===1;});
    const top5=rows.filter(function(r){return Number(r.finish)>0&&Number(r.finish)<=5;});
    const top10=rows.filter(function(r){return Number(r.finish)>0&&Number(r.finish)<=10;});
    const lapsLed=rows.reduce(function(a,r){return a+Number(r.lapsLed||0);},0);
    const clean=rows.filter(function(r){return Number(r.incidents||0)===0;});
    const maxGain=rows.reduce(function(m,r){
      const s=Number(r.start||0),f=Number(r.finish||0);
      return s>0&&f>0?Math.max(m,s-f):m;
    },0);
    const sources=new Set(wins.map(function(r){return r.source;}));
    const winTracks=wins.map(function(r){return String(r.track||'').toLowerCase();});
    if(rows.length>=1)awards.push(['🏁','First Start']);
    if(wins.length>=1)awards.push(['🏆','Race Winner']);
    if(wins.length>=5)awards.push(['🔥','5 Wins']);
    if(wins.length>=10)awards.push(['👑','10 Wins']);
    if(rows.length>=25)awards.push(['25','25 Starts']);
    if(rows.length>=50)awards.push(['50','50 Starts']);
    if(top5.length>=10)awards.push(['🎯','10 Top 5s']);
    if(top10.length>=25)awards.push(['💪','25 Top 10s']);
    if(lapsLed>=100)awards.push(['💨','100 Laps Led']);
    if(clean.length>=5)awards.push(['✨','5 Clean Races']);
    if(maxGain>=10)awards.push(['🚀','10+ Spot Mover']);
    if(sources.size>=2)awards.push(['🌐','Multi-Series Winner']);
    if(winTracks.some(function(t){return /daytona|talladega|superspeedway|irss/.test(t);}))awards.push(['⚡','Superspeedway Winner']);
    if(winTracks.some(function(t){return /bristol|martinsville|iowa/.test(t);}))awards.push(['🧱','Short Track Winner']);
    ['Sunday','Monday'].forEach(function(league){
      const leader=(state.standings[league]||[])[0];
      if(leader&&prettyName(String(leader.name))===prettyName(name))awards.push(['#1',league+' Points Leader']);
    });
    return awards;
  }

  function latestDriverRow(name){
    const rows=resultRowsForName(name);
    return rows.length?rows[rows.length-1]:null;
  }

  function favoriteDriverCards(){
    const names=(state.favorites||[]).slice(0,4);
    if(!names.length){
      return '<button class="os-empty-choice" onclick="setView(\'drivers\')"><span>☆</span><div><strong>Choose favorite drivers</strong><small>They will become your personal race-day watch list.</small></div><b>›</b></button>';
    }
    return names.map(function(name){
      const latest=latestDriverRow(name);
      const rows=resultRowsForName(name);
      const recent=rows.slice(-5).map(function(r){return Number(r.finish||0);}).filter(function(x){return x>0;});
      return '<button class="os-my-driver" onclick="openHLRNDriverProfile(\''+encodeURIComponent(name)+'\')">'+
        driverPhotoMarkup(name,'os-my-driver-photo','os-my-driver-fallback')+
        '<div><small>MY DRIVER</small><strong>'+escapeHtml(name)+'</strong><span>'+(latest?escapeHtml(latest.source)+' • '+escapeHtml(latest.track)+' • P'+escapeHtml(latest.finish):'Waiting for race history')+'</span>'+
        (recent.length?sparklineSVG(recent,true):'')+'</div></button>';
    }).join('');
  }

  function teamByName(league,name){
    return (state.teamStandings[league]||[]).find(function(t){return String(t.name||'')===String(name||'');})||null;
  }

  function personalizedHomeHTML(){
    const p=driverOSProfile();
    const team=teamByName(p.favoriteTeamLeague,p.favoriteTeam);
    const live=state.liveRace&&state.liveRace.connected&&state.liveRace.driverCount>0;
    return '<section class="os-myhlrn-home">'+
      '<div class="os-myhlrn-head"><div><small>DRIVER OS • PERSONALIZED</small><strong>MY HLRN</strong><span>'+(live?'Race-night data is live.':'Your HLRN watch list on this device.')+'</span></div>'+
      '<button onclick="openFeature(\'myhlrn\')">CUSTOMIZE</button></div>'+
      '<div class="os-myhlrn-drivers">'+favoriteDriverCards()+'</div>'+
      '<div class="os-myhlrn-foot">'+
        '<button onclick="openHLRNSearch()"><span>⌕</span><strong>Search</strong><small>Everything HLRN</small></button>'+
        '<button onclick="openFeature(\'simulator\')"><span>∑</span><strong>Simulator</strong><small>Points scenarios</small></button>'+
        '<button onclick="openFeature(\'replay\')"><span>↺</span><strong>Replay</strong><small>Race timeline</small></button>'+
        '<button onclick="openFeature(\'admin\')"><span>⚙</span><strong>Operations</strong><small>Data health</small></button>'+
      '</div>'+
      (team?'<button class="os-favorite-team" onclick="openTeamGarage(\''+p.favoriteTeamLeague+'\',\''+encodeURIComponent(team.name)+'\')"><small>FAVORITE TEAM • '+escapeHtml(p.favoriteTeamLeague.toUpperCase())+'</small><strong>'+escapeHtml(team.name)+'</strong><span>'+escapeHtml(team.points)+' pts • '+escapeHtml(team.wins||0)+' wins</span><b>GARAGE ›</b></button>':'')+
    '</section>';
  }

  function raceDayInfo(){
    const profile=driverOSProfile();
    if(!profile.raceDayTakeover)return null;
    const live=state.liveRace&&state.liveRace.connected&&state.liveRace.driverCount>0;
    if(live){
      const f=state.liveRace.feed||{};
      return {live:true,league:String(f.series||state.homeLeague||'HLRN'),track:String(f.track||state.liveRace.track||'HLRN Race'),label:String(f.phase||f.sessionName||'LIVE').toUpperCase(),detail:'Lap '+(f.lap||state.liveRace.lap||'—')+(f.totalLaps?' / '+f.totalLaps:'')};
    }
    const candidates=['Sunday','Monday'].map(function(league){return {league:league,race:state.nextRaces[league]};}).filter(function(x){return x.race&&x.race.iso;});
    const now=Date.now();
    candidates.sort(function(a,b){return new Date(a.race.iso)-new Date(b.race.iso);});
    const hit=candidates.find(function(x){
      const diff=new Date(x.race.iso).getTime()-now;
      return diff<=6*3600000&&diff>=-5*3600000;
    });
    if(!hit)return null;
    const diff=new Date(hit.race.iso).getTime()-now;
    return {live:false,league:hit.league,track:hit.race.track,label:diff>0?'RACE DAY':'RACE WINDOW',detail:diff>0?'Green flag in '+Math.max(0,Math.ceil(diff/60000))+' min':'Race-night window active'};
  }

  function addRaceDayTakeover(){
    const info=raceDayInfo();
    document.body.classList.toggle('os-race-day',!!info);
    if(!info)return;
    const top=app.querySelector('.cc-topline');
    if(!top||document.querySelector('.os-race-day-takeover'))return;
    const section=document.createElement('section');
    section.className='os-race-day-takeover '+(info.live?'live':'');
    section.innerHTML='<div class="os-race-day-flag"><i></i><span>'+escapeHtml(info.live?'LIVE NOW':info.label)+'</span></div>'+
      '<div><small>'+escapeHtml(String(info.league||'HLRN').toUpperCase())+'</small><strong>'+escapeHtml(info.track)+'</strong><span>'+escapeHtml(info.detail)+'</span></div>'+
      '<button onclick="'+(info.live?'openLiveRaceCenter()':'setView(\'schedule\')')+'">'+(info.live?'OPEN RACE CENTER':'RACE DETAILS')+' ›</button>';
    top.parentNode.insertBefore(section,top);
  }

  const renderHomeV12=renderHome;
  renderHome=function(){
    const p=driverOSProfile();
    if(p.homeLeague)state.homeLeague=p.homeLeague;
    renderHomeV12();
    const top=app.querySelector('.cc-topline');
    if(top&&!document.querySelector('.os-myhlrn-home')){
      top.insertAdjacentHTML('afterend',personalizedHomeHTML());
    }
    addRaceDayTakeover();
    updateLiveTracker();
  };

  function teamOptions(league,selected){
    const rows=state.teamStandings[league]||[];
    return '<option value="">No favorite team</option>'+rows.map(function(t){
      return '<option value="'+escapeHtml(t.name)+'" '+(String(t.name)===String(selected)?'selected':'')+'>'+escapeHtml(t.name)+'</option>';
    }).join('');
  }

  function myHLRNDriverGrid(){
    const names=combinedDriverNames();
    const favorites=new Set(state.favorites||[]);
    return names.slice(0,120).map(function(name){
      return '<button class="os-driver-picker '+(favorites.has(name)?'selected':'')+'" onclick="toggleFavorite(\''+encodeURIComponent(name)+'\');renderMyHLRN()">'+
        driverPhotoMarkup(name,'os-picker-photo','os-picker-fallback')+
        '<span>'+escapeHtml(name)+'</span><b>'+(favorites.has(name)?'★':'☆')+'</b></button>';
    }).join('');
  }

  window.saveMyHLRNSelect=function(key,value){
    const p={};p[key]=value;saveDriverOSProfile(p);renderMyHLRN();toast('My HLRN updated','good');
  };
  window.toggleMyHLRNSetting=function(key){
    const cur=driverOSProfile();const p={};p[key]=!cur[key];saveDriverOSProfile(p);renderMyHLRN();vibrate(10);
  };

  window.renderMyHLRN=function(){
    const p=driverOSProfile();
    const body='<section class="os-profile-settings">'+
      '<div class="os-setting-row"><div><small>HOME SERIES</small><strong>Default Command Center league</strong></div><select onchange="saveMyHLRNSelect(\'homeLeague\',this.value)"><option '+(p.homeLeague==='Sunday'?'selected':'')+'>Sunday</option><option '+(p.homeLeague==='Monday'?'selected':'')+'>Monday</option></select></div>'+
      '<div class="os-setting-row"><div><small>FAVORITE TEAM SERIES</small><strong>Which team championship?</strong></div><select onchange="saveMyHLRNSelect(\'favoriteTeamLeague\',this.value)"><option '+(p.favoriteTeamLeague==='Sunday'?'selected':'')+'>Sunday</option><option '+(p.favoriteTeamLeague==='Monday'?'selected':'')+'>Monday</option></select></div>'+
      '<div class="os-setting-row"><div><small>FAVORITE TEAM</small><strong>Pin a team to My HLRN</strong></div><select onchange="saveMyHLRNSelect(\'favoriteTeam\',this.value)">'+teamOptions(p.favoriteTeamLeague,p.favoriteTeam)+'</select></div>'+
      '<button class="os-setting-toggle '+(p.favoriteAlerts?'on':'')+'" onclick="toggleMyHLRNSetting(\'favoriteAlerts\')"><div><small>FAVORITE DRIVER ALERTS</small><strong>Live lead, status and finish alerts</strong></div><span><i></i></span></button>'+
      '<button class="os-setting-toggle '+(p.raceDayTakeover?'on':'')+'" onclick="toggleMyHLRNSetting(\'raceDayTakeover\')"><div><small>RACE-DAY TAKEOVER</small><strong>Switch the Command Center into race-night mode</strong></div><span><i></i></span></button>'+
      '<button class="os-setting-toggle '+(p.haptics?'on':'')+'" onclick="toggleMyHLRNSetting(\'haptics\')"><div><small>HAPTICS</small><strong>Vibration feedback on supported phones</strong></div><span><i></i></span></button>'+
      '</section>'+
      '<div class="section-head"><h3>Favorite Drivers</h3><span>'+(state.favorites||[]).length+' SAVED</span></div>'+
      '<div class="os-driver-picker-grid">'+myHLRNDriverGrid()+'</div>'+
      '<div class="section-head"><h3>Driver OS Shortcuts</h3><span>TOOLS</span></div>'+
      '<div class="os-tool-grid"><button onclick="openFeature(\'simulator\')"><span>∑</span><strong>Championship Simulator</strong><small>Run finish scenarios</small></button><button onclick="openFeature(\'graphics\')"><span>▣</span><strong>Share Studio</strong><small>Generate graphics</small></button><button onclick="openFeature(\'replay\')"><span>↺</span><strong>Race Replay</strong><small>Timeline and events</small></button><button onclick="openFeature(\'notifications\')"><span>🔔</span><strong>Notifications</strong><small>'+escapeHtml(state.pushStatus)+'</small></button></div>';
    featureShell('My HLRN','Your personalized Driver OS dashboard, favorites and race-day settings.',body,'os-myhlrn-page');
  };

  const toggleFavoriteV12=toggleFavorite;
  toggleFavorite=function(name){
    name=decodeSafe(name);
    toggleFavoriteV12(name);
    const p=driverOSProfile();
    if(p.pinnedDriver&&!isFavorite(p.pinnedDriver)&&p.pinnedDriver===name)saveDriverOSProfile({pinnedDriver:''});
    toast((isFavorite(name)?'Following ':'Unfollowed ')+name,isFavorite(name)?'good':'');
    vibrate(10);
    updateLiveTracker();
  };

  function inferredPointsByFinish(league){
    const groups={};
    (state.results[league]||[]).forEach(function(r){
      const f=Number(r.finish),pts=Number(r.points);
      if(f>0&&Number.isFinite(pts)){if(!groups[f])groups[f]=[];groups[f].push(pts);}
    });
    const out={};
    Object.keys(groups).forEach(function(k){
      const vals=groups[k].slice().sort(function(a,b){return a-b;});
      const mid=Math.floor(vals.length/2);
      out[k]=vals.length%2?vals[mid]:(vals[mid-1]+vals[mid])/2;
    });
    return out;
  }
  function simulatorDrivers(league){
    return (state.standings[league]||[]).slice(0,12);
  }
  function simFinishOptions(selected){
    let html='<option value="">No scenario</option>';
    for(let i=1;i<=20;i++)html+='<option value="'+i+'" '+(Number(selected)===i?'selected':'')+'>P'+i+'</option>';
    return html;
  }
  function getSimScenario(){
    return readJSON('hlrn-sim-scenario',{league:'Sunday',finishes:{}});
  }
  function saveSimScenario(s){writeJSON('hlrn-sim-scenario',s);}
  window.switchSimulatorLeague=function(league){saveSimScenario({league:league,finishes:{}});renderChampionshipSimulator();};
  window.updateSimulatorFinish=function(name,value){
    const s=getSimScenario();s.finishes[name]=value?Number(value):null;saveSimScenario(s);renderChampionshipSimulator();
  };
  window.resetSimulator=function(){const s=getSimScenario();saveSimScenario({league:s.league||'Sunday',finishes:{}});renderChampionshipSimulator();};

  window.renderChampionshipSimulator=function(){
    const scenario=getSimScenario();
    const league=scenario.league||'Sunday';
    const table=inferredPointsByFinish(league);
    const drivers=simulatorDrivers(league);
    const projected=drivers.map(function(d){
      const finish=Number(scenario.finishes[d.name]||0);
      const add=finish?Number(table[finish]||0):0;
      return Object.assign({},d,{simFinish:finish,simAdd:add,simPoints:Number(d.points||0)+add});
    }).sort(function(a,b){return b.simPoints-a.simPoints||Number(a.rank)-Number(b.rank);});
    const maxPerRace=Math.max.apply(null,Object.values(table).concat([0]));
    const completed=Math.max.apply(null,(state.results[league]||[]).map(function(r){return Number(r.raceNo||0);}).concat([0]));
    const total=(FULL_SCHEDULE[league]||[]).length||16;
    const remaining=Math.max(0,total-completed);
    const leader=(state.standings[league]||[])[0];
    const second=(state.standings[league]||[])[1];
    const gap=leader&&second?Number(leader.points||0)-Number(second.points||0):0;
    const maxSwing=remaining*maxPerRace;
    const clinched=remaining===0||gap>maxSwing;
    const rows=projected.map(function(d,i){
      return '<article class="os-sim-row '+(i===0?'leader':'')+'"><b>P'+(i+1)+'</b>'+
        driverPhotoMarkup(d.name,'os-sim-photo','os-sim-fallback')+
        '<div><strong>'+escapeHtml(d.name)+'</strong><span>'+escapeHtml(d.points)+' current pts'+(d.simAdd?' • +'+d.simAdd.toFixed(1).replace('.0','')+' scenario':'')+'</span></div>'+
        '<select onchange="updateSimulatorFinish(\''+escapeHtml(d.name).replace(/'/g,'&#039;')+'\',this.value)">'+simFinishOptions(d.simFinish)+'</select>'+
        '<em>'+d.simPoints.toFixed(1).replace('.0','')+'<small>PROJECTED</small></em></article>';
    }).join('');
    const body='<div class="tabs premium-tabs os-sim-tabs"><button class="'+(league==='Sunday'?'active':'')+'" onclick="switchSimulatorLeague(\'Sunday\')">SUNDAY</button><button class="'+(league==='Monday'?'active':'')+'" onclick="switchSimulatorLeague(\'Monday\')">MONDAY</button></div>'+
      '<section class="os-clinch-card '+(clinched?'clinched':'')+'"><div><small>CHAMPIONSHIP MATH</small><strong>'+escapeHtml(leader?leader.name:'Loading')+'</strong><span>'+(leader&&second?'+'+gap+' over '+escapeHtml(second.name):'Standings syncing')+'</span></div><div><small>RACES LEFT</small><strong>'+remaining+'</strong><span>'+maxPerRace.toFixed(1).replace('.0','')+' max observed points / race</span></div><div><small>STATUS</small><strong>'+(clinched?'MATHEMATICALLY SAFE':'OPEN')+'</strong><span>'+(clinched?'Current gap exceeds remaining maximum swing':'Scenario remains mathematically open')+'</span></div></section>'+
      '<p class="feature-note"><strong>Scenario tool, not a forecast.</strong> Added points are inferred from the actual HLRN points historically awarded for each finishing position in this league. It does not predict who will finish where.</p>'+
      '<div class="os-sim-list">'+rows+'</div><button class="btn" onclick="resetSimulator()">RESET SCENARIO</button>';
    featureShell('Championship Simulator','Choose hypothetical finishing positions and see the standings math update instantly.',body,'os-simulator-page');
  };

  function teamDriverNames(team){
    if(!team)return [];
    return String(team.drivers||'').split(',').map(function(x){return prettyName(x.trim());}).filter(Boolean);
  }
  window.openTeamGarage=function(league,encoded){
    const name=decodeSafe(encoded);
    state.teamGarage={league:league,name:name};
    openFeature('teamgarage');
  };
  window.renderTeamGarage=function(){
    const g=state.teamGarage||{league:'Sunday',name:''};
    const team=teamByName(g.league,g.name);
    if(!team){featureShell('Team Garage','Team profile and driver performance.','<div class="empty">Team data is not loaded yet.</div>','os-team-garage');return;}
    const names=teamDriverNames(team);
    const cards=names.map(function(name){
      const standing=(state.standings[g.league]||[]).find(function(d){return prettyName(String(d.name))===name;});
      const rows=(state.results[g.league]||[]).filter(function(r){return prettyName(String(r.driver))===name;}).sort(function(a,b){return Number(a.raceNo)-Number(b.raceNo);});
      const recent=rows.slice(-6).map(function(r){return Number(r.finish||0);}).filter(function(v){return v>0;});
      return '<button class="os-team-driver" onclick="openHLRNDriverProfile(\''+encodeURIComponent(name)+'\')">'+
        driverPhotoMarkup(name,'os-team-driver-photo','os-team-driver-fallback')+
        '<div><small>TEAM DRIVER</small><strong>'+escapeHtml(name)+'</strong><span>'+(standing?'P'+escapeHtml(standing.rank)+' • '+escapeHtml(standing.points)+' pts • '+escapeHtml(standing.wins||0)+' wins':'Results loaded')+'</span>'+sparklineSVG(recent,true)+'</div><b>›</b></button>';
    }).join('');
    const body='<section class="os-team-hero '+g.league.toLowerCase()+'"><small>'+escapeHtml(g.league.toUpperCase())+' TEAM GARAGE</small><h3>'+escapeHtml(team.name)+'</h3><p>'+names.length+' drivers • '+escapeHtml(team.points)+' points</p><div><b>'+escapeHtml(team.wins||0)+'<span>WINS</span></b><b>'+escapeHtml(team.top5||0)+'<span>TOP 5</span></b><b>'+names.length+'<span>DRIVERS</span></b></div></section>'+
      '<div class="section-head"><h3>Drivers</h3><span>'+names.length+' ROSTERED</span></div><div class="os-team-driver-list">'+cards+'</div>'+
      '<div class="section-head"><h3>Team Tools</h3><span>DRIVER OS</span></div><div class="os-tool-grid"><button onclick="openFeature(\'simulator\')"><span>∑</span><strong>Championship Simulator</strong><small>Run points scenarios</small></button><button onclick="shareHLRNItem(\'HLRN '+escapeHtml(team.name)+'\',\''+escapeHtml(team.points)+' points • '+escapeHtml(team.wins||0)+' wins\',HLRN_SITE_DATA.website)"><span>↗</span><strong>Share Team</strong><small>Native share sheet</small></button></div>';
    featureShell(team.name,'Team Garage • '+g.league+' League',body,'os-team-garage');
  };

  renderTeams=function(){
    const league=state.teamLeague||'Sunday';
    const data=state.teamStandings[league]||[];
    const rows=data.length?data.map(function(t,i){
      return '<button class="team-standing-row" onclick="openTeamGarage(\''+league+'\',\''+encodeURIComponent(t.name)+'\')"><b class="team-rank">'+(i+1)+'</b><div><strong>'+escapeHtml(t.name)+'</strong><span>'+escapeHtml(t.drivers||'HLRN TEAM')+'</span></div><div class="team-mini"><b>'+escapeHtml(t.wins||0)+'<small>WINS</small></b><b>'+escapeHtml(t.top5||0)+'<small>TOP 5</small></b></div><em>'+Number(t.points||0).toFixed(1).replace('.0','')+'<small>PTS</small></em></button>';
    }).join(''):'<div class="empty">Connecting to '+league+' team standings…</div>';
    const body='<div class="tabs premium-tabs team-tabs"><button class="'+(league==='Sunday'?'active':'')+'" onclick="state.teamLeague=\'Sunday\';renderTeams()">SUNDAY</button><button class="'+(league==='Monday'?'active':'')+'" onclick="state.teamLeague=\'Monday\';renderTeams()">MONDAY</button></div>'+
      '<section class="team-command-card '+league.toLowerCase()+'"><div><small>'+league.toUpperCase()+' TEAM CHAMPIONSHIP</small><strong>'+(data.length||'--')+'</strong><span>teams loaded live</span></div><div><small>LEADER</small><strong>'+escapeHtml(data[0]?data[0].name:'Loading')+'</strong><span>'+(data[0]?escapeHtml(data[0].points):'--')+' points</span></div></section>'+
      '<p class="feature-note">Tap any team to open its full Team Garage with driver photos, recent form and team tools.</p><div class="team-standing-list">'+rows+'</div>';
    featureShell('Team Garage','Team championship standings plus full team and driver garages.',body,'teams-page');
  };

  function normalizeTrackName(name){return String(name||'').trim().toLowerCase().replace(/\s+/g,' ');}
  function trackRows(track){
    const target=normalizeTrackName(track),rows=[];
    ['Sunday','Monday'].forEach(function(league){
      (state.results[league]||[]).forEach(function(r){
        if(normalizeTrackName(r.track)===target)rows.push({source:league,driver:prettyName(String(r.driver||'')),finish:Number(r.finish||0),start:Number(r.start||0),lapsLed:Number(r.lapsLed||0),incidents:Number(r.incidents||0),date:String(r.date||''),raceNo:Number(r.raceNo||0)});
      });
    });
    (state.hostedRaceRows||[]).forEach(function(r){
      if(normalizeTrackName(r.Track)===target)rows.push({source:'Hosted',driver:prettyName(String(r.Driver||'')),finish:Number(r['Finish Position']||0),start:Number(r['Start Position']||0),lapsLed:Number(r['Laps Led']||0),incidents:Number(r.Incidents||0),date:String(r['Race Date']||''),raceNo:0});
    });
    return rows.filter(function(r){return r.driver&&r.finish>0;});
  }
  function trackSummary(track){
    const rows=trackRows(track),drivers=new Map(),wins=new Map();
    rows.forEach(function(r){
      if(!drivers.has(r.driver))drivers.set(r.driver,{name:r.driver,starts:0,finish:0,wins:0,lapsLed:0,incidents:0,finishes:[]});
      const d=drivers.get(r.driver);d.starts++;d.finish+=r.finish;d.finishes.push(r.finish);d.lapsLed+=r.lapsLed;d.incidents+=r.incidents;if(r.finish===1){d.wins++;wins.set(r.driver,(wins.get(r.driver)||0)+1);}
    });
    const list=Array.from(drivers.values()).map(function(d){return Object.assign(d,{avgFinish:d.finish/d.starts,avgInc:d.incidents/d.starts});}).sort(function(a,b){return a.avgFinish-b.avgFinish||b.starts-a.starts;});
    const winner=Array.from(wins.entries()).sort(function(a,b){return b[1]-a[1];})[0];
    const raceKeys=new Set(rows.map(function(r){return r.source+'|'+r.date+'|'+r.raceNo;}));
    return {track:track,rows:rows,drivers:list,races:raceKeys.size,topWinner:winner?winner[0]:'—',topWins:winner?winner[1]:0,avgInc:rows.length?rows.reduce(function(a,r){return a+r.incidents;},0)/rows.length:0};
  }
  window.openTrackIntelligence=function(encoded){state.trackIntel=decodeSafe(encoded);openFeature('trackintel');};
  window.renderTrackIntelligence=function(){
    const track=state.trackIntel||allTrackNames()[0]||'';
    const t=trackSummary(track);
    const winners=t.rows.filter(function(r){return r.finish===1;}).sort(function(a,b){return String(b.date).localeCompare(String(a.date));}).slice(0,10);
    const drivers=t.drivers.slice(0,12);
    const body='<section class="os-track-hero"><small>HLRN TRACK INTELLIGENCE</small><h3>'+escapeHtml(track||'Track')+'</h3><p>'+t.races+' recorded race sessions • '+t.rows.length+' driver starts</p><div><b>'+escapeHtml(t.topWinner)+'<span>WINNINGEST</span></b><b>'+t.topWins+'<span>WINS</span></b><b>'+t.avgInc.toFixed(1)+'<span>AVG INC / START</span></b></div></section>'+
      '<div class="section-head"><h3>Best Historical Performers</h3><span>ALL AVAILABLE HLRN DATA</span></div>'+
      '<div class="os-track-driver-list">'+drivers.map(function(d,i){return '<button onclick="openHLRNDriverProfile(\''+encodeURIComponent(d.name)+'\')"><b>'+(i+1)+'</b>'+driverPhotoMarkup(d.name,'os-track-driver-photo','os-track-driver-fallback')+'<div><strong>'+escapeHtml(d.name)+'</strong><span>'+d.starts+' starts • '+d.wins+' wins • '+d.avgFinish.toFixed(1)+' avg finish</span>'+sparklineSVG(d.finishes,true)+'</div><em>'+d.lapsLed+'<small>LAPS LED</small></em></button>';}).join('')+'</div>'+
      '<div class="section-head"><h3>Previous Winners</h3><span>'+winners.length+' SHOWN</span></div><div class="os-track-winners">'+(winners.length?winners.map(function(r){return '<article><strong>'+escapeHtml(r.driver)+'</strong><span>'+escapeHtml(r.source)+' • '+escapeHtml(r.date)+'</span><b>P1</b></article>';}).join(''):'<div class="empty">No winner data loaded for this track.</div>')+'</div>';
    featureShell(track||'Track Intelligence','Winners, average finishes, laps led and incident history across HLRN data.',body,'os-track-intel');
  };
  renderTrackHub=function(){
    if(!(state.hostedRaceRows||[]).length)ensureHostedData();
    const tracks=allTrackNames();
    const body='<div class="os-track-grid">'+tracks.map(function(track){
      const t=trackSummary(track);
      return '<button class="os-track-card" onclick="openTrackIntelligence(\''+encodeURIComponent(track)+'\')"><span>〰</span><small>TRACK INTELLIGENCE</small><strong>'+escapeHtml(track)+'</strong><em>'+t.races+' recorded races</em><div><b>'+escapeHtml(t.topWinner)+'</b><i>'+t.topWins+' wins</i></div><footer>'+t.avgInc.toFixed(1)+' avg incidents / start</footer></button>';
    }).join('')+'</div>';
    featureShell('Track Intelligence','Sunday, Monday and Hosted track history in one place.',body,'tracks-page');
  };

  function replayEvents(){
    const f=state.liveRace&&state.liveRace.feed;
    if(!f)return [];
    try{return liveEvents(f)||[];}catch(e){
      return [].concat(Array.isArray(f.events)?f.events:[],Array.isArray(f.recorderTimeline)?f.recorderTimeline:[]);
    }
  }
  function replayMaxLap(){
    const f=state.liveRace&&state.liveRace.feed;
    const events=replayEvents();
    return Math.max(Number(f&&f.totalLaps||0),Number(f&&f.lap||0),Math.max.apply(null,events.map(function(e){return Number(e.lap||0);}).concat([0])));
  }
  function replayDriverNames(){
    const f=state.liveRace&&state.liveRace.feed;
    const set=new Set((Array.isArray(f&&f.drivers)?f.drivers:[]).map(function(d){return prettyName(String(d.name||''));}).filter(Boolean));
    replayEvents().forEach(function(e){
      combinedDriverNames().forEach(function(name){if((String(e.title||'')+' '+String(e.text||'')).toLowerCase().includes(name.toLowerCase()))set.add(name);});
    });
    return Array.from(set).sort();
  }
  window.setReplayLap=function(value){state.replayLap=Number(value||0);renderRaceReplay();};
  window.setReplayDriver=function(value){state.replayDriver=decodeSafe(value);renderRaceReplay();};
  window.renderRaceReplay=function(){
    const feed=state.liveRace&&state.liveRace.feed;
    const maxLap=replayMaxLap();
    if(state.replayLap==null||state.replayLap>maxLap)state.replayLap=maxLap;
    const selected=Math.max(0,Number(state.replayLap||0));
    const driver=state.replayDriver||'';
    const events=replayEvents().filter(function(e){
      const lap=Number(e.lap);
      if(Number.isFinite(lap)&&lap>selected)return false;
      if(driver){
        const hay=(String(e.title||'')+' '+String(e.text||'')).toLowerCase();
        if(!hay.includes(driver.toLowerCase()))return false;
      }
      return true;
    }).slice(-30).reverse();
    const body='<section class="os-replay-control"><div><small>RACE REPLAY</small><strong>'+(feed?escapeHtml(feed.track||'Current Race'):'No frozen race feed loaded')+'</strong><span>Review verified timeline events through the selected lap.</span></div><div class="os-replay-lap"><b>LAP '+selected+'</b><input type="range" min="0" max="'+Math.max(1,maxLap)+'" value="'+selected+'" oninput="document.getElementById(\'replayLapReadout\').textContent=\'LAP \'+this.value" onchange="setReplayLap(this.value)"><em id="replayLapReadout">LAP '+selected+'</em></div><select onchange="setReplayDriver(this.value)"><option value="">All drivers</option>'+replayDriverNames().map(function(n){return '<option value="'+encodeURIComponent(n)+'" '+(driver===n?'selected':'')+'>'+escapeHtml(n)+'</option>';}).join('')+'</select></section>'+
      '<p class="feature-note">Replay uses the current/frozen Race Center event recorder. Published historical races without lap-by-lap recorder data still remain available in Results, but the app will not invent events that were never captured.</p>'+
      '<div class="os-replay-events">'+(events.length?events.map(function(e){return '<article class="'+escapeHtml(String(e.type||'session'))+'"><b>'+(e.lap!=null?'LAP '+escapeHtml(e.lap):'SESSION')+'</b><div><strong>'+escapeHtml(e.title||'Race Event')+'</strong><p>'+escapeHtml(e.text||'')+'</p></div></article>';}).join(''):'<div class="empty">No recorded events match this replay point yet.</div>')+'</div>';
    featureShell('Race Replay','Scrub captured race-night events without inventing missing telemetry.',body,'os-replay-page');
  };

  function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines){
    const words=String(text||'').split(/\s+/),lines=[],cur=[];
    words.forEach(function(word){
      const test=cur.concat([word]).join(' ');
      if(ctx.measureText(test).width>maxWidth&&cur.length){lines.push(cur.join(' '));cur=[word];}else cur.push(word);
    });
    if(cur.length)lines.push(cur.join(' '));
    lines.slice(0,maxLines||99).forEach(function(line,i){ctx.fillText(line,x,y+i*lineHeight);});
  }
  async function canvasToShare(canvas,filename,title,text){
    return new Promise(function(resolve){
      canvas.toBlob(async function(blob){
        if(!blob){resolve();return;}
        const file=new File([blob],filename,{type:'image/png'});
        try{
          if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
            await navigator.share({title:title,text:text,files:[file]});
          }else{
            const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
            toast('Graphic saved','good');
          }
        }catch(e){}
        resolve();
      },'image/png');
    });
  }
  function drawShareBase(ctx,label){
    const g=ctx.createLinearGradient(0,0,1080,1080);g.addColorStop(0,'#151b23');g.addColorStop(.55,'#080b10');g.addColorStop(1,'#030405');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1080);
    ctx.fillStyle='#f0163d';ctx.fillRect(0,0,18,1080);
    ctx.fillStyle='rgba(255,255,255,.025)';for(let x=0;x<1080;x+=60)ctx.fillRect(x,0,1,1080);for(let y=0;y<1080;y+=60)ctx.fillRect(0,y,1080,1);
    ctx.fillStyle='#fff';ctx.font='900 60px Arial';ctx.fillText('HLRN',72,105);
    ctx.fillStyle='#ff4965';ctx.font='900 24px Arial';ctx.fillText(String(label||'HIGH LINE RACING NETWORK').toUpperCase(),72,146);
    ctx.fillStyle='rgba(255,255,255,.035)';ctx.font='900 280px Arial';ctx.fillText('HLRN',230,970);
  }
  window.generateHLRNGraphic=async function(type){
    const canvas=document.getElementById('osShareCanvas');if(!canvas)return;
    const ctx=canvas.getContext('2d');drawShareBase(ctx,type==='winner'?'RACE WINNER':type==='championship'?'CHAMPIONSHIP LEADER':'DRIVER CARD');
    let title='HLRN Graphic',text='High Line Racing Network';
    if(type==='winner'){
      const latest=(state.latestResults||[])[0]||null;
      const winner=latest?latest.winner:(state.hostedLatest&&state.hostedLatest.winner)||'HLRN Winner';
      const track=latest?latest.track:(state.hostedLatest&&state.hostedLatest.track)||'HLRN';
      ctx.fillStyle='#fff';ctx.font='900 68px Arial';wrapText(ctx,winner,72,360,860,78,2);
      ctx.fillStyle='#ffd21f';ctx.font='900 150px Arial';ctx.fillText('WINNER',72,650);
      ctx.fillStyle='#98a3b0';ctx.font='700 34px Arial';ctx.fillText(track,72,720);
      title='HLRN Winner — '+winner;text=winner+' wins at '+track;
    }else if(type==='championship'){
      const league=state.homeLeague||'Sunday';const leader=(state.standings[league]||[])[0];
      const name=leader?leader.name:'HLRN Leader';
      ctx.fillStyle='#fff';ctx.font='900 66px Arial';wrapText(ctx,name,72,360,880,76,2);
      ctx.fillStyle='#4b8cff';ctx.font='900 105px Arial';ctx.fillText('#1 IN POINTS',72,610);
      ctx.fillStyle='#98a3b0';ctx.font='700 34px Arial';ctx.fillText(league+' League • '+(leader?leader.points:'—')+' pts',72,690);
      title='HLRN '+league+' Championship Leader';text=name+' leads the '+league+' championship.';
    }else{
      const name=state.shareDriver||(state.favorites||[])[0]||combinedDriverNames()[0]||'HLRN Driver';
      const rows=resultRowsForName(name),stats=profileStats(rows);
      ctx.fillStyle='#fff';ctx.font='900 64px Arial';wrapText(ctx,name,72,350,880,74,2);
      const vals=[['STARTS',stats.starts],['WINS',stats.wins],['TOP 5',stats.top5],['AVG FIN',stats.avgFinish?stats.avgFinish.toFixed(1):'—']];
      vals.forEach(function(v,i){const x=72+i*240;ctx.fillStyle='#8792a0';ctx.font='900 22px Arial';ctx.fillText(v[0],x,570);ctx.fillStyle='#fff';ctx.font='900 70px Arial';ctx.fillText(String(v[1]),x,650);});
      title='HLRN Driver — '+name;text=name+' • '+stats.starts+' starts • '+stats.wins+' wins';
    }
    ctx.fillStyle='#697481';ctx.font='700 24px Arial';ctx.fillText('HIGH LINE RACING NETWORK • DRIVER OS 13',72,1015);
    await canvasToShare(canvas,'hlrn-'+slug(title)+'.png',title,text);
  };
  window.renderShareStudio=function(){
    const body='<section class="os-share-studio"><canvas id="osShareCanvas" width="1080" height="1080"></canvas><div><small>POST-READY 1080 × 1080 GRAPHICS</small><strong>Share Studio</strong><p>Generate a clean HLRN square graphic and send it directly to the phone share sheet when supported.</p><button onclick="generateHLRNGraphic(\'winner\')">WINNER GRAPHIC</button><button onclick="generateHLRNGraphic(\'championship\')">CHAMPIONSHIP LEADER</button><button onclick="generateHLRNGraphic(\'driver\')">DRIVER CARD</button></div></section>';
    featureShell('Share Studio','Winner, championship and driver graphics generated directly in the app.',body,'os-share-studio-page');
  };

  function globalSearchItems(){
    const items=[];
    combinedDriverNames().forEach(function(name){items.push({type:'DRIVER',title:name,sub:'Open Driver Card',action:"openHLRNDriverProfile('"+encodeURIComponent(name)+"');closeHLRNSearch()"});});
    ['Sunday','Monday'].forEach(function(league){
      (state.teamStandings[league]||[]).forEach(function(t){items.push({type:'TEAM',title:t.name,sub:league+' Team Garage',action:"openTeamGarage('"+league+"','"+encodeURIComponent(t.name)+"');closeHLRNSearch()"});});
    });
    allTrackNames().forEach(function(track){items.push({type:'TRACK',title:track,sub:'Track Intelligence',action:"openTrackIntelligence('"+encodeURIComponent(track)+"');closeHLRNSearch()"});});
    FEATURE_NAMES.forEach(function(f){items.push({type:'FEATURE',title:f[1],sub:f[2],action:"openFeature('"+f[0]+"');closeHLRNSearch()"});});
    return items;
  }
  window.filterHLRNSearch=function(value){
    const root=document.getElementById('hlrnGlobalSearchResults');if(!root)return;
    const q=String(value||'').trim().toLowerCase();
    const items=globalSearchItems().filter(function(i){return !q||i.title.toLowerCase().includes(q)||i.sub.toLowerCase().includes(q)||i.type.toLowerCase().includes(q);}).slice(0,50);
    root.innerHTML=items.length?items.map(function(i){return '<button onclick="'+i.action+'"><span>'+escapeHtml(i.type)+'</span><div><strong>'+escapeHtml(i.title)+'</strong><small>'+escapeHtml(i.sub)+'</small></div><b>›</b></button>';}).join(''):'<div class="os-search-empty">No HLRN matches.</div>';
  };
  window.openHLRNSearch=function(){
    let overlay=document.getElementById('hlrnGlobalSearch');
    if(!overlay){
      overlay=document.createElement('div');overlay.id='hlrnGlobalSearch';overlay.className='os-global-search';
      overlay.innerHTML='<div class="os-search-sheet"><header><div><small>DRIVER OS 13</small><strong>Search HLRN</strong></div><button onclick="closeHLRNSearch()">×</button></header><input id="hlrnGlobalSearchInput" placeholder="Driver, team, track, feature…" oninput="filterHLRNSearch(this.value)" autocomplete="off"><div id="hlrnGlobalSearchResults" class="os-search-results"></div></div>';
      document.body.appendChild(overlay);
    }
    overlay.classList.add('open');filterHLRNSearch('');setTimeout(function(){document.getElementById('hlrnGlobalSearchInput')?.focus();},80);vibrate(8);
  };
  window.closeHLRNSearch=function(){document.getElementById('hlrnGlobalSearch')?.classList.remove('open');};

  function liveTrackerDriver(){
    const feed=state.liveRace&&state.liveRace.feed;
    const drivers=feed&&Array.isArray(feed.drivers)?feed.drivers:[];
    if(!drivers.length)return null;
    const p=driverOSProfile();
    let name=p.pinnedDriver;
    if(!name){
      const fav=(state.favorites||[]).find(function(f){return drivers.some(function(d){return prettyName(String(d.name||d.driver||''))===prettyName(f);});});
      name=fav||'';
    }
    let d=name?drivers.find(function(x){return prettyName(String(x.name||x.driver||''))===prettyName(name);}):null;
    if(!d&&state.liveFocusKey)d=drivers.find(function(x){return liveDriverKey(x)===state.liveFocusKey;});
    return d||null;
  }
  function ensureLiveTracker(){
    let el=document.getElementById('hlrnLiveTracker');
    if(!el){el=document.createElement('div');el.id='hlrnLiveTracker';el.className='os-live-tracker';document.body.appendChild(el);}
    return el;
  }
  window.pinLiveDriver=function(name){name=decodeSafe(name);saveDriverOSProfile({pinnedDriver:name});toast(name?'Pinned '+name:'Live tracker unpinned','good');updateLiveTracker();};
  window.updateLiveTracker=function(){
    const el=ensureLiveTracker(),feed=state.liveRace&&state.liveRace.feed,d=liveTrackerDriver();
    const active=state.liveRace&&state.liveRace.connected&&state.liveRace.driverCount>0&&d;
    el.classList.toggle('visible',!!active);
    if(!active){el.innerHTML='';return;}
    const name=prettyName(String(d.name||d.driver||'Unknown')),status=liveDriverStatus(d,feed);
    el.innerHTML='<button class="os-tracker-main" onclick="state.liveFocusKey=\''+escapeHtml(liveDriverKey(d)).replace(/'/g,'&#039;')+'\';state.liveCenterTab=\'focus\';openLiveRaceCenter()">'+
      driverPhotoMarkup(name,'os-tracker-photo','os-tracker-fallback')+
      '<div><small>LIVE DRIVER TRACKER • '+escapeHtml(status)+'</small><strong>#'+escapeHtml(d.number||'—')+' '+escapeHtml(name)+'</strong><span>P'+escapeHtml(d.position||'—')+' • '+escapeHtml(liveGapText(d))+' • Last '+escapeHtml(liveLapTime(d.lastLapTime))+' • Best '+escapeHtml(liveLapTime(d.bestLapTime))+'</span></div></button>'+
      '<button class="os-tracker-close" onclick="pinLiveDriver(\'\')">×</button>';
  };

  const livePrevious=new Map();
  const liveAlertSeen=new Set(readJSON(ALERT_KEY,[]));
  function rememberAlert(key){
    liveAlertSeen.add(key);while(liveAlertSeen.size>MAX_ALERTS)liveAlertSeen.delete(liveAlertSeen.values().next().value);writeJSON(ALERT_KEY,Array.from(liveAlertSeen));
  }
  async function favoriteLiveAlert(title,body,key){
    if(liveAlertSeen.has(key)||driverOSProfile().favoriteAlerts===false)return;
    rememberAlert(key);toast(title+' — '+body,'live');vibrate([18,20,18]);
    if(document.hidden&&'Notification' in window&&Notification.permission==='granted'){
      try{
        const reg=await navigator.serviceWorker.ready;reg.showNotification(title,{body:body,icon:'./icon-192.png',badge:'./icon-192.png',tag:key,data:{url:'./?view=live'}});
      }catch(e){}
    }
  }
  function processFavoriteLiveAlerts(feed){
    if(!feed||String(feed.phase||'').toLowerCase()!=='race')return;
    const fav=new Set((state.favorites||[]).map(function(x){return prettyName(x).toLowerCase();}));
    const drivers=Array.isArray(feed.drivers)?feed.drivers:[];
    if(!livePrevious.size){drivers.forEach(function(d){livePrevious.set(liveDriverKey(d),{position:d.position,status:liveDriverStatus(d,feed)});});return;}
    drivers.forEach(function(d){
      const name=prettyName(String(d.name||d.driver||''));if(!fav.has(name.toLowerCase()))return;
      const key=liveDriverKey(d),prev=livePrevious.get(key)||{},status=liveDriverStatus(d,feed);
      if(Number(d.position)===1&&Number(prev.position)!==1)favoriteLiveAlert('HLRN • '+name+' takes the lead','Now scored P1 at '+String(feed.track||'the race'),'lead|'+String(feed.subSessionId||feed.sessionId||feed.track)+'|'+name+'|'+String(feed.lap||0));
      if(prev.status&&prev.status!==status&&['PIT ROAD','BLACK FLAG','MEATBALL','DQ','OUT','DISCONNECTED'].includes(status))favoriteLiveAlert('HLRN • '+name,status,'status|'+String(feed.subSessionId||feed.track)+'|'+name+'|'+status+'|'+String(feed.lap||0));
      if(liveRaceFinished(feed)&&Number(d.position)===1)favoriteLiveAlert('HLRN • '+name+' wins',String(feed.track||'HLRN race')+' • Checkered flag','win|'+String(feed.subSessionId||feed.track)+'|'+name);
    });
    drivers.forEach(function(d){livePrevious.set(liveDriverKey(d),{position:d.position,status:liveDriverStatus(d,feed)});});
  }

  const applyLiveRaceStateV12=applyLiveRaceState;
  applyLiveRaceState=function(feed){
    processFavoriteLiveAlerts(feed);
    applyLiveRaceStateV12(feed);
    updateLiveTracker();
  };

  const openLiveRaceCenterV12=openLiveRaceCenter;
  openLiveRaceCenter=function(addHistory){
    openLiveRaceCenterV12(addHistory);
    setTimeout(function(){
      const focus=liveFocusDriver&&liveFocusDriver(state.liveRace.feed);
      if(focus){
        const name=prettyName(String(focus.name||focus.driver||''));
        const hero=document.querySelector('.native-focus-actions');
        if(hero&&!hero.querySelector('.os-pin-driver'))hero.insertAdjacentHTML('afterbegin','<button class="os-pin-driver" onclick="pinLiveDriver(\''+encodeURIComponent(name)+'\')">PIN</button>');
      }
      updateLiveTracker();
    },0);
  };

  function storeOfflineSnapshot(){
    const payload={savedAt:Date.now(),standings:state.standings,results:state.results,latestResults:state.latestResults,nextRaces:state.nextRaces,teamStandings:state.teamStandings,hostedLatest:state.hostedLatest,hostedSessionCount:state.hostedSessionCount};
    writeJSON(SNAPSHOT_KEY,payload);
  }
  function restoreOfflineSnapshot(){
    const snap=readJSON(SNAPSHOT_KEY,null);if(!snap)return false;
    if((!state.standings.Sunday||!state.standings.Sunday.length)&&snap.standings)state.standings=snap.standings;
    if((!state.results.Sunday||!state.results.Sunday.length)&&snap.results)state.results=snap.results;
    if(snap.latestResults)state.latestResults=snap.latestResults;
    if(snap.nextRaces)state.nextRaces=snap.nextRaces;
    if(snap.teamStandings)state.teamStandings=snap.teamStandings;
    if(snap.hostedLatest)state.hostedLatest=snap.hostedLatest;
    if(snap.hostedSessionCount)state.hostedSessionCount=snap.hostedSessionCount;
    state.offlineSnapshotAt=snap.savedAt||0;
    return true;
  }
  restoreOfflineSnapshot();
  setTimeout(storeOfflineSnapshot,3500);
  window.addEventListener('online',function(){setTimeout(storeOfflineSnapshot,2500);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')storeOfflineSnapshot();});

  function currentDataAge(){
    const t=state.lastUpdated||state.offlineSnapshotAt||0;if(!t)return 'UNKNOWN';
    const mins=Math.max(0,Math.round((Date.now()-t)/60000));return mins<1?'JUST NOW':mins+' MIN AGO';
  }
  renderAdmin=function(){
    const sw=!!navigator.serviceWorker.controller;
    const feed=state.liveRace&&state.liveRace.connected;
    const website=state.liveStatus==='LIVE';
    const hosted=state.hostedDataStatus==='LIVE';
    const push=state.pushStatus;
    const body='<section class="os-ops-health"><div class="'+(navigator.onLine?'good':'bad')+'"><small>INTERNET</small><strong>'+(navigator.onLine?'ONLINE':'OFFLINE')+'</strong><span>Browser network state</span></div><div class="'+(website?'good':'warn')+'"><small>LEAGUE DATA</small><strong>'+escapeHtml(state.liveStatus)+'</strong><span>Last sync '+escapeHtml(currentDataAge())+'</span></div><div class="'+(hosted?'good':'warn')+'"><small>HOSTED</small><strong>'+escapeHtml(state.hostedDataStatus)+'</strong><span>'+escapeHtml(state.hostedSessionCount||0)+' sessions published</span></div><div class="'+(feed?'good':'warn')+'"><small>LIVE BRIDGE</small><strong>'+(feed?'CONNECTED':'STANDBY')+'</strong><span>'+(feed?escapeHtml(state.liveRace.track||'Race feed'):'Waiting for race-night websocket')+'</span></div><div class="'+(sw?'good':'warn')+'"><small>PWA CACHE</small><strong>'+(sw?'ACTIVE':'CHECKING')+'</strong><span>Driver OS '+DRIVER_OS_VERSION+'</span></div><div class="'+(push==='ENABLED'?'good':'warn')+'"><small>PUSH</small><strong>'+escapeHtml(push)+'</strong><span>Phone alert service</span></div></section>'+
      '<div class="section-head"><h3>Race-Night Operations</h3><span>SAFE ACTIONS</span></div><div class="os-admin-grid"><button onclick="refreshNow();hlrnToast(\'Refreshing all HLRN data\',\'good\')"><span>↻</span><strong>Force Data Refresh</strong><small>Website, Hosted, teams and bulletins</small></button><button onclick="openLiveRaceCenter()"><span>●</span><strong>Live Race Center</strong><small>Leaderboard, control and timing</small></button><button onclick="openFeature(\'notifications\')"><span>🔔</span><strong>Push Center</strong><small>Subscriptions and test alert</small></button><button onclick="openFeature(\'replay\')"><span>↺</span><strong>Race Replay</strong><small>Review recorded events</small></button></div>'+
      '<div class="section-head"><h3>Owner Launchpad</h3><span>ACCOUNT ACCESS REQUIRED</span></div><div class="os-admin-grid"><button onclick="openSocial(\'https://docs.google.com/spreadsheets/d/'+LIVE.standingsSheet+'/edit\')"><span>S</span><strong>League Sheets</strong><small>Sunday / Monday standings & results</small></button><button onclick="openSocial(\'https://docs.google.com/spreadsheets/d/'+HOSTED_SHEET+'/edit\')"><span>H</span><strong>Hosted Sheet</strong><small>Hosted race database</small></button><button onclick="openSocial(\'https://docs.google.com/spreadsheets/d/'+LIVE.newsroomSheet+'/edit\')"><span>N</span><strong>Newsroom Sheet</strong><small>Announcements and published news</small></button><button onclick="openSocial(\'https://docs.google.com/spreadsheets/d/'+LIVE.configSheet+'/edit\')"><span>⚙</span><strong>Config Sheet</strong><small>Schedule, links and app config</small></button><button onclick="openSocial(\'https://github.com/hunterwelborn32-creator/HLRN-App\')"><span>GH</span><strong>App Repository</strong><small>Source, actions and deployment</small></button><button onclick="openSocial(\'https://github.com/hunterwelborn32-creator/HLRN-Website\')"><span>WEB</span><strong>Website Repository</strong><small>Shared published data</small></button></div>'+
      '<div class="admin-note"><strong>SECURE ADMIN WRITES</strong><p>The app does not embed Google, GitHub or Discord credentials. Editing opens the official services where your account permissions handle authentication. That keeps the public PWA from containing admin secrets.</p></div>';
    featureShell('Operations Console','Race-night health, data sources and owner launch tools.',body,'os-admin-page');
  };

  renderAchievements=function(){
    if(!(state.hostedRaceRows||[]).length)ensureHostedData();
    const ds=combinedDriverNames().map(function(name){return {name:name,awards:driverAchievements(name),rows:resultRowsForName(name)};}).filter(function(d){return d.rows.length;}).sort(function(a,b){return b.awards.length-a.awards.length||b.rows.length-a.rows.length;});
    const body='<div class="os-achievement-board">'+ds.slice(0,50).map(function(d,i){
      return '<button onclick="openHLRNDriverProfile(\''+encodeURIComponent(d.name)+'\')"><header><b>'+(i+1)+'</b>'+driverPhotoMarkup(d.name,'os-ach-photo','os-ach-fallback')+'<div><strong>'+escapeHtml(d.name)+'</strong><span>'+d.awards.length+' achievements • '+d.rows.length+' starts</span></div></header><div class="os-ach-badges">'+(d.awards.length?d.awards.map(function(a){return '<span><b>'+a[0]+'</b><small>'+escapeHtml(a[1])+'</small></span>';}).join(''):'<em>Keep racing to unlock milestones</em>')+'</div></button>';
    }).join('')+'</div>';
    featureShell('Achievements','Cross-series career badges from Sunday, Monday and Hosted results.',body,'os-achievements-page');
  };

  function appendDriverOSInsights(name){
    if(!app||document.querySelector('.os-driver-insights'))return;
    const rows=resultRowsForName(name);if(!rows.length)return;
    const awards=driverAchievements(name),finishes=rows.slice(-10).map(function(r){return Number(r.finish||0);}).filter(function(v){return v>0;});
    const tracks={};rows.forEach(function(r){if(!r.track)return;if(!tracks[r.track])tracks[r.track]=[];tracks[r.track].push(Number(r.finish||0));});
    const best=Object.keys(tracks).map(function(track){const a=tracks[track].filter(function(x){return x>0;});return {track:track,avg:a.reduce(function(x,y){return x+y;},0)/a.length,starts:a.length};}).filter(function(x){return x.starts>=1;}).sort(function(a,b){return a.avg-b.avg;})[0];
    const html='<section class="os-driver-insights"><div class="section-head"><h3>Driver OS Intelligence</h3><span>CAREER PROFILE</span></div><div class="os-driver-insight-grid"><article><small>RECENT FORM</small><strong>'+finishes.slice(-5).map(function(x){return 'P'+x;}).join(' • ')+'</strong>'+sparklineSVG(finishes,true)+'</article><article><small>BEST TRACK</small><strong>'+escapeHtml(best?best.track:'—')+'</strong><span>'+(best?best.avg.toFixed(1)+' avg finish • '+best.starts+' starts':'No track history')+'</span></article></div><div class="section-head"><h3>Achievement Cabinet</h3><span>'+awards.length+' UNLOCKED</span></div><div class="os-driver-achievement-cabinet">'+(awards.length?awards.map(function(a){return '<span><b>'+a[0]+'</b><small>'+escapeHtml(a[1])+'</small></span>';}).join(''):'<em>Keep racing to unlock career badges.</em>')+'</div></section>';
    app.insertAdjacentHTML('beforeend',html);
  }
  const openHLRNDriverProfileV12=openHLRNDriverProfile;
  openHLRNDriverProfile=function(name,addHistory){
    const decoded=prettyName(decodeSafe(name));
    openHLRNDriverProfileV12(decoded,addHistory);
    setTimeout(function(){appendDriverOSInsights(decoded);},0);
  };

  function featureDispatch(name){
    if(name==='myhlrn')return renderMyHLRN();
    if(name==='simulator')return renderChampionshipSimulator();
    if(name==='teamgarage')return renderTeamGarage();
    if(name==='trackintel')return renderTrackIntelligence();
    if(name==='replay')return renderRaceReplay();
    if(name==='graphics')return renderShareStudio();
    return null;
  }
  const renderFeatureV12=renderFeature;
  renderFeature=function(name){
    if(['myhlrn','simulator','teamgarage','trackintel','replay','graphics'].includes(name))return featureDispatch(name);
    return renderFeatureV12(name);
  };

  function injectDriverOSLauncher(){
    const social=document.querySelector('.cc-community');
    if(!social||document.querySelector('.os-driver-os-launcher'))return;
    social.insertAdjacentHTML('afterend','<section class="os-driver-os-launcher"><div><small>HLRN APP 13</small><strong>DRIVER OS</strong><span>Personalization • replay • simulator • search • team garages • track intelligence</span></div><button onclick="openFeature(\'myhlrn\')">OPEN MY HLRN ›</button></section>');
  }
  const homeAgain=renderHome;
  renderHome=function(){homeAgain();injectDriverOSLauncher();};

  function raceReminderTick(){
    const now=Date.now();
    ['Sunday','Monday'].forEach(function(league){
      const race=state.nextRaces[league];if(!race||!race.iso)return;
      const mins=Math.round((new Date(race.iso).getTime()-now)/60000);
      if(mins!==30)return;
      const key='reminder30|'+league+'|'+race.iso;if(liveAlertSeen.has(key))return;
      favoriteLiveAlert('HLRN • '+league+' race in 30 minutes',race.track+' • '+race.time,key);
    });
  }
  setInterval(raceReminderTick,60000);setTimeout(raceReminderTick,2500);

  function addSearchButton(){
    const actions=document.querySelector('.top-actions');if(!actions||document.getElementById('globalSearchBtn'))return;
    const btn=document.createElement('button');btn.className='icon-btn os-search-btn';btn.id='globalSearchBtn';btn.setAttribute('aria-label','Search HLRN');btn.innerHTML='⌕';btn.onclick=openHLRNSearch;
    actions.insertBefore(btn,actions.firstChild.nextSibling||actions.firstChild);
  }
  function updateEdition(){
    const ed=document.querySelector('.top-edition');if(ed)ed.textContent='13';
    const brand=document.querySelector('.top-brand h1 em');if(brand)brand.textContent='DRIVER OS';
  }

  function boot(){
    addSearchButton();updateEdition();ensureLiveTracker();updateLiveTracker();
    if(state.currentView==='home')renderHome();
    document.documentElement.dataset.hlrnOs='13';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
})();