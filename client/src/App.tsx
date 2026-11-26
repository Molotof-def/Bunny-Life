import { useEffect, useMemo, useState } from 'react';
import { Heart, Utensils, Gamepad2, Sparkles, Droplets, ShoppingBag, House, Trophy, UserRound, Backpack, Star, Coins, LoaderCircle, Users, Copy } from 'lucide-react';
import RabbitScene from './RabbitScene';
import { action, authenticate, claimQuest, startMiniGame, finishMiniGame, startGame, finishGame, changeRoom, dailyGift, achievement, loadSocial, sendFriendRequest, answerFriendRequest } from './api';
import type { GameState } from './types';
import { visitFriendRoom, giftCarrots } from './api';
import type { SocialState, FriendRoom, WorldState } from './api';
import { loadWorld, collectFind } from './api';

const initial: GameState = {
  user: { id: 'demo', name: 'Гость', level: 1, carrots: 250, xp: 0, loginStreak: 0 },
  pet: { name: 'Плюша', stats: { hunger: 82, mood: 91, energy: 76, cleanliness: 88, friendship: 12 }, equipped: [] },
  inventory: [], room: { decor: [], wallColor: '#f4e7dc', floorColor: '#e8d6c5', theme: 'cozy' }, lastUpdated: Date.now()
};
const shop = [
  { id: 'pink_bow', name: 'Розовый бантик', emoji: '🎀', price: 80, category: 'accessory', description: 'Милый аксессуар для Плюши' },
  { id: 'round_glasses', name: 'Круглые очки', emoji: '👓', price: 120, category: 'accessory', description: 'Самый умный кролик района' },
  { id: 'flower_crown', name: 'Венок из цветов', emoji: '🌼', price: 180, category: 'accessory', description: 'Немного весеннего настроения' },
  { id: 'soft_bed', name: 'Мягкая кроватка', emoji: '🛏️', price: 150, category: 'room', description: 'Место для сладкого сна' },
  { id: 'carrot_lamp', name: 'Морковная лампа', emoji: '🥕', price: 100, category: 'room', description: 'Уютный свет в комнате' },
  { id: 'tiny_plant', name: 'Комнатный цветок', emoji: '🪴', price: 90, category: 'room', description: 'Зелёный уголок' },
  { id: 'blue_scarf', name: 'Голубой шарфик', emoji: '🧣', price: 130, category: 'accessory', description: 'Тёплый образ для прогулки' },
  { id: 'star_rug', name: 'Коврик со звёздами', emoji: '🌟', price: 110, category: 'room', description: 'Мягкое место для игр' },
  { id: 'bookshelf', name: 'Мини-библиотека', emoji: '📚', price: 170, category: 'room', description: 'Полка с любимыми книжками' },
  { id: 'moon_mobile', name: 'Лунный мобиль', emoji: '🌙', price: 145, category: 'room', description: 'Спокойная атмосфера перед сном' },
  { id: 'bunny_sofa', name: 'Диванчик', emoji: '🛋️', price: 220, category: 'room', description: 'Место для уютного отдыха' },
  { id: 'carrot_table', name: 'Морковный столик', emoji: '🪵', price: 190, category: 'room', description: 'Маленький столик для комнаты' },
  { id: 'cloud_wallpaper', name: 'Обои «Облачка»', emoji: '☁️', price: 260, category: 'room', description: 'Преобрази стены в нежное небо' }
] as const;

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return <div className="stat"><div className="stat-top"><span>{icon} {label}</span><b>{Math.round(value)}%</b></div><div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}
function CarrotCatch({ authenticated, onReward, onNotice }: { authenticated: boolean; onReward: (nonce: string, score: number) => Promise<void>; onNotice: (message: string) => void }) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(20);
  const [score, setScore] = useState(0);
  const [nonce, setNonce] = useState('');
  const [target, setTarget] = useState({ left: 50, top: 50, emoji: '🥕' });
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (running && seconds === 0) { setRunning(false); void onReward(nonce, score); }
  }, [running, seconds, nonce, score, onReward]);
  async function begin() {
    if (starting || running) return;
    setStarting(true);
    try {
      const session = authenticated ? await startMiniGame() : { nonce: 'demo', durationSeconds: 20 };
      setNonce(session.nonce); setSeconds(session.durationSeconds); setScore(0); setRunning(true);
      onNotice('Лови морковки! У тебя 20 секунд 🥕');
    } catch (e) { onNotice(e instanceof Error ? e.message : 'Не удалось начать игру'); }
    finally { setStarting(false); }
  }
  function catchCarrot() {
    if (!running) return;
    setScore(v => Math.min(100, v + 1));
    setTarget({ left: 8 + Math.random() * 78, top: 10 + Math.random() * 72, emoji: Math.random() > .84 ? '✨' : '🥕' });
  }
  return <section className="page-section">
    <span className="eyebrow">МИНИ-ИГРА · НАГРАДЫ</span><h2>Морковный переполох</h2>
    <p className="muted">Лови морковки за 20 секунд. Чем больше поймаешь, тем больше монет получишь.</p>
    <div className="game-score-row"><div><small>ВРЕМЯ</small><b>{seconds}с</b></div><div><small>ПОЙМАНО</small><b>{score}</b></div><div><small>НАГРАДА</small><b>до 30 🥕</b></div></div>
    <div className={`catch-field ${running ? 'is-running' : ''}`}>
      {running ? <button className="catch-target" style={{ left: `${target.left}%`, top: `${target.top}%` }} onClick={catchCarrot}>{target.emoji}</button> : <div className="game-start-copy"><span>🥕🐰🥕</span><b>Готов проверить ловкость?</b><small>Нажимай на морковку, пока не закончится время</small></div>}
    </div>
    <button className="game-start" disabled={running || starting} onClick={begin}>{running ? 'Игра идёт…' : starting ? 'Подготовка…' : 'Играть за морковки'}</button>
    <p className="game-footnote">Награда: 1 монета за каждые 2 очка, максимум 30 за раунд. Дневной лимит — 150 монет.</p>
  </section>;
}

