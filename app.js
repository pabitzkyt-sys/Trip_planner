const $ = (selector) => document.querySelector(selector);
const days = ['Wednesday','Thursday','Friday','Saturday','Sunday','Extra'];

const plannedStops = [
  {name:"Buc-ee's Springfield",address:'3284 N Mulroy Rd, Springfield, MO 65803',day:'Wednesday',phone:'',website:'https://buc-ees.com/',price:'Free entry'},
  {name:'Grand Country Resort',address:'1945 W 76 Country Blvd, Branson, MO 65616',day:'Wednesday',phone:'1-888-514-1088',website:'https://www.grandcountry.com/',price:'Waterpark admission included for resort guests'},
  {name:"Mel's Hard Luck Diner",address:'2800 W 76 Country Blvd, Branson, MO 65616',day:'Wednesday',phone:'',website:'https://www.melshardluckdiner.com/',price:'Menu pricing'},
  {name:'Silver Dollar City',address:'399 Silver Dollar City Pkwy, Branson, MO 65616',day:'Thursday',phone:'417-336-7100',website:'https://www.silverdollarcity.com/tickets',price:'Check official ticket page for current pricing'},
  {name:"Ripley's Believe It or Not!",address:'3326 W 76 Country Blvd, Branson, MO 65616',day:'Friday',phone:'417-337-5300',website:'https://www.ripleys.com/attractions/ripleys-believe-it-or-not-branson',price:'Check official ticket page'},
  {name:"McFarlain's Family Restaurant",address:'3562 Shepherd of the Hills Expy, Branson, MO 65616',day:'Friday',phone:'',website:'https://www.bransonimax.com/mcfarlains-family-restaurant/',price:'Menu pricing'},
  {name:'Branson Landing',address:'100 Branson Landing Blvd, Branson, MO 65616',day:'Friday',phone:'',website:'https://www.bransonlanding.com/',price:'Free entry; shopping and dining vary'},
  {name:'Reza Live Theatre',address:'645 State Hwy 165, Branson, MO 65616',day:'Friday',phone:'',website:'https://rezalive.com/',price:'Check official ticket page'},
  {name:'Top of the Rock',address:'150 Top of the Rock Rd, Ridgedale, MO 65739',day:'Saturday',phone:'',website:'https://bigcedar.com/top-of-the-rock/',price:'Check official ticket page'},
  {name:'Lost Canyon Cave & Nature Trail',address:'150 Top of the Rock Rd, Ridgedale, MO 65739',day:'Saturday',phone:'',website:'https://bigcedar.com/activity/lost-canyon-cave-nature-trail/',price:'Check official ticket page'},
  {name:'Copperhead Mountain Coaster',address:'6021 W 76 Country Blvd, Branson, MO 65616',day:'Saturday',phone:'417-334-4191',website:'https://theshepherdofthehills.com/copperhead-mountain-coaster/',price:'Check official ticket page'},
  {name:'Shepherd of the Hills',address:'5586 W 76 Country Blvd, Branson, MO 65616',day:'Saturday',phone:'417-334-4191',website:'https://theshepherdofthehills.com/',price:'Optional; prices vary'},
  {name:"Buc-ee's Springfield",address:'3284 N Mulroy Rd, Springfield, MO 65803',day:'Sunday',phone:'',website:'https://buc-ees.com/',price:'Free entry'}
];

const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const seedStops = () => plannedStops.map((stop,index)=>({...stop,id:makeId(),lat:null,lon:null,order:index}));

let state;
try {
  state = JSON.parse(localStorage.getItem('simpleTrip') || 'null');
} catch {
  state = null;
}
if (!state) state = {title:'My Branson Trip',city:'Branson, Missouri',start:'Grand Country Resort, Branson, Missouri',stops:seedStops(),version:3};
if (!Array.isArray(state.stops) || !state.stops.length) state.stops = seedStops();
state.version = 3;
localStorage.setItem('simpleTrip',JSON.stringify(state));
let currentDetailId = null;

function save(){
  localStorage.setItem('simpleTrip',JSON.stringify(state));
  render();
}
function esc(value=''){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function mapSearch(place){
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.address || ''}`)}`;
}
function phoneButton(phone){
  return phone ? `<a class="mini" href="tel:${phone.replace(/\D/g,'')}">Call</a>` : '';
}
function webButton(url){
  return url ? `<a class="mini" target="_blank" rel="noopener" href="${esc(url)}">Tickets / Info</a>` : '';
}

