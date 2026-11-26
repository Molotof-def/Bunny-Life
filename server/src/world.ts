import { pool } from './db.js';

const finds = [
  { id: 'clover', name: 'Счастливый клевер', emoji: '☘️', points: 5, carrots: 18 },
  { id: 'pearl', name: 'Розовая жемчужина', emoji: '🦪', points: 8, carrots: 24 },
  { id: 'star', name: 'Звёздная пыльца', emoji: '✨', points: 10, carrots: 30 }
];
const seasonStart = () => { const d = new Date(); const day = d.getUTCDay(); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate() - ((day + 6) % 7)); return d; };

export async function getWorld(id: string) {
  if (!pool) return { finds, collected: [], season: { name: 'Неделя уютных открытий', points: 0, endsAt: new Date(seasonStart().getTime()+7*86400000).toISOString() }, leaderboard: [], notifications: [] };
  const start = seasonStart();
  const [collected, score, leaderboard, notifications] = await Promise.all([
    pool.query('SELECT find_id FROM world_collectibles WHERE user_id=$1 AND collect_date=CURRENT_DATE', [id]),
    pool.query('SELECT COALESCE(SUM(points),0)::int AS points FROM world_collectibles WHERE user_id=$1 AND collected_at >= $2', [id,start]),
    pool.query("SELECT 'Кролик #' || upper(substr(md5(id),1,5)) AS name,level,xp FROM users ORDER BY xp DESC, level DESC, created_at ASC LIMIT 10"),
    pool.query('SELECT id,kind,message,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 12', [id])
  ]);
  return { finds, collected: collected.rows.map(x=>x.find_id), season: { name: 'Неделя уютных открытий', points: Number(score.rows[0].points), endsAt: new Date(start.getTime()+7*86400000).toISOString() }, leaderboard: leaderboard.rows, notifications: notifications.rows };
}

export async function collectWorldFind(id: string, name: string, findId: string) {
  const item = finds.find(x=>x.id===findId);
  if (!item) throw new Error('Такая находка не существует.');
  if (!pool) throw new Error('Событие сохранится после входа через Telegram и подключения базы данных.');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('INSERT INTO users(id,name) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[id,name]);
    const inserted = await c.query('INSERT INTO world_collectibles(user_id,find_id,points,reward) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,find_id,collect_date) DO NOTHING RETURNING id',[id,findId,item.points,item.carrots]);
    if (!inserted.rowCount) throw new Error('Эту находку ты уже собирал сегодня. Возвращайся завтра!');
    await c.query('UPDATE users SET carrots=carrots+$2,xp=xp+3,level=((xp+3)/100)+1 WHERE id=$1',[id,item.carrots]);
    await c.query('INSERT INTO notifications(user_id,kind,message) VALUES($1,$2,$3)',[id,'event',`Найдено: ${item.name} · +${item.carrots} 🥕`]);
    await c.query('COMMIT');
    return { reward:item.carrots, state: await (await import('./game.js')).getState(id,name), world: await getWorld(id) };
  } catch(e) { try { await c.query('ROLLBACK'); } catch {} throw e; }
  finally { c.release(); }
}

export async function markNotificationsRead(id:string) {
  if (!pool) return { ok:true };
  await pool.query('UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL',[id]);
  return { ok:true };
}
