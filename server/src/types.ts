export type GameState = {
  user: { id: string; name: string; level: number; carrots: number; xp: number; achievements?: string[]; dailyGiftClaimed?: boolean; loginStreak?: number };
  pet: { name: string; stats: { hunger: number; mood: number; energy: number; cleanliness: number; friendship: number }; equipped: string[] };
  inventory: string[];
  room: { decor: string[]; wallColor?: string; floorColor?: string; theme?: string };
  lastUpdated: number;
};
