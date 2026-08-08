(()=>{
  function applyTicketInfo(){
    try{
      const raw=localStorage.getItem('simpleTrip');
      if(!raw)return;
      const trip=JSON.parse(raw);
      const stop=(trip.stops||[]).find(s=>String(s.name||'').toLowerCase().includes('lost canyon'));
      if(!stop)return;
      stop.day='Saturday';
      stop.time='1:00–3:00 PM';
      stop.timeStatus='Planned — confirm time';
      stop.ticketsPurchased=true;
      stop.ticketSummary='Tickets purchased: 2 adults + 2 children + cart protection';
      stop.entryNotes='Bring photo ID for guests over 16. Waiver required. $10 parking, credit card only.';
      localStorage.setItem('simpleTrip',JSON.stringify(trip));
      if(typeof state!=='undefined'&&state){Object.assign(state,trip);if(typeof render==='function')render();}
    }catch(e){console.warn('Could not apply Lost Canyon ticket info',e);}
  }

  function decorate(){
    document.querySelectorAll('#stops .stop').forEach(card=>{
      const title=card.querySelector('h3');
      if(!title||!title.textContent.toLowerCase().includes('lost canyon'))return;
      if(card.querySelector('.ticket-badge'))return;
      const body=title.parentElement;
      const wrap=document.createElement('div');
      wrap.className='ticket-extra';
      wrap.innerHTML='<div class="ticket-badge">✅ Tickets Purchased</div><div class="ticket-time">🕐 1:00–3:00 PM <span>(planned — confirm)</span></div><div class="ticket-note">🎟️ 2 adults + 2 children + cart protection</div><div class="ticket-note">🪪 Photo ID for guests over 16 • waiver required • $10 parking, card only</div>';
      const actions=body.querySelector('.stop-actions');
      body.insertBefore(wrap,actions||null);
    });
  }

  applyTicketInfo();
  decorate();
  const target=document.getElementById('stops');
  if(target)new MutationObserver(decorate).observe(target,{childList:true,subtree:true});
})();
