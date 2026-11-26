import { pool } from './db.js';
import type { GameState } from './types.js';

const memory = new Map<string, GameState>();
const memoryQuestClaims = new Set<string>();
const miniSessions = new Map<string, { startedAt: number; nonce: string; gameId: string }>();
const memoryDailyGift = new Set<string>();
const memoryStreaks = new Map<string, { streak: number; lastDay: string }>();
const memoryAchievements = new Set<string>();
const roomStyles: Record<string, { wallColor: string; floorColor: string; theme: string }> = {
  cozy: { wallColor: '#f4e7dc', floorColor: '#e8d6c5', theme: 'cozy' },
  sky: { wallColor: '#dceaf4', floorColor: '#d8e2e8', theme: 'sky' },
  rose: { wallColor: '#f3dce4', floorColor: '#ead1d5', theme: 'rose' },
  mint: { wallColor: '#dcebe0', floorColor: '#d1dfd1', theme: 'mint' },
  lavender: { wallColor: '#e7def2', floorColor: '#d9d0e6', theme: 'lavender' }
};
const achievementRewards: Record<string, number> = { first_touch: 25, first_game: 40, collector_3: 60, level_3: 80 };

const memoryMiniRewards = new Map<string, number>();
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
function fresh(id: string, name: string): GameState {
  return { user: { id, name, level: 1, carrots: 250, xp: 0, achievements: [], dailyGiftClaimed: false, loginStreak: 0 }, pet: { name: 'Плюша', stats: { hunger: 82, mood: 91, energy: 76, cleanliness: 88, friendship: 12 }, equipped: [] }, inventory: [], room: { decor: [], ...roomStyles.cozy }, lastUpdated: Date.now() };
}
export async function getState(id: string, name: string): Promise<GameState> {
  if (!pool) {
    if (!memory.has(id)) memory.set(id, fresh(id, name));
    return structuredClone(memory.get(id)!);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO users(id,name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name', [id, name]);
    await client.query('INSERT INTO pets(user_id,last_updated) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING', [id, Date.now()]);
    await client.query('INSERT INTO rooms(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [id]);
    const u = (await client.query('SELECT * FROM users WHERE id=$1', [id])).rows[0];
    const p = (await client.query('SELECT * FROM pets WHERE user_id=$1', [id])).rows[0];
    const inv = (await client.query('SELECT item_id FROM inventory WHERE user_id=$1', [id])).rows.map(r => r.item_id);
    const room = (await client.query('SELECT decor,wall_color,floor_color,theme FROM rooms WHERE user_id=$1', [id])).rows[0];
    await client.query('COMMIT');
    return { user: { id, name: u.name, level: u.level, carrots: u.carrots, xp: u.xp, achievements: u.achievements || [], dailyGiftClaimed: u.daily_gift_date ? new Date(u.daily_gift_date).toISOString().slice(0,10) === new Date().toISOString().slice(0,10) : false, loginStreak: Number(u.login_streak || 0) }, pet: { name: p.name, stats: { hunger: p.hunger, mood: p.mood, energy: p.energy, cleanliness: p.cleanliness, friendship: p.friendship }, equipped: p.equipped || [] }, inventory: inv, room: { decor: room?.decor || [], wallColor: room?.wall_color || roomStyles.cozy.wallColor, floorColor: room?.floor_color || roomStyles.cozy.floorColor, theme: room?.theme || 'cozy' }, lastUpdated: Number(p.last_updated) };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
export async function applyAction(id: string, name: string, type: string, itemId?: string) {
  const state = await getState(id, name);
  const p = state.pet.stats;
  let message = 'Готово!';
  const prices: Record<string, number> = { pink_bow: 80, round_glasses: 120, flower_crown: 180, soft_bed: 150, carrot_lamp: 100, tiny_plant: 90, blue_scarf: 130, star_rug: 110, bookshelf: 170, moon_mobile: 145, bunny_sofa: 220, carrot_table: 190, cloud_wallpaper: 260 };
  if (type === 'feed') { if (state.user.carrots < 10) throw new Error('Не хватает морковок'); state.user.carrots -= 10; p.hunger = clamp(p.hunger + 22); message = 'Ням-ням! Плюша подкрепилась 🥕'; }
  else if (type === 'pet') { p.mood = clamp(p.mood + 8); p.friendship = clamp(p.friendship + 2); message = 'Плюша довольно урчит 💗'; }
  else if (type === 'play') { p.mood = clamp(p.mood + 15); p.energy = clamp(p.energy - 10); p.friendship = clamp(p.friendship + 4); message = 'Вы отлично поиграли!'; }
  else if (type === 'clean') { p.cleanliness = clamp(p.cleanliness + 25); message = 'Теперь в комнате чисто!'; }
  else if (type === 'water') { p.mood = clamp(p.mood + 3); message = 'Плюша попила свежей воды 💧'; }
  else if (type === 'sleep') { p.energy = clamp(p.energy + 25); message = 'Плюша немного отдохнула 😴'; }
  else if (type === 'walk') { if (p.energy < 5) throw new Error('Плюше нужно отдохнуть перед прогулкой'); p.energy = clamp(p.energy - 5); p.mood = clamp(p.mood + 8); p.friendship = clamp(p.friendship + 1); message = 'Вы отлично погуляли в саду! 🌷'; }
  else if (type === 'buy' && itemId) {
    const price = prices[itemId]; if (!price) throw new Error('Такого товара нет');
    if (state.inventory.includes(itemId)) throw new Error('Предмет уже куплен');
    if (state.user.carrots < price) throw new Error('Не хватает морковок');
    state.user.carrots -= price; state.inventory.push(itemId); message = 'Покупка успешно совершена!';
  } else if (type === 'equip' && itemId) {
    if (!state.inventory.includes(itemId)) throw new Error('Предмет не найден в инвентаре');
    const roomItems = ['soft_bed','carrot_lamp','tiny_plant','star_rug','bookshelf','moon_mobile','bunny_sofa','carrot_table','cloud_wallpaper'];
    if (roomItems.includes(itemId)) state.room.decor = state.room.decor.includes(itemId) ? state.room.decor.filter(x => x !== itemId) : [...state.room.decor, itemId];
    else state.pet.equipped = state.pet.equipped.includes(itemId) ? state.pet.equipped.filter(x => x !== itemId) : [...state.pet.equipped, itemId];
    message = roomItems.includes(itemId) ? 'Комната Плюши обновлена! 🏡' : 'Образ Плюши обновлён!';
  } else throw new Error('Неизвестное действие');
  state.user.xp += 5;
  state.user.level = Math.floor(state.user.xp / 100) + 1;
  state.lastUpdated = Date.now();
  if (!pool) { memory.set(id, state); return { state, message }; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET carrots=$2,xp=$3,level=$4 WHERE id=$1', [id, state.user.carrots, state.user.xp, state.user.level]);
    await client.query('UPDATE pets SET hunger=$2,mood=$3,energy=$4,cleanliness=$5,friendship=$6,equipped=$7,last_updated=$8 WHERE user_id=$1', [id, p.hunger, p.mood, p.energy, p.cleanliness, p.friendship, JSON.stringify(state.pet.equipped), state.lastUpdated]);
    if (type === 'buy' && itemId) await client.query('INSERT INTO inventory(user_id,item_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, itemId]);
    if (type === 'equip' && itemId) await client.query('UPDATE rooms SET decor=$2 WHERE user_id=$1', [id, JSON.stringify(state.room.decor)]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  return { state, message };
}


export async function updateRoomStyle(id: string, name: string, styleId: string) {
  const style = roomStyles[styleId];
  if (!style) throw new Error('Неизвестный стиль комнаты');
  const state = await getState(id, name);
  const prices: Record<string, number> = { cozy: 0, sky: 120, rose: 120, mint: 150, lavender: 180 };
  const price = prices[styleId];
  if (state.room.theme === styleId) throw new Error('Этот стиль уже установлен');
  if (state.user.carrots < price) throw new Error('Не хватает морковок');
  if (price) state.user.carrots -= price;
  state.room = { ...state.room, ...style };
  state.user.xp += 5; state.user.level = Math.floor(state.user.xp / 100) + 1;
  if (!pool) { memory.set(id, state); return { state, message: `Комната преобразилась! ${styleId === 'cozy' ? '🏡' : '✨'}` }; }
  const c = await pool.connect();
  try { await c.query('BEGIN'); await c.query('UPDATE users SET carrots=$2,xp=$3,level=$4 WHERE id=$1',[id,state.user.carrots,state.user.xp,state.user.level]); await c.query('UPDATE rooms SET wall_color=$2,floor_color=$3,theme=$4 WHERE user_id=$1',[id,style.wallColor,style.floorColor,style.theme]); await c.query('COMMIT'); }
  catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  return { state, message: 'Комната преобразилась! ✨' };
}

export async function claimDailyGift(id: string, name: string) {
  const day = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  if (!pool) {
    const key = `${id}:${day}`;
    if (memoryDailyGift.has(key)) throw new Error('Подарок уже получен сегодня');
    const state = await getState(id,name);
    const previous = memoryStreaks.get(id);
    const streak = previous?.lastDay === yesterday ? previous.streak + 1 : 1;
    const reward = 50 + Math.min(streak - 1, 6) * 10;
    memoryStreaks.set(id, { streak, lastDay: day });
    state.user.carrots += reward; state.user.xp += 10 + Math.min(streak, 7) * 2;
    state.user.level = Math.floor(state.user.xp/100)+1; state.user.dailyGiftClaimed = true; state.user.loginStreak = streak;
    memory.set(id,state); memoryDailyGift.add(key);
    return { state, message: `День ${streak} подряд! Ежедневный подарок: ${reward} морковок 🎁` };
  }
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const row = await c.query('SELECT daily_gift_date,login_streak,last_login_date FROM users WHERE id=$1 FOR UPDATE',[id]);
    if (!row.rowCount) throw new Error('Профиль не найден');
    const u = row.rows[0];
    if (u.daily_gift_date && new Date(u.daily_gift_date).toISOString().slice(0,10) === day) throw new Error('Подарок уже получен сегодня');
    const streak = u.last_login_date && new Date(u.last_login_date).toISOString().slice(0,10) === yesterday ? Number(u.login_streak || 0) + 1 : 1;
    const reward = 50 + Math.min(streak - 1, 6) * 10;
    await c.query('UPDATE users SET carrots=carrots+$2,xp=xp+$3,level=((xp+$3)/100)+1,daily_gift_date=CURRENT_DATE,last_login_date=CURRENT_DATE,login_streak=$4 WHERE id=$1',[id,reward,10+Math.min(streak,7)*2,streak]);
    await c.query('COMMIT');
    return { state: await getState(id,name), message: `День ${streak} подряд! Ежедневный подарок: ${reward} морковок 🎁` };
  } catch(e) { try { await c.query('ROLLBACK'); } catch {} throw e; } finally { c.release(); }
}

export async function claimAchievement(id: string, name: string, achievementId: string) {
  const reward = achievementRewards[achievementId]; if (!reward) throw new Error('Неизвестное достижение');
  const state = await getState(id,name);
  const eligible = achievementId === 'first_touch' ? state.pet.stats.friendship > 12 : achievementId === 'first_game' ? (memoryMiniRewards.get(`${id}:${new Date().toISOString().slice(0,10)}`) || 0) >= 1 || state.user.xp >= 5 : achievementId === 'collector_3' ? state.inventory.length >= 3 : state.user.level >= 3;
  if (!eligible) throw new Error('Достижение ещё не открыто');
  if (!pool) { const key=`${id}:${achievementId}`; if(memoryAchievements.has(key)) throw new Error('Награда уже получена'); memoryAchievements.add(key); state.user.achievements=[...(state.user.achievements||[]),achievementId]; state.user.carrots+=reward; state.user.xp+=15; state.user.level=Math.floor(state.user.xp/100)+1; memory.set(id,state); return {state,message:`Достижение получено! +${reward} 🥕`}; }
  const c=await pool.connect(); try { await c.query('BEGIN'); const q=await c.query("UPDATE users SET carrots=carrots+$2,xp=xp+15,level=((xp+15)/100)+1,achievements=achievements || to_jsonb($3::text) WHERE id=$1 AND NOT (achievements ? $3)",[id,reward,achievementId]); if(!q.rowCount){await c.query('ROLLBACK');throw new Error('Награда уже получена');} await c.query('COMMIT'); return {state:await getState(id,name),message:`Достижение получено! +${reward} 🥕`}; } catch(e){try{await c.query('ROLLBACK')}catch{} throw e;} finally{c.release()}
}

const dailyQuestRewards: Record<string, number> = { feed: 20, pet: 15, play: 25 };

export async function claimQuest(id: string, name: string, questId: string) {
  const reward = dailyQuestRewards[questId];
  if (!reward) throw new Error('Неизвестное задание');
  if (!pool) {
    const day = new Date().toISOString().slice(0, 10);
    const key = `${id}:${questId}:${day}`;
    if (memoryQuestClaims.has(key)) throw new Error('Это задание уже выполнено сегодня');
    const state = await getState(id, name);
    state.user.carrots += reward;
    state.user.xp += 10;
    state.user.level = Math.floor(state.user.xp / 100) + 1;
    state.lastUpdated = Date.now();
    memory.set(id, state);
    memoryQuestClaims.add(key);
    return { state, message: `Получено ${reward} морковок! 🥕` };
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const claimed = await client.query(
      'INSERT INTO user_quests(user_id,quest_id,quest_date) VALUES($1,$2,CURRENT_DATE) ON CONFLICT DO NOTHING RETURNING quest_id',
      [id, questId]
    );
    if (claimed.rowCount === 0) {
      await client.query('ROLLBACK');
      throw new Error('Это задание уже выполнено сегодня');
    }
    await client.query('UPDATE users SET carrots=carrots+$2,xp=xp+10,level=((xp+10)/100)+1 WHERE id=$1', [id, reward]);
    await client.query('COMMIT');
    const state = await getState(id, name);
    return { state, message: `Получено ${reward} морковок! 🥕` };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally { client.release(); }
}


export function startMiniGame(userId: string, gameId = 'catch') {
  const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  if (!['catch','memory','quiz'].includes(gameId)) throw new Error('Неизвестная мини-игра');
  miniSessions.set(userId, { startedAt: Date.now(), nonce, gameId });
  return { nonce, durationSeconds: 20 };
}

export async function finishMiniGame(userId: string, name: string, nonce: string, rawScore: number, gameId = 'catch') {
  const session = miniSessions.get(userId);
  if (!session || session.nonce !== nonce || session.gameId !== gameId) throw new Error('Раунд не найден. Начни игру заново.');
  const elapsed = Date.now() - session.startedAt; miniSessions.delete(userId);
  if (elapsed < (gameId === 'catch' ? 18_000 : 5_000) || elapsed > 120_000) throw new Error('Время раунда некорректно. Попробуй ещё раз.');
  if (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > 100) throw new Error('Некорректный результат.');
  const baseReward = Math.min(gameId === 'catch' ? 30 : 25, Math.floor(rawScore / (gameId === 'memory' ? 1 : 2)));
  if (!pool) {
    const key = `${userId}:${new Date().toISOString().slice(0,10)}`;
    const used = memoryMiniRewards.get(key) || 0; const reward = Math.min(baseReward, Math.max(0,150-used));
    memoryMiniRewards.set(key, used+reward);
    const state = await getState(userId,name); state.user.carrots += reward; state.user.xp += Math.max(1,Math.floor(rawScore/5));
    state.user.level = Math.floor(state.user.xp/100)+1; state.lastUpdated=Date.now(); memory.set(userId,state);
    return { state, reward, message: reward ? `Ты поймал ${rawScore} морковок и получил ${reward} монет! 🥕` : 'Дневной лимит наград исчерпан.' };
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const used = await client.query('SELECT COALESCE(SUM(reward),0)::int AS total FROM minigame_rewards WHERE user_id=$1 AND reward_date=CURRENT_DATE',[userId]);
    const reward = Math.min(baseReward,Math.max(0,150-Number(used.rows[0].total)));
    await client.query('INSERT INTO minigame_rewards(user_id,score,reward) VALUES($1,$2,$3)',[userId,rawScore,reward]);
    await client.query('UPDATE users SET carrots=carrots+$2,xp=xp+$3,level=((xp+$3)/100)+1 WHERE id=$1',[userId,reward,Math.max(1,Math.floor(rawScore/5))]);
    await client.query('COMMIT'); const state=await getState(userId,name);
    return { state,reward,message:reward?`Ты поймал ${rawScore} морковок и получил ${reward} монет! 🥕`:'Дневной лимит наград исчерпан.' };
  } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
