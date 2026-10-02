(function(){
  'use strict';

  const CONNECTED_GRID_VERSION='17.0.1';
  const AUTH_APP_URL='https://script.google.com/macros/s/AKfycbyX5H27GP1LS7lFvCw_m9PirJlCCpMYRQkU8ovkYJOlmhyWcCy8qFvSKeBL_-SXiNT8/exec';
  const LOGIN_KEY='hlrn_driver_login_device_v1';
  const DEVICE_KEY_STORAGE='hlrn_driver_permanent_device_key_v2';
  const APPEAL_KEY='hlrn_connected_grid_appeals_v1';
  const PIT_KEY='hlrn_connected_grid_last_pit_v1';
  const PUSH_PROFILE_KEY='hlrn_connected_grid_push_profile_v1';
  const DRIVER_NUMBER_URL='https://raw.githubusercontent.com/hunterwelborn32-creator/HLRN-Website/main/data/driver-numbers.json';
  const driverNumbers=new Map();

  let connectedLogin=null;
  let loginVerified=false;
  let loginStatus='CHECKING';
  let loginRequest='';
  let loginPoll=null;
  let loginPollCount=0;
  let jsonpCount=0;
  let lastRestore=0;
  let restoreInFlight=false;
  let lastFeedKey='';
  let lastWorkflowStage='';
  let liveRenderTimer=null;

  const pitSession={
    key:'',
    drivers:new Map(),
    recent:[],
    startedAt:0
  };

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }
  function normalize(v){
    return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  }
  function slug(v){
    return String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
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
  function vibrate(pattern){
    try{if(navigator.vibrate)navigator.vibrate(pattern||8);}catch(e){}
  }
  function driverNumber(name){
    return driverNumbers.get(normalize(name))||'';
  }
  async function loadDriverNumbers(){
    try{
      const r=await fetch(DRIVER_NUMBER_URL,{cache:'no-store'});
      if(!r.ok)return;
      const data=await r.json();
      Object.entries(data?.numbers||{}).forEach(function(pair){
        driverNumbers.set(String(pair[0]||''),String(pair[1]||''));
      });
      if(state.currentView==='feature'&&state.featureView==='driverid')renderDriverId();
      if(state.currentView==='feature'&&state.featureView==='account')renderConnectedAccount();
    }catch(e){}
  }

  function liveFeed(){
    return state.liveRace&&state.liveRace.feed?state.liveRace.feed:null;
  }
  function isLive(){
    return !!(state.liveRace&&state.liveRace.connected&&state.liveRace.driverCount>0);
  }
  function liveDriverList(feed){
    feed=feed||liveFeed();
    try{return liveDrivers(feed);}
    catch(e){
      return (Array.isArray(feed?.drivers)?[...feed.drivers]:[])
        .filter(function(d){return d&&d.position!=null;})
        .sort(function(a,b){return Number(a.position??999)-Number(b.position??999);});
    }
  }
  function driverName(d){
    return prettyName(String(d?.name||d?.driver||'Unknown'));
  }
  function driverKey(d){
    try{return liveDriverKey(d);}
    catch(e){return d?.carIdx!=null?'idx:'+d.carIdx:'n:'+String(d?.number||'')+'|'+driverName(d);}
  }
  function liveStatus(d,feed){
    try{return liveDriverStatus(d,feed||liveFeed());}
    catch(e){return String(d?.status||'ON TRACK').toUpperCase();}
  }
  function liveGap(d){
    try{return liveGapText(d);}
    catch(e){
      if(Number(d?.position)===1)return 'LEADER';
      const g=Number(d?.gap);
      return Number.isFinite(g)?'+'+g.toFixed(3):'—';
    }
  }
  function lapTime(v){
    try{return liveLapTime(v);}
    catch(e){
      const n=Number(v);
      if(!Number.isFinite(n)||n<=0)return '—';
      const m=Math.floor(n/60),s=n-m*60;
      return m?m+':'+s.toFixed(3).padStart(6,'0'):s.toFixed(3);
    }
  }

  /* =========================================================
     1. REAL DRIVER ACCOUNT — SAME SERVER-BACKED DISCORD FLOW
     AS THE WEBSITE
     ========================================================= */
  function hashString(value,seed){
    let hash=seed>>>0;
    const text=String(value||'');
    for(let i=0;i<text.length;i++){
      hash^=text.charCodeAt(i);
      hash=Math.imul(hash,16777619);
      hash>>>=0;
    }
    return ('00000000'+hash.toString(16)).slice(-8);
  }
  function legacyDeviceKey(){
    let timezone='';
    try{timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){}
    const screenValue=window.screen?[screen.width,screen.height,screen.colorDepth,screen.pixelDepth].join('x'):'';
    const fingerprint=[
      navigator.userAgent||'',
      navigator.platform||'',
      navigator.language||'',
      timezone,
      screenValue,
      navigator.hardwareConcurrency||'',
      navigator.deviceMemory||'',
      navigator.maxTouchPoints||''
    ].join('|');
    return 'dev_'+
      hashString(fingerprint,2166136261)+
      hashString(fingerprint,3339675911)+
      hashString(fingerprint,2654435761)+
      hashString(fingerprint,2246822519);
  }
  function permanentDeviceKey(){
    try{
      const saved=String(localStorage.getItem(DEVICE_KEY_STORAGE)||'').trim();
      if(/^[A-Za-z0-9_-]{12,128}$/.test(saved))return saved;
      const migrated=legacyDeviceKey();
      localStorage.setItem(DEVICE_KEY_STORAGE,migrated);
      return migrated;
    }catch(e){return legacyDeviceKey();}
  }
  const DEVICE_KEY=permanentDeviceKey();

  function requestToken(){
    if(window.crypto&&typeof window.crypto.randomUUID==='function'){
      return (crypto.randomUUID()+'-'+crypto.randomUUID()).replace(/-/g,'');
    }
    return Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
  }
  function cleanLogin(data){
    if(!data||typeof data!=='object')return null;
    const driver=String(data.driver||'').trim();
    if(!driver)return null;
    return {
      driver:prettyName(driver),
      discordUsername:String(data.discordUsername||'').trim(),
      discordDisplayName:String(data.discordDisplayName||'').trim(),
      discordId:String(data.discordId||'').trim()
    };
  }
  function cacheLogin(data){
    const safe=cleanLogin(data);
    if(!safe)return;
    connectedLogin=safe;
    try{localStorage.setItem(LOGIN_KEY,JSON.stringify(safe));}catch(e){}
  }
  function loadCachedLogin(){
    try{return cleanLogin(JSON.parse(localStorage.getItem(LOGIN_KEY)||'null'));}
    catch(e){return null;}
  }
  function clearCachedLogin(){
    try{localStorage.removeItem(LOGIN_KEY);}catch(e){}
    connectedLogin=null;
    loginVerified=false;
  }
  function runJsonp(action,params,callback){
    jsonpCount++;
    const cb='hlrnConnectedGridJsonp_'+Date.now()+'_'+jsonpCount;
    const script=document.createElement('script');
    let done=false;
    let timer=null;
    function cleanup(){
      if(done)return;
      done=true;
      if(timer)clearTimeout(timer);
      try{delete window[cb];}catch(e){window[cb]=undefined;}
      if(script.parentNode)script.remove();
    }
    function finish(result){
      if(done)return;
      try{callback(result||{});}finally{cleanup();}
    }
    window[cb]=finish;
    script.onerror=function(){finish({ok:false,status:'network_error'});};
    let url=AUTH_APP_URL+'?action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    Object.keys(params||{}).forEach(function(k){
      url+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]);
    });
    script.src=url;
    document.head.appendChild(script);
    timer=setTimeout(function(){finish({ok:false,status:'timeout'});},12000);
  }
  function accountChanged(){
    renderAccountChrome();
    syncConnectedPushTopics().catch(function(){});
    if(state.currentView==='feature'&&state.featureView==='account')renderConnectedAccount();
  }
  function restoreAccount(force){
    const now=Date.now();
    if(restoreInFlight)return;
    if(!force&&now-lastRestore<15000)return;
    restoreInFlight=true;
    lastRestore=now;
    loginStatus='CHECKING';
    runJsonp('deviceStatus',{device:DEVICE_KEY},function(result){
      restoreInFlight=false;
      if(result&&result.ok&&result.status==='active'&&result.driver){
        cacheLogin({
          driver:result.driver,
          discordUsername:result.discordUsername||'',
          discordDisplayName:result.discordDisplayName||'',
          discordId:result.discordId||''
        });
        loginVerified=true;
        loginStatus='CONNECTED';
        accountChanged();
        return;
      }
      if(result&&result.ok&&result.status==='revoked'){
        clearCachedLogin();
        loginStatus='SIGNED OUT';
        accountChanged();
        return;
      }
      loginStatus=connectedLogin?'CACHED':'OFFLINE';
      accountChanged();
    });
  }
  function pollLogin(){
    if(!loginRequest)return;
    loginPollCount++;
    runJsonp('status',{request:loginRequest},function(result){
      if(result&&result.ok&&result.status==='complete'&&result.driver){
        cacheLogin({
          driver:result.driver,
          discordUsername:result.discordUsername||'',
          discordDisplayName:result.discordDisplayName||'',
          discordId:result.discordId||''
        });
        loginVerified=true;
        loginStatus='CONNECTED';
        loginRequest='';
        if(loginPoll){clearInterval(loginPoll);loginPoll=null;}
        setTimeout(function(){restoreAccount(true);},700);
        toast('Driver account connected','good');
        vibrate([12,20,12]);
        accountChanged();
      }
    });
  }
  window.connectedGridLogin=function(){
    const token=requestToken();
    loginRequest=token;
    if(loginPoll)clearInterval(loginPoll);
    pollLogin();
    loginPoll=setInterval(pollLogin,1800);
    const url=AUTH_APP_URL+'?action=login&request='+encodeURIComponent(token)+'&device='+encodeURIComponent(DEVICE_KEY);
    const win=window.open(url,'_blank');
    if(!win)window.location.href=url;
  };
  window.connectedGridLogout=function(){
    if(loginPoll){clearInterval(loginPoll);loginPoll=null;}
    loginRequest='';
    clearCachedLogin();
    loginStatus='SIGNED OUT';
    accountChanged();
    runJsonp('deviceLogout',{device:DEVICE_KEY},function(){});
    toast('Signed out of HLRN Driver Account');
  };
  function verifiedAccount(){
    return !!(connectedLogin&&loginVerified);
  }
  function connectedDriverStanding(name){
    const rows=[];
    ['Sunday','Monday'].forEach(function(l){
      const d=(state.standings[l]||[]).find(function(x){return normalize(x.name)===normalize(name);});
      if(d)rows.push({league:l,row:d});
    });
    return rows;
  }
  function connectedDriverData(name){
    const standings=connectedDriverStanding(name);
    const primary=standings[0]?.row||null;
    const rows=[];
    try{rows.push(...(driverProfileRows(name)||[]));}catch(e){}
    return {
      name:name,
      standings:standings,
      primary:primary,
      number:driverNumber(name)||(rows.slice().reverse().find(function(r){return r.carNumber;})||{}).carNumber||'',
      team:primary?.team||standings.find(function(x){return x.row.team;})?.row?.team||'',
      starts:rows.length,
      wins:rows.filter(function(r){return Number(r.finish)===1;}).length,
      latest:rows.length?rows[rows.length-1]:null
    };
  }
  function accountHero(){
    if(!connectedLogin){
      return '<section class="cg-account-gate"><div class="cg-account-gate-icon">◉</div><small>SERVER-BACKED DRIVER IDENTITY</small><h3>Connect your HLRN driver account</h3><p>This uses the same Discord/device-session login system as the HLRN website. Your Discord login is handled by the existing HLRN authentication service; no Discord token is stored in this PWA.</p><button onclick="connectedGridLogin()">CONNECT WITH DISCORD</button></section>';
    }
    const d=connectedDriverData(connectedLogin.driver);
    return '<section class="cg-account-hero '+(loginVerified?'verified':'cached')+'">'+
      driverPhotoMarkup(d.name,'cg-account-photo','cg-account-fallback')+
      '<div><small>'+esc(loginVerified?'VERIFIED DRIVER SESSION':'CACHED DRIVER SESSION')+'</small><h3>'+esc(d.name)+'</h3><p>'+(connectedLogin.discordUsername?'@'+esc(connectedLogin.discordUsername):esc(connectedLogin.discordDisplayName||'Discord linked'))+'</p><div class="cg-account-tags">'+d.standings.map(function(s){return '<span>'+s.league+' • P'+esc(s.row.rank)+' • '+esc(s.row.points)+' PTS</span>';}).join('')+'</div></div>'+
      '<div class="cg-account-state"><i></i><strong>'+esc(loginStatus)+'</strong><span>'+esc(d.number?'#'+d.number:'HLRN DRIVER')+'</span></div>'+
    '</section>';
  }
  function pushSummary(){
    return '<article class="cg-account-tile"><small>BACKGROUND PUSH</small><strong>'+esc(state.pushStatus||'CHECKING')+'</strong><span>Announcements, reminders, schedules, results and connected driver topics.</span><button onclick="openFeature(\'notifications\')">NOTIFICATION CENTER ›</button></article>';
  }
  window.renderConnectedAccount=function(){
    const name=connectedLogin?.driver||'';
    const d=name?connectedDriverData(name):null;
    const body=accountHero()+
      (d?'<section class="cg-account-grid">'+
        '<article class="cg-account-tile"><small>MY DRIVER CARD</small><strong>'+esc(d.number?'#'+d.number+' '+d.name:d.name)+'</strong><span>'+esc(d.team||'HLRN Competitor')+'</span><button onclick="openHLRNDriverProfile(\''+encodeURIComponent(d.name)+'\')">OPEN PROFILE ›</button></article>'+
        '<article class="cg-account-tile"><small>DIGITAL DRIVER ID</small><strong>HLRN LICENSE</strong><span>Photo, number, team, career stats and share link.</span><button onclick="state.connectedIdDriver=\''+esc(d.name).replace(/'/g,'&#039;')+'\';openFeature(\'driverid\')">OPEN ID ›</button></article>'+
        pushSummary()+
        '<article class="cg-account-tile"><small>PENALTY CENTER</small><strong>'+publishedPenaltyFor(d.name).toFixed(0)+' PTS</strong><span>Published championship penalty value plus live race-control status.</span><button onclick="openFeature(\'penalties\')">OPEN CASE CENTER ›</button></article>'+
      '</section>'+
      '<section class="cg-account-actions"><button onclick="restoreAccount(true)">VERIFY SESSION</button><button onclick="connectedGridLogout()">SIGN OUT</button></section>':
      '<section class="cg-account-grid">'+pushSummary()+'</section>')+
      '<section class="cg-account-note"><strong>CONNECTED GRID ACCOUNT</strong><p>The account identity is server-backed. Personal display settings and favorite-driver choices remain stored on this device because the current HLRN account service does not expose a cross-device preference-sync endpoint.</p></section>';
    featureShell('Driver Account','Discord-linked HLRN identity, personal driver tools and notification status.',body,'cg-account-page');
  };

  function renderAccountChrome(){
    const actions=document.querySelector('.top-actions');
    if(!actions)return;
    let button=document.getElementById('connectedGridAccountButton');
    if(!button){
      button=document.createElement('button');
      button.id='connectedGridAccountButton';
      button.className='icon-btn cg-account-button';
      button.setAttribute('aria-label','HLRN Driver Account');
      button.onclick=function(){openFeature('account');};
      actions.appendChild(button);
    }
    if(connectedLogin){
      button.innerHTML='<span class="cg-account-initial">'+esc((connectedLogin.driver||'H').charAt(0).toUpperCase())+'</span><i class="'+(loginVerified?'verified':'cached')+'"></i>';
      button.title=connectedLogin.driver+(loginVerified?' • verified':' • cached');
    }else{
      button.innerHTML='<span class="cg-account-person">◉</span><i></i>';
      button.title='Connect HLRN Driver Account';
    }
  }

  /* =========================================================
     3/4. SECURE OPERATIONS + PENALTY/APPEAL CENTER
     No client secret or write credential is embedded.
     ========================================================= */
  function publishedPenaltyFor(name){
    let total=0;
    ['Sunday','Monday'].forEach(function(l){
      const d=(state.standings[l]||[]).find(function(x){return normalize(x.name)===normalize(name);});
      if(d)total+=Number(d.penalty||0);
    });
    return total;
  }
  function livePenaltyRows(){
    const feed=liveFeed();
    return liveDriverList(feed).filter(function(d){
      const status=liveStatus(d,feed);
      return d.blackFlag||d.repairFlag||d.disqualified||d.dqFlag||['BLACK FLAG','MEATBALL','DQ'].includes(status);
    }).map(function(d){
      return {
        driver:driverName(d),
        number:d.number||'—',
        status:liveStatus(d,feed),
        reason:d.penaltyReason||d.statusDetail||'Telemetry status active',
        lap:feed?.lap??'—'
      };
    });
  }
  function appealDrafts(){
    return readJSON(APPEAL_KEY,[]);
  }
  function saveAppealDrafts(rows){
    writeJSON(APPEAL_KEY,rows.slice(-25));
  }
  window.createPenaltyAppeal=function(){
    if(!connectedLogin){
      toast('Connect your Driver Account first');
      openFeature('account');
      return;
    }
    const reason=(document.getElementById('cgAppealReason')?.value||'').trim();
    const event=(document.getElementById('cgAppealEvent')?.value||'').trim();
    if(!reason){
      toast('Add the reason for the appeal');
      return;
    }
    const draft={
      id:'APL-'+Date.now().toString(36).toUpperCase(),
      driver:connectedLogin.driver,
      discord:connectedLogin.discordUsername||connectedLogin.discordDisplayName||'',
      event:event||String(liveFeed()?.track||'HLRN Event'),
      reason:reason,
      createdAt:Date.now(),
      status:'DRAFT'
    };
    const rows=appealDrafts();
    rows.push(draft);
    saveAppealDrafts(rows);
    toast('Appeal draft saved','good');
    renderPenaltyCenter();
  };
  window.copyAppealPacket=async function(id){
    const row=appealDrafts().find(function(x){return x.id===id;});
    if(!row)return;
    const text=[
      'HLRN PENALTY APPEAL',
      'Case: '+row.id,
      'Driver: '+row.driver,
      'Event: '+row.event,
      'Created: '+new Date(row.createdAt).toLocaleString(),
      '',
      row.reason
    ].join('\n');
    try{
      await navigator.clipboard.writeText(text);
      toast('Appeal packet copied','good');
    }catch(e){
      if(navigator.share)navigator.share({title:'HLRN Penalty Appeal '+row.id,text:text}).catch(function(){});
    }
  };
  window.deleteAppealDraft=function(id){
    saveAppealDrafts(appealDrafts().filter(function(x){return x.id!==id;}));
    renderPenaltyCenter();
  };
  window.renderPenaltyCenter=function(){
    const name=connectedLogin?.driver||'';
    const published=name?publishedPenaltyFor(name):0;
    const live=livePenaltyRows();
    const drafts=appealDrafts().filter(function(x){return !name||normalize(x.driver)===normalize(name);}).reverse();
    const body='<section class="cg-penalty-summary">'+
      '<div><small>CONNECTED DRIVER</small><strong>'+esc(name||'SIGN IN REQUIRED')+'</strong><span>'+esc(loginVerified?'Verified account':'No verified account')+'</span></div>'+
      '<div><small>PUBLISHED PENALTY</small><strong>'+published.toFixed(0)+'</strong><span>Current standings penalty field</span></div>'+
      '<div><small>LIVE RC FLAGS</small><strong>'+live.length+'</strong><span>Black flag / meatball / DQ telemetry</span></div>'+
      '<div><small>APPEAL DRAFTS</small><strong>'+drafts.length+'</strong><span>Stored on this device</span></div>'+
    '</section>'+
    '<div class="section-head"><h3>Live Race-Control Status</h3><span>TELEMETRY</span></div>'+
    '<section class="cg-live-penalties">'+(live.length?live.map(function(x){return '<article><b>#'+esc(x.number)+'</b><div><strong>'+esc(x.driver)+'</strong><span>'+esc(x.status)+' • Lap '+esc(x.lap)+'</span><p>'+esc(x.reason)+'</p></div></article>';}).join(''):'<div class="empty">No active live penalty flags are visible in the current telemetry.</div>')+'</section>'+
    '<div class="section-head"><h3>Prepare Appeal</h3><span>DRIVER TOOL</span></div>'+
    (connectedLogin?'<section class="cg-appeal-form"><input id="cgAppealEvent" value="'+esc(liveFeed()?.track||'')+'" placeholder="Event / race"><textarea id="cgAppealReason" placeholder="Explain what you are appealing and the evidence Race Control should review."></textarea><button onclick="createPenaltyAppeal()">SAVE APPEAL DRAFT</button></section>':
      '<section class="cg-account-gate compact"><strong>Driver sign-in required</strong><p>Connect your verified HLRN Driver Account to prepare an appeal packet.</p><button onclick="openFeature(\'account\')">DRIVER ACCOUNT</button></section>')+
    '<div class="section-head"><h3>Appeal Drafts</h3><span>'+drafts.length+'</span></div>'+
    '<section class="cg-appeal-list">'+(drafts.length?drafts.map(function(x){return '<article><div><small>'+esc(x.id)+' • '+new Date(x.createdAt).toLocaleString()+'</small><strong>'+esc(x.event)+'</strong><p>'+esc(x.reason)+'</p></div><div><button onclick="copyAppealPacket(\''+esc(x.id)+'\')">COPY PACKET</button><button class="danger" onclick="deleteAppealDraft(\''+esc(x.id)+'\')">DELETE</button></div></article>';}).join(''):'<div class="empty">No appeal drafts on this device.</div>')+'</section>'+
    '<section class="cg-account-note"><strong>APPEAL SUBMISSION</strong><p>The current HLRN server does not expose a public authenticated penalty-write/appeal endpoint. Connected Grid therefore prepares a structured appeal packet without pretending it was submitted. Use Copy Packet and send it through the official Race Control channel.</p></section>';
    featureShell('Penalty & Appeals','Published penalties, live race-control flags and structured appeal preparation.',body,'cg-penalty-page');
  };

  function adminLink(url,label,desc,icon){
    return '<button onclick="openSocial(\''+esc(url)+'\')"><span>'+icon+'</span><strong>'+esc(label)+'</strong><small>'+esc(desc)+'</small></button>';
  }
  window.renderConnectedAdmin=function(){
    const verified=verifiedAccount();
    const body='<section class="cg-admin-auth '+(verified?'verified':'locked')+'"><div><i></i><span><small>DRIVER SESSION</small><strong>'+esc(verified?connectedLogin.driver:'VERIFICATION REQUIRED')+'</strong><em>'+esc(loginStatus)+'</em></span></div><button onclick="'+(connectedLogin?'restoreAccount(true)':'connectedGridLogin()')+'">'+(connectedLogin?'VERIFY NOW':'CONNECT ACCOUNT')+'</button></section>'+
      '<section class="cg-admin-health">'+
        '<article><small>LEAGUE DATA</small><strong>'+esc(state.liveStatus||'—')+'</strong><span>Published standings/results</span></article>'+
        '<article><small>HOSTED DATA</small><strong>'+esc(state.hostedDataStatus||'—')+'</strong><span>'+esc(state.hostedSessionCount||0)+' sessions</span></article>'+
        '<article><small>LIVE BRIDGE</small><strong>'+(isLive()?'CONNECTED':'STANDBY')+'</strong><span>'+esc(state.liveRace?.track||'Waiting for telemetry')+'</span></article>'+
        '<article><small>PUSH</small><strong>'+esc(state.pushStatus||'—')+'</strong><span>Web Push transport</span></article>'+
      '</section>'+
      '<div class="section-head"><h3>Race Operations</h3><span>IN-APP</span></div>'+
      '<section class="cg-admin-tools"><button onclick="openFeature(\'racecontrol2\')"><span>RC</span><strong>Race Control 2.0</strong><small>Flags, restart order, alerts, pit cycle</small></button><button onclick="openFeature(\'pitstrategy\')"><span>PIT</span><strong>Pit Strategy Center</strong><small>Observed stops and stint lengths</small></button><button onclick="openFeature(\'livechamp\')"><span>PTS</span><strong>Live Championship</strong><small>Unofficial running-order points</small></button><button onclick="openFeature(\'penalties\')"><span>⚑</span><strong>Penalty Center</strong><small>Published + live cases</small></button><button onclick="openFeature(\'media\')"><span>▶</span><strong>Media Center</strong><small>Broadcasts, recaps and socials</small></button><button onclick="refreshNow()"><span>↻</span><strong>Refresh Network</strong><small>Reload all racing data</small></button></section>'+
      '<div class="section-head"><h3>Authenticated Source Controls</h3><span>GOOGLE / GITHUB ENFORCED</span></div>'+
      '<section class="cg-admin-source-grid">'+
        adminLink('https://docs.google.com/spreadsheets/d/'+LIVE.standingsSheet+'/edit','League Database','Standings and results','S')+
        adminLink('https://docs.google.com/spreadsheets/d/'+HOSTED_SHEET+'/edit','Hosted Database','Hosted race imports','H')+
        adminLink('https://docs.google.com/spreadsheets/d/'+LIVE.newsroomSheet+'/edit','Newsroom','Published announcements','N')+
        adminLink('https://docs.google.com/spreadsheets/d/'+LIVE.configSheet+'/edit','App Config','Schedule and links','⚙')+
        adminLink('https://github.com/hunterwelborn32-creator/HLRN-App','App Repository','Source and deployment','GH')+
        adminLink('https://github.com/hunterwelborn32-creator/HLRN-Website','Website Repository','Published network data','WEB')+
      '</section>'+
      '<section class="cg-account-note"><strong>SECURE WRITE BOUNDARY</strong><p>Connected Grid does not embed Google, GitHub, Discord, or server credentials in the public PWA. Direct in-app edits stay disabled until HLRN has an authenticated write API. The source-control buttons above use each provider’s own account permissions.</p></section>';
    featureShell('Connected Operations','Driver-verified race-night operations and secure source controls.',body,'cg-admin-page');
  };

  /* =========================================================
     5. BACKGROUND PUSH — CONNECTED TOPICS
     ========================================================= */
  function connectedPushTopics(){
    const topics=['connected-grid-v1'];
    (state.favorites||[]).slice(0,12).forEach(function(name){
      topics.push('driver-'+slug(name));
    });
    if(connectedLogin?.driver)topics.push('my-driver-'+slug(connectedLogin.driver));
    return topics;
  }
  async function syncConnectedPushTopics(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window))return;
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(!sub)return;
    const base=(typeof getPushTopics==='function'?getPushTopics():[]);
    const topics=Array.from(new Set([].concat(base||[],connectedPushTopics())));
    writeJSON(PUSH_PROFILE_KEY,{topics:topics,updatedAt:Date.now()});
    await fetch(HLRN_PUSH.worker+'/subscribe',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscription:sub.toJSON(),topics:topics})
    });
  }
  if(typeof toggleFavorite==='function'){
    const toggleFavoriteBefore17=toggleFavorite;
    toggleFavorite=function(name){
      const result=toggleFavoriteBefore17(name);
      syncConnectedPushTopics().catch(function(){});
      return result;
    };
  }

  /* =========================================================
     7. LIVE PIT STRATEGY CENTER
     ========================================================= */
  function feedSessionKey(feed){
    if(!feed)return '';
    return String(feed.subSessionId||feed.sessionId||feed.sessionNum||'')+'|'+String(feed.track||'')+'|'+String(feed.phase||'');
  }
  function resetPitSession(key){
    pitSession.key=key;
    pitSession.drivers.clear();
    pitSession.recent=[];
    pitSession.startedAt=Date.now();
  }
  function pitRecordFor(d){
    const key=driverKey(d);
    if(!pitSession.drivers.has(key)){
      pitSession.drivers.set(key,{
        key:key,
        name:driverName(d),
        number:String(d.number||''),
        active:false,
        observedMidStop:false,
        enterLap:null,
        enterAt:0,
        lastExitLap:null,
        stops:[]
      });
    }
    const row=pitSession.drivers.get(key);
    row.name=driverName(d);
    row.number=String(d.number||row.number||'');
    return row;
  }
  function processPitTelemetry(feed){
    if(!feed||String(feed.phase||'').toLowerCase()!=='race')return;
    const key=feedSessionKey(feed);
    if(key!==pitSession.key)resetPitSession(key);
    const lap=Number(feed.lap||0);
    liveDriverList(feed).forEach(function(d){
      const row=pitRecordFor(d);
      const onPit=!!(d.onPitRoad||String(d.status||'').toUpperCase().includes('PIT ROAD')||String(d.trackStatus||'').toUpperCase().includes('PIT ROAD'));
      if(onPit&&!row.active){
        row.active=true;
        row.enterLap=lap||Number(d.lapsCompleted||0)||null;
        row.enterAt=Date.now();
        if(!pitSession.startedAt||Date.now()-pitSession.startedAt<2500)row.observedMidStop=true;
        pitSession.recent.push({key:row.key,name:row.name,lap:row.enterLap,at:Date.now(),type:'entry'});
      }else if(!onPit&&row.active){
        const exitLap=lap||Number(d.lapsCompleted||0)||row.enterLap;
        row.active=false;
        row.lastExitLap=exitLap;
        if(!row.observedMidStop){
          row.stops.push({
            inLap:row.enterLap,
            outLap:exitLap,
            durationSec:row.enterAt?Math.max(0,(Date.now()-row.enterAt)/1000):null
          });
          pitSession.recent.push({key:row.key,name:row.name,lap:exitLap,at:Date.now(),type:'exit'});
        }
        row.observedMidStop=false;
        row.enterLap=null;
        row.enterAt=0;
      }
    });
    pitSession.recent=pitSession.recent.slice(-80);
    try{
      const compact=Array.from(pitSession.drivers.values()).map(function(x){
        return {name:x.name,number:x.number,lastExitLap:x.lastExitLap,stops:x.stops.slice(-6)};
      });
      writeJSON(PIT_KEY,{key:pitSession.key,drivers:compact,savedAt:Date.now()});
    }catch(e){}
  }
  function pitCycleStatus(feed){
    const lap=Number(feed?.lap||0);
    const active=Array.from(pitSession.drivers.values()).filter(function(x){return x.active;});
    const recent=pitSession.recent.filter(function(x){return x.type==='entry'&&Number(x.lap)>=Math.max(0,lap-2);});
    if(active.length>=3||recent.length>=5)return {active:true,label:'PIT CYCLE ACTIVE',detail:active.length+' on pit road • '+recent.length+' entries in last 2 laps'};
    if(active.length)return {active:true,label:'PIT ACTIVITY',detail:active.length+' car'+(active.length===1?'':'s')+' on pit road'};
    return {active:false,label:'GREEN-TRACK RUN',detail:'No major pit cycle observed'};
  }
  function pitRows(feed){
    const lap=Number(feed?.lap||0);
    return liveDriverList(feed).map(function(d){
      const row=pitRecordFor(d);
      const stops=row.stops.length;
      const last=row.stops[row.stops.length-1]||null;
      const lastLap=last?.outLap??row.lastExitLap;
      const stint=lastLap!=null&&lap?Math.max(0,lap-Number(lastLap)):stops===0&&lap?lap:'—';
      return {
        name:driverName(d),
        number:d.number||'—',
        position:d.position||'—',
        active:row.active,
        stops:stops,
        lastPit:lastLap==null?'—':'L'+lastLap,
        stint:stint,
        duration:last?.durationSec,
        status:liveStatus(d,feed)
      };
    }).sort(function(a,b){return Number(a.position)-Number(b.position);});
  }
  window.renderPitStrategy=function(){
    const feed=liveFeed();
    if(!feed||String(feed.phase||'').toLowerCase()!=='race'){
      featureShell('Pit Strategy Center','Observed pit-road transitions, stops and stint lengths from live telemetry.','<section class="cg-standby"><span>PIT</span><strong>Waiting for a live race session</strong><p>Pit Strategy activates when the live bridge reports the race phase. It only reports pit activity actually observed by the app.</p><button onclick="openLiveRaceCenter()">LIVE RACE CENTER</button></section>','cg-pit-page');
      return;
    }
    processPitTelemetry(feed);
    const cycle=pitCycleStatus(feed);
    const rows=pitRows(feed);
    const totalStops=rows.reduce(function(a,x){return a+x.stops;},0);
    const body='<section class="cg-pit-hero '+(cycle.active?'active':'')+'"><div><small>OBSERVED STRATEGY STATE</small><strong>'+esc(cycle.label)+'</strong><span>'+esc(cycle.detail)+'</span></div><div><small>LAP</small><strong>'+esc(feed.lap??'—')+'</strong><span>'+esc(feed.totalLaps?'/ '+feed.totalLaps:'')+'</span></div><div><small>OBSERVED STOPS</small><strong>'+totalStops+'</strong><span>Since this app joined the race feed</span></div></section>'+
      '<section class="cg-pit-board">'+rows.map(function(x){return '<article class="'+(x.active?'active':'')+'"><b>P'+esc(x.position)+'</b>'+driverPhotoMarkup(x.name,'cg-pit-photo','cg-pit-fallback')+'<div><small>#'+esc(x.number)+' • '+esc(x.status)+'</small><strong>'+esc(x.name)+'</strong><span>'+x.stops+' observed stop'+(x.stops===1?'':'s')+'</span></div><div><small>LAST PIT</small><strong>'+esc(x.active?'PIT ROAD':x.lastPit)+'</strong><span>'+(x.duration!=null?x.duration.toFixed(1)+' sec observed':'—')+'</span></div><div><small>STINT</small><strong>'+esc(x.stint==='—'?'—':x.stint+' L')+'</strong><span>laps since last observed exit</span></div></article>';}).join('')+'</section>'+
      '<section class="cg-account-note"><strong>TELEMETRY LIMIT</strong><p>Stops are counted only after this app observes a pit-road entry and exit. Fuel level, tire changes and unobserved earlier stops are not invented.</p></section>';
    featureShell('Pit Strategy Center','Verified pit-road activity and stint tracking from the live HLRN feed.',body,'cg-pit-page');
  };

  /* =========================================================
     8. LIVE UNOFFICIAL CHAMPIONSHIP
     ========================================================= */
  function leagueFromFeed(feed){
    const text=String(feed?.series||feed?.sessionName||'').toLowerCase();
    if(text.includes('monday'))return 'Monday';
    if(text.includes('sunday'))return 'Sunday';
    return state.homeLeague||'Sunday';
  }
  function pointsByFinish(leagueName){
    const grouped={};
    (state.results[leagueName]||[]).forEach(function(r){
      const f=Number(r.finish),p=Number(r.points);
      if(f>0&&Number.isFinite(p)){
        if(!grouped[f])grouped[f]=[];
        grouped[f].push(p);
      }
    });
    const out={};
    Object.keys(grouped).forEach(function(k){
      const vals=grouped[k].slice().sort(function(a,b){return a-b;});
      const mid=Math.floor(vals.length/2);
      out[k]=vals.length%2?vals[mid]:(vals[mid-1]+vals[mid])/2;
    });
    return out;
  }
  function liveChampRows(feed){
    const l=leagueFromFeed(feed);
    const map=pointsByFinish(l);
    const live=liveDriverList(feed);
    const byName=new Map(live.map(function(d){return [normalize(driverName(d)),d];}));
    return (state.standings[l]||[]).map(function(s){
      const d=byName.get(normalize(s.name));
      const finish=d?Number(d.position||0):0;
      const provisional=finish?Number(map[finish]||0):0;
      return {
        name:s.name,
        currentRank:Number(s.rank||0),
        currentPoints:Number(s.points||0),
        running:finish||null,
        provisionalRace:provisional,
        projected:Number(s.points||0)+provisional,
        liveDriver:d
      };
    }).sort(function(a,b){return b.projected-a.projected||a.currentRank-b.currentRank;});
  }
  window.renderLiveChampionship=function(){
    const feed=liveFeed();
    if(!feed||String(feed.phase||'').toLowerCase()!=='race'){
      featureShell('Live Championship','Unofficial championship movement based on current race running order.','<section class="cg-standby"><span>PTS</span><strong>Live championship is waiting for Race phase</strong><p>When the race starts, current running positions will be applied to the latest published standings using the league’s observed finish-points table.</p><button onclick="openLiveRaceCenter()">LIVE RACE CENTER</button></section>','cg-livechamp-page');
      return;
    }
    const l=leagueFromFeed(feed);
    const rows=liveChampRows(feed);
    const leader=rows[0];
    const body='<section class="cg-livechamp-banner"><div><i></i><span><small>UNOFFICIAL • LIVE</small><strong>'+esc(l)+' CHAMPIONSHIP</strong><em>Lap '+esc(feed.lap??'—')+(feed.totalLaps?' / '+esc(feed.totalLaps):'')+'</em></span></div><p>Running-position points only. Stage points, bonuses and post-race penalties are not included.</p></section>'+
      (leader?'<section class="cg-livechamp-leader">'+driverPhotoMarkup(leader.name,'cg-livechamp-photo','cg-livechamp-fallback')+'<div><small>PROVISIONAL LEADER</small><strong>'+esc(leader.name)+'</strong><span>'+leader.projected.toFixed(1).replace('.0','')+' unofficial pts • '+(leader.running?'running P'+leader.running:'not currently scored')+'</span></div></section>':'')+
      '<section class="cg-livechamp-table">'+rows.map(function(x,i){
        const delta=x.currentRank-(i+1);
        return '<article class="'+(i===0?'leader':'')+'"><b>P'+(i+1)+'</b>'+driverPhotoMarkup(x.name,'cg-livechamp-row-photo','cg-livechamp-row-fallback')+'<div><strong>'+esc(x.name)+'</strong><span>'+x.currentPoints+' published + '+x.provisionalRace.toFixed(1).replace('.0','')+' running-order pts'+(x.running?' • Race P'+x.running:'')+'</span></div><em class="'+(delta>0?'up':delta<0?'down':'same')+'">'+(delta>0?'▲ '+delta:delta<0?'▼ '+Math.abs(delta):'—')+'<small>'+x.projected.toFixed(1).replace('.0','')+' PTS</small></em></article>';
      }).join('')+'</section>';
    featureShell('Live Championship','Unofficial title picture calculated from the current running order.',body,'cg-livechamp-page');
  };

  /* =========================================================
     9/10. RACE CONTROL 2.0 + AUTOMATIC WORKFLOW
     ========================================================= */
  function workflowStage(feed){
    if(!feed||!isLive())return {key:'standby',label:'PRE-RACE',step:0};
    let phase=String(feed.phase||feed.sessionName||'').toLowerCase();
    let finished=false;
    try{finished=liveRaceFinished(feed);}catch(e){finished=String(feed.flag||'').toUpperCase().includes('CHECKER');}
    if(finished)return {key:'final',label:'CHECKERED / FINAL',step:4};
    if(phase.includes('practice'))return {key:'practice',label:'PRACTICE',step:1};
    if(phase.includes('qual'))return {key:'qualifying',label:'QUALIFYING',step:2};
    if(phase.includes('race')){
      const flag=String(feed.flag||'').toUpperCase();
      const rc=feed.raceControl||{};
      if(rc.oneToGreen)return {key:'restart',label:'ONE TO GREEN',step:3};
      if(rc.active||flag.includes('YELLOW')||flag.includes('CAUTION'))return {key:'caution',label:'CAUTION',step:3};
      return {key:'race',label:'GREEN FLAG',step:3};
    }
    return {key:'pre',label:'PRE-RACE',step:0};
  }
  function workflowHTML(feed){
    const stage=workflowStage(feed);
    const steps=[['PRE-RACE',0],['PRACTICE',1],['QUALIFY',2],['RACE',3],['FINAL',4]];
    return '<section class="cg-workflow '+esc(stage.key)+'"><header><div><small>AUTOMATIC RACE-NIGHT WORKFLOW</small><strong>'+esc(stage.label)+'</strong></div><span>'+esc(isLive()?'LIVE FEED':'STANDBY')+'</span></header><div>'+steps.map(function(x){return '<article class="'+(x[1]<stage.step?'done':x[1]===stage.step?'active':'')+'"><i></i><b>'+x[0]+'</b></article>';}).join('')+'</div></section>';
  }
  function injectWorkflow(){
    if(document.querySelector('.cg-workflow'))return;
    const feed=liveFeed();
    if(state.currentView==='home'){
      const anchor=document.querySelector('.rnp-home-launcher')||document.querySelector('.cc-live-race')||document.querySelector('.cc-race-panel');
      if(anchor)anchor.insertAdjacentHTML('afterend',workflowHTML(feed));
    }else if(state.currentView==='live-center'){
      const anchor=document.querySelector('.native-live-head');
      if(anchor)anchor.insertAdjacentHTML('afterend',workflowHTML(feed));
    }
  }
  function rcSummary(feed){
    const rc=feed?.raceControl||{};
    const drivers=liveDriverList(feed);
    return {
      flag:String(feed?.flag||'—').toUpperCase(),
      lap:feed?.lap??'—',
      total:feed?.totalLaps??'—',
      cautions:Number(rc.cautionCount||0),
      yellowLaps:Number(rc.totalCautionLaps||0),
      greenRun:Number(rc.currentGreenRun||0),
      longestGreen:Number(rc.longestGreenRun||0),
      oneToGreen:!!rc.oneToGreen,
      restart:Array.isArray(rc.restartOrder)?rc.restartOrder:[],
      penalties:livePenaltyRows(),
      disconnected:drivers.filter(function(d){return ['DISCONNECTED','OUT'].includes(liveStatus(d,feed));}),
      pit:pitCycleStatus(feed)
    };
  }
  window.renderRaceControl2=function(){
    const feed=liveFeed();
    if(!feed){
      featureShell('Race Control 2.0','Automatic race-state command center driven by the HLRN live bridge.','<section class="cg-standby"><span>RC</span><strong>Race Control is standing by</strong><p>Start the HLRN live bridge to activate flag, caution, restart, pit-cycle and championship tools.</p><button onclick="openLiveRaceCenter()">LIVE RACE CENTER</button></section>','cg-racecontrol-page');
      return;
    }
    processPitTelemetry(feed);
    const rc=rcSummary(feed);
    const body=workflowHTML(feed)+
      '<section class="cg-rc2-hero"><div><small>FLAG</small><strong>'+esc(rc.flag)+'</strong><span>Lap '+esc(rc.lap)+(feed.totalLaps?' / '+esc(feed.totalLaps):'')+'</span></div><div><small>CAUTIONS</small><strong>'+rc.cautions+'</strong><span>'+rc.yellowLaps+' yellow laps</span></div><div><small>GREEN RUN</small><strong>'+rc.greenRun+'</strong><span>Longest '+rc.longestGreen+'</span></div><div><small>RESTART</small><strong>'+esc(rc.oneToGreen?'1 TO GREEN':'—')+'</strong><span>'+esc(rc.pit.label)+'</span></div></section>'+
      '<div class="section-head"><h3>Race-Control Alerts</h3><span>'+rc.penalties.length+' ACTIVE</span></div>'+
      '<section class="cg-rc2-alerts">'+(rc.penalties.length?rc.penalties.map(function(x){return '<article><b>#'+esc(x.number)+'</b><div><strong>'+esc(x.driver)+'</strong><span>'+esc(x.status)+'</span><p>'+esc(x.reason)+'</p></div></article>';}).join(''):'<div class="empty">No black flag, meatball or DQ telemetry is currently active.</div>')+'</section>'+
      '<div class="section-head"><h3>Connected Tools</h3><span>RACE NIGHT</span></div>'+
      '<section class="cg-admin-tools"><button onclick="openFeature(\'pitstrategy\')"><span>PIT</span><strong>Pit Strategy</strong><small>'+esc(rc.pit.detail)+'</small></button><button onclick="openFeature(\'livechamp\')"><span>PTS</span><strong>Live Championship</strong><small>Unofficial running order</small></button><button onclick="openFeature(\'penalties\')"><span>⚑</span><strong>Penalty Center</strong><small>'+rc.penalties.length+' live RC flag'+(rc.penalties.length===1?'':'s')+'</small></button><button onclick="openFeature(\'recap\')"><span>RPT</span><strong>Race Recap</strong><small>Post-race story builder</small></button></section>'+
      (rc.disconnected.length?'<div class="section-head"><h3>Out / Disconnected</h3><span>'+rc.disconnected.length+'</span></div><section class="cg-rc2-disconnected">'+rc.disconnected.map(function(d){return '<article><strong>#'+esc(d.number||'—')+' '+esc(driverName(d))+'</strong><span>'+esc(liveStatus(d,feed))+'</span></article>';}).join('')+'</section>':'');
    featureShell('Race Control 2.0','Flags, cautions, restarts, pit cycle and connected race-night tools.',body,'cg-racecontrol-page');
  };

  /* =========================================================
     11. MEDIA CENTER
     ========================================================= */
  function latestWinnerCards(){
    const rows=(state.latestResults||[]).slice(0,3);
    if(state.hostedLatest)rows.push({league:'Hosted',winner:state.hostedLatest.winner,track:state.hostedLatest.track,date:state.hostedLatest.date});
    return rows.slice(0,4).map(function(x){
      const name=prettyName(String(x.winner||'Winner'));
      return '<button class="cg-media-result" onclick="openHLRNDriverProfile(\''+encodeURIComponent(name)+'\')">'+driverPhotoMarkup(name,'cg-media-winner-photo','cg-media-winner-fallback')+'<div><small>'+esc(String(x.league||'HLRN').toUpperCase())+' WINNER</small><strong>'+esc(name)+'</strong><span>'+esc(x.track||'HLRN Race')+(x.date?' • '+esc(x.date):'')+'</span></div></button>';
    }).join('');
  }
  window.renderMediaCenter=function(){
    const sun=state.links['Sunday Broadcast']||'https://www.youtube.com/@High_Line_Racing';
    const mon=state.links['Monday Broadcast']||'https://www.youtube.com/@rsibroadcasting';
    const anns=(state.announcements||[]).slice(0,4);
    const body='<section class="cg-media-hero"><div><small>HLRN NETWORK MEDIA</small><strong>WATCH • READ • SHARE</strong><span>Broadcasts, winners, official bulletins and HLRN community channels.</span></div><button onclick="openBroadcast(state.homeLeague)">WATCH CURRENT LEAGUE ›</button></section>'+
      '<div class="section-head"><h3>Broadcast Center</h3><span>LIVE + REPLAY</span></div>'+
      '<section class="cg-media-broadcasts"><button onclick="openSocial(\''+esc(sun)+'\')"><span>▶</span><div><small>SUNDAY COVERAGE</small><strong>HLRN Broadcast</strong><em>Open current Sunday stream/channel</em></div></button><button onclick="openSocial(\''+esc(mon)+'\')"><span>▶</span><div><small>MONDAY COVERAGE</small><strong>RSI / HLRN Coverage</strong><em>Open current Monday stream/channel</em></div></button><button onclick="openSocial(\'https://www.youtube.com/@High_Line_Racing\')"><span>YT</span><div><small>YOUTUBE</small><strong>High Line Racing Network</strong><em>Races • highlights • content</em></div></button><button onclick="openSocial(\'https://highlineracingnetwork.com/adventures/\')"><span>A</span><div><small>ORIGINAL SERIES</small><strong>Adventures of High Line</strong><em>Episodes and stories</em></div></button></section>'+
      '<div class="section-head"><h3>Latest Winners</h3><span>RESULTS DESK</span></div><section class="cg-media-winners">'+(latestWinnerCards()||'<div class="empty">Latest winners are loading.</div>')+'</section>'+
      '<div class="section-head"><h3>Official Bulletins</h3><span>'+esc(state.announcementsStatus||'—')+'</span></div><section class="cg-media-news">'+(anns.length?anns.map(function(a){return '<article><small>'+esc(a.tag||'HLRN')+' • '+esc(a.time||'')+'</small><strong>'+esc(a.title||'HLRN Bulletin')+'</strong><p>'+esc(a.text||'')+'</p>'+(a.jumpUrl?'<button onclick="openSocial(\''+esc(a.jumpUrl)+'\')">OPEN DISCORD POST ›</button>':'')+'</article>';}).join(''):'<div class="empty">No bulletins loaded.</div>')+'</section>'+
      '<div class="section-head"><h3>Community</h3><span>CONNECT</span></div><section class="cg-media-community"><button onclick="openSocial(\'https://discord.gg/HpDfUQk23P\')"><span>◉</span><strong>Discord</strong><small>HLRN Hangout</small></button><button onclick="openSocial(\'https://www.facebook.com/profile.php?id=61573411079339\')"><span>f</span><strong>Facebook</strong><small>HLRNZone</small></button><button onclick="openFeature(\'graphics\')"><span>▣</span><strong>Share Studio</strong><small>Generate HLRN graphics</small></button><button onclick="setView(\'socials\')"><span>↗</span><strong>All Socials</strong><small>Full network directory</small></button></section>';
    featureShell('Media Center','Broadcasts, winners, bulletins, original content and community links.',body,'cg-media-page');
  };

  /* =========================================================
     12. DIGITAL DRIVER LICENSE / ID
     ========================================================= */
  function findStanding(name){
    const list=[];
    ['Sunday','Monday'].forEach(function(l){
      const row=(state.standings[l]||[]).find(function(x){return normalize(x.name)===normalize(name);});
      if(row)list.push({league:l,row:row});
    });
    return list;
  }
  function driverCareer(name){
    let rows=[];
    try{rows=driverProfileRows(name)||[];}catch(e){}
    const standings=findStanding(name);
    const primary=standings[0]?.row||null;
    return {
      name:prettyName(name),
      number:driverNumber(name)||(rows.slice().reverse().find(function(r){return r.carNumber;})||{}).carNumber||'',
      team:primary?.team||standings.find(function(x){return x.row.team;})?.row?.team||'',
      driverId:primary?.driverId||standings.find(function(x){return x.row.driverId;})?.row?.driverId||'',
      starts:rows.length,
      wins:rows.filter(function(r){return Number(r.finish)===1;}).length,
      top5:rows.filter(function(r){const f=Number(r.finish);return f>0&&f<=5;}).length,
      avg:rows.length?rows.reduce(function(a,r){return a+Number(r.finish||0);},0)/rows.length:0,
      standings:standings
    };
  }
  function driverProfileShareUrl(name){
    return 'https://highlineracingnetwork.com/drivers/?driver='+encodeURIComponent(name);
  }
  window.selectDriverId=function(value){
    state.connectedIdDriver=decodeURIComponent(value);
    renderDriverId();
  };
  window.copyDriverIdLink=async function(name){
    const url=driverProfileShareUrl(decodeURIComponent(name));
    try{await navigator.clipboard.writeText(url);toast('Driver profile link copied','good');}
    catch(e){if(navigator.share)navigator.share({title:'HLRN Driver',url:url}).catch(function(){});}
  };
  window.shareConnectedDriverId=async function(name){
    name=decodeURIComponent(name);
    const d=driverCareer(name);
    const text='#'+(d.number||'—')+' '+d.name+' • '+d.starts+' starts • '+d.wins+' wins • HLRN';
    try{
      if(navigator.share)await navigator.share({title:'HLRN Driver ID — '+d.name,text:text,url:driverProfileShareUrl(name)});
      else await copyDriverIdLink(encodeURIComponent(name));
    }catch(e){}
  };
  window.renderDriverId=function(){
    const names=Array.from(new Set(
      (state.drivers||[]).map(function(d){return prettyName(String(d.name||''));})
        .concat((state.hostedDrivers||[]).map(function(d){return prettyName(String(d.name||''));}))
    )).filter(Boolean).sort();
    let selected=state.connectedIdDriver||connectedLogin?.driver||(state.favorites||[])[0]||names[0]||'';
    if(!selected){
      featureShell('Digital Driver ID','Shareable HLRN driver license.','<div class="empty">No driver data is loaded yet.</div>','cg-driverid-page');
      return;
    }
    state.connectedIdDriver=selected;
    const d=driverCareer(selected);
    const url=driverProfileShareUrl(selected);
    const qr='https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data='+encodeURIComponent(url);
    const body='<section class="cg-id-toolbar"><select onchange="selectDriverId(this.value)">'+names.map(function(n){return '<option value="'+encodeURIComponent(n)+'" '+(normalize(n)===normalize(selected)?'selected':'')+'>'+esc(n)+'</option>';}).join('')+'</select><button onclick="shareConnectedDriverId(\''+encodeURIComponent(selected)+'\')">SHARE ID</button></section>'+
      '<section class="cg-driver-license"><div class="cg-id-top"><div><small>HIGH LINE RACING NETWORK</small><strong>DIGITAL DRIVER LICENSE</strong></div><b>CONNECTED GRID</b></div><div class="cg-id-main">'+driverPhotoMarkup(selected,'cg-id-photo','cg-id-fallback')+'<div class="cg-id-identity"><small>HLRN COMPETITOR</small><h3>'+esc(selected)+'</h3><p>'+esc(d.team||'Independent')+'</p><div><span>#'+esc(d.number||'—')+'</span><span>ID '+esc(d.driverId||'—')+'</span></div></div><div class="cg-id-qr"><img src="'+qr+'" alt="QR code for '+esc(selected)+' HLRN profile" loading="lazy"><small>SCAN PROFILE</small></div></div><div class="cg-id-stats"><div><small>STARTS</small><strong>'+d.starts+'</strong></div><div><small>WINS</small><strong>'+d.wins+'</strong></div><div><small>TOP 5</small><strong>'+d.top5+'</strong></div><div><small>AVG FIN</small><strong>'+(d.avg?d.avg.toFixed(1):'—')+'</strong></div></div><footer><span>'+d.standings.map(function(x){return x.league+' P'+x.row.rank+' • '+x.row.points+' PTS';}).join('  |  ')+'</span><b>HLRN • 2026</b></footer></section>'+
      '<section class="cg-id-actions"><button onclick="copyDriverIdLink(\''+encodeURIComponent(selected)+'\')">COPY PROFILE LINK</button><button onclick="openHLRNDriverProfile(\''+encodeURIComponent(selected)+'\')">OPEN DRIVER CARD</button></section>';
    featureShell('Digital Driver ID','Shareable HLRN identity card with career data and profile QR code.',body,'cg-driverid-page');
  };

  /* =========================================================
     POST-RACE CONNECTED SUMMARY
     ========================================================= */
  function finalSummary(feed){
    const list=liveDriverList(feed);
    const leader=list[0];
    let fastest=null;
    try{fastest=liveFastestDrivers(feed)[0]||null;}catch(e){}
    const rc=feed?.raceControl||{};
    return {
      winner:leader,
      top10:list.slice(0,10),
      fastest:fastest,
      cautions:Number(rc.cautionCount||0),
      yellowLaps:Number(rc.totalCautionLaps||0),
      track:feed?.track||state.liveRace.track||'HLRN Race'
    };
  }
  function postRaceCard(feed){
    let finished=false;
    try{finished=liveRaceFinished(feed);}catch(e){}
    if(!finished)return '';
    const r=finalSummary(feed);
    if(!r.winner)return '';
    return '<section class="cg-postrace"><div><small>AUTOMATIC POST-RACE SUMMARY</small><strong>#'+esc(r.winner.number||'—')+' '+esc(driverName(r.winner))+'</strong><span>'+esc(r.track)+' • '+r.cautions+' cautions • '+r.yellowLaps+' yellow laps'+(r.fastest?' • Fastest '+esc(driverName(r.fastest))+' '+esc(lapTime(r.fastest.bestLapTime)):'')+'</span></div><button onclick="openFeature(\'recap\')">FULL RECAP ›</button></section>';
  }
  function injectPostRace(){
    if(document.querySelector('.cg-postrace'))return;
    const feed=liveFeed();
    if(!feed)return;
    const html=postRaceCard(feed);
    if(!html)return;
    const anchor=state.currentView==='home'?document.querySelector('.cg-workflow'):document.querySelector('.native-live-head');
    if(anchor)anchor.insertAdjacentHTML('afterend',html);
  }

  /* =========================================================
     HOME CONNECTED GRID LAUNCHPAD
     ========================================================= */
  function homeConnectedGrid(){
    const account=connectedLogin?.driver||'Connect Driver Account';
    const feed=liveFeed();
    const stage=workflowStage(feed);
    const champLeague=feed&&String(feed.phase||'').toLowerCase()==='race'?leagueFromFeed(feed):(state.homeLeague||'Sunday');
    return '<section class="cg-home"><header><div><small>HLRN APP 17</small><strong>CONNECTED GRID</strong><span>Identity • race control • live championship • media • driver IDs</span></div><div class="'+(verifiedAccount()?'verified':'')+'"><i></i><span>'+esc(account)+'</span></div></header><div class="cg-home-grid"><button onclick="openFeature(\'account\')"><span>◉</span><strong>Driver Account</strong><small>'+esc(loginVerified?'VERIFIED':connectedLogin?'CACHED':'DISCORD LOGIN')+'</small></button><button onclick="openFeature(\'racecontrol2\')"><span>RC</span><strong>Race Control 2.0</strong><small>'+esc(stage.label)+'</small></button><button onclick="openFeature(\'pitstrategy\')"><span>PIT</span><strong>Pit Strategy</strong><small>'+esc(isLive()?'LIVE TELEMETRY':'RACE-NIGHT TOOL')+'</small></button><button onclick="openFeature(\'livechamp\')"><span>PTS</span><strong>Live Championship</strong><small>'+esc(champLeague.toUpperCase())+' • UNOFFICIAL</small></button><button onclick="openFeature(\'penalties\')"><span>⚑</span><strong>Penalties & Appeals</strong><small>CASES + LIVE FLAGS</small></button><button onclick="openFeature(\'media\')"><span>▶</span><strong>Media Center</strong><small>WATCH • READ • SHARE</small></button><button onclick="state.connectedIdDriver=connectedLogin?.driver||state.favorites?.[0]||\'\';openFeature(\'driverid\')"><span>ID</span><strong>Digital Driver ID</strong><small>PROFILE + QR</small></button><button onclick="openFeature(\'connectedadmin\')"><span>⚙</span><strong>Connected Ops</strong><small>NETWORK CONTROL</small></button></div></section>';
  }
  function injectConnectedHome(){
    if(state.currentView!=='home'||document.querySelector('.cg-home'))return;
    const anchor=document.querySelector('.rnp-home-launcher')||document.querySelector('.os-myhlrn-home')||document.querySelector('.cc-status-grid');
    if(anchor)anchor.insertAdjacentHTML('afterend',homeConnectedGrid());
  }

  /* =========================================================
     FEATURE / LIVE INTEGRATION
     ========================================================= */
  const renderFeatureBefore17=renderFeature;
  renderFeature=function(name){
    if(name==='account')return renderConnectedAccount();
    if(name==='connectedadmin')return renderConnectedAdmin();
    if(name==='penalties')return renderPenaltyCenter();
    if(name==='pitstrategy')return renderPitStrategy();
    if(name==='livechamp')return renderLiveChampionship();
    if(name==='racecontrol2')return renderRaceControl2();
    if(name==='media')return renderMediaCenter();
    if(name==='driverid')return renderDriverId();
    return renderFeatureBefore17(name);
  };

  const renderHomeBefore17=renderHome;
  renderHome=function(){
    renderHomeBefore17();
    injectConnectedHome();
    injectWorkflow();
    injectPostRace();
    renderAccountChrome();
  };

  const renderLiveBefore17=renderLiveRaceCenter;
  renderLiveRaceCenter=function(preserveScroll,addHistory){
    renderLiveBefore17(preserveScroll,addHistory);
    injectWorkflow();
    injectPostRace();
    const tabs=document.querySelector('.native-live-tabs');
    if(tabs&&!tabs.querySelector('.cg-live-tool')){
      tabs.insertAdjacentHTML('beforeend','<button class="cg-live-tool" onclick="openFeature(\'racecontrol2\')">RC 2.0</button><button class="cg-live-tool" onclick="openFeature(\'pitstrategy\')">PIT</button><button class="cg-live-tool" onclick="openFeature(\'livechamp\')">LIVE PTS</button>');
    }
  };

  const applyLiveBefore17=applyLiveRaceState;
  applyLiveRaceState=function(feed){
    processPitTelemetry(feed);
    const stage=workflowStage(feed);
    if(stage.key!==lastWorkflowStage){
      lastWorkflowStage=stage.key;
      if(stage.key==='final'&&window.hlrnToast)window.hlrnToast('Checkered flag — Connected Grid final workflow active','good');
    }
    applyLiveBefore17(feed);
    clearTimeout(liveRenderTimer);
    liveRenderTimer=setTimeout(function(){
      if(state.currentView==='feature'){
        if(state.featureView==='pitstrategy')renderPitStrategy();
        else if(state.featureView==='livechamp')renderLiveChampionship();
        else if(state.featureView==='racecontrol2')renderRaceControl2();
        else if(state.featureView==='penalties')renderPenaltyCenter();
      }
      if(state.currentView==='home'||state.currentView==='live-center'){
        document.querySelector('.cg-workflow')?.remove();
        document.querySelector('.cg-postrace')?.remove();
        injectWorkflow();
        injectPostRace();
      }
    },900);
  };

  /* Add Connected Grid commands to HyperGrid palette without rewriting it. */
  function injectHyperGridCommands(){
    const grid=document.getElementById('hyperGridPaletteGrid');
    if(!grid||grid.querySelector('.cg-palette-command'))return;
    const extras=[
      ['◉','Driver Account','Verified Discord identity',"openFeature('account')"],
      ['RC','Race Control 2.0','Connected race operations',"openFeature('racecontrol2')"],
      ['PIT','Pit Strategy','Observed stops and stints',"openFeature('pitstrategy')"],
      ['PTS','Live Championship','Unofficial running points',"openFeature('livechamp')"],
      ['▶','Media Center','Broadcasts and bulletins',"openFeature('media')"],
      ['ID','Driver ID','Digital HLRN license',"openFeature('driverid')"]
    ];
    extras.forEach(function(x){
      const b=document.createElement('button');
      b.className='cg-palette-command';
      b.innerHTML='<span>'+x[0]+'</span><div><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div><b>›</b>';
      b.onclick=function(){if(window.closeHyperGridLauncher)closeHyperGridLauncher();eval(x[3]);};
      grid.appendChild(b);
    });
  }

  const openHyperBefore17=window.openHyperGridLauncher;
  if(typeof openHyperBefore17==='function'){
    window.openHyperGridLauncher=function(){
      openHyperBefore17();
      setTimeout(injectHyperGridCommands,0);
    };
  }

  function boot(){
    connectedLogin=loadCachedLogin();
    loginStatus=connectedLogin?'CACHED':'CHECKING';
    renderAccountChrome();
    restoreAccount(true);
    setInterval(function(){restoreAccount(false);},120000);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)restoreAccount(false);});
    window.addEventListener('focus',function(){restoreAccount(false);});
    syncConnectedPushTopics().catch(function(){});
    loadDriverNumbers();
    if(state.currentView==='home'){
      injectConnectedHome();
      injectWorkflow();
      injectPostRace();
    }
    document.documentElement.dataset.connectedGrid='17';
    const edition=document.querySelector('.top-edition');if(edition)edition.textContent='17';
    const brand=document.querySelector('.top-brand h1 em');if(brand)brand.textContent='CONNECTED GRID';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,0);
})();