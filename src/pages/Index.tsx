import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GAMES } from "@/lib/md5-analyzer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Fireworks from "@/components/Fireworks";

const GAME_COLORS: Record<string, { bg: string; iconBg: string }> = {
  "68gamebai": { bg: "rgba(59,130,246,0.15)", iconBg: "linear-gradient(135deg, #3b82f6, #2563eb)" },
  "lc79": { bg: "rgba(234,179,8,0.15)", iconBg: "linear-gradient(135deg, #eab308, #ca8a04)" },
  "thienduong": { bg: "rgba(249,115,22,0.15)", iconBg: "linear-gradient(135deg, #f97316, #ea580c)" },
  "sao789": { bg: "rgba(168,85,247,0.15)", iconBg: "linear-gradient(135deg, #a855f7, #7c3aed)" },
  "betvip": { bg: "rgba(234,179,8,0.15)", iconBg: "linear-gradient(135deg, #eab308, #d97706)" },
  "sunwin": { bg: "rgba(239,68,68,0.15)", iconBg: "linear-gradient(135deg, #ef4444, #dc2626)" },
};

const GAME_SUBTITLES: Record<string, string> = {
  "68gamebai": "Đại lý",
  "lc79": "Game bài",
  "thienduong": "Trò chơi",
  "sao789": "Slot game",
  "betvip": "Nổ hũ",
  "sunwin": "Game bài",
};

export default function Index() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

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
            }}>💰 VIP</span>
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
                  </div>
                  {isAdmin && (
                    <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }} onClick={() => navigate("/admin")}>
                      🔧 Admin
                    </button>
                  )}
                  <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }} onClick={() => navigate("/buy-key")}>
                    🔑 Mua Key
                  </button>
                  <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700" }} onClick={() => navigate("/history")}>
                    📜 Lịch sử
                  </button>
                  <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition text-white/50 hover:text-white" onClick={signOut}>
                    🚪 Đăng xuất
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <section className="relative z-10 max-w-lg mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {GAMES.map((game) => {
            const colors = GAME_COLORS[game.id] || { bg: "rgba(255,255,255,0.05)", iconBg: "linear-gradient(135deg, #666, #888)" };
            const subtitle = GAME_SUBTITLES[game.id] || "";
            return (
              <div
                key={game.id}
                className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97] flex flex-col items-center gap-3"
                style={{
                  background: "rgba(25,35,65,0.8)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
                }}
                onClick={() => navigate(`/game/${game.id}`)}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{
                  background: colors.iconBg,
                  boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                }}>
                  {game.icon}
                </div>
                <div className="text-center">
                  <p className="font-black text-sm text-white">{game.name.toUpperCase()}</p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 max-w-lg mx-auto px-4 pb-6">
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
