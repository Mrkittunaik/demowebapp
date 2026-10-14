/* free map tiles: CARTO Voyager (OpenStreetMap data), no API key */
const tiles=()=>L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}'+(window.LITE?'':'{r}')+'.png',{subdomains:'abcd',maxZoom:19,keepBuffer:1,updateWhenIdle:true,updateWhenZooming:false,attribution:'© OpenStreetMap · © CARTO'});

/* ---------- storage helpers ---------- */
const kv=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const kvs=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- addresses ---------- */
let addrs=kv('addrs',[]), selId=kv('selAddr',null);
const saveAddrs=()=>{kvs('addrs',addrs);kvs('selAddr',selId)};
const curAddr=()=>addrs.find(a=>a.id==selId)||addrs[0]||null;
const addrLine=a=>[a.house,a.landmark&&('Near '+a.landmark),a.full].filter(Boolean).join(', ');
const addrShort=a=>a?`${a.label} - ${a.area}${a.city&&a.city!==a.area?', '+a.city:''}`:'Set delivery location';
const DEF_LOC={lat:17.385,lng:78.4867};

/* ---------- geocoding (OpenStreetMap Nominatim) ---------- */
async function reverseGeo(lat,lng,signal){
  const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=en&lat=${lat}&lon=${lng}`,{signal});
  if(!r.ok)throw new Error('geo');
  const j=await r.json(),a=j.address||{};
  const area=a.suburb||a.neighbourhood||a.quarter||a.residential||a.city_district||a.village||a.hamlet||a.road||'Pinned location';
  const city=a.city||a.town||a.municipality||a.county||a.state_district||'';
  const parts=[a.amenity||a.building||a.shop,a.road,a.neighbourhood,a.suburb,city,a.state,a.postcode].filter((x,i,arr)=>x&&arr.indexOf(x)==i);
  return {area,city,pincode:a.postcode||'',full:parts.join(', ')||j.display_name||''};
}
async function searchPlaces(q,signal){
  const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&accept-language=en&q=${encodeURIComponent(q)}`,{signal});
  return r.ok?r.json():[];
}

