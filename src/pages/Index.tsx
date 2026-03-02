import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GAMES } from "@/lib/md5-analyzer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import Fireworks from "@/components/Fireworks";
import { formatVND } from "@/lib/md5-analyzer";

const GAME_COLORS: Record<string, { bg: string; iconBg: string }> = {
  sunwin: { bg: "rgba(239,68,68,0.15)", iconBg: "linear-gradient(135deg, #ef4444, #dc2626)" },
  hitclub: { bg: "rgba(249,115,22,0.15)", iconBg: "linear-gradient(135deg, #f97316, #ea580c)" },
  "68gamebai": { bg: "rgba(59,130,246,0.15)", iconBg: "linear-gradient(135deg, #3b82f6, #2563eb)" },
  sao789: { bg: "rgba(168,85,247,0.15)", iconBg: "linear-gradient(135deg, #a855f7, #7c3aed)" },
  son789: { bg: "rgba(34,197,94,0.15)", iconBg: "linear-gradient(135deg, #22c55e, #16a34a)" },
  sumclub: { bg: "rgba(16,185,129,0.15)", iconBg: "linear-gradient(135deg, #10b981, #059669)" },
  ta28: { bg: "rgba(56,189,248,0.15)", iconBg: "linear-gradient(135deg, #38bdf8, #0284c7)" },
  tik88: { bg: "rgba(99,102,241,0.15)", iconBg: "linear-gradient(135deg, #6366f1, #4f46e5)" },
  rikvip: { bg: "rgba(234,179,8,0.15)", iconBg: "linear-gradient(135deg, #eab308, #ca8a04)" },
  betvip: { bg: "rgba(234,179,8,0.15)", iconBg: "linear-gradient(135deg, #eab308, #d97706)" },
  b52: { bg: "rgba(107,114,128,0.15)", iconBg: "linear-gradient(135deg, #6b7280, #4b5563)" },
  "789club": { bg: "rgba(168,85,247,0.15)", iconBg: "linear-gradient(135deg, #a855f7, #6d28d9)" },
  lc79: { bg: "rgba(234,179,8,0.15)", iconBg: "linear-gradient(135deg, #eab308, #ca8a04)" },
  xocdia88: { bg: "rgba(236,72,153,0.15)", iconBg: "linear-gradient(135deg, #ec4899, #db2777)" },
  thienduong: { bg: "rgba(249,115,22,0.15)", iconBg: "linear-gradient(135deg, #f97316, #ea580c)" },
};

const GAME_SUBTITLES: Record<string, string> = {
  sunwin: "Game bài",
  hitclub: "Bắn cá",
  "68gamebai": "Đại lý",
  sao789: "Slot game",
  son789: "Casino",
  sumclub: "Lộc phát",
  ta28: "Quay hũ",
  tik88: "Tài xỉu",
  rikvip: "Game bài",
  betvip: "Nổ hũ",
  b52: "B52 club",
  "789club": "Macau",
  lc79: "Game bài",
  xocdia88: "Xóc đĩa",
  thienduong: "Trò chơi",
};

