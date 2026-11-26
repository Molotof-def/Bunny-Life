import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { validateTelegramInitData, signSession, requireAuth } from './auth.js';
import { getState, applyAction, claimQuest, startMiniGame, finishMiniGame, updateRoomStyle, claimDailyGift, claimAchievement } from './game.js';
import { pool, initDb } from './db.js';
import { getSocial, requestFriend, respondFriend, visitFriendRoom, sendCarrotGift } from './social.js';
import { getWorld, collectWorldFind, markNotificationsRead } from './world.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',').map(value => value.trim()).filter(Boolean);

if (isProduction) {
  const missing = ['BOT_TOKEN', 'JWT_SECRET', 'DATABASE_URL'].filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  if (process.env.ALLOW_DEMO === 'true') throw new Error('ALLOW_DEMO must be false in production');
  if ((process.env.JWT_SECRET || '').length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '32kb' }));

const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const actionLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });

// Liveness is intentionally independent from PostgreSQL so the host can tell
// whether the Node process is alive even while the database is reconnecting.
app.get('/health/live', (_req, res) => {
  res.json({ ok: true, app: 'BUNNY LIFE', version: '0.2.0', channel: 'stable' });
});

// Readiness checks the dependency required for persistent production saves.
app.get('/health/ready', async (_req, res) => {
  try {
    if (!pool) {
      if (isProduction) return res.status(503).json({ ok: false, database: 'not-configured' });
      return res.json({ ok: true, database: 'memory-demo' });
    }
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

// Keep the original health URL for existing Render monitors.
app.get('/health', async (_req, res) => {
  try {
    if (!pool) {
      if (isProduction) return res.status(503).json({ ok: false, app: 'BUNNY LIFE', database: 'not-configured' });
      return res.json({ ok: true, app: 'BUNNY LIFE', database: 'memory-demo' });
    }
    await pool.query('SELECT 1');
    res.json({ ok: true, app: 'BUNNY LIFE', database: 'connected' });
  } catch {
    res.status(503).json({ ok: false, app: 'BUNNY LIFE', database: 'unavailable' });
  }
});

app.get('/api/meta', (_req, res) => {
  res.json({ name: 'BUNNY LIFE', version: '0.2.0', releaseChannel: 'release',
    nextMilestone: '0.3.0', capabilities: ['pet-care', 'rooms', 'mini-games', 'daily-streak', 'friend-requests', 'friend-room-visits', 'carrot-gifts', 'weekly-world-event', 'collectibles', 'leaderboard', 'notifications'] });
});

app.post('/api/auth/telegram', authLimiter, async (req, res) => {
  const initData = String(req.body?.initData || '');
  let user = validateTelegramInitData(initData);
  if (!user && !isProduction && process.env.ALLOW_DEMO === 'true') user = { id: 'demo-user', name: 'Гость' };
  if (!user) return res.status(401).json({ error: 'Не удалось подтвердить Telegram. Откройте приложение через бота.' });
  try {
    const state = await getState(user.id, user.name);
    res.json({ token: signSession(user), state });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка загрузки профиля' }); }
});

app.get('/api/game', requireAuth, async (req, res) => {
  try { const u = (req as any).user; res.json(await getState(u.id, u.name)); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Ошибка загрузки игры' }); }
});

app.post('/api/game/action', requireAuth, actionLimiter, async (req, res) => {
  try {
    const u = (req as any).user;
    const result = await applyAction(u.id, u.name, String(req.body?.type || ''), req.body?.itemId ? String(req.body.itemId) : undefined);
    res.json(result);
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : 'Ошибка действия' }); }
});

app.post('/api/game/minigame/start', requireAuth, actionLimiter, (req, res) => { try { const u=(req as any).user; res.json(startMiniGame(u.id,String(req.body?.gameId||'catch'))); } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Не удалось начать игру'}); } });
app.post('/api/game/minigame/finish', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; res.json(await finishMiniGame(u.id,u.name,String(req.body?.nonce||''),Number(req.body?.score),String(req.body?.gameId||'catch'))); } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Не удалось завершить игру'}); } });

app.post('/api/game/room/style', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; res.json(await updateRoomStyle(u.id,u.name,String(req.body?.styleId||''))); } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Не удалось изменить комнату'}); } });
app.post('/api/game/daily-gift', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; res.json(await claimDailyGift(u.id,u.name)); } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Подарок недоступен'}); } });
app.post('/api/game/achievement', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; res.json(await claimAchievement(u.id,u.name,String(req.body?.achievementId||''))); } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Награда недоступна'}); } });

app.get('/api/world', requireAuth, async (req,res) => { try { const u=(req as any).user; res.json(await getWorld(u.id)); } catch { res.status(500).json({error:'Не удалось загрузить мир'}); } });
app.post('/api/world/collect', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; res.json(await collectWorldFind(u.id,u.name,String(req.body?.findId||''))); } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Не удалось собрать находку'}); } });
app.post('/api/notifications/read', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; res.json(await markNotificationsRead(u.id)); } catch { res.status(500).json({error:'Не удалось обновить уведомления'}); } });

app.get('/api/social', requireAuth, async (req, res) => { try { const u=(req as any).user; res.json(await getSocial(u.id)); } catch(e) { res.status(500).json({error:'Не удалось загрузить друзей'}); } });
app.post('/api/social/request', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; res.json(await requestFriend(u.id,String(req.body?.code||''))); } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Не удалось отправить заявку'}); } });
app.post('/api/social/respond', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; const id=Number(req.body?.requestId); if(!Number.isSafeInteger(id)||id<1) throw new Error('Некорректная заявка'); res.json(await respondFriend(u.id,id,req.body?.accept===true)); } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Не удалось обработать заявку'}); } });
app.get('/api/social/visit/:code', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; res.json(await visitFriendRoom(u.id,String(req.params.code||''))); } catch(e) { res.status(403).json({error:e instanceof Error?e.message:'Не удалось открыть комнату'}); } });
app.post('/api/social/gift', requireAuth, actionLimiter, async (req,res) => { try { const u=(req as any).user; const result=await sendCarrotGift(u.id,String(req.body?.code||''),Number(req.body?.amount)); res.json({ ...result, state: await getState(u.id,u.name), message:`Отправлено ${result.gifted} морковок! 🥕` }); } catch(e) { res.status(400).json({error:e instanceof Error?e.message:'Не удалось отправить подарок'}); } });

app.post('/api/game/quest/claim', requireAuth, actionLimiter, async (req, res) => {
  try {
    const u = (req as any).user;
    const result = await claimQuest(u.id, u.name, String(req.body?.questId || ''));
    res.json(result);
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : 'Не удалось получить награду' }); }
});

// Render can serve the built Mini App and API from one web service.
const clientDist = path.resolve(process.cwd(), '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), error => {
    if (error) next();
  });
});

if (pool) {
  await initDb();
  console.log('BUNNY LIFE database schema is ready');
}
const server = app.listen(port, () => console.log(`BUNNY LIFE API v0.2.0 listening on ${port}`));

// Graceful shutdown lets in-flight requests finish before closing PostgreSQL.
async function shutdown(signal: string) {
  console.log(`${signal}: shutting down BUNNY LIFE`);
  server.close(async () => {
    try { if (pool) await pool.end(); }
    finally { process.exit(0); }
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
