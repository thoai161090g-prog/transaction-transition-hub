export interface KeyPackage {
  id: string;
  label: string;
  price: number;
  days: number | null;
}

export const KEY_PACKAGES: KeyPackage[] = [
  { id: "1day", label: "1 Ngày", price: 25000, days: 1 },
  { id: "3days", label: "3 Ngày", price: 55000, days: 3 },
  { id: "1week", label: "1 Tuần", price: 89000, days: 7 },
  { id: "1month", label: "1 Tháng", price: 120000, days: 30 },
  { id: "lifetime", label: "Vĩnh Viễn", price: 177000, days: null },
];

export const formatVND = (amount: number) =>
  amount.toLocaleString("vi-VN") + "đ";

export interface Game {
  id: string;
  name: string;
  icon: string;
  image?: string;
}

export const GAMES: Game[] = [
  { id: "68gamebai", name: "68 Game Bài", icon: "🎴" },
  { id: "lc79", name: "LC79", icon: "💎" },
  { id: "thienduong", name: "Thiên Đường Trò Chơi", icon: "🏆" },
  { id: "sao789", name: "Sao789", icon: "⭐" },
  { id: "betvip", name: "BetVIP", icon: "🎰" },
  { id: "sunwin", name: "Sunwin", icon: "🌞" },
];

export function analyzeMD5(md5: string) {
  if (!md5 || md5.length < 4) return null;
  const lastChars = md5.slice(-4);
  let sum = 0;
  for (const c of lastChars) {
    const n = parseInt(c, 16);
    if (!isNaN(n)) sum += n;
  }
  const isTai = sum >= 30;
  const taiPercent = Math.min(99, Math.max(1, Math.round((sum / 60) * 100)));
  const xiuPercent = 100 - taiPercent;
  const confidence = Math.min(99, Math.max(50, 50 + Math.abs(taiPercent - 50)));
  return {
    result: isTai ? "Tài" : "Xỉu",
    taiPercent,
    xiuPercent,
    confidence,
    sum,
  };
}
