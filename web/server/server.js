import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || '';

// --- In-memory stores (demo) ---
const ratings = []; // { guildId, userId?, category, score, comment, createdAt }
const supporters = []; // { guildId, id, name, avatar, points, rank }

// --- Helpers ---
function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }

function summarize(guildId){
  const byCat = (cat) => {
    const items = ratings.filter(r => r.guildId === guildId && r.category === cat);
    const count = items.length;
    const avg = count ? items.reduce((a,b)=>a+b.score,0)/count : 0;
    const dist = [1,2,3,4,5].map(n=> items.filter(i=>i.score===n).length);
    return { avg, count, dist };
  };
  return { game: byCat('game'), support: byCat('support') };
}

// --- Routes ---
app.get('/api/health', (req,res)=> res.json({ok:true}));

app.get('/api/ratings/summary', (req,res)=>{
  const guildId = String(req.query.guildId||'');
  return res.json(summarize(guildId));
});

app.get('/api/ratings/recent', (req,res)=>{
  const guildId = String(req.query.guildId||'');
  const limit = clamp(Number(req.query.limit||20), 1, 100);
  const items = ratings
    .filter(r => r.guildId === guildId)
    .slice(-limit*2) // overfetch for both categories
    .reverse()
    .slice(0, limit)
    .map(r => ({
      category: r.category,
      score: r.score,
      comment: r.comment,
      createdAt: r.createdAt,
      author: r.userId ? { name: 'User ' + String(r.userId).slice(-4), avatar: '' } : null
    }));
  res.json(items);
});

app.post('/api/ratings', (req,res)=>{
  const { guildId, userId, category, score, comment } = req.body||{};
  if(!guildId) return res.status(400).json({error:'guildId required'});
  if(category!=='game' && category!=='support') return res.status(400).json({error:'invalid category'});
  const s = clamp(Number(score), 1, 5);
  if(!s) return res.status(400).json({error:'score required 1..5'});
  const entry = { guildId, userId: userId||null, category, score: s, comment: String(comment||'').slice(0, 800), createdAt: new Date().toISOString() };
  ratings.push(entry);
  res.status(201).json({ok:true});
});

app.get('/api/supporters/top', (req,res)=>{
  const guildId = String(req.query.guildId||'');
  const limit = clamp(Number(req.query.limit||5), 1, 20);
  const list = supporters
    .filter(s => s.guildId === guildId)
    .sort((a,b)=> b.points - a.points)
    .slice(0, limit)
    .map((s, idx)=> ({ id:s.id, name:s.name, avatar:s.avatar, points:s.points, rank: s.rank || (idx+1) }));
  // demo fallback
  if(list.length===0){
    return res.json([
      {id:'1', name:'Sage', points:128, rank:1},
      {id:'2', name:'Nova', points:97, rank:2},
      {id:'3', name:'Orion', points:76, rank:3},
      {id:'4', name:'Kira', points:55, rank:4},
      {id:'5', name:'Ash', points:33, rank:5},
    ]);
  }
  res.json(list);
});

// OAuth2 exchange (Discord)
app.post('/api/discord/oauth/callback', async (req,res)=>{
  const { code, redirectUri } = req.body||{};
  if(!code || !redirectUri) return res.status(400).json({error:'code and redirectUri required'});
  try{
    if(!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET){
      // Demo mode: return a fake user
      return res.json({ user: { id: 'demo-user', name: 'Demo User', avatar: '' } });
    }
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    if(!tokenRes.ok){
      const txt = await tokenRes.text();
      return res.status(400).json({error:'token_exchange_failed', detail: txt});
    }
    const token = await tokenRes.json(); // { access_token, token_type, ... }
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `${token.token_type} ${token.access_token}` }
    });
    if(!userRes.ok){
      const txt = await userRes.text();
      return res.status(400).json({error:'user_fetch_failed', detail: txt});
    }
    const u = await userRes.json(); // { id, username, avatar, ... }
    const avatarUrl = u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : '';
    res.json({ user: { id: String(u.id), name: u.username, avatar: avatarUrl } });
  }catch(e){
    console.error(e);
    res.status(500).json({error:'oauth_internal_error'});
  }
});

app.listen(PORT, ()=>{
  console.log(`[technoheart] API listening on http://localhost:${PORT}`);
});