function render(){
  $('#tripTitle').textContent = state.title;
  $('#cityInput').value = state.city;
  $('#startInput').value = state.start;
  $('#titleInput').value = state.title;
  $('#stopCount').textContent = state.stops.length;
  $('#optimizeBtn').disabled = state.stops.length < 2;
  $('#openRouteBtn').disabled = state.stops.length < 1;

  const box = $('#stops');
  if (!state.stops.length){
    box.className = 'stops empty';
    box.textContent = 'No stops yet.';
    return;
  }

  box.className = 'stops';
  let html = '';
  for (const day of days){
    const items = state.stops.filter(item => (item.day || 'Extra') === day);
    if (!items.length) continue;
    html += `<div class="day-label">${day}</div>`;
    html += items.map((place,index)=>`<article class="stop">
      <div class="number">${index+1}</div>
      <div>
        <h3>${esc(place.name)}</h3>
        <div class="meta">${esc(place.address || '')}</div>
        ${place.phone ? `<div class="meta">📞 ${esc(place.phone)}</div>` : ''}
        ${place.price ? `<div class="price">🎟️ ${esc(place.price)}</div>` : ''}
        <div class="stop-actions">
          <button class="mini" onclick="editDetails('${place.id}')">Details</button>
          <a class="mini" target="_blank" href="${mapSearch(place)}">Map</a>
          ${phoneButton(place.phone)}${webButton(place.website)}
          <button class="mini remove" onclick="removeStop('${place.id}')">Remove</button>
        </div>
      </div>
    </article>`).join('');
  }
  box.innerHTML = html;
}

function photonAddress(properties){
  return [properties.housenumber,properties.street,properties.city || properties.locality,properties.state,properties.postcode,properties.country]
    .filter(Boolean).join(', ');
}

async function searchPhoton(query){
  const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(`${query}, ${state.city}`)}&limit=10&lang=en`);
  if (!response.ok) throw new Error('Photon search failed');
  const json = await response.json();
  return (json.features || []).map(feature=>{
    const p = feature.properties || {};
    const coordinates = feature.geometry?.coordinates || [];
    return {
      name:p.name || p.street || query,
      address:photonAddress(p),
      lat:Number(coordinates[1]),
      lon:Number(coordinates[0])
    };
  }).filter(place=>Number.isFinite(place.lat) && Number.isFinite(place.lon));
}

async function searchNominatim(query){
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&q=${encodeURIComponent(`${query}, ${state.city}`)}`,{
    headers:{'Accept-Language':'en-US,en;q=0.9'}
  });
  if (!response.ok) throw new Error('Nominatim search failed');
  const json = await response.json();
  return json.map(item=>({
    name:item.name || item.display_name.split(',')[0],
    address:item.display_name,
    lat:Number(item.lat),
    lon:Number(item.lon)
  }));
}

function displayResults(results){
  const resultBox = $('#results');
  if (!results.length){
    resultBox.innerHTML = '<p class="small">No matches. Try a shorter search, such as “pizza” or “museum”.</p>';
    return;
  }
  resultBox.innerHTML = results.map((place,index)=>`<article class="result">
    <h3>${esc(place.name)}</h3>
    <div class="meta">${esc(place.address)}</div>
    <div class="result-actions">
      <button class="mini add" data-result-index="${index}">Add</button>
      <a class="mini" target="_blank" href="${mapSearch(place)}">Map</a>
    </div>
  </article>`).join('');

  document.querySelectorAll('[data-result-index]').forEach(button=>{
    button.onclick = ()=>{
      const place = results[Number(button.dataset.resultIndex)];
      addStop({...place,id:makeId(),phone:'',website:'',price:'',day:'Extra'});
    };
  });
}

async function searchPlaces(){
  const query = $('#placeInput').value.trim();
  if (!query){
    $('#placeInput').focus();
    return;
  }
  $('#results').innerHTML = '<p class="small">Searching…</p>';
  $('#searchBtn').disabled = true;
  $('#searchBtn').textContent = 'Searching';
  try {
    let results = [];
    try {
      results = await searchPhoton(query);
    } catch {
      results = await searchNominatim(query);
    }
    displayResults(results);
  } catch (error){
    $('#results').innerHTML = `<p class="small">Search could not connect. <a target="_blank" href="https://www.google.com/maps/search/${encodeURIComponent(`${query} near ${state.city}`)}">Search in Google Maps instead</a>.</p>`;
  } finally {
    $('#searchBtn').disabled = false;
    $('#searchBtn').textContent = 'Search';
  }
}

function addStop(place){
  state.stops.push(place);
  save();
  $('#results').innerHTML = '';
  $('#placeInput').value = '';
}
window.removeStop = id => {
  state.stops = state.stops.filter(place=>place.id !== id);
  save();
};
window.editDetails = id => {
  const place = state.stops.find(item=>item.id === id);
  if (!place) return;
  currentDetailId = id;
  $('#detailName').textContent = place.name;
  $('#detailAddress').textContent = place.address;
  $('#detailDay').value = place.day || 'Extra';
  $('#detailPhone').value = place.phone || '';
  $('#detailWebsite').value = place.website || '';
  $('#detailPrice').value = place.price || '';
  $('#detailsDialog').showModal();
};

