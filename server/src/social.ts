import crypto from 'node:crypto';
import { pool } from './db.js';

function codeFor(id: string) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.createHash('sha256').update(`bunny-life:${id}`).digest();
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function ensureSocialProfile(id: string) {
  if (!pool) return { friendCode: codeFor(id), friends: [], incoming: [], outgoing: [] };
  await pool.query('UPDATE users SET friend_code=$2 WHERE id=$1 AND friend_code IS NULL', [id, codeFor(id)]);
  const r = await pool.query('SELECT friend_code FROM users WHERE id=$1', [id]);
  return { friendCode: r.rows[0]?.friend_code || codeFor(id) };
}

export async function getSocial(id: string) {
  if (!pool) return { friendCode: codeFor(id), friends: [], incoming: [], outgoing: [] };
  await ensureSocialProfile(id);
  const [friends, incoming, outgoing] = await Promise.all([
    pool.query(`SELECT u.friend_code AS code,u.name,u.level FROM friendships f JOIN users u ON u.id=CASE WHEN f.user_a=$1 THEN f.user_b ELSE f.user_a END WHERE f.user_a=$1 OR f.user_b=$1 ORDER BY u.name`, [id]),
    pool.query(`SELECT r.id,u.friend_code AS code,u.name,u.level FROM friend_requests r JOIN users u ON u.id=r.from_user WHERE r.to_user=$1 AND r.status='pending' ORDER BY r.created_at DESC`, [id]),
    pool.query(`SELECT r.id,u.friend_code AS code,u.name,u.level FROM friend_requests r JOIN users u ON u.id=r.to_user WHERE r.from_user=$1 AND r.status='pending' ORDER BY r.created_at DESC`, [id])
  ]);
  const profile = await pool.query('SELECT friend_code FROM users WHERE id=$1', [id]);
  return { friendCode: profile.rows[0].friend_code, friends: friends.rows, incoming: incoming.rows, outgoing: outgoing.rows };
}

export async function requestFriend(id: string, code: string) {
  if (!pool) throw new Error('Друзья доступны после входа через Telegram и подключения базы данных.');
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z0-9]{8}$/.test(clean)) throw new Error('Код друга должен состоять из 8 символов.');
  const target = await pool.query('SELECT id FROM users WHERE friend_code=$1', [clean]);
  if (!target.rowCount) throw new Error('Игрок с таким кодом не найден.');
  const other = target.rows[0].id as string;
  if (other === id) throw new Error('Нельзя добавить самого себя.');
  const existing = await pool.query(`SELECT 1 FROM friendships WHERE (user_a=$1 AND user_b=$2) OR (user_a=$2 AND user_b=$1)`, [id, other]);
  if (existing.rowCount) throw new Error('Вы уже друзья.');
  const pending = await pool.query(`SELECT id,from_user,to_user FROM friend_requests WHERE status='pending' AND ((from_user=$1 AND to_user=$2) OR (from_user=$2 AND to_user=$1))`, [id, other]);
  if (pending.rowCount) throw new Error('Заявка уже существует. Проверь входящие заявки.');
  await pool.query(`INSERT INTO friend_requests(from_user,to_user) VALUES($1,$2)`, [id, other]);
  await pool.query(`INSERT INTO notifications(user_id,kind,message) VALUES($1,'friend', $2)`, [other, 'Новая заявка в друзья!']);
  return getSocial(id);
}