/* ---------- location picker page ---------- */
let LOCMAP=null;
function locView(arg){
  const e=arg&&arg!='new'?addrs.find(a=>a.id==arg):null;
  const lab=e?e.label:'Home';
  return `<div class="loc">
   <div class="loc-top"><button class="ib" data-back aria-label="Back">${ic('back',20)}</button>
     <div class="s-in" style="flex:1">${ic('search',18)}<input id="ls" placeholder="Search area, street, landmark" autocomplete="off"></div></div>
   <div id="lres" class="lres"></div>
   <div class="mapwrap"><div id="map"></div>
     <div id="pin" class="pinx"><svg width="38" height="46" viewBox="0 0 38 46"><path d="M19 45C19 45 4 28 4 17a15 15 0 0130 0c0 11-15 28-15 28z" fill="#1faa4b" stroke="#fff" stroke-width="2.5"/><circle cx="19" cy="17" r="5.500" fill="#fff"/></svg></div>
     <div class="pin-dot"></div>
     <div class="pin-tip" id="ptip">Move the map to place the pin exactly</div>
     <button class="gps" id="gps">${ic('locate',16)} Use current location</button></div>
   <div class="loc-card">
     <div class="lc-h">${ic('pin',22)}<div style="min-width:0"><b id="larea">Locating…</b><div id="lfull" class="pq">Fetching address…</div></div></div>
     <input id="lhouse" class="fld" placeholder="Flat / House no. / Floor / Building *" value="${esc(e?.house)}">
     <input id="llm" class="fld" placeholder="Landmark (optional)" value="${esc(e?.landmark)}">
     <div class="lbls">${['Home','Work','Other'].map(l=>`<button class="chip lbl ${l==lab?'on':''}" data-lbl="${l}">${ic(l=='Work'?'briefcase':l=='Home'?'home':'pin',14)} ${l}</button>`).join('')}</div>
     <button class="btn" id="lok" style="width:100%">Confirm &amp; save address</button></div></div>`;
}
function locInit(arg){
  const box=$('#map');if(!box)return;
  if(!window.L){box.innerHTML='<div class="none">Map could not load. Check your internet connection and reload.</div>';return}
  const e=arg&&arg!='new'?addrs.find(a=>a.id==arg):null;
  const ca=curAddr();
  const start=e?{lat:e.lat,lng:e.lng}:(ca?{lat:ca.lat,lng:ca.lng}:DEF_LOC);
  const map=LOCMAP=L.map('map',{zoomControl:false,zoomAnimation:!window.LITE,fadeAnimation:!window.LITE,markerZoomAnimation:!window.LITE}).setView([start.lat,start.lng],e||ca?17:13);
  L.control.zoom({position:'bottomright'}).addTo(map);
  tiles().addTo(map);
  let cur={lat:start.lat,lng:start.lng,area:e?.area||'',city:e?.city||'',pincode:e?.pincode||'',full:e?.full||''},seq=0,ctl=null,tmr=null,accC=null,label=e?e.label:'Home';
  const pin=$('#pin'),show=()=>{$('#larea').textContent=cur.area||'Locating…';$('#lfull').textContent=cur.full||'Fetching address…'};
  if(e)show();
  const lookup=()=>{
    const c=map.getCenter();cur.lat=+c.lat.toFixed(6);cur.lng=+c.lng.toFixed(6);
    $('#larea').textContent='Locating…';$('#lfull').textContent='Fetching address…';
    clearTimeout(tmr);tmr=setTimeout(async()=>{
      const my=++seq;ctl&&ctl.abort();ctl=new AbortController();
      try{const g=await reverseGeo(cur.lat,cur.lng,ctl.signal);if(my!=seq)return;Object.assign(cur,g)}
      catch(err){if(err.name=='AbortError'||my!=seq)return;Object.assign(cur,{area:'Pinned location',city:'',pincode:'',full:`${cur.lat.toFixed(5)}, ${cur.lng.toFixed(5)}`})}
      show();
    },450);
  };
  map.on('movestart',()=>{pin.classList.add('lift');$('#ptip').style.opacity=0});
  map.on('moveend',()=>{pin.classList.remove('lift');lookup()});
  map.on('click',ev=>map.panTo(ev.latlng));            // tap anywhere = move pin there
  if(!e)lookup();
  const gps=()=>{
    if(!navigator.geolocation)return toast('Location not supported');
    toast('Finding your location…');
    navigator.geolocation.getCurrentPosition(p=>{
      const ll=[p.coords.latitude,p.coords.longitude];
      accC&&map.removeLayer(accC);accC=L.circle(ll,{radius:p.coords.accuracy,color:'#1faa4b',weight:1,fillOpacity:.1}).addTo(map);
      map.setView(ll,18);
    },er=>toast(er.code==1?'Allow location permission to use GPS':'Could not get your location'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };
  $('#gps').onclick=gps;
  if(arg=='new'&&!ca)gps();                              // first time: auto-detect
  /* search */
  const ls=$('#ls'),lres=$('#lres');let st=null,sc=null,hits=[];
  ls.oninput=()=>{clearTimeout(st);const v=ls.value.trim();if(v.length<3){lres.innerHTML='';return}
    st=setTimeout(async()=>{sc&&sc.abort();sc=new AbortController();
      try{hits=await searchPlaces(v,sc.signal);lres.innerHTML=hits.length?hits.map((h,i)=>`<button class="lr" data-i="${i}">${ic('pin',16)}<span><b>${esc(h.name||h.display_name.split(',')[0])}</b><small>${esc(h.display_name)}</small></span></button>`).join(''):'<div class="none" style="padding:16px">No places found</div>'}catch(er){}},400)};
  lres.onclick=ev=>{const b=ev.target.closest('.lr');if(!b)return;const h=hits[+b.dataset.i];lres.innerHTML='';ls.value='';ls.blur();map.setView([+h.lat,+h.lon],18)};
  document.querySelectorAll('.lbl').forEach(b=>b.onclick=()=>{label=b.dataset.lbl;document.querySelectorAll('.lbl').forEach(x=>x.classList.toggle('on',x==b))});
  $('#lok').onclick=()=>{
    const house=$('#lhouse').value.trim();
    if(!house){toast('Enter flat / house no.');$('#lhouse').focus();return}
    const rec={id:e?e.id:Date.now(),label,house,landmark:$('#llm').value.trim(),lat:cur.lat,lng:cur.lng,area:cur.area||'Pinned location',city:cur.city,pincode:cur.pincode,full:cur.full};
    addrs=e?addrs.map(a=>a.id==e.id?rec:a):[...addrs,rec];selId=rec.id;saveAddrs();toast('Address saved');
    history.length>1?history.back():location.hash='#/';
  };
}
function locCleanup(){if(LOCMAP){LOCMAP.remove();LOCMAP=null}}
