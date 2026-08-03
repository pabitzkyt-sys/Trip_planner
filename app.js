const $=s=>document.querySelector(s);
const state=JSON.parse(localStorage.getItem('simpleTrip')||'null')||{title:'My Branson Trip',city:'Branson, Missouri',start:'Grand Country Resort, Branson, Missouri',stops:[]};
let currentDetailId=null;
function save(){localStorage.setItem('simpleTrip',JSON.stringify(state));render();}
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
 $('#tripTitle').textContent=state.title; $('#cityInput').value=state.city; $('#startInput').value=state.start; $('#titleInput').value=state.title;
 $('#stopCount').textContent=state.stops.length; $('#optimizeBtn').disabled=state.stops.length<2; $('#openRouteBtn').disabled=state.stops.length<1;
 const box=$('#stops');
 if(!state.stops.length){box.className='stops empty';box.textContent='No stops yet.';return;}
 box.className='stops'; box.innerHTML=state.stops.map((p,i)=>`<article class="stop"><div class="number">${i+1}</div><div><h3>${esc(p.name)}</h3><div class="meta">${esc(p.address||'')}</div>${p.phone?`<div class="meta">📞 ${esc(p.phone)}</div>`:''}${p.price?`<div class="price">🎟️ ${esc(p.price)}</div>`:''}<div class="stop-actions"><button class="mini" onclick="editDetails('${p.id}')">Details</button><a class="mini" target="_blank" href="${mapSearch(p)}">Map</a><button class="mini remove" onclick="removeStop('${p.id}')">Remove</button></div></div></article>`).join('');
}
function mapSearch(p){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+' '+p.address)}`}
async function searchPlaces(){
 const q=$('#placeInput').value.trim(); if(!q)return;
 $('#results').innerHTML='<p class="small">Searching…</p>';
 try{
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(q+' near '+state.city)}`;
  const r=await fetch(url,{headers:{'Accept-Language':'en-US'}}); const data=await r.json();
  $('#results').innerHTML=data.length?data.map((p,i)=>`<article class="result"><h3>${esc(p.name||p.display_name.split(',')[0])}</h3><div class="meta">${esc(p.display_name)}</div><div class="result-actions"><button class="mini add" data-i="${i}">Add</button><a class="mini" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.display_name)}">Map</a></div></article>`).join(''):'<p class="small">No matches. Try a simpler search.</p>';
  [...document.querySelectorAll('[data-i]')].forEach(b=>b.onclick=()=>{const p=data[+b.dataset.i];addStop({id:crypto.randomUUID(),name:p.name||p.display_name.split(',')[0],address:p.display_name,lat:+p.lat,lon:+p.lon,phone:'',website:'',price:''});});
 }catch(e){$('#results').innerHTML='<p class="small">Search could not connect. Check your internet and try again.</p>'}
}
function addStop(p){if(state.stops.some(x=>Math.abs(x.lat-p.lat)<.00001&&Math.abs(x.lon-p.lon)<.00001))return;state.stops.push(p);save();$('#results').innerHTML='';$('#placeInput').value='';}
window.removeStop=id=>{state.stops=state.stops.filter(x=>x.id!==id);save();}
window.editDetails=id=>{const p=state.stops.find(x=>x.id===id);currentDetailId=id;$('#detailName').textContent=p.name;$('#detailAddress').textContent=p.address;$('#detailPhone').value=p.phone||'';$('#detailWebsite').value=p.website||'';$('#detailPrice').value=p.price||'';$('#detailsDialog').showModal();}
async function optimize(){
 const start=await geocode(state.start); if(!start){alert('I could not find the starting location. Check it in Settings.');return;}
 $('#optimizeBtn').textContent='Finding best order…'; $('#optimizeBtn').disabled=true;
 try{
  const coords=[start,...state.stops].map(p=>`${p.lon},${p.lat}`).join(';');
  const r=await fetch(`https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&overview=false&steps=false`); const data=await r.json();
  if(data.code!=='Ok')throw Error();
  const order=data.waypoints.slice(1).sort((a,b)=>a.waypoint_index-b.waypoint_index).map(w=>state.stops[w.original_index-1]);
  state.stops=order; save();
 }catch(e){alert('Route optimization was unavailable. Your list was not changed.');}
 $('#optimizeBtn').textContent='✨ Optimize My Route'; $('#optimizeBtn').disabled=state.stops.length<2;
}
async function geocode(q){try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`);const d=await r.json();return d[0]?{lat:+d[0].lat,lon:+d[0].lon}:null}catch{return null}}
function openRoute(){const waypoints=state.stops.map(p=>p.name+' '+p.address);const url=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(state.start)}&destination=${encodeURIComponent(waypoints.at(-1))}&waypoints=${encodeURIComponent(waypoints.slice(0,-1).join('|'))}&travelmode=driving`;window.open(url,'_blank');}
$('#searchBtn').onclick=searchPlaces;$('#placeInput').addEventListener('keydown',e=>{if(e.key==='Enter')searchPlaces()});
$('#setCityBtn').onclick=()=>{state.city=$('#cityInput').value.trim()||state.city;save();$('#cityStatus').textContent='Now searching around '+state.city+'.';}
$('#optimizeBtn').onclick=optimize;$('#openRouteBtn').onclick=openRoute;
$('#settingsBtn').onclick=()=>$('#settingsDialog').showModal();
$('#saveSettingsBtn').onclick=()=>{state.title=$('#titleInput').value.trim()||'My Trip';state.start=$('#startInput').value.trim();save();};
$('#clearBtn').onclick=()=>{if(confirm('Clear every stop?')){state.stops=[];save();$('#settingsDialog').close();}};
$('#saveDetailsBtn').onclick=()=>{const p=state.stops.find(x=>x.id===currentDetailId);p.phone=$('#detailPhone').value.trim();p.website=$('#detailWebsite').value.trim();p.price=$('#detailPrice').value.trim();save();};
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
