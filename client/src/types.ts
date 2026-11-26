export type Stats = { hunger: number; mood: number; energy: number; cleanliness: number; friendship: number };
export type ShopItem = { id: string; name: string; emoji: string; price: number; category: 'accessory' | 'room'; description: string };
export type GameState = {
  user: { id: string; name: string; level: number; carrots: number; xp: number; achievements?: string[]; dailyGiftClaimed?: boolean; loginStreak?: number };
  pet: { name: string; stats: Stats; equipped: string[] };
  inventory: string[];
  room: { decor: string[]; wallColor?: string; floorColor?: string; theme?: string };
  lastUpdated: number;
};
export type ActionResult = { state: GameState; message: string };