async function geocode(query){
  try {
    const results = await searchPhoton(query);
    return results[0] || null;
  } catch {
    try {
      const results = await searchNominatim(query);
      return results[0] || null;
    } catch {
      return null;
    }
  }
}
async function ensureCoords(place){
  if (Number.isFinite(place.lat) && Number.isFinite(place.lon)) return place;
  const found = await geocode(`${place.name}, ${place.address}`);
  if (found){ place.lat = found.lat; place.lon = found.lon; }
  return place;
}

async function optimize(){
  const day = prompt('Which day should I optimize?','Friday');
  if (!day) return;
  const chosen = state.stops.filter(item=>(item.day || 'Extra').toLowerCase() === day.trim().toLowerCase());
  if (chosen.length < 2){ alert('That day needs at least two stops.'); return; }
  const start = await geocode(state.start);
  if (!start){ alert('I could not find the starting location.'); return; }
  $('#optimizeBtn').textContent = 'Finding best order…';
  $('#optimizeBtn').disabled = true;
  try {
    for (const place of chosen) await ensureCoords(place);
    if (chosen.some(place=>!Number.isFinite(place.lat) || !Number.isFinite(place.lon))) throw new Error('Missing coordinates');
    const coordinates = [start,...chosen].map(place=>`${place.lon},${place.lat}`).join(';');
    const response = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordinates}?source=first&roundtrip=false&overview=false&steps=false`);
    const json = await response.json();
    if (json.code !== 'Ok') throw new Error('Route failed');
    const ordered = json.waypoints.slice(1).sort((a,b)=>a.waypoint_index-b.waypoint_index).map(point=>chosen[point.original_index-1]);
    const firstIndex = state.stops.findIndex(item=>chosen.includes(item));
    const others = state.stops.filter(item=>!chosen.includes(item));
    state.stops = [...others.slice(0,firstIndex),...ordered,...others.slice(firstIndex)];
    save();
  } catch {
    alert('Route optimization was unavailable. Your list was not changed.');
  } finally {
    $('#optimizeBtn').textContent = '✨ Put Stops in Best Driving Order';
    $('#optimizeBtn').disabled = state.stops.length < 2;
  }
}

function openRoute(){
  const day = prompt('Which day should open in Google Maps?','Friday');
  if (!day) return;
  const list = state.stops.filter(item=>(item.day || 'Extra').toLowerCase() === day.trim().toLowerCase());
  if (!list.length){ alert('No stops found for that day.'); return; }
  const locations = list.map(place=>`${place.name} ${place.address}`);
  const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(state.start)}&destination=${encodeURIComponent(locations.at(-1))}&waypoints=${encodeURIComponent(locations.slice(0,-1).join('|'))}&travelmode=driving`;
  window.location.href = url;
}

function loadReservation(){
  let reservation = {};
  try { reservation = JSON.parse(localStorage.getItem('tripReservation') || '{}'); } catch {}
  ['hotelName','guestName','itineraryNumber','roomConfirmation','checkIn','checkOut'].forEach(id=>{
    if (reservation[id]) $(`#${id}`).value = reservation[id];
  });
}
function saveReservation(){
  const reservation = {};
  ['hotelName','guestName','itineraryNumber','roomConfirmation','checkIn','checkOut'].forEach(id=>reservation[id] = $(`#${id}`).value.trim());
  localStorage.setItem('tripReservation',JSON.stringify(reservation));
  alert('Reservation saved privately on this device.');
}

$('#searchBtn').onclick = searchPlaces;
$('#placeInput').addEventListener('keydown',event=>{ if (event.key === 'Enter') searchPlaces(); });
$('#setCityBtn').onclick = ()=>{
  state.city = $('#cityInput').value.trim() || state.city;
  save();
  $('#cityStatus').textContent = `Now searching around ${state.city}.`;
};
$('#optimizeBtn').onclick = optimize;
$('#openRouteBtn').onclick = openRoute;
$('#saveReservationBtn').onclick = saveReservation;
$('#settingsBtn').onclick = ()=>$('#settingsDialog').showModal();
$('#saveSettingsBtn').onclick = ()=>{
  state.title = $('#titleInput').value.trim() || 'My Trip';
  state.start = $('#startInput').value.trim();
  save();
};
$('#resetPlanBtn').onclick = ()=>{
  if (confirm('Reload the full Branson itinerary?')){
    state.stops = seedStops();
    save();
    $('#settingsDialog').close();
  }
};
$('#clearBtn').onclick = ()=>{
  if (confirm('Clear every stop?')){
    state.stops = [];
    save();
    $('#settingsDialog').close();
  }
};
$('#saveDetailsBtn').onclick = ()=>{
  const place = state.stops.find(item=>item.id === currentDetailId);
  if (!place) return;
  place.day = $('#detailDay').value;
  place.phone = $('#detailPhone').value.trim();
  place.website = $('#detailWebsite').value.trim();
  place.price = $('#detailPrice').value.trim();
  save();
};

render();
loadReservation();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
