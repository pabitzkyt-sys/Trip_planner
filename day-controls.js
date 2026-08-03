(() => {
  const picker = document.querySelector('#dayPickerDialog');
  const title = document.querySelector('#dayPickerTitle');
  const help = document.querySelector('#dayPickerHelp');
  const optimizeButton = document.querySelector('#optimizeBtn');
  const routeButton = document.querySelector('#openRouteBtn');
  const closeButton = document.querySelector('#closeDayPicker');
  const dayButtons = [...document.querySelectorAll('.day-button')];
  let action = 'route';

  function stopsFor(day){
    return state.stops.filter(item => (item.day || 'Extra') === day);
  }

  function refreshDayButtons(){
    dayButtons.forEach(button => {
      const day = button.dataset.day;
      const count = stopsFor(day).length;
      const label = day === 'Extra' ? 'Extra Stops' : day;
      button.textContent = `${label} (${count})`;
      button.disabled = count === 0 || (action === 'optimize' && count < 2);
      button.title = action === 'optimize' && count < 2 ? 'At least two stops are needed' : '';
    });
  }

  function showPicker(nextAction){
    action = nextAction;
    if (action === 'optimize'){
      title.textContent = 'Which day should I optimize?';
      help.textContent = 'Tap a day with at least two stops.';
    } else {
      title.textContent = 'Which day should I open?';
      help.textContent = 'Tap a day to open its route in Google Maps.';
    }
    refreshDayButtons();
    picker.showModal();
  }

  async function optimizeDay(day){
    const chosen = stopsFor(day);
    if (chosen.length < 2){
      alert(`${day} needs at least two stops.`);
      return;
    }

    picker.close();
    optimizeButton.textContent = `Optimizing ${day}…`;
    optimizeButton.disabled = true;

    try {
      const start = await geocode(state.start);
      if (!start) throw new Error('Starting location not found');

      for (const place of chosen) await ensureCoords(place);
      if (chosen.some(place => !Number.isFinite(place.lat) || !Number.isFinite(place.lon))){
        throw new Error('One or more stops could not be located');
      }

      const coordinates = [start, ...chosen]
        .map(place => `${place.lon},${place.lat}`)
        .join(';');
      const response = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordinates}?source=first&roundtrip=false&overview=false&steps=false`);
      const result = await response.json();
      if (result.code !== 'Ok') throw new Error('Route service unavailable');

      const ordered = result.waypoints
        .map((waypoint, originalInputIndex) => ({waypoint, originalInputIndex}))
        .slice(1)
        .sort((a,b) => a.waypoint.waypoint_index - b.waypoint.waypoint_index)
        .map(item => chosen[item.originalInputIndex - 1]);

      let next = 0;
      state.stops = state.stops.map(item => chosen.includes(item) ? ordered[next++] : item);
      save();
      alert(`${day} is now in the best driving order.`);
    } catch (error){
      console.error(error);
      alert('I could not optimize that route right now. Your stops were not changed.');
    } finally {
      optimizeButton.textContent = '✨ Put Stops in Best Driving Order';
      optimizeButton.disabled = state.stops.length < 2;
    }
  }

  function openDay(day){
    const list = stopsFor(day);
    if (!list.length){
      alert(`There are no stops on ${day}.`);
      return;
    }

    picker.close();
    const locations = list.map(place => `${place.name} ${place.address || ''}`);
    const origin = state.start;
    const destination = locations[locations.length - 1];
    const waypoints = locations.slice(0,-1).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
    window.location.href = url;
  }

  optimizeButton.onclick = () => showPicker('optimize');
  routeButton.onclick = () => showPicker('route');
  closeButton.onclick = () => picker.close();

  dayButtons.forEach(button => {
    button.onclick = () => {
      const day = button.dataset.day;
      if (action === 'optimize') optimizeDay(day);
      else openDay(day);
    };
  });
})();