export async function respondFriend(id: string, requestId: number, accept: boolean) {
  if (!pool) throw new Error('Социальная система недоступна в демо-режиме.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const q = await client.query(`SELECT id,from_user,to_user FROM friend_requests WHERE id=$1 AND to_user=$2 AND status='pending' FOR UPDATE`, [requestId,id]);
    if (!q.rowCount) throw new Error('Заявка уже обработана или не найдена.');
    const request = q.rows[0];
    await client.query(`UPDATE friend_requests SET status=$2,updated_at=NOW() WHERE id=$1`, [requestId,accept?'accepted':'declined']);
    if (accept) {
      await client.query(`INSERT INTO notifications(user_id,kind,message) VALUES($1,'friend','Твоя заявка в друзья принята!')`, [request.from_user]);
      const a = String(request.from_user), b = String(request.to_user);
      await client.query('INSERT INTO friendships(user_a,user_b) VALUES($1,$2) ON CONFLICT DO NOTHING', [a < b ? a : b, a < b ? b : a]);
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  return getSocial(id);
}


export async function visitFriendRoom(id: string, code: string) {
  if (!pool) throw new Error('Посещение комнат доступно после подключения PostgreSQL.');
  const clean = code.trim().toUpperCase();
  const q = await pool.query(`
    SELECT u.id,u.name,u.level,r.decor,r.wall_color,r.floor_color,r.theme,p.name AS pet_name,p.equipped
    FROM users u JOIN rooms r ON r.user_id=u.id JOIN pets p ON p.user_id=u.id
    WHERE u.friend_code=$1`, [clean]);
  if (!q.rowCount) throw new Error('Комната игрока не найдена.');
  const target = q.rows[0];
  const friendship = await pool.query('SELECT 1 FROM friendships WHERE (user_a=$1 AND user_b=$2) OR (user_a=$2 AND user_b=$1)', [id,target.id]);
  if (!friendship.rowCount) throw new Error('Посещать комнаты могут только друзья.');
  return { name: target.name, level: Number(target.level), petName: target.pet_name, decor: target.decor || [], wallColor: target.wall_color, floorColor: target.floor_color, theme: target.theme, equipped: target.equipped || [] };
}

export async function sendCarrotGift(id: string, code: string, amount: number) {
  if (!pool) throw new Error('Подарки доступны после подключения PostgreSQL.');
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 50) throw new Error('Можно отправить от 1 до 50 морковок за раз.');
  const clean = code.trim().toUpperCase();
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const targetQ = await c.query('SELECT id FROM users WHERE friend_code=$1', [clean]);
    if (!targetQ.rowCount) throw new Error('Игрок не найден.');
    const target = String(targetQ.rows[0].id);
    if (target === id) throw new Error('Нельзя отправить подарок самому себе.');
    const f = await c.query('SELECT 1 FROM friendships WHERE (user_a=$1 AND user_b=$2) OR (user_a=$2 AND user_b=$1)', [id,target]);
    if (!f.rowCount) throw new Error('Подарки можно отправлять только друзьям.');
    const sender = await c.query('SELECT carrots FROM users WHERE id=$1 FOR UPDATE', [id]);
    if (!sender.rowCount || Number(sender.rows[0].carrots) < amount) throw new Error('Недостаточно морковок.');
    const sent = await c.query(`SELECT COALESCE(SUM(amount),0)::int AS total FROM carrot_gifts WHERE from_user=$1 AND created_at >= date_trunc('day', NOW())`, [id]);
    if (Number(sent.rows[0].total) + amount > 100) throw new Error('Дневной лимит подарков — 100 морковок.');
    await c.query('UPDATE users SET carrots=carrots-$2 WHERE id=$1', [id,amount]);
    await c.query('UPDATE users SET carrots=carrots+$2 WHERE id=$1', [target,amount]);
    await c.query('INSERT INTO carrot_gifts(from_user,to_user,amount) VALUES($1,$2,$3)', [id,target,amount]);
    await c.query("INSERT INTO notifications(user_id,kind,message) VALUES($1,'gift',$2)", [target, `Тебе отправили ${amount} морковок! 🥕`]);
    await c.query('COMMIT');
    return { gifted: amount, remaining: Number(sender.rows[0].carrots) - amount };
  } catch (e) { try { await c.query('ROLLBACK'); } catch {} throw e; }
  finally { c.release(); }
}
