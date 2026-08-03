const $=s=>document.querySelector(s);
const days=['Wednesday','Thursday','Friday','Saturday','Sunday','Extra'];
const plannedStops=[
 {name:"Buc-ee's Springfield",address:'3284 N Mulroy Rd, Springfield, MO 65803',day:'Wednesday',phone:'',website:'https://buc-ees.com/',price:'Free entry'},
 {name:'Grand Country Resort',address:'1945 W 76 Country Blvd, Branson, MO 65616',day:'Wednesday',phone:'1-888-514-1088',website:'https://www.grandcountry.com/',price:'Waterpark admission included for resort guests'},
 {name:"Mel's Hard Luck Diner",address:'2800 W 76 Country Blvd, Branson, MO 65616',day:'Wednesday',phone:'',website:'https://www.melshardluckdiner.com/',price:'Menu pricing'},
 {name:'Silver Dollar City',address:'399 Silver Dollar City Pkwy, Branson, MO 65616',day:'Thursday',phone:'417-336-7100',website:'https://www.silverdollarcity.com/tickets',price:'Check official ticket page for current 2026 pricing'},
 {name:"Ripley's Believe It or Not!",address:'3326 W 76 Country Blvd, Branson, MO 65616',day:'Friday',phone:'417-337-5300',website:'https://www.ripleys.com/attractions/ripleys-believe-it-or-not-branson',price:'2026 tickets listed around $14.99–$25.99; verify before purchase'},
 {name:"McFarlain's Family Restaurant",address:'3562 Shepherd of the Hills Expy, Branson, MO 65616',day:'Friday',phone:'',website:'https://www.bransonimax.com/mcfarlains-family-restaurant/',price:'Menu pricing'},
 {name:'Branson Landing',address:'100 Branson Landing Blvd, Branson, MO 65616',day:'Friday',phone:'',website:'https://www.bransonlanding.com/',price:'Free entry; shopping and dining vary'},
 {name:'Reza Live Theatre',address:'645 State Hwy 165, Branson, MO 65616',day:'Friday',phone:'',website:'https://rezalive.com/',price:'Check official show calendar for current ticket pricing'},
 {name:'Top of the Rock',address:'150 Top of the Rock Rd, Ridgedale, MO 65739',day:'Saturday',phone:'',website:'https://bigcedar.com/top-of-the-rock/',price:'Check official site for current admission and Lost Canyon pricing'},
 {name:'Lost Canyon Cave & Nature Trail',address:'150 Top of the Rock Rd, Ridgedale, MO 65739',day:'Saturday',phone:'',website:'https://bigcedar.com/activity/lost-canyon-cave-nature-trail/',price:'Check official ticket page'},
 {name:'Copperhead Mountain Coaster',address:'6021 W 76 Country Blvd, Branson, MO 65616',day:'Saturday',phone:'417-334-4191',website:'https://theshepherdofthehills.com/copperhead-mountain-coaster/',price:'Check official site for current rider pricing'},
 {name:'Shepherd of the Hills',address:'5586 W 76 Country Blvd, Branson, MO 65616',day:'Saturday',phone:'417-334-4191',website:'https://theshepherdofthehills.com/',price:'Optional; prices vary by attraction'},
 {name:"Buc-ee's Springfield",address:'3284 N Mulroy Rd, Springfield, MO 65803',day:'Sunday',phone:'',website:'https://buc-ees.com/',price:'Free entry'}
];
const makeId=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();
const seedStops=()=>plannedStops.map((p,i)=>({...p,id:makeId(),lat:null,lon:null,order:i}));
let state=JSON.parse(localStorage.getItem('simpleTrip')||'null')||{title:'My Branson Trip',city:'Branson, Missouri',start:'Grand Country Resort, Branson, Missouri',stops:seedStops(),version:2};
if(!state.version||state.version<2){if(!state.stops||state.stops.length===0)state.stops=seedStops();state.version=2;localStorage.setItem('simpleTrip',JSON.stringify(state));}
let currentDetailId=null;
function save(){localStorage.setItem('simpleTrip',JSON.stringify(state));render();}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function tel(phone){return phone?`<a class="mini" href="tel:${phone.replace(/\D/g,'')}">Call</a>`:''}
function website(url){return url?`<a class="mini" target="_blank" rel="noopener" href="${esc(url)}">Tickets / Info</a>`:''}
function render(){
 $('#tripTitle').textContent=state.title; $('#cityInput').value=state.city; $('#startInput').value=state.start; $('#titleInput').value=state.title;
 $('#stopCount').textContent=state.stops.length; $('#optimizeBtn').disabled=state.stops.length<2; $('#openRouteBtn').disabled=state.stops.length<1;
 const box=$('#stops');
 if(!state.stops.length){box.className='stops empty';box.textContent='No stops yet.';return;}
 box.className='stops';
 let html='';
 days.forEach(day=>{
  const items=state.stops.filter(x=>(x.day||'Extra')===day);
  if(!items.length)return;
  html+=`<div class="day-label">${day}</div>`;
  html+=items.map((p,i)=>`<article class="stop"><div class="number">${i+1}</div><div><h3>${esc(p.name)}</h3><div class="meta">${esc(p.address||'')}</div>${p.phone?`<div class="meta">📞 ${esc(p.phone)}</div>`:''}${p.price?`<div class="price">🎟️ ${esc(p.price)}</div>`:''}<div class="stop-actions"><button class="mini" onclick="editDetails('${p.id}')">Details</button><a class="mini" target="_blank" href="${mapSearch(p)}">Map</a>${tel(p.phone)}${website(p.website)}<button class="mini remove" onclick="removeStop('${p.id}')">Remove</button></div></div></article>`).join('');
 });
 box.innerHTML=html;
}
function mapSearch(p){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+' '+p.address)}`}
async function searchPlaces(){
 const q=$('#placeInput').value.trim(); if(!q)return;
 $('#results').innerHTML='<p class="small">Searching…</p>';
 try{
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(q+' near '+state.city)}`;
  const r=await fetch(url,{headers:{'Accept-Language':'en-US'}}); const data=await r.json();
  $('#results').innerHTML=data.length?data.map((p,i)=>`<article class="result"><h3>${esc(p.name||p.display_name.split(',')[0])}</h3><div class="meta">${esc(p.display_name)}</div><div class="result-actions"><button class="mini add" data-i="${i}">Add</button><a class="mini" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.display_name)}">Map</a></div></article>`).join(''):'<p class="small">No matches. Try a simpler search.</p>';
  [...document.querySelectorAll('[data-i]')].forEach(b=>b.onclick=()=>{const p=data[+b.dataset.i];addStop({id:makeId(),name:p.name||p.display_name.split(',')[0],address:p.display_name,lat:+p.lat,lon:+p.lon,phone:'',website:'',price:'',day:'Extra'});});
 }catch(e){$('#results').innerHTML='<p class="small">Search could not connect. Check your internet and try again.</p>'}
}
function addStop(p){state.stops.push(p);save();$('#results').innerHTML='';$('#placeInput').value='';}
window.removeStop=id=>{state.stops=state.stops.filter(x=>x.id!==id);save();}
window.editDetails=id=>{const p=state.stops.find(x=>x.id===id);currentDetailId=id;$('#detailName').textContent=p.name;$('#detailAddress').textContent=p.address;$('#detailDay').value=p.day||'Extra';$('#detailPhone').value=p.phone||'';$('#detailWebsite').value=p.website||'';$('#detailPrice').value=p.price||'';$('#detailsDialog').showModal();}
async function ensureCoords(p){if(Number.isFinite(p.lat)&&Number.isFinite(p.lon))return p;const g=await geocode(p.name+' '+p.address);if(g){p.lat=g.lat;p.lon=g.lon;}return p;}
async function optimize(){
 const day=prompt('Which day should I optimize? Type Wednesday, Thursday, Friday, Saturday, Sunday, or Extra.','Friday');
 if(!day)return; const chosen=state.stops.filter(x=>(x.day||'Extra').toLowerCase()===day.trim().toLowerCase());
 if(chosen.length<2){alert('That day needs at least two stops.');return;}
 const start=await geocode(state.start); if(!start){alert('I could not find the starting location. Check it in Settings.');return;}
 $('#optimizeBtn').textContent='Finding best order…'; $('#optimizeBtn').disabled=true;
 try{
  for(const p of chosen)await ensureCoords(p);
  if(chosen.some(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lon)))throw Error('geocode');
  const coords=[start,...chosen].map(p=>`${p.lon},${p.lat}`).join(';');
  const r=await fetch(`https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&overview=false&steps=false`); const data=await r.json();
  if(data.code!=='Ok')throw Error();
  const order=data.waypoints.slice(1).sort((a,b)=>a.waypoint_index-b.waypoint_index).map(w=>chosen[w.original_index-1]);
  const others=state.stops.filter(x=>!chosen.includes(x));
  const insertAt=state.stops.findIndex(x=>chosen.includes(x)); state.stops=[...others.slice(0,insertAt),...order,...others.slice(insertAt)]; save();
 }catch(e){alert('Route optimization was unavailable. Your list was not changed.');}
 $('#optimizeBtn').textContent='✨ Put Stops in Best Driving Order'; $('#optimizeBtn').disabled=state.stops.length<2;
}
async function geocode(q){try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`);const d=await r.json();return d[0]?{lat:+d[0].lat,lon:+d[0].lon}:null}catch{return null}}
function openRoute(){const day=prompt('Which day should open in Google Maps?','Friday');if(!day)return;const list=state.stops.filter(x=>(x.day||'Extra').toLowerCase()===day.trim().toLowerCase());if(!list.length){alert('No stops found for that day.');return;}const wp=list.map(p=>p.name+' '+p.address);const url=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(state.start)}&destination=${encodeURIComponent(wp.at(-1))}&waypoints=${encodeURIComponent(wp.slice(0,-1).join('|'))}&travelmode=driving`;window.open(url,'_blank');}
function loadReservation(){const r=JSON.parse(localStorage.getItem('tripReservation')||'{}');['hotelName','guestName','itineraryNumber','roomConfirmation','checkIn','checkOut'].forEach(id=>{if(r[id])$('#'+id).value=r[id];});}
function saveReservation(){const r={};['hotelName','guestName','itineraryNumber','roomConfirmation','checkIn','checkOut'].forEach(id=>r[id]=$('#'+id).value.trim());localStorage.setItem('tripReservation',JSON.stringify(r));alert('Reservation saved privately on this device.');}
$('#searchBtn').onclick=searchPlaces;$('#placeInput').addEventListener('keydown',e=>{if(e.key==='Enter')searchPlaces()});
$('#setCityBtn').onclick=()=>{state.city=$('#cityInput').value.trim()||state.city;save();$('#cityStatus').textContent='Now searching around '+state.city+'.';}
$('#optimizeBtn').onclick=optimize;$('#openRouteBtn').onclick=openRoute;$('#saveReservationBtn').onclick=saveReservation;
$('#settingsBtn').onclick=()=>$('#settingsDialog').showModal();
$('#saveSettingsBtn').onclick=()=>{state.title=$('#titleInput').value.trim()||'My Trip';state.start=$('#startInput').value.trim();save();};
$('#resetPlanBtn').onclick=()=>{if(confirm('Reload the full Branson itinerary?')){state.stops=seedStops();save();$('#settingsDialog').close();}};
$('#clearBtn').onclick=()=>{if(confirm('Clear every stop?')){state.stops=[];save();$('#settingsDialog').close();}};
$('#saveDetailsBtn').onclick=()=>{const p=state.stops.find(x=>x.id===currentDetailId);p.day=$('#detailDay').value;p.phone=$('#detailPhone').value.trim();p.website=$('#detailWebsite').value.trim();p.price=$('#detailPrice').value.trim();save();};
render();loadReservation();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');