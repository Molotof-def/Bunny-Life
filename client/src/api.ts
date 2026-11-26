import type { ActionResult, GameState } from './types';

const API = import.meta.env.VITE_API_URL || '';
let token = sessionStorage.getItem('bunny_token') || '';

export function getTelegramInitData() {
  return (window as any).Telegram?.WebApp?.initData || '';
}
export async function authenticate(): Promise<GameState> {
  const initData = getTelegramInitData();
  const res = await fetch(`${API}/api/auth/telegram`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Не удалось войти');
  const data = await res.json();
  token = data.token;
  sessionStorage.setItem('bunny_token', token);
  return data.state;
}
export async function loadState(): Promise<GameState> {
  const res = await fetch(`${API}/api/game`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Не удалось загрузить сохранение');
  return res.json();
}
export async function action(type: string, itemId?: string): Promise<ActionResult> {
  const res = await fetch(`${API}/api/game/action`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type, itemId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Действие не выполнено');
  return data;
}

export async function claimQuest(questId: string): Promise<ActionResult> {
  const res = await fetch(`${API}/api/game/quest/claim`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ questId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось получить награду');
  return data;
}

export async function startMiniGame(): Promise<{nonce:string;durationSeconds:number}> { const r=await fetch(`${API}/api/game/minigame/start`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Не удалось начать игру'); return d; }
export async function finishMiniGame(nonce:string,score:number): Promise<ActionResult & {reward:number}> { const r=await fetch(`${API}/api/game/minigame/finish`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({nonce,score})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Не удалось завершить игру'); return d; }

export async function startGame(gameId: string): Promise<{nonce:string;durationSeconds:number}> { const r=await fetch(`${API}/api/game/minigame/start`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({gameId})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Не удалось начать игру'); return d; }
export async function finishGame(nonce:string,score:number,gameId:string): Promise<ActionResult & {reward:number}> { const r=await fetch(`${API}/api/game/minigame/finish`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({nonce,score,gameId})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Не удалось завершить игру'); return d; }
export async function changeRoom(styleId:string): Promise<ActionResult> { const r=await fetch(`${API}/api/game/room/style`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({styleId})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Не удалось изменить комнату'); return d; }
export async function dailyGift(): Promise<ActionResult> { const r=await fetch(`${API}/api/game/daily-gift`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Подарок недоступен'); return d; }
export async function achievement(id:string): Promise<ActionResult> { const r=await fetch(`${API}/api/game/achievement`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({achievementId:id})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Награда недоступна'); return d; }

export type SocialState = { friendCode:string; friends:{code:string;name:string;level:number}[]; incoming:{id:number;code:string;name:string;level:number}[]; outgoing:{id:number;code:string;name:string;level:number}[] };
export async function loadSocial():Promise<SocialState>{const r=await fetch(`${API}/api/social`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось загрузить друзей');return d;}
export async function sendFriendRequest(code:string):Promise<SocialState>{const r=await fetch(`${API}/api/social/request`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({code})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось отправить заявку');return d;}
export async function answerFriendRequest(requestId:number,accept:boolean):Promise<SocialState>{const r=await fetch(`${API}/api/social/respond`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({requestId,accept})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось обработать заявку');return d;}


export type FriendRoom = { name:string; level:number; petName:string; decor:string[]; wallColor:string; floorColor:string; theme:string; equipped:string[] };
export async function visitFriendRoom(code:string):Promise<FriendRoom>{const r=await fetch(`${API}/api/social/visit/${encodeURIComponent(code)}`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось посетить комнату');return d;}
export async function giftCarrots(code:string,amount:number):Promise<{state:GameState;message:string}>{const r=await fetch(`${API}/api/social/gift`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({code,amount})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось отправить подарок');return d;}


export type WorldState = { finds:{id:string;name:string;emoji:string;points:number;carrots:number}[]; collected:string[]; season:{name:string;points:number;endsAt:string}; leaderboard:{name:string;level:number;xp:number}[]; notifications:{id:number;kind:string;message:string;created_at:string;read_at?:string|null}[] };
export async function loadWorld():Promise<WorldState>{const r=await fetch(`${API}/api/world`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось загрузить мир');return d;}
export async function collectFind(findId:string):Promise<{state:GameState;world:WorldState;reward:number}>{const r=await fetch(`${API}/api/world/collect`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({findId})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось собрать находку');return d;}
export async function readNotifications():Promise<void>{await fetch(`${API}/api/notifications/read`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});}