export default function Index() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const fetchBalance = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      if (data) setBalance(data.balance);
    };
    fetchBalance();
  }, [user]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #0f1729 0%, #1a2140 50%, #0f1729 100%)"
    }}>
      <Fireworks />

      <header className="relative z-10 py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-black tracking-wider flex items-center gap-2" style={{ color: "#ffd700" }}>
            👑 <span>Văn Minh</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full font-bold" style={{
              background: "rgba(255,215,0,0.15)",
              color: "#ffd700",
              border: "1px solid rgba(255,215,0,0.2)"
            }}>💰 {formatVND(balance)}</span>
            <Sheet>
              <SheetTrigger asChild>
                <button className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{
                  background: "linear-gradient(135deg, #f97316, #ffd700)",
                  color: "#1a0a00",
                }}>
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 border-0" style={{ background: "#1a2140" }}>
                <nav className="flex flex-col gap-3 mt-8">
                  <div className="text-center mb-4">
                    <p className="text-lg font-black" style={{ color: "#ffd700" }}>👑 Văn Minh</p>
                    <p className="text-[10px] tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>UY TÍN • CHẤT LƯỢNG</p>
                    <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>{user?.email}</p>
                    <p className="text-sm mt-1 font-bold" style={{ color: "#ffd700" }}>💰 Số dư: {formatVND(balance)}</p>
                  </div>
                  {isAdmin && (
                    <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }} onClick={() => navigate("/admin")}>
                      🔧 Admin
                    </button>
                  )}
                  <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }} onClick={() => navigate("/buy-key")}>
                    🔑 Mua Key
                  </button>
                  <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }} onClick={() => navigate("/buy-key?tab=card")}>
                    💳 Nạp tiền bằng thẻ
                  </button>
                  <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }} onClick={() => navigate("/history")}>
                    📜 Lịch sử
                  </button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }}>
                        🎧 Hỗ trợ
                      </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl border-0 max-w-sm" style={{ background: "#fff" }}>
                      <h3 className="text-center text-lg font-bold text-gray-800 mb-4">Liên hệ hỗ trợ</h3>
                      <a href="https://t.me/nhan161019" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl mb-2 hover:bg-gray-50 transition" style={{ background: "#f5f5f5" }}>
                        <span className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg" style={{ background: "#229ED9" }}>✈</span>
                        <span className="font-bold text-gray-800">THÀNH NHÂN</span>
                      </a>
                      <a href="https://t.me/vanminh2603" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl mb-2 hover:bg-gray-50 transition" style={{ background: "#f5f5f5" }}>
                        <span className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg" style={{ background: "#229ED9" }}>✈</span>
                        <span className="font-bold text-gray-800">Văn Minh</span>
                      </a>
                    </DialogContent>
                  </Dialog>
                  <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition text-white/50 hover:text-white" onClick={signOut}>
                    🚪 Đăng xuất
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Balance card */}
      <section className="relative z-10 max-w-lg mx-auto px-4 pb-4">
        <div className="rounded-2xl p-4" style={{
          background: "rgba(25,35,65,0.8)",
          border: "1px solid rgba(255,215,0,0.15)",
        }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Số dư hiện tại</p>
          <p className="text-2xl font-black" style={{ color: "#ffd700" }}>{formatVND(balance)} <span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>VNĐ</span></p>
          <p className="text-[11px] mt-1 px-3 py-1 rounded-full inline-block" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>ID: Thành viên</p>
        </div>
      </section>

      <section className="relative z-10 max-w-lg mx-auto px-4 py-2">
        <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "rgba(255,255,255,0.7)" }}>🔥 Danh sách trò chơi</p>
        <div className="grid grid-cols-3 gap-3">
          {GAMES.map((game) => {
            const colors = GAME_COLORS[game.id] || { bg: "rgba(255,255,255,0.05)", iconBg: "linear-gradient(135deg, #666, #888)" };
            const subtitle = GAME_SUBTITLES[game.id] || "";
            return (
              <div
                key={game.id}
                className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97] flex flex-col items-center gap-2"
                style={{
                  background: "rgba(25,35,65,0.8)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
                }}
                onClick={() => navigate(`/game/${game.id}`)}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl overflow-hidden" style={{
                  background: game.image ? "transparent" : colors.iconBg,
                  boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                }}>
                  {game.image ? (
                    <img src={game.image} alt={game.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    game.icon
                  )}
                </div>
                <div className="text-center">
                  <p className="font-black text-[11px] text-white">{game.name.toUpperCase()}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 max-w-lg mx-auto px-4 py-4">
        <div className="flex gap-3">
          <button onClick={() => navigate("/buy-key")} className="flex-1 py-3.5 rounded-2xl font-bold text-sm" style={{
            background: "linear-gradient(135deg, #f97316, #ffd700)",
            color: "#1a0a00",
          }}>🔑 Mua Key</button>
          <button onClick={signOut} className="py-3.5 px-6 rounded-2xl font-bold text-sm" style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
          }}>🚪</button>
        </div>
      </section>

      <section className="relative z-10 max-w-lg mx-auto px-4 pb-8">
        <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          👑 <span style={{ color: "#ffd700" }}>Văn Minh Tool</span> — Uy tín • Chất lượng
        </p>
      </section>
    </div>
  );
}