function ExtraGames({ authenticated, onReward, onNotice }: { authenticated:boolean; onReward:(nonce:string,score:number,gameId:string)=>Promise<void>; onNotice:(s:string)=>void }) {
  const [mode,setMode]=useState<'memory'|'quiz'>('memory');
  const [nonce,setNonce]=useState(''); const [started,setStarted]=useState(false); const [score,setScore]=useState(0); const [round,setRound]=useState(0);
  const [sequence,setSequence]=useState<number[]>([]); const [input,setInput]=useState<number[]>([]); const [question,setQuestion]=useState(0); const [preview,setPreview]=useState(false);
  const questions=[{q:'Что больше всего любит кролик?',a:['Морковку','Пиццу','Лимонад'],correct:0},{q:'Как называется домик кролика?',a:['Аквариум','Крольчатник','Террариум'],correct:1},{q:'Когда кролики обычно отдыхают?',a:['Никогда','Только зимой','В течение дня'],correct:2}];
  async function begin(){try{const s=authenticated?await startGame(mode):{nonce:'demo-'+Date.now(),durationSeconds:30};setNonce(s.nonce);setStarted(true);setScore(0);setRound(0);setInput([]);setSequence(Array.from({length:4},()=>Math.floor(Math.random()*4)));setPreview(mode==='memory');window.setTimeout(()=>setPreview(false),1800);setQuestion(0);onNotice(mode==='memory'?'Запомни последовательность и повтори её!':'Ответь на три вопроса о кроликах!');}catch(e){onNotice(e instanceof Error?e.message:'Ошибка запуска');}}
  async function end(finalScore:number){setStarted(false);await onReward(nonce,finalScore,mode);}
  function memoryTap(n:number){if(!started||preview)return;const next=[...input,n];setInput(next);const idx=next.length-1;if(sequence[idx]!==n){void end(score);return;}if(next.length===sequence.length){const nextScore=score+10;setScore(nextScore);setRound(v=>v+1);setInput([]);setSequence(Array.from({length:Math.min(7,4+round+1)},()=>Math.floor(Math.random()*4)));if(round>=2)void end(nextScore);}}
  function answer(n:number){if(!started)return;const q=questions[question];if(n===q.correct){const next=score+10;setScore(next);if(question===2)void end(next);else setQuestion(v=>v+1);}else void end(score);}
  return <section className="page-section extra-game"><span className="eyebrow">ЕЩЁ БОЛЬШЕ РАЗВЛЕЧЕНИЙ</span><h2>{mode==='memory'?'Память кролика':'Кроличья викторина'}</h2><div className="game-switch"><button className={mode==='memory'?'selected':''} onClick={()=>{setMode('memory');setStarted(false)}}>🧠 Память</button><button className={mode==='quiz'?'selected':''} onClick={()=>{setMode('quiz');setStarted(false)}}>❔ Викторина</button></div>
    {!started?<div className="extra-game-start"><div>{mode==='memory'?'🧠✨':'🐰❔'}</div><b>{mode==='memory'?'Повтори комбинацию из четырёх кнопок':'Проверь, что знаешь о кроликах'}</b><p className="muted">За правильные ответы и раунды начисляется опыт и морковки.</p><button className="game-start" onClick={begin}>Начать игру</button></div>:mode==='memory'?<><p className="muted">Раунд {round+1} · Правильных очков: {score}</p><div className="memory-preview">{preview?`Запомни: ${sequence.map(i=>['🍓','🥕','🌼','⭐'][i]).join(' ')}`:'Теперь повтори последовательность'}</div><div className="memory-grid">{['🍓','🥕','🌼','⭐'].map((e,i)=><button key={i} onClick={()=>memoryTap(i)}>{e}</button>)}</div><small>Повтори последовательность. Ошибка завершит раунд.</small></>:<><p className="muted">Вопрос {question+1} из 3 · Очки {score}</p><h3>{questions[question].q}</h3><div className="quiz-answers">{questions[question].a.map((a,i)=><button key={a} onClick={()=>answer(i)}>{a}</button>)}</div></>}
  </section>;
}

