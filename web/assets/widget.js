/* TechnoHeart – Hearts Rating Widget (RedM/GTA + Discord)
 * MIT © 2025
 */
(() => {
  const root = document.querySelector('.tr-heart-widget');
  if (!root) return;

  const API = (root.dataset.api || '').trim(); // empty => DEMO
  const GUILD = root.dataset.guild || '';
  const TITLE = root.dataset.title || 'Bewertung';
  const DISCORD_CLIENT = root.dataset.discordClient || '';
  const REDIRECT_URI = root.dataset.redirect || window.location.href.split('#')[0];

  const $ = sel => root.querySelector(sel);
  const $$ = sel => root.querySelectorAll(sel);

  root.querySelector('.js-title').textContent = TITLE;

  const toast = (msg, tone='info') => {
    const el = $('.js-toast');
    el.textContent = msg;
    el.style.color = tone==='ok'? 'var(--ok)' : tone==='warn'? 'var(--warn)' : tone==='err'? 'var(--danger)':'var(--text)';
    setTimeout(() => { if (el.textContent === msg) el.textContent=''; }, 3500);
  };

  // Discord login UI
  const btnLogin = $('.js-discord-login');
  const userPill = $('.js-user-pill');

  const stateKey = 'tr_discord_state';
  const userKey = 'tr_discord_user';

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch { return null; }
  };
  const setUser = (u) => localStorage.setItem(userKey, JSON.stringify(u));

  function updateAuthUI() {
    const user = getUser();
    if (user) {
      btnLogin.style.display = 'none';
      userPill.style.display = 'flex';
      userPill.querySelector('.js-user-name').textContent = user.name || ('User ' + user.id);
      userPill.querySelector('.js-user-avatar').src = user.avatar || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f47e.svg';
    } else {
      userPill.style.display = 'none';
      btnLogin.style.display = 'flex';
    }
  }

  function startDiscordLogin() {
    if (!DISCORD_CLIENT) { toast('Discord Login nicht konfiguriert', 'warn'); return; }
    const state = Math.random().toString(36).slice(2);
    localStorage.setItem(stateKey, state);
    const url = new URL('https://discord.com/api/oauth2/authorize');
    url.searchParams.set('client_id', DISCORD_CLIENT);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'identify guilds');
    url.searchParams.set('state', state);
    window.location.href = url.toString();
  }

  async function finishDiscordLogin() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    if (!code) return;
    const state = localStorage.getItem(stateKey);
    if (!state || state !== returnedState) { toast('Ungültige OAuth-Session', 'err'); return; }
    try {
      if (!API) throw new Error('Kein API-Endpoint für Token-Austausch konfiguriert');
      const res = await fetch(API + '/api/discord/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
      });
      if (!res.ok) throw new Error('Login fehlgeschlagen');
      const data = await res.json();
      setUser(data.user);
      // Clean URL
      const cleanURL = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanURL);
      toast('Erfolgreich mit Discord verbunden', 'ok');
      updateAuthUI();
    } catch (e) {
      console.error(e); toast('Discord Login konnte nicht abgeschlossen werden', 'err');
    }
  }

  btnLogin.addEventListener('click', startDiscordLogin);
  finishDiscordLogin();
  updateAuthUI();

  // Rating form
  const btnSubmit = $('.js-submit');
  const btnClear = $('.js-clear');

  function getScore(name) {
    const sel = root.querySelector(`input[name="${name}"]:checked`);
    return sel ? Number(sel.value) : 0;
  }

  function clearForm() {
    $$('input.js-rate:checked').forEach(i => i.checked = false);
    $('.js-comment-game').value = '';
    $('.js-comment-support').value = '';
  }
  btnClear.addEventListener('click', clearForm);

  async function submitRating() {
    const game = getScore('game');
    const support = getScore('support');
    if (!game && !support) { toast('Bitte mindestens eine Kategorie bewerten', 'warn'); return; }
    const user = getUser();
    const entries = [];
    if (game) entries.push({ category: 'game', score: game, comment: $('.js-comment-game').value.trim() });
    if (support) entries.push({ category: 'support', score: support, comment: $('.js-comment-support').value.trim() });

    try {
      if (API) {
        for (const e of entries) {
          const res = await fetch(API + '/api/ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guildId: GUILD, userId: user?.id, ...e }),
          });
          if (!res.ok) throw new Error('API Fehler');
        }
      } else {
        const key = 'tr_demo_ratings';
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        entries.forEach(e => list.push({ guildId: GUILD, userId: user?.id || null, ...e, createdAt: new Date().toISOString() }));
        localStorage.setItem(key, JSON.stringify(list));
      }
      toast('Danke! Bewertung gespeichert ❤', 'ok');
      clearForm();
      await refresh();
    } catch (e) { console.error(e); toast('Konnte nicht speichern', 'err'); }
  }
  btnSubmit.addEventListener('click', submitRating);

  function fmtAvg(n){ return (Math.round((n||0)*10)/10).toFixed(1).replace('.', ','); }
  function pct(n){ return Math.max(0, Math.min(100, Math.round(n))); }

  function renderReviews(items){
    const box = $('.js-reviews');
    box.innerHTML = '';
    if(!items || !items.length){ box.innerHTML = '<div class="small">Noch keine Rezensionen.</div>'; return; }
    items.slice(0,6).forEach(r=>{
      const el = document.createElement('div');
      el.className='item';
      const who = r.author?.name || 'Anonym';
      const av = r.author?.avatar || 'https://avatars.githubusercontent.com/u/583231?v=4';
      el.innerHTML = `
        <img class="avatar" src="${av}" alt="Avatar"/>
        <div>
          <div class="meta"><strong>${who}</strong> · <span>${r.category==='game'?'Server':'Support'}</span> · <span>${'❤'.repeat(r.score)}</span></div>
          <div>${(r.comment||'').replace(/[<>]/g,'')}</div>
        </div>`;
      box.appendChild(el);
    });
    $('.js-rec-count').textContent = items.length + ' gesamt';
  }

  function renderSupporters(items){
    const box = $('.js-supporters');
    box.innerHTML = '';
    if(!items || !items.length){ box.innerHTML = '<div class="small">Noch keine Daten zur Aktivität.</div>'; return; }
    items.slice(0,5).forEach((s,idx)=>{
      const row = document.createElement('div');
      row.className='row';
      const crown = idx===0 ? ' 👑' : idx===1 ? ' 🥈' : idx===2 ? ' 🥉' : '';
      row.innerHTML = `
        <img class="avatar" src="${s.avatar||'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f47e.svg'}" alt="Avatar"/>
        <div>
          <div style="font-weight:700">${s.name||'Supporter'}${crown}</div>
          <div class="small">${s.points||0} Punkte · Rang ${s.rank||idx+1}</div>
        </div>`;
      box.appendChild(row);
    });
  }

  function computeSummaryLocal(list, category){
    const items = list.filter(x=>x.category===category);
    const count = items.length;
    const avg = count? items.reduce((a,b)=>a+b.score,0)/count : 0;
    const dist = [1,2,3,4,5].map(n=> items.filter(i=>i.score===n).length);
    return { avg, count, dist };
  }

  async function fetchJSON(url){
    const r = await fetch(url);
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }

  async function refresh(){
    try{
      if(API){
        const summary = await fetchJSON(`${API}/api/ratings/summary?guildId=${encodeURIComponent(GUILD)}`);
        const recent = await fetchJSON(`${API}/api/ratings/recent?guildId=${encodeURIComponent(GUILD)}&limit=20`);
        const tops = await fetchJSON(`${API}/api/supporters/top?guildId=${encodeURIComponent(GUILD)}&limit=5`);
        updateSummary(summary);
        renderReviews(recent);
        renderSupporters(tops);
      } else {
        const list = JSON.parse(localStorage.getItem('tr_demo_ratings')||'[]');
        const summ = { game: computeSummaryLocal(list,'game'), support: computeSummaryLocal(list,'support') };
        updateSummary(summ);
        const recent = list.slice(-10).reverse().map(x=>({category:x.category, score:x.score, comment:x.comment, author: x.userId? { name:'User '+String(x.userId).slice(-4), avatar:'' }:null, createdAt:x.createdAt }));
        renderReviews(recent);
        renderSupporters([
          {name:'Sage', points:128, rank:1},
          {name:'Nova', points:97, rank:2},
          {name:'Orion', points:76, rank:3},
          {name:'Kira', points:55, rank:4},
          {name:'Ash', points:33, rank:5},
        ]);
      }
    } catch(e){
      console.error(e);
      toast('Konnte Daten nicht laden', 'err');
    }
  }

  function updateSummary(summary){
    const g = summary.game || {avg:0,count:0,dist:[0,0,0,0,0]};
    const s = summary.support || {avg:0,count:0,dist:[0,0,0,0,0]};
    $('.js-avg-game').textContent = fmtAvg(g.avg);
    $('.js-avg-support').textContent = fmtAvg(s.avg);
    $('.js-count-game').textContent = (g.count||0) + ' Bewertungen';
    $('.js-count-support').textContent = (s.count||0) + ' Bewertungen';
    $('.js-bar-game').style.width = pct((g.avg||0)/5*100)+'%';
    $('.js-bar-support').style.width = pct((s.avg||0)/5*100)+'%';
  }

  refresh();
})();
