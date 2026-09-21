(function(){
"use strict";

const BASE="https://hunterwelborn32-creator.github.io/HLRN-App/driver-photos/cutout/";
const MAP={"aarontruebig":"aaron-truebig.webp","alexleebaw":"alex-leebaw.webp","benjaminrichards":"benjamin-richards.webp","billdaniels":"bill-daniels.webp","brandonbeyke":"brandon-beyke.webp","brandonshowers":"brandon-showers.webp","brianhayes":"brian-hayes.webp","brianhebbard":"brian-hebbard.webp","brianhennings":"brian-hennings.webp","brockpiper":"brock-piper.webp","brycehinton":"bryce-hinton.webp","carsonfreeman":"carson-freeman.webp","charlesfletcher":"charles-fletcher.webp","chrisjames":"chris-james.webp","coricooke":"cori-cooke.webp","craigrowe":"craig-rowe.webp","darrelceballos":"darrel-ceballos.webp","daviddurand":"david-durand.webp","derekjacobs":"derek-jacobs.webp","donnybeach":"donny-beach.webp","dylanjones":"dylan-jones.webp","erichayden":"eric-hayden.webp","ethaneckert":"ethan-eckert.webp","ethanmoreno":"ethan-moreno.webp","evanfuqua":"evan-fuqua.webp","evankarlbon":"evan-karlbon.webp","evanparry":"evan-parry.webp","gerrybergeron":"gerry-bergeron.webp","grantwessley":"grant-wessley.webp","hunterwelborn":"hunter-welborn.webp","jaredphilpott":"jared-philpott.webp","jasonbranch":"jason-branch.webp","javonethompson":"javone-thompson.webp","jeremyjeffries":"jeremy-jeffries.webp","jerryfassett":"jerry-fassett.webp","jimsegredo":"jim-segredo.webp","joekonen":"joe-konen.webp","johnmiles":"john-miles.webp","joshmckinney":"josh-mckinney.webp","joshuaspragg":"joshua-spragg.webp","juanescamilla":"juan-escamilla.webp","justincrowe":"justin-crowe.webp","justincrowetransparent":"justin-crowe-transparent.webp","keatoncox":"keaton-cox.webp","kennyreel":"kenny-reel.webp","kenwoodramsey":"kenwood-ramsey.webp","kodyneagles":"kody-neagles.webp","kylekammeron":"kyle-kammeron.webp","larkinboyer":"larkin-boyer.webp","matthewbrown":"matthew-brown.webp","matthewgraham":"matthew-graham.webp","nicholasbaumann":"nicholas-baumann.webp","nicholasmoody":"nicholas-moody.webp","randyschweitzer":"randy-schweitzer.webp","randyshowers":"randy-showers.webp","rickymiles":"ricky-miles.webp","rosscampoli":"ross-campoli.webp","ryanwilson":"ryan-wilson.webp","scottwise":"scott-wise.webp","sebastianmichaels":"sebastian-michaels.webp","shanehatfield":"shane-hatfield.webp","shawnstamper":"shawn-stamper.webp","timothytyler":"timothy-tyler.webp","tjlunn":"tj-lunn.webp","tommyrogers":"tommy-rogers.webp","trevoraswarnauth":"trevor-aswarnauth.webp","trevorhaley":"trevor-haley.webp","vincenteguerrero":"vincente-guerrero.webp","zackharry":"zack-harry.webp"};
const ALIAS={"sebastianmicheals":"sebastianmichaels","ericpedleyhayden":"erichayden","randyschweitzerrsi":"randyschweitzer","dyalnjones":"dylanjones","nicholasbaumann2":"nicholasbaumann","dylancjones":"dylanjones","ethanfonsecamoreno":"ethanmoreno","joshuamckinney":"joshmckinney","joshuamckinney2":"joshmckinney","jeremysjeffries":"jeremyjeffries","vicenteguerrero2":"vincenteguerrero","brianhebbard2":"brianhebbard","brianhayes4":"brianhayes","ryanwilson21":"ryanwilson","timothytyler3":"timothytyler","matthewbrown49":"matthewbrown","matthewgraham20":"matthewgraham"};

function normalizeName(name){
  let n=String(name||"").trim();

  // HLRN standings often display "LAST, FIRST".
  if(n.includes(",")){
    const parts=n.split(",");
    if(parts.length>=2){
      let last=parts[0].trim().replace(/\d+$/,"");
      let first=parts.slice(1).join(" ").trim();
      n=(first+" "+last).trim();
    }
  } else {
    n=n.replace(/\d+$/,"").trim();
  }

  return n;
}

function keyFor(name){
  const normalized=normalizeName(name);
  let k=normalized.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]/g,"");

  if(ALIAS[k]) k=ALIAS[k];

  if(!MAP[k]){
    const stripped=k.replace(/\d+/g,"");
    if(ALIAS[stripped]) k=ALIAS[stripped];
    else if(MAP[stripped]) k=stripped;
  }

  return k;
}

function safeText(value){
  return String(value==null?"":value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

window.hLrnNameWithPhoto=function(name){
  const display=String(name||"").trim();
  const file=MAP[keyFor(display)];

  if(!file) return safeText(display);

  const url=BASE+file;

  return '<span style="display:inline-flex;align-items:center;gap:10px;min-height:62px;vertical-align:middle">'
    +'<img src="'+url+'" alt="" loading="lazy" decoding="async" onerror="this.remove()" '
    +'style="display:block;width:54px;height:62px;flex:0 0 54px;object-fit:contain;object-position:center bottom;'
    +'margin:-8px 0 -7px;background:transparent;border:0;outline:0;box-shadow:none">'
    +'<span>'+safeText(display)+'</span>'
    +'</span>';
};

})();