export default function App() {
  const [state, setState] = useState<GameState>(initial);
  const [tab, setTab] = useState('home');
  const [worldPlace, setWorldPlace] = useState<'garden'|'playroom'|'cafe'|'forest'|'lake'|'market'>('garden');
  const [visiting, setVisiting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Плюша ждёт тебя!');
  const [authenticated, setAuthenticated] = useState(false);
  const [demo, setDemo] = useState(false);
  const [social, setSocial] = useState<SocialState | null>(null);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [socialBusy, setSocialBusy] = useState(false);
  const [friendRoom, setFriendRoom] = useState<FriendRoom | null>(null);
  const [worldData, setWorldData] = useState<WorldState | null>(null);
  const [worldBusy, setWorldBusy] = useState(false);
  const [questDone, setQuestDone] = useState<string[]>([]);
  const xpProgress = useMemo(() => state.user.xp % 100, [state.user.xp]);

  useEffect(() => {
    authenticate().then(async s => { setState(s); setClaimedAchievements(s.user.achievements || []); setGiftClaimed(!!s.user.dailyGiftClaimed); setAuthenticated(true); try { setSocial(await loadSocial()); } catch {} }).catch(() => { setDemo(true); });
  }, []);

  useEffect(() => { if (authenticated && tab === 'world') loadWorld().then(setWorldData).catch(e=>setNotice(e instanceof Error?e.message:'Ошибка мира')); }, [authenticated, tab]);

  async function pickWorldFind(id:string) { if(worldBusy) return; setWorldBusy(true); try { const result=await collectFind(id); setState(result.state); setWorldData(result.world); setNotice(`Находка собрана! +${result.reward} 🥕`); } catch(e) { setNotice(e instanceof Error?e.message:'Не удалось собрать'); } finally { setWorldBusy(false); } }

  async function doAction(type: string, itemId?: string) {
    if (busy) return;
    setBusy(true);
    try {
      if (authenticated) {
        const result = await action(type, itemId);
        setState(result.state); setNotice(result.message);
      } else {
        setState(prev => {
          const s = structuredClone(prev);
          const p = s.pet.stats;
          if (type === 'feed') { p.hunger = Math.min(100, p.hunger + 22); s.user.carrots = Math.max(0, s.user.carrots - 10); }
          if (type === 'pet') { p.mood = Math.min(100, p.mood + 8); p.friendship = Math.min(100, p.friendship + 2); }
          if (type === 'play') { p.mood = Math.min(100, p.mood + 15); p.energy = Math.max(0, p.energy - 10); p.friendship = Math.min(100, p.friendship + 4); }
          if (type === 'clean') p.cleanliness = Math.min(100, p.cleanliness + 25);
          if (type === 'water') p.mood = Math.min(100, p.mood + 3);
          if (type === 'sleep') p.energy = Math.min(100, p.energy + 25);
          if (type === 'walk') { p.energy = Math.max(0, p.energy - 5); p.mood = Math.min(100, p.mood + 8); p.friendship = Math.min(100, p.friendship + 1); }
          if (type === 'buy' && itemId) {
            const item = shop.find(x => x.id === itemId);
            if (item && s.user.carrots >= item.price && !s.inventory.includes(itemId)) { s.user.carrots -= item.price; s.inventory.push(itemId); }
          }
          if (type === 'equip' && itemId) { const item = shop.find(x => x.id === itemId); if (item?.category === 'room') s.room.decor = s.room.decor.includes(itemId) ? s.room.decor.filter(x => x !== itemId) : [...s.room.decor, itemId]; else s.pet.equipped = s.pet.equipped.includes(itemId) ? s.pet.equipped.filter(x => x !== itemId) : [...s.pet.equipped, itemId]; }
          
          s.user.xp += 5;
          return s;
        });
        setNotice(type === 'walk' ? 'Вы отлично погуляли в саду! 🌷' : type === 'feed' ? 'Ням-ням! Плюша подкрепилась 🥕' : type === 'pet' ? 'Плюша довольно урчит 💗' : type === 'play' ? 'Вы отлично поиграли!' : type === 'clean' ? 'Теперь в комнате чисто!' : type === 'sleep' ? 'Плюша немного отдохнула 😴' : 'Готово!');
      }
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Ошибка'); }
    finally { setBusy(false); }
  }
  async function handleMiniGameReward(nonce: string, score: number, gameId = 'catch') {
    try {
      if (authenticated) {
        const result = gameId === 'catch' ? await finishMiniGame(nonce, score) : await finishGame(nonce, score, gameId);
        setState(result.state); setNotice(result.message);
      } else {
        const reward = Math.min(30, Math.floor(score / 2));
        setState(old => ({ ...old, user: { ...old.user, carrots: old.user.carrots + reward, xp: old.user.xp + Math.max(1, Math.floor(score / 5)), level: Math.floor((old.user.xp + Math.max(1, Math.floor(score / 5))) / 100) + 1 } }));
        setNotice(`Игра завершена! +${reward} морковок 🥕`);
      }
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Не удалось получить награду'); }
  }
  const [giftClaimed,setGiftClaimed]=useState(false);
  const [claimedAchievements,setClaimedAchievements]=useState<string[]>([]);
  async function getDailyGift(){try{if(authenticated){const r=await dailyGift();setState(r.state);setNotice(r.message);}else{if(giftClaimed){setNotice('Подарок уже получен сегодня');return;}setState(v=>({...v,user:{...v.user,carrots:v.user.carrots+50,xp:v.user.xp+12,loginStreak:(v.user.loginStreak||0)+1,level:Math.floor((v.user.xp+12)/100)+1}}));setNotice('Ежедневный подарок: +50 морковок! 🎁');}setGiftClaimed(true);}catch(e){setNotice(e instanceof Error?e.message:'Подарок недоступен');}}
  async function claimAch(id:string,reward:number){if(claimedAchievements.includes(id))return;try{if(authenticated){const r=await achievement(id);setState(r.state);setNotice(r.message);}else{setState(v=>({...v,user:{...v.user,carrots:v.user.carrots+reward,xp:v.user.xp+15,level:Math.floor((v.user.xp+15)/100)+1}}));setNotice(`Достижение получено! +${reward} 🥕`);}setClaimedAchievements(v=>[...v,id]);}catch(e){setNotice(e instanceof Error?e.message:'Награда пока недоступна');}}
  async function setRoomTheme(id:string,price:number){try{if(authenticated){const r=await changeRoom(id);setState(r.state);setNotice(r.message);}else{if(state.user.carrots<price){setNotice('Не хватает морковок');return;}const themes:any={cozy:['#f4e7dc','#e8d6c5'],sky:['#dceaf4','#d8e2e8'],rose:['#f3dce4','#ead1d5'],mint:['#dcebe0','#d1dfd1'],lavender:['#e7def2','#d9d0e6']};setState(v=>({...v,user:{...v.user,carrots:v.user.carrots-price},room:{...v.room,wallColor:themes[id][0],floorColor:themes[id][1],theme:id}}));setNotice('Новый стиль комнаты применён! ✨');}}catch(e){setNotice(e instanceof Error?e.message:'Не удалось сменить стиль');}}
  async function addFriend(){if(!authenticated){setNotice('Друзья появятся после запуска через Telegram с подключённой базой данных.');return;}if(socialBusy)return;setSocialBusy(true);try{setSocial(await sendFriendRequest(friendCodeInput));setFriendCodeInput('');setNotice('Заявка отправлена! ✉️');}catch(e){setNotice(e instanceof Error?e.message:'Ошибка');}finally{setSocialBusy(false);}}
  async function replyFriend(id:number,accept:boolean){if(socialBusy)return;setSocialBusy(true);try{setSocial(await answerFriendRequest(id,accept));setNotice(accept?'Теперь вы друзья! 🐰':'Заявка отклонена');}catch(e){setNotice(e instanceof Error?e.message:'Ошибка');}finally{setSocialBusy(false);}}
  function copyFriendCode(){if(social?.friendCode){void navigator.clipboard?.writeText(social.friendCode);setNotice('Код друга скопирован!');}}
  async function openFriendRoom(code:string){if(socialBusy)return;setSocialBusy(true);try{setFriendRoom(await visitFriendRoom(code));setNotice('Ты в гостях! Осматривай комнату друга 🏡');}catch(e){setNotice(e instanceof Error?e.message:'Не удалось посетить комнату');}finally{setSocialBusy(false);}}
  async function giftFriend(code:string){if(socialBusy)return;setSocialBusy(true);try{const r=await giftCarrots(code,10);setState(r.state);setNotice(r.message);}catch(e){setNotice(e instanceof Error?e.message:'Не удалось отправить подарок');}finally{setSocialBusy(false);}}

  const s = state.pet.stats;
  const quests = [
    { id: 'feed', title: 'Покорми Плюшу', reward: 20, action: 'feed' },
    { id: 'pet', title: 'Погладь кролика', reward: 15, action: 'pet' },
    { id: 'play', title: 'Поиграй вместе', reward: 25, action: 'play' }
  ];
  async function completeQuest(id: string, actionType: string) {
    if (questDone.includes(id) || busy) return;
    setBusy(true);
    try {
      if (authenticated) {
        const performed = await action(actionType);
        const claimed = await claimQuest(id);
        setState(claimed.state);
        setNotice(`${performed.message} ${claimed.message}`);
      } else {
        setState(old => {
          const next = structuredClone(old);
          const p = next.pet.stats;
          if (actionType === 'feed') { p.hunger = Math.min(100, p.hunger + 22); next.user.carrots = Math.max(0, next.user.carrots - 10); }
          if (actionType === 'pet') { p.mood = Math.min(100, p.mood + 8); p.friendship = Math.min(100, p.friendship + 2); }
          if (actionType === 'play') { p.mood = Math.min(100, p.mood + 15); p.energy = Math.max(0, p.energy - 10); p.friendship = Math.min(100, p.friendship + 4); }
          next.user.carrots += quests.find(q => q.id === id)?.reward || 0;
          next.user.xp += 15;
          return next;
        });
        setNotice('Задание выполнено! Награда получена 🥕');
      }
      setQuestDone(old => [...old, id]);
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Не удалось выполнить задание'); }
    finally { setBusy(false); }
  }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-icon">🐰</div><div><b>BUNNY LIFE</b><small>ТВОЙ МАЛЕНЬКИЙ МИР</small></div></div>
      <div className="wallet"><Coins size={16}/><b>{state.user.carrots}</b></div>
    </header>
    {demo && <div className="demo-banner">Демо-режим · прогресс пока хранится только в этой сессии</div>}
    <section className="welcome"><div><span className="eyebrow">ТВОЙ ПИТОМЕЦ</span><h1>Привет, {state.user.name}!</h1><p>Плюша рада тебя видеть</p></div><div className="level">УР. {state.user.level}<div className="levelbar"><i style={{width:`${xpProgress}%`}}/></div></div></section>
    {tab === 'home' && <>
      <RabbitScene equipped={state.pet.equipped} decor={state.room.decor} mood={s.mood} wallColor={state.room.wallColor} floorColor={state.room.floorColor} onPetTap={() => { void doAction('pet'); setNotice('Плюша рада ласке! 💗'); }} />
      <div className="pet-name"><div><h2>Плюша <span>✦</span></h2><p>{notice}</p></div><div className="heart-bubble"><Heart size={18} fill="#ec91a1" color="#ec91a1"/></div></div>
      {state.room.decor.length > 0 && <div className="room-status">🏡 Комната украшена: {state.room.decor.length} предмета</div>}
      <section className="stats-grid">
        <Stat label="Сытость" value={s.hunger} icon="🥕"/><Stat label="Настроение" value={s.mood} icon="😊"/>
        <Stat label="Энергия" value={s.energy} icon="⚡"/><Stat label="Чистота" value={s.cleanliness} icon="🫧"/>
        <Stat label="Дружба" value={s.friendship} icon="💗"/>
      </section>
      <section className="actions">
        <button onClick={() => doAction('feed')}><span>🥕</span>Покормить</button>
        <button onClick={() => doAction('pet')}><span>💗</span>Погладить</button>
        <button onClick={() => doAction('play')}><span>🎾</span>Играть</button>
        <button onClick={() => doAction('clean')}><span>🧹</span>Убраться</button>
        <button onClick={() => doAction('water')}><span>💧</span>Напоить</button>
        <button onClick={() => doAction('sleep')}><span>🌙</span>Отдых</button>
      </section>
      <div className="home-shortcuts"><button onClick={getDailyGift} disabled={giftClaimed || !!state.user.dailyGiftClaimed}>🎁 Ежедневный подарок <span>{giftClaimed || state.user.dailyGiftClaimed ? 'Уже получен сегодня' : `Серия: ${state.user.loginStreak || 0} дней · забрать`}</span></button><button onClick={() => setTab('games')}>🎮 Играть в мини-игры <span>Зарабатывай морковки</span></button><button onClick={() => setTab('room')}>🏡 Изменить комнату <span>Расставляй мебель</span></button></div>
    </>}
    {tab === 'world' && <section className="page-section"><span className="eyebrow">МИР ПЛЮШИ</span><h2>{visiting ? `В гостях у ${visiting}` : worldPlace==='garden'?'Прогулка в саду':worldPlace==='forest'?'Тихий лес':worldPlace==='lake'?'Озеро':worldPlace==='market'?'Кроличья площадь':worldPlace==='playroom'?'Игровая комната':'Кроличье кафе'}</h2><div className="world-tabs">{[{id:'garden',name:'🌷 Сад'},{id:'forest',name:'🌲 Лес'},{id:'lake',name:'🦆 Озеро'},{id:'market',name:'🏡 Площадь'},{id:'playroom',name:'🧸 Игровая'},{id:'cafe',name:'☕ Кафе'}].map(x=><button key={x.id} className={!visiting&&worldPlace===x.id?'selected':''} onClick={()=>{setVisiting(null);setWorldPlace(x.id as any)}}>{x.name}</button>)}</div><RabbitScene place={visiting?'room':worldPlace} visitor={!!visiting} equipped={state.pet.equipped} decor={state.room.decor} mood={s.mood} wallColor={state.room.wallColor} floorColor={state.room.floorColor} onPetTap={()=>{void doAction('pet');setNotice('Плюша рада вниманию! 💗')}}/>{!visiting&&['garden','forest','lake','market'].includes(worldPlace)&&<><p className="muted">Отправляйтесь на свежий воздух! Исследование района поднимает настроение, но тратит немного энергии.</p><button className="game-start" disabled={busy||s.energy<5} onClick={()=>doAction('walk')}>{worldPlace==='forest'?'🌲 Исследовать лес':worldPlace==='lake'?'🦆 Прогуляться у озера':worldPlace==='market'?'🏡 Заглянуть на площадь':'🌿 Погулять с Плюшей'} · −5 энергии</button></>}{!visiting&&<><h3>Соседи Плюши</h3><p className="muted">Загляни в гости к другим кроликам. Это игровые персонажи мира BUNNY LIFE.</p><div className="neighbor-grid">{[{name:'Милка',emoji:'🐰',desc:'Любит цветы и тихие вечера',color:'#f4dce6'},{name:'Пончик',emoji:'🐇',desc:'Обожает играть и прыгать',color:'#e9dfd2'},{name:'Облачко',emoji:'🐰',desc:'Коллекционирует мягкие игрушки',color:'#dceaf4'}].map(f=><button className="neighbor-card" key={f.name} onClick={()=>{setVisiting(f.name);setNotice(`Вы пришли в гости к ${f.name}!`)}}><span style={{background:f.color}}>{f.emoji}</span><b>{f.name}</b><small>{f.desc}</small><i>Посетить дом →</i></button>)}</div></>}{visiting&&<button className="game-start" onClick={()=>setVisiting(null)}>← Вернуться в свой мир</button>}</section>}
    {tab === 'world' && <section className="page-section world-expansion"><div className="section-heading"><div><span className="eyebrow">СЕЗОННОЕ СОБЫТИЕ</span><h2>Неделя уютных открытий</h2></div><span className="pill">✨ {worldData?.season.points || 0} очков</span></div><p className="muted">Каждый день исследуй мир и находи редкие вещи. Прогресс и награды сохраняются на сервере.</p><div className="event-banner"><span>🌈</span><div><b>{worldData?.season.name || 'Загружаем событие...'}</b><small>Собирай находки, получай морковки и поднимайся в сезонном рейтинге.</small></div></div><h3>Находки дня</h3><div className="shop-grid">{(worldData?.finds || [{id:'clover',name:'Счастливый клевер',emoji:'☘️',points:5,carrots:18},{id:'pearl',name:'Розовая жемчужина',emoji:'🦪',points:8,carrots:24},{id:'star',name:'Звёздная пыльца',emoji:'✨',points:10,carrots:30}]).map(f=><article className="shop-card" key={f.id}><div className="item-art">{f.emoji}</div><b>{f.name}</b><p>+{f.points} очков · +{f.carrots} 🥕</p><button disabled={!authenticated||worldBusy||!!worldData?.collected.includes(f.id)} onClick={()=>pickWorldFind(f.id)}>{worldData?.collected.includes(f.id)?'Найдено сегодня ✓':authenticated?'Собрать':'Войди через Telegram'}</button></article>)}</div><h3>🏆 Рейтинг игроков</h3>{!worldData?.leaderboard.length?<p className="muted">Рейтинг появится, когда игроки начнут набирать опыт.</p>:worldData.leaderboard.map((p,i)=><article className="quest" key={`${p.name}-${i}`}><div className="quest-icon">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div><div className="quest-info"><b>{p.name}</b><small>Уровень {p.level} · {p.xp} XP</small></div></article>)}<h3>🔔 Уведомления</h3>{!worldData?.notifications.length?<p className="muted">Пока новых уведомлений нет.</p>:worldData.notifications.map(n=><article className="quest" key={n.id}><div className="quest-icon">{n.kind==='gift'?'🎁':n.kind==='friend'?'🐰':'✨'}</div><div className="quest-info"><b>{n.message}</b><small>{new Date(n.created_at).toLocaleString('ru-RU')}</small></div></article>)}</section>}
    {tab === 'games' && <><CarrotCatch authenticated={authenticated} onReward={handleMiniGameReward} onNotice={setNotice} /><ExtraGames authenticated={authenticated} onReward={handleMiniGameReward} onNotice={setNotice}/></>}
    {tab === 'room' && <section className="page-section"><span className="eyebrow">ТВОЁ УЮТНОЕ МЕСТО</span><h2>Комната Плюши</h2><RabbitScene equipped={state.pet.equipped} decor={state.room.decor} mood={s.mood} wallColor={state.room.wallColor} floorColor={state.room.floorColor}/><p className="muted">Меняй стены и пол, покупай мебель и создавай свой стиль.</p><h3>Стиль комнаты</h3><div className="theme-grid">{[{id:'cozy',name:'Уютная',price:0,swatch:'#f4e7dc'},{id:'sky',name:'Небесная',price:120,swatch:'#dceaf4'},{id:'rose',name:'Розовая',price:120,swatch:'#f3dce4'},{id:'mint',name:'Мятная',price:150,swatch:'#dcebe0'},{id:'lavender',name:'Лавандовая',price:180,swatch:'#e7def2'}].map(t=><button key={t.id} className={state.room.theme===t.id?'current':''} onClick={()=>setRoomTheme(t.id,t.price)}><i style={{background:t.swatch}}/><b>{t.name}</b><small>{t.price===0?'Бесплатно':`🥕 ${t.price}`}</small></button>)}</div>{state.inventory.filter(id => ['soft_bed','carrot_lamp','tiny_plant','star_rug','bookshelf','moon_mobile','bunny_sofa','carrot_table','cloud_wallpaper'].includes(id)).length === 0 ? <div className="empty"><span>🪑</span><b>Пока нет мебели</b><p>Заработай морковки в мини-играх и купи первые украшения.</p><button onClick={() => setTab('shop')}>Открыть магазин</button></div> : <div className="shop-grid">{state.inventory.filter(id => ['soft_bed','carrot_lamp','tiny_plant','star_rug','bookshelf','moon_mobile','bunny_sofa','carrot_table','cloud_wallpaper'].includes(id)).map(id => { const item=shop.find(x=>x.id===id)!; const placed=state.room.decor.includes(id); return <article className="shop-card" key={id}><div className="item-art">{item.emoji}</div><b>{item.name}</b><button onClick={() => doAction('equip',id)}>{placed?'Убрать из комнаты':'Поставить в комнату'}</button></article>; })}</div>}</section>}
    {tab === 'shop' && <section className="page-section"><div className="section-heading"><div><span className="eyebrow">МАЛЕНЬКИЕ РАДОСТИ</span><h2>Магазин</h2></div><span className="pill">🥕 {state.user.carrots}</span></div><div className="shop-grid">{shop.map(item => {
      const owned = state.inventory.includes(item.id);
      return <article className="shop-card" key={item.id}><div className="item-art">{item.emoji}</div><b>{item.name}</b><p>{item.description}</p><button disabled={owned || state.user.carrots < item.price || busy} onClick={() => doAction('buy', item.id)}>{owned ? 'Куплено ✓' : `🥕 ${item.price}`}</button></article>;
    })}</div></section>}
    {tab === 'inventory' && <section className="page-section"><span className="eyebrow">ТВОИ СОКРОВИЩА</span><h2>Инвентарь</h2>{state.inventory.length === 0 ? <div className="empty"><span>🎒</span><b>Пока здесь пусто</b><p>Загляни в магазин за первым подарком для Плюши</p><button onClick={() => setTab('shop')}>Открыть магазин</button></div> : <div className="shop-grid">{state.inventory.map(id => { const item = shop.find(x => x.id === id)!; const equipped = item.category === 'room' ? state.room.decor.includes(id) : state.pet.equipped.includes(id); return <article className="shop-card" key={id}><div className="item-art">{item.emoji}</div><b>{item.name}</b><button onClick={() => doAction('equip', id)}>{equipped ? 'Убрать' : item.category === 'room' ? 'Поставить' : 'Надеть'}</button></article>; })}</div>}</section>}
    {tab === 'quests' && <section className="page-section"><span className="eyebrow">НЕБОЛЬШИЕ ДЕЛА</span><h2>Задания дня</h2><p className="muted">Забота о Плюше приносит морковки.</p>{quests.map(q => <article className="quest" key={q.id}><div className="quest-icon">✨</div><div className="quest-info"><b>{q.title}</b><small>Награда: 🥕 {q.reward}</small></div><button disabled={questDone.includes(q.id)} onClick={() => completeQuest(q.id, q.action)}>{questDone.includes(q.id) ? 'Готово ✓' : 'Забрать'}</button></article>)}</section>}
    {tab === 'achievements' && <section className="page-section"><span className="eyebrow">МАЛЕНЬКИЕ ПОБЕДЫ</span><h2>Достижения</h2><p className="muted">Выполняй игровые цели и получай редкие награды.</p>{[{id:'first_touch',title:'Первое знакомство',desc:'Подружись с Плюшей',reward:25,ok:s.friendship>12},{id:'first_game',title:'Игрок',desc:'Получи опыт за игру',reward:40,ok:state.user.xp>=5},{id:'collector_3',title:'Коллекционер',desc:'Собери 3 предмета',reward:60,ok:state.inventory.length>=3},{id:'level_3',title:'Большой друг',desc:'Достигни 3 уровня',reward:80,ok:state.user.level>=3}].map(a=><article className="quest" key={a.id}><div className="quest-icon">🏆</div><div className="quest-info"><b>{a.title}</b><small>{a.desc} · 🥕 {a.reward}</small></div><button disabled={!a.ok||claimedAchievements.includes(a.id)} onClick={()=>claimAch(a.id,a.reward)}>{claimedAchievements.includes(a.id)?'Получено ✓':a.ok?'Забрать':'Закрыто'}</button></article>)}</section>}
    {tab === 'friends' && <section className="page-section"><span className="eyebrow">ТВОЁ КРОЛИЧЬЕ СООБЩЕСТВО</span><h2>Друзья</h2>{!authenticated?<div className="empty"><span>🐰</span><b>Онлайн-друзья скоро будут доступны</b><p>Открой BUNNY LIFE через Telegram, чтобы использовать настоящие аккаунты и сохранять друзей.</p></div>:<><div className="friend-code-card"><div><small>ТВОЙ УНИКАЛЬНЫЙ КОД</small><strong>{social?.friendCode||'Загрузка...'}</strong><p>Отправь его другу, чтобы он мог добавить тебя.</p></div><button onClick={copyFriendCode} disabled={!social?.friendCode}><Copy size={17}/> Копировать</button></div><div className="friend-add"><h3>Добавить друга</h3><p className="muted">Введи 8-значный код игрока. Заявка появится у него во входящих.</p><div><input value={friendCodeInput} onChange={e=>setFriendCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8))} placeholder="КОД ДРУГА" maxLength={8}/><button disabled={friendCodeInput.length!==8||socialBusy} onClick={addFriend}>Отправить</button></div></div><h3>Входящие заявки · {social?.incoming.length||0}</h3>{!social?.incoming.length&&<p className="muted">Пока нет новых заявок.</p>}{social?.incoming.map(f=><article className="friend-row" key={f.id}><span>🐰</span><div><b>{f.name}</b><small>Уровень {f.level} · {f.code}</small></div><button onClick={()=>replyFriend(f.id,true)}>Принять</button><button className="friend-decline" onClick={()=>replyFriend(f.id,false)}>✕</button></article>)}<h3>Мои друзья · {social?.friends.length||0}</h3>{!social?.friends.length&&<p className="muted">Здесь появятся игроки, которые приняли твою заявку.</p>}{social?.friends.map(f=><article className="friend-row friend-row-actions" key={f.code}><span>🐇</span><div><b>{f.name}</b><small>Уровень {f.level} · {f.code}</small></div><button disabled={socialBusy} onClick={()=>openFriendRoom(f.code)}>В гости</button><button disabled={socialBusy||state.user.carrots<10} onClick={()=>giftFriend(f.code)}>🎁 10</button></article>)}{friendRoom&&<div className="friend-room-panel"><div className="section-heading"><div><small>ТЫ В ГОСТЯХ У</small><h3>{friendRoom.name} · уровень {friendRoom.level}</h3></div><button onClick={()=>setFriendRoom(null)}>Закрыть ✕</button></div><RabbitScene place="room" visitor equipped={friendRoom.equipped} decor={friendRoom.decor} mood={80} wallColor={friendRoom.wallColor} floorColor={friendRoom.floorColor}/><p className="muted">Это просмотр комнаты: изменения владельца не затрагиваются.</p></div>}{!!social?.outgoing.length&&<><h3>Ожидают ответа</h3>{social.outgoing.map(f=><article className="friend-row" key={f.id}><span>✉️</span><div><b>{f.name}</b><small>Заявка отправлена</small></div><i>Ожидание</i></article>)}</>}</>}</section>}
    {tab === 'profile' && <section className="page-section"><span className="eyebrow">ТВОЙ ПРОГРЕСС</span><h2>Профиль</h2><div className="profile-card"><div className="profile-avatar">🐰</div><h3>{state.user.name}</h3><p>Уровень {state.user.level} · BUNNY LIFE</p><div className="streak-card"><div className="streak-flame">🔥</div><div><b>{state.user.loginStreak || 0} дней подряд</b><small>Заходи каждый день — награда растёт до 110 морковок</small></div><strong>до 110 🥕</strong></div><button className="game-start" disabled={!!state.user.dailyGiftClaimed || giftClaimed} onClick={getDailyGift}>{state.user.dailyGiftClaimed || giftClaimed ? "Подарок уже получен сегодня ✓" : "🎁 Забрать ежедневный подарок"}</button><div className="profile-numbers"><div><b>{state.user.carrots}</b><small>Морковок</small></div><div><b>{state.user.xp}</b><small>Опыт</small></div><div><b>{state.inventory.length}</b><small>Предметов</small></div></div></div></section>}
    <nav className="bottom-nav">
      {[['home',House,'Дом'],['friends',Users,'Друзья'],['room',Sparkles,'Комната'],['world',Star,'Мир'],['games',Gamepad2,'Игры'],['shop',ShoppingBag,'Магазин'],['inventory',Backpack,'Сумка'],['quests',Trophy,'Задания'],['profile',UserRound,'Профиль']].map(([id, Icon, label]: any) => <button key={id} className={tab===id?'active':''} onClick={() => setTab(id)}><Icon size={20}/><span>{label}</span></button>)}
    </nav>
    {busy && <div className="busy"><LoaderCircle className="spin" size={18}/> Сохраняем...</div>}
  </main>;
}
