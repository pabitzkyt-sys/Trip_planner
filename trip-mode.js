(() => {
  const STORE = 'tripModeData';
  const RADIUS_METERS = 1200;
  let watchId = null;
  let currentPosition = null;
  let nearbyBusy = false;

  const loadTripData = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE) || 'null') || {
        active:false,startTime:null,endTime:null,track:[],suggestions:[],lastNearbyAt:0,recap:null
      };
    } catch {
      return {active:false,startTime:null,endTime:null,track:[],suggestions:[],lastNearbyAt:0,recap:null};
    }
  };
  let tripData = loadTripData();
  const saveTripData = () => localStorage.setItem(STORE, JSON.stringify(tripData));
  const safe = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatTime = value => value ? new Date(value).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : '';

  function distanceMeters(a,b){
    const rad = n => n * Math.PI / 180;
    const R = 6371000;
    const dLat = rad(b.lat-a.lat), dLon = rad(b.lon-a.lon);
    const s = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function insertTripModeUI(){
    if (document.querySelector('#tripModeCard')) return;
    const itineraryCard = [...document.querySelectorAll('section.card')].find(section => section.querySelector('#stops'));
    if (!itineraryCard) return;
    const section = document.createElement('section');
    section.id = 'tripModeCard';
    section.className = 'card trip-mode-card';
    section.innerHTML = `
      <div class="section-head">
        <div><h2>📍 Trip Mode</h2><p class="small">Tracks progress and nearby ideas only while this app is open.</p></div>
        <span id="tripModeBadge" class="secure">Off</span>
      </div>
      <div id="locationStatus" class="location-status">Location is not being used.</div>
      <div class="trip-mode-actions">
        <button id="startTripBtn" class="primary">Start Trip</button>
        <button id="nearbyBtn" class="secondary">Find Walkable Things</button>
        <button id="finishTripBtn" class="secondary">Finish & Make Recap</button>
      </div>
      <div id="nearbyResults" class="nearby-results"></div>
      <div id="tripRecap" class="trip-recap"></div>`;
    itineraryCard.parentNode.insertBefore(section, itineraryCard);

    document.querySelector('#startTripBtn').onclick = toggleTrip;
    document.querySelector('#nearbyBtn').onclick = findNearby;
    document.querySelector('#finishTripBtn').onclick = finishTrip;
    renderTripMode();
    if (tripData.active) startWatching(false);
  }

  function renderTripMode(){
    const badge = document.querySelector('#tripModeBadge');
    const start = document.querySelector('#startTripBtn');
    const finish = document.querySelector('#finishTripBtn');
    if (!badge) return;
    badge.textContent = tripData.active ? 'Tracking' : 'Off';
    badge.classList.toggle('tracking', tripData.active);
    start.textContent = tripData.active ? 'Pause Tracking' : (tripData.startTime ? 'Resume Tracking' : 'Start Trip');
    finish.disabled = !tripData.startTime;
    renderSuggestions();
    renderRecap();
  }

  function toggleTrip(){
    if (tripData.active) stopWatching(); else startWatching(true);
  }

  function startWatching(markStart){
    if (!navigator.geolocation){
      alert('This device does not support location tracking.');
      return;
    }
    if (markStart && !tripData.startTime) tripData.startTime = Date.now();
    tripData.active = true;
    tripData.endTime = null;
    saveTripData();
    renderTripMode();
    document.querySelector('#locationStatus').textContent = 'Waiting for your location…';
    watchId = navigator.geolocation.watchPosition(position => {
      currentPosition = {lat:position.coords.latitude,lon:position.coords.longitude,accuracy:position.coords.accuracy,time:Date.now()};
      const last = tripData.track.at(-1);
      if (!last || Date.now()-last.time > 120000 || distanceMeters(last,currentPosition) > 100){
        tripData.track.push(currentPosition);
        if (tripData.track.length > 500) tripData.track = tripData.track.slice(-500);
        saveTripData();
      }
      document.querySelector('#locationStatus').textContent = `Location active • accurate to about ${Math.round(position.coords.accuracy)} ft • updated ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
      autoMarkNearbyStops();
      if (Date.now() - tripData.lastNearbyAt > 10*60*1000) findNearby(true);
    }, error => {
      const messages = {1:'Location permission was denied. Allow location for this site in Safari settings.',2:'Your location is unavailable right now.',3:'Location took too long. Try again.'};
      document.querySelector('#locationStatus').textContent = messages[error.code] || 'Could not get your location.';
      tripData.active = false;
      saveTripData();
      renderTripMode();
    }, {enableHighAccuracy:true,maximumAge:30000,timeout:20000});
  }

  function stopWatching(){
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    tripData.active = false;
    saveTripData();
    const status = document.querySelector('#locationStatus');
    if (status) status.textContent = 'Tracking paused. Your saved progress remains on this device.';
    renderTripMode();
  }

  async function autoMarkNearbyStops(){
    if (!currentPosition || typeof state === 'undefined') return;
    for (const place of state.stops){
      if (place.status === 'completed') continue;
      try {
        if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) await ensureCoords(place);
        if (Number.isFinite(place.lat) && distanceMeters(currentPosition,place) < 180){
          place.nearbyAt = place.nearbyAt || Date.now();
        }
      } catch {}
    }
    save();
  }

  async function findNearby(silent=false){
    if (nearbyBusy) return;
    if (!currentPosition){
      if (!silent) alert('Start Trip Mode first so the app can use your current location.');
      return;
    }
    nearbyBusy = true;
    const box = document.querySelector('#nearbyResults');
    const button = document.querySelector('#nearbyBtn');
    if (button){ button.disabled = true; button.textContent = 'Looking nearby…'; }
    if (!silent) box.innerHTML = '<p class="small">Looking for attractions, parks, treats, museums, and entertainment within walking distance…</p>';
    try {
      const q = `[out:json][timeout:20];(nwr(around:${RADIUS_METERS},${currentPosition.lat},${currentPosition.lon})[tourism];nwr(around:${RADIUS_METERS},${currentPosition.lat},${currentPosition.lon})[leisure~"park|playground|amusement_arcade|bowling_alley|miniature_golf"];nwr(around:${RADIUS_METERS},${currentPosition.lat},${currentPosition.lon})[amenity~"cafe|ice_cream|cinema|theatre|arts_centre|restaurant"];);out center tags 60;`;
      const response = await fetch('https://overpass-api.de/api/interpreter', {method:'POST',body:q,headers:{'Content-Type':'text/plain;charset=UTF-8'}});
      if (!response.ok) throw new Error('Nearby service unavailable');
      const json = await response.json();
      const found = (json.elements || []).map(item => {
        const tags = item.tags || {};
        const lat = item.lat ?? item.center?.lat;
        const lon = item.lon ?? item.center?.lon;
        if (!tags.name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const distance = Math.round(distanceMeters(currentPosition,{lat,lon}));
        return {id:`${item.type}-${item.id}`,name:tags.name,category:tags.tourism||tags.leisure||tags.amenity||'activity',lat,lon,distance,seenAt:Date.now(),added:false};
      }).filter(Boolean).sort((a,b)=>a.distance-b.distance).slice(0,12);
      const existing = new Map(tripData.suggestions.map(item=>[item.id,item]));
      for (const item of found) existing.set(item.id,{...existing.get(item.id),...item});
      tripData.suggestions = [...existing.values()].slice(-60);
      tripData.lastNearbyAt = Date.now();
      saveTripData();
      renderSuggestions();
    } catch {
      if (!silent) box.innerHTML = `<p class="small">Nearby suggestions could not load. <a target="_blank" href="https://www.google.com/maps/search/Things+to+do/@${currentPosition.lat},${currentPosition.lon},16z">See nearby activities in Google Maps</a>.</p>`;
    } finally {
      nearbyBusy = false;
      if (button){ button.disabled = false; button.textContent = 'Find Walkable Things'; }
    }
  }

  function renderSuggestions(){
    const box = document.querySelector('#nearbyResults');
    if (!box) return;
    const recent = tripData.suggestions.slice().sort((a,b)=>(a.distance||99999)-(b.distance||99999)).slice(0,8);
    if (!recent.length){ box.innerHTML = ''; return; }
    box.innerHTML = `<h3 class="nearby-title">Walkable ideas nearby</h3>` + recent.map(item => {
      const minutes = Math.max(1,Math.round(item.distance/80));
      return `<article class="nearby-item"><div><strong>${safe(item.name)}</strong><div class="meta">${safe(item.category.replaceAll('_',' '))} • about ${minutes} min walk</div></div><div class="nearby-actions"><button class="mini add-nearby" data-nearby-id="${safe(item.id)}">Add</button><a class="mini" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}&travelmode=walking">Walk</a></div></article>`;
    }).join('');
    box.querySelectorAll('.add-nearby').forEach(button => button.onclick = () => addNearby(button.dataset.nearbyId));
  }

  function addNearby(id){
    const item = tripData.suggestions.find(s=>s.id===id);
    if (!item) return;
    const today = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
    const day = days.includes(today) ? today : 'Extra';
    state.stops.push({id:makeId(),name:item.name,address:'Nearby suggestion',day,phone:'',website:'',price:'',lat:item.lat,lon:item.lon,sourceSuggestionId:item.id,status:'planned'});
    item.added = true;
    saveTripData();
    save();
    renderSuggestions();
  }

  function decorateStops(){
    document.querySelectorAll('#stops .stop').forEach(card => {
      if (card.querySelector('.progress-actions')) return;
      const editButton = [...card.querySelectorAll('button')].find(button => button.getAttribute('onclick')?.startsWith('editDetails'));
      const match = editButton?.getAttribute('onclick')?.match(/'([^']+)'/);
      const id = match?.[1];
      const place = state.stops.find(item=>item.id===id);
      if (!place) return;
      card.classList.toggle('completed-stop',place.status==='completed');
      card.classList.toggle('skipped-stop',place.status==='skipped');
      const controls = document.createElement('div');
      controls.className = 'progress-actions';
      controls.innerHTML = `<button class="progress-btn done" data-status="completed">${place.status==='completed'?'✓ Completed':'Mark Done'}</button><button class="progress-btn skip" data-status="skipped">${place.status==='skipped'?'Skipped':'Skip'}</button>${place.nearbyAt&&!place.status?'<span class="near-badge">You were nearby</span>':''}`;
      controls.querySelectorAll('[data-status]').forEach(button => button.onclick = () => markStop(id,button.dataset.status));
      card.querySelector('div:nth-child(2)').appendChild(controls);
    });
  }

  function markStop(id,status){
    const place = state.stops.find(item=>item.id===id);
    if (!place) return;
    place.status = place.status===status ? 'planned' : status;
    place.statusAt = place.status==='planned' ? null : Date.now();
    const suggestion = tripData.suggestions.find(item=>item.id===place.sourceSuggestionId);
    if (suggestion && place.status==='completed') suggestion.visited = true;
    saveTripData();
    save();
  }

  function finishTrip(){
    stopWatching();
    tripData.endTime = Date.now();
    const completed = state.stops.filter(item=>item.status==='completed');
    const missed = state.stops.filter(item=>item.status!=='completed');
    const future = tripData.suggestions.filter(item=>!item.visited && !item.added).sort((a,b)=>(a.distance||99999)-(b.distance||99999)).slice(0,8);
    tripData.recap = {madeAt:Date.now(),completed:completed.map(x=>x.name),missed:missed.map(x=>x.name),future:future.map(x=>x.name),trackPoints:tripData.track.length};
    saveTripData();
    renderTripMode();
    document.querySelector('#tripRecap')?.scrollIntoView({behavior:'smooth'});
  }

  function recapText(){
    const r = tripData.recap;
    if (!r) return '';
    return `${state.title} recap\n\nCompleted (${r.completed.length}):\n${r.completed.map(x=>'• '+x).join('\n')||'None marked'}\n\nMissed or saved for next time (${r.missed.length}):\n${r.missed.map(x=>'• '+x).join('\n')||'None'}\n\nNearby opportunities for next time:\n${r.future.map(x=>'• '+x).join('\n')||'No extra suggestions were saved.'}`;
  }

  function renderRecap(){
    const box = document.querySelector('#tripRecap');
    if (!box || !tripData.recap){ if(box) box.innerHTML=''; return; }
    const r = tripData.recap;
    box.innerHTML = `<div class="recap-card"><h3>🎉 Trip recap</h3><p><strong>${r.completed.length}</strong> completed • <strong>${r.missed.length}</strong> left for next time</p><h4>Missed or saved</h4><p class="recap-list">${r.missed.map(safe).join(' • ')||'Nothing missed'}</p><h4>Nearby opportunities for next time</h4><p class="recap-list">${r.future.map(safe).join(' • ')||'No extra suggestions saved yet'}</p><button id="shareRecapBtn" class="primary full">Share Recap</button></div>`;
    document.querySelector('#shareRecapBtn').onclick = async () => {
      const text = recapText();
      if (navigator.share){ try { await navigator.share({title:`${state.title} recap`,text}); } catch {} }
      else { await navigator.clipboard.writeText(text); alert('Recap copied.'); }
    };
  }

  const originalRender = render;
  render = function(){ originalRender(); decorateStops(); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', insertTripModeUI);
  else insertTripModeUI();
  decorateStops();
})();