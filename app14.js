(function(){
  'use strict';

  const RNP_VERSION='14.0.0';
  const PROFILE_KEY='hlrn-driver-os-profile';
  const SPOTTER_KEY='hlrn-rnp-spotter';
  const UPDATE_KEY='hlrn-rnp-update-seen';
  let weekendTimer=null;
  let liveRenderTimer=null;
  let spotterVoiceLastAt=0;
  let spotterPrev={flag:'',position:null,status:'',oneToGreen:false,battleKey:''};

  function readJSON(key,fallback){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value==null?fallback:value;
    }catch(e){return fallback;}
  }
  function writeJSON(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}
  }
  function readProfile(){
    const p=readJSON(PROFILE_KEY,{});
    return {
      pinnedDriver:String(p.pinnedDriver||''),
      homeLeague:p.homeLeague==='Monday'?'Monday':'Sunday'
    };
  }
  function writeProfile(patch){
    const p=Object.assign({},readJSON(PROFILE_KEY,{}),patch||{});
    writeJSON(PROFILE_KEY,p);
    return p;
  }
  function decodeSafe(value){
    try{return decodeURIComponent(String(value||''));}catch(e){return String(value||'');}
  }
  function n(value,fallback){
    const x=Number(value);
    return Number.isFinite(x)?x:(fallback==null?0:fallback);
  }
  function pct(value){
    return Number.isFinite(Number(value))?Number(value).toFixed(1):'—';
  }
  function avg(values){
    const a=(values||[]).map(Number).filter(Number.isFinite);
    return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:0;
  }
  function stdev(values){
    const a=(values||[]).map(Number).filter(Number.isFinite);
    if(a.length<2)return 0;
    const m=avg(a);
    return Math.sqrt(a.reduce(function(s,x){return s+Math.pow(x-m,2);},0)/a.length);
  }
  function safeName(driver){
    return prettyName(String(driver?.name||driver?.driver||'Unknown'));
  }
  function currentFeed(){
    return state.liveRace&&state.liveRace.feed?state.liveRace.feed:null;
  }
  function liveList(feed){
    try{return liveDrivers(feed||currentFeed());}
    catch(e){
      return (Array.isArray((feed||currentFeed())?.drivers)?[...(feed||currentFeed()).drivers]:[])
        .filter(function(d){return d&&d.position!=null;})
        .sort(function(a,b){return n(a.position,999)-n(b.position,999);});
    }
  }
  function liveKey(driver){
    try{return liveDriverKey(driver);}
    catch(e){return driver?.carIdx!=null?'idx:'+driver.carIdx:'n:'+String(driver?.number||'')+'|'+safeName(driver);}
  }
  function statusOf(driver,feed){
    try{return liveDriverStatus(driver,feed||currentFeed());}
    catch(e){return String(driver?.status||'ON TRACK').toUpperCase();}
  }
  function gapText(driver){
    try{return liveGapText(driver);}
    catch(e){
      if(n(driver?.position)===1)return 'LEADER';
      return Number.isFinite(Number(driver?.gap))?'+'+Number(driver.gap).toFixed(3):'—';
    }
  }
  function lapTime(value){
    try{return liveLapTime(value);}
    catch(e){
      const x=Number(value);if(!Number.isFinite(x)||x<=0)return '—';
      const m=Math.floor(x/60),s=x-m*60;
      return m?m+':'+s.toFixed(3).padStart(6,'0'):s.toFixed(3);
    }
  }
  function driverByName(name,feed){
    const target=prettyName(String(name||'')).toLowerCase();
    return liveList(feed).find(function(d){return safeName(d).toLowerCase()===target;})||null;
  }
  function pinnedLiveDriver(feed){
    const p=readProfile();
    if(p.pinnedDriver){
      const d=driverByName(p.pinnedDriver,feed);
      if(d)return d;
    }
    const favorites=state.favorites||[];
    for(const name of favorites){
      const d=driverByName(name,feed);
      if(d)return d;
    }
    if(state.liveFocusKey){
      const d=liveList(feed).find(function(x){return liveKey(x)===state.liveFocusKey;});
      if(d)return d;
    }
    return liveList(feed)[0]||null;
  }
  function neighborGap(a,b){
    if(!a||!b)return null;
    if(n(b.position)===n(a.position)+1&&Number.isFinite(Number(b.interval)))return Math.max(0,Number(b.interval));
    const ag=n(a.gap,NaN),bg=n(b.gap,NaN);
    if(Number.isFinite(ag)&&Number.isFinite(bg))return Math.max(0,bg-ag);
    return null;
  }
  function relativePack(driver,feed){
    const list=liveList(feed);
    const idx=list.findIndex(function(d){return liveKey(d)===liveKey(driver);});
    const ahead=idx>0?list[idx-1]:null;
    const behind=idx>=0&&idx<list.length-1?list[idx+1]:null;
    return {
      ahead:ahead,
      behind:behind,
      gapAhead:ahead?neighborGap(ahead,driver):null,
      gapBehind:behind?neighborGap(driver,behind):null
    };
  }
  function spark(values,invert){
    const a=(values||[]).map(Number).filter(Number.isFinite);
    if(!a.length)return '<div class="rnp-chart-empty">NO DATA</div>';
    const w=300,h=72,p=6;
    let min=Math.min.apply(null,a),max=Math.max.apply(null,a);
    if(min===max){min-=1;max+=1;}
    const points=a.map(function(v,i){
      const x=p+(a.length===1?0:i/(a.length-1)*(w-p*2));
      let ratio=(v-min)/(max-min);
      if(invert)ratio=1-ratio;
      const y=p+(1-ratio)*(h-p*2);
      return x.toFixed(1)+','+y.toFixed(1);
    }).join(' ');
    return '<svg class="rnp-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><polyline points="'+points+'"/></svg>';
  }
  function haptic(pattern){
    try{if(navigator.vibrate)navigator.vibrate(pattern||8);}catch(e){}
  }
  function toast(text,tone){
    if(window.hlrnToast)return window.hlrnToast(text,tone);
  }

  /* ---------------------------------------------------------
     SPOTTER MODE
     --------------------------------------------------------- */
  function spotterSettings(){
    return Object.assign({voice:false,battleAlerts:true,positionAlerts:true},readJSON(SPOTTER_KEY,{}));
  }
  function saveSpotterSettings(patch){
    const next=Object.assign({},spotterSettings(),patch||{});
    writeJSON(SPOTTER_KEY,next);
    return next;
  }
  window.toggleSpotterSetting=function(key){
    const s=spotterSettings();
    const p={};p[key]=!s[key];
    saveSpotterSettings(p);
    renderSpotterMode();
    haptic(8);
  };
  window.selectSpotterDriver=function(value){
    const name=decodeSafe(value);
    writeProfile({pinnedDriver:name});
    if(window.pinLiveDriver)window.pinLiveDriver(name);
    state.liveFocusKey='';
    renderSpotterMode();
  };

  function spotterDriverOptions(feed,selected){
    return liveList(feed).map(function(d){
      const name=safeName(d);
      return '<option value="'+encodeURIComponent(name)+'" '+(name===selected?'selected':'')+'>#'+escapeHtml(d.number||'—')+' '+escapeHtml(name)+' • P'+escapeHtml(d.position||'—')+'</option>';
    }).join('');
  }
  function radarCar(driver,label,extra,cls){
    if(!driver)return '<div class="rnp-radar-empty '+(cls||'')+'"><small>'+label+'</small><strong>—</strong><span>No car</span></div>';
    return '<button class="rnp-radar-car '+(cls||'')+'" onclick="selectSpotterDriver(\''+encodeURIComponent(safeName(driver))+'\')">'+
      driverPhotoMarkup(safeName(driver),'rnp-radar-photo','rnp-radar-fallback')+
      '<div><small>'+label+' • P'+escapeHtml(driver.position||'—')+'</small><strong>#'+escapeHtml(driver.number||'—')+' '+escapeHtml(safeName(driver))+'</strong><span>'+escapeHtml(extra||statusOf(driver))+'</span></div></button>';
  }
  function spotterMetrics(driver,feed){
    const rel=relativePack(driver,feed);
    const last=n(driver.lastLapTime,NaN),best=n(driver.bestLapTime,NaN);
    const delta=Number.isFinite(last)&&Number.isFinite(best)?last-best:null;
    const moved=(function(){
      try{return livePositionDelta(driver,feed);}catch(e){return {text:'—',cls:'same'};}
    })();
    return [
      ['POSITION','P'+(driver.position??'—'),moved.text+' FROM START'],
      ['GAP',gapText(driver),n(driver.position)===1?'RACE LEADER':'TO LEADER'],
      ['AHEAD',rel.gapAhead==null?'—':rel.gapAhead.toFixed(3)+'s',rel.ahead?'#'+(rel.ahead.number||'—')+' '+safeName(rel.ahead):'FRONT OF FIELD'],
      ['BEHIND',rel.gapBehind==null?'—':rel.gapBehind.toFixed(3)+'s',rel.behind?'#'+(rel.behind.number||'—')+' '+safeName(rel.behind):'NO CAR BEHIND'],
      ['LAST LAP',lapTime(driver.lastLapTime),delta==null?'NO DELTA':(delta>=0?'+':'')+delta.toFixed(3)+' TO BEST'],
      ['BEST LAP',lapTime(driver.bestLapTime),'SESSION PERSONAL BEST'],
      ['INCIDENTS',driver.incidents??driver.incidentPoints??'—','CURRENT TOTAL'],
      ['STATUS',statusOf(driver,feed),driver.lapsCompleted!=null?driver.lapsCompleted+' LAPS COMPLETE':'LIVE TELEMETRY']
    ].map(function(x){
      return '<div><small>'+escapeHtml(x[0])+'</small><strong>'+escapeHtml(x[1])+'</strong><span>'+escapeHtml(x[2])+'</span></div>';
    }).join('');
  }
  window.renderSpotterMode=function(){
    const feed=currentFeed(),drivers=liveList(feed),driver=pinnedLiveDriver(feed),settings=spotterSettings();
    if(!feed||!drivers.length||!driver){
      featureShell('Spotter Mode','Favorite-driver relative timing, race radar and optional voice calls.',
        '<section class="rnp-standby"><span>🎧</span><strong>Spotter Mode is armed</strong><p>Start the HLRN iRacing bridge. As soon as scored cars arrive, this page will lock onto your pinned or favorite driver.</p><button onclick="openLiveRaceCenter()">OPEN LIVE RACE CENTER</button></section>',
        'rnp-spotter-page');
      return;
    }
    const name=safeName(driver),rel=relativePack(driver,feed);
    const flag=String(feed.flag||state.liveRace.flag||'UNKNOWN').toUpperCase();
    const battleAhead=rel.gapAhead!=null&&rel.gapAhead<=.75;
    const battleBehind=rel.gapBehind!=null&&rel.gapBehind<=.75;
    const body='<section class="rnp-spotter-toolbar"><div><small>TRACKED DRIVER</small><select onchange="selectSpotterDriver(this.value)">'+spotterDriverOptions(feed,name)+'</select></div>'+
      '<button class="'+(settings.voice?'on':'')+'" onclick="toggleSpotterSetting(\'voice\')"><span>🔊</span><div><small>VOICE SPOTTER</small><strong>'+(settings.voice?'ON':'OFF')+'</strong></div></button>'+
      '<button class="'+(settings.battleAlerts?'on':'')+'" onclick="toggleSpotterSetting(\'battleAlerts\')"><span>⚔</span><div><small>BATTLE CALLS</small><strong>'+(settings.battleAlerts?'ON':'OFF')+'</strong></div></button></section>'+
      '<section class="rnp-spotter-hero '+flag.toLowerCase()+'">'+
        driverPhotoMarkup(name,'rnp-spotter-photo','rnp-spotter-fallback')+
        '<div class="rnp-spotter-copy"><small>RACE NIGHT PRO • #'+escapeHtml(driver.number||'—')+'</small><h2>'+escapeHtml(name)+'</h2><p>'+escapeHtml(feed.track||state.liveRace.track||'HLRN Race')+' • '+escapeHtml(statusOf(driver,feed))+'</p><div><b>'+escapeHtml(flag)+'</b><span>LAP '+escapeHtml(feed.lap??state.liveRace.lap??'—')+(feed.totalLaps?' / '+escapeHtml(feed.totalLaps):'')+'</span></div></div>'+
        '<div class="rnp-spotter-pos"><small>RUNNING</small><strong>P'+escapeHtml(driver.position||'—')+'</strong><span>'+escapeHtml(gapText(driver))+'</span></div>'+
      '</section>'+
      '<section class="rnp-spotter-metrics">'+spotterMetrics(driver,feed)+'</section>'+
      '<div class="section-head"><h3>Race Radar</h3><span>'+(battleAhead||battleBehind?'BATTLE ACTIVE':'RELATIVE TIMING')+'</span></div>'+
      '<section class="rnp-radar '+(battleAhead||battleBehind?'battle':'')+'">'+
        radarCar(rel.ahead,'CAR AHEAD',rel.gapAhead==null?'—':rel.gapAhead.toFixed(3)+' sec','ahead')+
        radarCar(driver,'YOU ARE TRACKING',statusOf(driver,feed),'focus')+
        radarCar(rel.behind,'CAR BEHIND',rel.gapBehind==null?'—':rel.gapBehind.toFixed(3)+' sec','behind')+
      '</section>'+
      '<section class="rnp-spotter-actions"><button onclick="state.liveFocusKey=\''+escapeHtml(liveKey(driver)).replace(/'/g,'&#039;')+'\';state.liveCenterTab=\'focus\';openLiveRaceCenter()">DRIVER FOCUS</button><button onclick="openHLRNDriverProfile(\''+encodeURIComponent(name)+'\')">DRIVER CARD</button><button onclick="openFeature(\'watchlist\')">LIVE WATCHLIST</button></section>';
    featureShell('Spotter Mode','Relative timing and race calls centered on one HLRN driver.',body,'rnp-spotter-page');
  };

  function speakSpotter(text,priority){
    const s=spotterSettings();
    if(!s.voice||!('speechSynthesis' in window)||!text)return;
    const now=Date.now();
    if(!priority&&now-spotterVoiceLastAt<3200)return;
    try{
      if(priority)window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);
      u.rate=1.08;u.pitch=.92;u.volume=.95;
      window.speechSynthesis.speak(u);
      spotterVoiceLastAt=now;
    }catch(e){}
  }
  function processSpotterFeed(feed){
    const driver=pinnedLiveDriver(feed);
    if(!driver)return;
    const settings=spotterSettings();
    const flag=String(feed.flag||'').toUpperCase();
    const status=statusOf(driver,feed);
    const pos=n(driver.position,null);
    const rc=feed.raceControl||{};
    const rel=relativePack(driver,feed);
    const lap=n(feed.lap,0);
    if(spotterPrev.flag&&flag!==spotterPrev.flag){
      if(flag==='YELLOW'||flag==='CAUTION')speakSpotter('Caution. Caution. Hold your position.',true);
      else if(flag==='GREEN')speakSpotter('Green flag. Back to racing.',true);
      else if(flag==='CHECKERED')speakSpotter('Checkered flag. Position '+pos+'.',true);
      else if(flag==='RED')speakSpotter('Red flag. Session stopped.',true);
    }
    if(!spotterPrev.oneToGreen&&rc.oneToGreen)speakSpotter('One to green. Get ready for the restart.',true);
    if(settings.positionAlerts&&spotterPrev.position!=null&&pos!=null&&pos!==spotterPrev.position){
      if(pos<spotterPrev.position)speakSpotter('Position '+pos+'. Nice move.',false);
      else speakSpotter('Position '+pos+'.',false);
    }
    if(spotterPrev.status&&status!==spotterPrev.status&&['PIT ROAD','BLACK FLAG','MEATBALL','DQ','OUT','DISCONNECTED'].includes(status)){
      speakSpotter(status==='PIT ROAD'?'Pit road.':status.replaceAll('_',' ')+'.',true);
    }
    if(settings.battleAlerts){
      const side=rel.gapBehind!=null&&rel.gapBehind<=.45?'behind':rel.gapAhead!=null&&rel.gapAhead<=.45?'ahead':'';
      const battleKey=side?side+'|'+lap:'';
      if(side&&battleKey!==spotterPrev.battleKey){
        speakSpotter(side==='behind'?'Car close behind. Defend.':'Closing on the car ahead.',false);
      }
      spotterPrev.battleKey=battleKey;
    }
    spotterPrev.flag=flag;spotterPrev.position=pos;spotterPrev.status=status;spotterPrev.oneToGreen=!!rc.oneToGreen;
  }

  /* ---------------------------------------------------------
     LIVE WATCHLIST
     --------------------------------------------------------- */
  function lastDriverResult(name){
    try{
      const rows=driverProfileRows(name)||[];
      return rows.length?rows[rows.length-1]:null;
    }catch(e){return null;}
  }
  function standingsFor(name){
    const out=[];
    ['Sunday','Monday'].forEach(function(league){
      const d=(state.standings[league]||[]).find(function(x){return prettyName(String(x.name||''))===prettyName(name);});
      if(d)out.push({league:league,driver:d});
    });
    return out;
  }
  function watchCard(name,feed){
    const live=driverByName(name,feed);
    if(live){
      const rel=relativePack(live,feed);
      return '<article class="rnp-watch-card live">'+
        '<button class="rnp-watch-main" onclick="selectSpotterDriver(\''+encodeURIComponent(name)+'\');openFeature(\'spotter\')">'+
          driverPhotoMarkup(name,'rnp-watch-photo','rnp-watch-fallback')+
          '<div><small>LIVE • #'+escapeHtml(live.number||'—')+' • '+escapeHtml(statusOf(live,feed))+'</small><strong>'+escapeHtml(name)+'</strong><span>P'+escapeHtml(live.position||'—')+' • '+escapeHtml(gapText(live))+' • Last '+escapeHtml(lapTime(live.lastLapTime))+'</span>'+
          '<footer><b>AHEAD '+(rel.gapAhead==null?'—':rel.gapAhead.toFixed(3))+'</b><b>BEHIND '+(rel.gapBehind==null?'—':rel.gapBehind.toFixed(3))+'</b><b>BEST '+escapeHtml(lapTime(live.bestLapTime))+'</b></footer></div></button>'+
        '<button class="rnp-watch-pin" onclick="selectSpotterDriver(\''+encodeURIComponent(name)+'\')">PIN</button></article>';
    }
    const result=lastDriverResult(name),st=standingsFor(name);
    return '<article class="rnp-watch-card">'+
      '<button class="rnp-watch-main" onclick="openHLRNDriverProfile(\''+encodeURIComponent(name)+'\')">'+
        driverPhotoMarkup(name,'rnp-watch-photo','rnp-watch-fallback')+
        '<div><small>MY DRIVER • OFF-RACE MODE</small><strong>'+escapeHtml(name)+'</strong><span>'+(result?escapeHtml(result.source)+' • '+escapeHtml(result.track)+' • P'+escapeHtml(result.finish):'No recent result loaded')+'</span>'+
        '<footer>'+st.map(function(x){return '<b>'+x.league.toUpperCase()+' P'+escapeHtml(x.driver.rank)+' • '+escapeHtml(x.driver.points)+' PTS</b>';}).join('')+'</footer></div></button></article>';
  }
  window.renderLiveWatchlist=function(){
    const feed=currentFeed();
    const names=Array.from(new Set((state.favorites||[]).map(function(x){return prettyName(x);}))).slice(0,8);
    const body=names.length?
      '<section class="rnp-watch-summary"><div><small>WATCH LIST</small><strong>'+names.length+'</strong><span>favorite drivers</span></div><div><small>LIVE IN SESSION</small><strong>'+names.filter(function(nm){return !!driverByName(nm,feed);}).length+'</strong><span>currently scored</span></div><button onclick="setView(\'drivers\')">EDIT FAVORITES</button></section><div class="rnp-watch-list">'+names.map(function(name){return watchCard(name,feed);}).join('')+'</div>':
      '<section class="rnp-standby"><span>★</span><strong>Your live watchlist is empty</strong><p>Favorite drivers from the Drivers page. Race Night Pro will then show them together during live sessions.</p><button onclick="setView(\'drivers\')">CHOOSE DRIVERS</button></section>';
    featureShell('Live Watchlist','Follow multiple favorite drivers on one race-night screen.',body,'rnp-watchlist-page');
  };

  /* ---------------------------------------------------------
     EVENT WEEKEND CENTER
     --------------------------------------------------------- */
  function eventForLeague(league){
    const race=state.nextRaces[league]||{};
    const schedule=(FULL_SCHEDULE[league]||[]).find(function(r){
      return r.date===(race.dateKey||String(race.iso||'').slice(0,10));
    })||(FULL_SCHEDULE[league]||[]).find(function(r){return r.track===race.track;})||null;
    return {league:league,race:race,schedule:schedule};
  }
  function sameTrack(a,b){
    return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();
  }
  function trackHistory(track){
    const rows=[];
    ['Sunday','Monday'].forEach(function(league){
      (state.results[league]||[]).forEach(function(r){
        if(sameTrack(r.track,track))rows.push({source:league,name:prettyName(String(r.driver||'')),finish:n(r.finish),start:n(r.start),lapsLed:n(r.lapsLed),incidents:n(r.incidents),date:String(r.date||''),race:n(r.raceNo)});
      });
    });
    (state.hostedRaceRows||[]).forEach(function(r){
      if(sameTrack(r.Track,track))rows.push({source:'Hosted',name:prettyName(String(r.Driver||'')),finish:n(r['Finish Position']),start:n(r['Start Position']),lapsLed:n(r['Laps Led']),incidents:n(r.Incidents),date:String(r['Race Date']||''),race:0});
    });
    return rows.filter(function(r){return r.name&&r.finish>0;});
  }
  function trackLeaders(track){
    const rows=trackHistory(track),map=new Map();
    rows.forEach(function(r){
      if(!map.has(r.name))map.set(r.name,{name:r.name,starts:0,wins:0,finish:0,lapsLed:0,incidents:0});
      const d=map.get(r.name);d.starts++;d.finish+=r.finish;d.lapsLed+=r.lapsLed;d.incidents+=r.incidents;if(r.finish===1)d.wins++;
    });
    return Array.from(map.values()).map(function(d){d.avgFinish=d.finish/d.starts;return d;}).sort(function(a,b){return a.avgFinish-b.avgFinish||b.wins-a.wins||b.starts-a.starts;});
  }
  function leagueRecentForm(league){
    const map=new Map();
    (state.results[league]||[]).forEach(function(r){
      const name=prettyName(String(r.driver||''));if(!name||!n(r.finish))return;
      if(!map.has(name))map.set(name,[]);
      map.get(name).push({race:n(r.raceNo),finish:n(r.finish),start:n(r.start)});
    });
    return Array.from(map.entries()).map(function(pair){
      const arr=pair[1].sort(function(a,b){return a.race-b.race;}).slice(-5);
      return {name:pair[0],avg:avg(arr.map(function(x){return x.finish;})),gain:avg(arr.map(function(x){return x.start-x.finish;})),finishes:arr.map(function(x){return x.finish;})};
    }).filter(function(x){return x.finishes.length>=2;}).sort(function(a,b){return a.avg-b.avg;});
  }
  function weekendCountdown(iso){
    const t=new Date(iso||'').getTime();if(!Number.isFinite(t))return 'TBD';
    const diff=t-Date.now();
    if(diff<=0)return 'RACE WINDOW';
    const days=Math.floor(diff/86400000),hrs=Math.floor(diff%86400000/3600000),mins=Math.floor(diff%3600000/60000),secs=Math.floor(diff%60000/1000);
    return (days?days+'D ':'')+String(hrs).padStart(2,'0')+':'+String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');
  }
  function startWeekendClock(iso){
    clearInterval(weekendTimer);
    const tick=function(){
      const el=document.getElementById('rnpWeekendCountdown');
      if(!el){clearInterval(weekendTimer);return;}
      el.textContent=weekendCountdown(iso);
    };
    tick();weekendTimer=setInterval(tick,1000);
  }
  window.switchWeekendLeague=function(league){state.weekendLeague=league;renderWeekendCenter();};
  window.renderWeekendCenter=function(){
    const league=state.weekendLeague||state.homeLeague||'Sunday';
    const evt=eventForLeague(league),race=evt.race,s=evt.schedule;
    const standings=state.standings[league]||[],leader=standings[0],second=standings[1];
    const gap=leader&&second?Math.max(0,n(leader.points)-n(second.points)):0;
    const track=s?.track||race.track||'TBD';
    const history=trackHistory(track);
    const previous=history.filter(function(r){return r.finish===1;}).sort(function(a,b){return String(b.date).localeCompare(String(a.date));})[0]||null;
    const trackBest=trackLeaders(track).filter(function(x){return x.starts>=2;}).slice(0,3);
    const form=leagueRecentForm(league).slice(0,3);
    const body='<div class="tabs premium-tabs rnp-weekend-tabs"><button class="'+(league==='Sunday'?'active':'')+'" onclick="switchWeekendLeague(\'Sunday\')">SUNDAY</button><button class="'+(league==='Monday'?'active':'')+'" onclick="switchWeekendLeague(\'Monday\')">MONDAY</button></div>'+
      '<section class="rnp-weekend-hero '+league.toLowerCase()+'"><div><small>NEXT EVENT • '+escapeHtml(league.toUpperCase())+'</small><h3>'+escapeHtml(track)+'</h3><p>'+escapeHtml(race.date||'')+' • '+escapeHtml(race.time||'')+' • '+escapeHtml(s?.car||'Race Car')+' • '+escapeHtml(s?.laps||'—')+' laps</p></div><div class="rnp-weekend-clock"><small>GREEN FLAG</small><strong id="rnpWeekendCountdown">'+escapeHtml(weekendCountdown(race.iso))+'</strong><span>LIVE COUNTDOWN</span></div></section>'+
      '<section class="rnp-weekend-grid"><article><small>CHAMPIONSHIP LEADER</small>'+(leader?driverPhotoMarkup(leader.name,'rnp-weekend-photo','rnp-weekend-fallback'):'')+'<strong>'+escapeHtml(leader?.name||'Loading')+'</strong><span>'+escapeHtml(leader?.points||'—')+' pts • +'+gap+' to P2</span></article><article><small>LAST HLRN WINNER HERE</small>'+(previous?driverPhotoMarkup(previous.name,'rnp-weekend-photo','rnp-weekend-fallback'):'')+'<strong>'+escapeHtml(previous?.name||'No prior winner loaded')+'</strong><span>'+(previous?escapeHtml(previous.source)+' • '+escapeHtml(previous.date):'Track history will populate from results')+'</span></article><article><small>TRACK HISTORY</small><b>'+history.length+'</b><strong>Driver Starts</strong><span>'+trackLeaders(track).length+' unique drivers</span></article></section>'+
      '<div class="section-head"><h3>Weekend Storylines</h3><span>DESCRIPTIVE DATA</span></div>'+
      '<section class="rnp-storylines">'+
        '<article><small>RECENT FORM</small><strong>'+(form[0]?escapeHtml(form[0].name):'—')+'</strong><span>'+(form[0]?form[0].avg.toFixed(1)+' avg finish over '+form[0].finishes.length+' recent races':'Not enough results yet')+'</span></article>'+
        '<article><small>TRACK FORM</small><strong>'+(trackBest[0]?escapeHtml(trackBest[0].name):'—')+'</strong><span>'+(trackBest[0]?trackBest[0].avgFinish.toFixed(1)+' avg finish • '+trackBest[0].starts+' starts':'Need at least two starts at this track')+'</span></article>'+
        '<article><small>CHAMPIONSHIP GAP</small><strong>'+gap+' PTS</strong><span>'+(leader&&second?escapeHtml(leader.name)+' over '+escapeHtml(second.name):'Standings syncing')+'</span></article>'+
      '</section>'+
      '<div class="section-head"><h3>Drivers to Watch</h3><span>RECENT + TRACK DATA</span></div>'+
      '<section class="rnp-weekend-drivers">'+form.map(function(d,i){return '<button onclick="openHLRNDriverProfile(\''+encodeURIComponent(d.name)+'\')">'+driverPhotoMarkup(d.name,'rnp-weekend-driver-photo','rnp-weekend-driver-fallback')+'<div><small>RECENT FORM #'+(i+1)+'</small><strong>'+escapeHtml(d.name)+'</strong><span>'+d.finishes.map(function(x){return 'P'+x;}).join(' • ')+'</span>'+spark(d.finishes,true)+'</div></button>';}).join('')+'</section>'+
      '<section class="rnp-weekend-actions"><button onclick="openTrackIntelligence(\''+encodeURIComponent(track)+'\')">TRACK INTELLIGENCE</button><button onclick="openFeature(\'simulator\')">CHAMPIONSHIP SIMULATOR</button><button onclick="setView(\'schedule\')">FULL SCHEDULE</button></section>';
    featureShell('Event Weekend Center','Race preview, championship context, track history and recent form.',body,'rnp-weekend-page');
    startWeekendClock(race.iso);
  };

  function injectWeekendPreview(){
    const tab=state.scheduleLeague||'Sunday';
    if(tab==='Hosted'||document.querySelector('.rnp-schedule-preview'))return;
    const evt=eventForLeague(tab),race=evt.race,s=evt.schedule;
    const target=document.querySelector('.schedule-dashboard');
    if(!target||!race)return;
    const leader=(state.standings[tab]||[])[0];
    target.insertAdjacentHTML('afterend','<button class="rnp-schedule-preview '+tab.toLowerCase()+'" onclick="state.weekendLeague=\''+tab+'\';openFeature(\'weekend\')"><div><small>RACE NIGHT PRO • EVENT WEEKEND</small><strong>'+escapeHtml(race.track||s?.track||'Next Race')+'</strong><span>'+escapeHtml(race.date||'')+' • '+escapeHtml(race.time||'')+' • '+escapeHtml(s?.car||'Race Car')+'</span></div><div><small>POINTS LEADER</small><strong>'+escapeHtml(leader?.name||'Loading')+'</strong><span>Open full race preview ›</span></div></button>');
  }

  /* ---------------------------------------------------------
     DRIVER INTELLIGENCE PRO
     --------------------------------------------------------- */
  function driverRows(name){
    try{return driverProfileRows(name)||[];}catch(e){return [];}
  }
  function driverIntelHTML(name){
    const rows=driverRows(name);
    if(!rows.length)return '';
    const finishes=rows.map(function(r){return n(r.finish,NaN);}).filter(Number.isFinite);
    const starts=rows.map(function(r){return n(r.start,NaN);}).filter(Number.isFinite);
    const inc=rows.map(function(r){return n(r.incidents,0);});
    const recent=rows.slice(-8),recentFinishes=recent.map(function(r){return n(r.finish,NaN);}).filter(Number.isFinite);
    const net=rows.reduce(function(total,r){const s=n(r.start),f=n(r.finish);return total+(s&&f?s-f:0);},0);
    const trackMap=new Map();
    rows.forEach(function(r){
      if(!r.track||!n(r.finish))return;
      if(!trackMap.has(r.track))trackMap.set(r.track,[]);
      trackMap.get(r.track).push(n(r.finish));
    });
    const bestTrack=Array.from(trackMap.entries()).map(function(x){return {track:x[0],starts:x[1].length,avg:avg(x[1])};}).filter(function(x){return x.starts>=2;}).sort(function(a,b){return a.avg-b.avg;})[0];
    const sourceStats=['Sunday','Monday','Hosted'].map(function(source){
      const x=rows.filter(function(r){return r.source===source;});
      return {source:source,starts:x.length,wins:x.filter(function(r){return n(r.finish)===1;}).length,avg:x.length?avg(x.map(function(r){return n(r.finish);})):0};
    }).filter(function(x){return x.starts;});
    const seasonAvg=avg(finishes),recentAvg=avg(recentFinishes);
    const trend=recentFinishes.length>=3?(recentAvg<seasonAvg-.5?'Recent average finish is better than career average':recentAvg>seasonAvg+.5?'Recent average finish is below career average':'Recent average finish is close to career average'):'Not enough recent races for comparison';
    return '<section class="rnp-driver-intel"><div class="section-head"><h3>Race Night Pro Intelligence</h3><span>DESCRIPTIVE • NO FORECAST</span></div><section class="rnp-driver-intel-hero"><article><small>FINISH TREND</small><strong>'+recentFinishes.map(function(x){return 'P'+x;}).join(' • ')+'</strong>'+spark(recentFinishes,true)+'<span>'+escapeHtml(trend)+'</span></article><article><small>CONSISTENCY</small><strong>'+stdev(finishes).toFixed(1)+'</strong><span>finish-position standard deviation</span></article><article><small>NET POSITIONS</small><strong>'+(net>0?'+':'')+net+'</strong><span>start-to-finish across loaded races</span></article><article><small>AVG INCIDENTS</small><strong>'+avg(inc).toFixed(1)+'</strong><span>per loaded race</span></article></section><section class="rnp-driver-intel-grid"><article><small>CAREER AVG FINISH</small><strong>'+seasonAvg.toFixed(1)+'</strong><span>'+rows.length+' starts loaded</span></article><article><small>RECENT AVG FINISH</small><strong>'+recentAvg.toFixed(1)+'</strong><span>last '+recentFinishes.length+' starts</span></article><article><small>BEST MULTI-START TRACK</small><strong>'+escapeHtml(bestTrack?.track||'—')+'</strong><span>'+(bestTrack?bestTrack.avg.toFixed(1)+' avg • '+bestTrack.starts+' starts':'Need two starts at a track')+'</span></article></section><div class="rnp-series-bars">'+sourceStats.map(function(x){return '<article><div><strong>'+x.source+'</strong><span>'+x.starts+' starts • '+x.wins+' wins • '+x.avg.toFixed(1)+' avg</span></div><i style="--p:'+Math.max(4,Math.min(100,(x.wins/x.starts)*100))+'%"></i></article>';}).join('')+'</div></section>';
  }
  function appendDriverIntel(name){
    if(document.querySelector('.rnp-driver-intel'))return;
    const html=driverIntelHTML(name);
    if(html)app.insertAdjacentHTML('beforeend',html);
  }

  /* ---------------------------------------------------------
     SYSTEM / UPDATE CENTER
     --------------------------------------------------------- */
  function installState(){
    const standalone=window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches;
    return standalone?'INSTALLED':'BROWSER MODE';
  }
  async function cacheInfo(){
    try{
      const keys=await caches.keys();
      return keys.filter(function(x){return /hlrn/i.test(x);});
    }catch(e){return [];}
  }
  window.checkRNPUpdate=async function(){
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      if(!reg){toast('No service worker registration found');return;}
      toast('Checking for HLRN updates…');
      await reg.update();
      setTimeout(function(){
        if(reg.waiting){showUpdateBanner();toast('HLRN update ready','good');}
        else toast('You are on the latest available build','good');
      },900);
    }catch(e){toast('Could not check for updates');}
  };
  window.applyRNPUpdate=async function(){
    const reg=await navigator.serviceWorker.getRegistration();
    if(!reg?.waiting){location.reload();return;}
    let reloaded=false;
    navigator.serviceWorker.addEventListener('controllerchange',function(){
      if(reloaded)return;reloaded=true;location.reload();
    });
    reg.waiting.postMessage({type:'SKIP_WAITING'});
  };
  function showUpdateBanner(){
    if(document.getElementById('rnpUpdateBanner'))return;
    const el=document.createElement('div');
    el.id='rnpUpdateBanner';el.className='rnp-update-banner';
    el.innerHTML='<div><i></i><span><strong>HLRN UPDATE READY</strong><small>A newer Race Night Pro build is ready to install.</small></span></div><button onclick="applyRNPUpdate()">UPDATE NOW</button><button class="close" onclick="this.parentElement.remove()">×</button>';
    document.body.appendChild(el);
  }
  function watchUpdates(){
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.getRegistration().then(function(reg){
      if(!reg)return;
      if(reg.waiting)showUpdateBanner();
      reg.addEventListener('updatefound',function(){
        const worker=reg.installing;if(!worker)return;
        worker.addEventListener('statechange',function(){
          if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdateBanner();
        });
      });
      setInterval(function(){reg.update().catch(function(){});},20*60*1000);
    }).catch(function(){});
  }
  window.renderSystemCenter=async function(){
    const cachesNow=await cacheInfo();
    const reg=await navigator.serviceWorker.getRegistration().catch(function(){return null;});
    const body='<section class="rnp-system-grid"><article><small>APP BUILD</small><strong>'+RNP_VERSION+'</strong><span>Race Night Pro</span></article><article><small>INSTALL STATE</small><strong>'+installState()+'</strong><span>PWA display mode</span></article><article><small>SERVICE WORKER</small><strong>'+(reg?'ACTIVE':'NOT FOUND')+'</strong><span>'+(reg?.waiting?'Update waiting':reg?.active?'Controlling app':'Checking')+'</span></article><article><small>HLRN CACHES</small><strong>'+cachesNow.length+'</strong><span>'+escapeHtml(cachesNow.slice(-1)[0]||'No cache key')+'</span></article><article><small>NETWORK</small><strong>'+(navigator.onLine?'ONLINE':'OFFLINE')+'</strong><span>Browser connectivity</span></article><article><small>DATA SYNC</small><strong>'+escapeHtml(state.liveStatus||'—')+'</strong><span>'+escapeHtml(state.hostedDataStatus||'—')+' Hosted</span></article></section><section class="rnp-system-actions"><button onclick="checkRNPUpdate()">CHECK FOR APP UPDATE</button><button onclick="refreshNow()">REFRESH ALL RACING DATA</button><button onclick="location.reload()">RELOAD APP</button><button onclick="openFeature(\'admin\')">OPERATIONS CONSOLE</button></section><section class="rnp-whats-new"><small>WHAT’S NEW IN 14</small><strong>Race Night Pro</strong><p>Spotter Mode • voice calls • multi-driver live watchlist • Race Radar • Event Weekend Center • deeper Driver Intelligence • automatic update detection.</p></section>';
    featureShell('System Center','App update status, cache, connectivity and build health.',body,'rnp-system-page');
  };

  /* ---------------------------------------------------------
     UI INTEGRATION / WRAPPERS
     --------------------------------------------------------- */
  function injectHomeRNP(){
    if(document.querySelector('.rnp-home-launcher'))return;
    const anchor=document.querySelector('.os-myhlrn-home')||document.querySelector('.cc-topline');
    if(!anchor)return;
    const live=state.liveRace&&state.liveRace.connected&&state.liveRace.driverCount>0;
    anchor.insertAdjacentHTML('afterend','<section class="rnp-home-launcher '+(live?'live':'')+'"><div class="rnp-home-title"><div><small>HLRN APP 14</small><strong>RACE NIGHT PRO</strong><span>'+(live?'Live telemetry connected — Race Night Pro is active.':'Spotter • watchlist • race radar • weekend intelligence')+'</span></div><i></i></div><div class="rnp-home-tools"><button onclick="openFeature(\'spotter\')"><span>🎧</span><strong>Spotter Mode</strong><small>'+(live?'LIVE RELATIVE TIMING':'Armed for race night')+'</small></button><button onclick="openFeature(\'watchlist\')"><span>★</span><strong>Watchlist</strong><small>'+escapeHtml((state.favorites||[]).length)+' favorite drivers</small></button><button onclick="state.weekendLeague=state.homeLeague;openFeature(\'weekend\')"><span>🏁</span><strong>Weekend Center</strong><small>'+escapeHtml(state.nextRaces[state.homeLeague]?.track||'Next event')+'</small></button><button onclick="openFeature(\'system\')"><span>↻</span><strong>System Center</strong><small>Updates + app health</small></button></div></section>');
  }
  function injectLiveProActions(){
    const tabs=document.querySelector('.native-live-tabs');
    if(tabs&&!tabs.querySelector('.rnp-live-tool')){
      tabs.insertAdjacentHTML('beforeend','<button class="rnp-live-tool" onclick="openFeature(\'spotter\')">SPOTTER</button><button class="rnp-live-tool" onclick="openFeature(\'watchlist\')">WATCHLIST</button>');
    }
  }

  const renderFeaturePrev=renderFeature;
  renderFeature=function(name){
    if(name==='spotter')return renderSpotterMode();
    if(name==='watchlist')return renderLiveWatchlist();
    if(name==='weekend')return renderWeekendCenter();
    if(name==='system')return renderSystemCenter();
    return renderFeaturePrev(name);
  };

  const renderHomePrev=renderHome;
  renderHome=function(){
    renderHomePrev();
    injectHomeRNP();
  };

  const renderSchedulePrev=renderSchedule;
  renderSchedule=function(){
    renderSchedulePrev();
    injectWeekendPreview();
  };

  const openProfilePrev=openHLRNDriverProfile;
  openHLRNDriverProfile=function(name,addHistory){
    const decoded=prettyName(decodeSafe(name));
    openProfilePrev(decoded,addHistory);
    setTimeout(function(){appendDriverIntel(decoded);},0);
  };

  const renderLivePrev=renderLiveRaceCenter;
  renderLiveRaceCenter=function(preserveScroll,addHistory){
    renderLivePrev(preserveScroll,addHistory);
    setTimeout(injectLiveProActions,0);
  };

  const applyLivePrev=applyLiveRaceState;
  applyLiveRaceState=function(feed){
    applyLivePrev(feed);
    processSpotterFeed(feed);
    clearTimeout(liveRenderTimer);
    liveRenderTimer=setTimeout(function(){
      if(state.currentView==='feature'&&state.featureView==='spotter')renderSpotterMode();
      else if(state.currentView==='feature'&&state.featureView==='watchlist')renderLiveWatchlist();
    },900);
  };

  function updateBrand(){
    const ed=document.querySelector('.top-edition');if(ed)ed.textContent='14';
    const em=document.querySelector('.top-brand h1 em');if(em)em.textContent='RACE NIGHT PRO';
    document.documentElement.dataset.hlrnRnp='14';
  }
  function announceUpgrade(){
    const seen=localStorage.getItem(UPDATE_KEY);
    if(seen===RNP_VERSION)return;
    localStorage.setItem(UPDATE_KEY,RNP_VERSION);
    setTimeout(function(){toast('Race Night Pro 14 is ready — Spotter Mode and Event Weekend Center added','good');},1100);
  }
  function boot(){
    updateBrand();
    watchUpdates();
    announceUpgrade();
    if(state.currentView==='home')renderHome();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
})();