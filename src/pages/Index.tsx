import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GAMES } from "@/lib/md5-analyzer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Fireworks from "@/components/Fireworks";

export default function Index() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #c0392b 0%, #e74c3c 20%, #d35400 50%, #1a0a00 100%)"
    }}>
      <Fireworks />
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,200,50,0.3) 0%, transparent 70%)"
      }} />

      <header className="relative z-10 py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black tracking-wider" style={{
            background: "linear-gradient(135deg, #ffae00, #ffd700, #fff5a0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>👑 VĂN MINH TOOL</h1>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2" style={{ color: "#ffd700" }}>
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64" style={{ background: "#1a0a00", borderColor: "rgba(255,174,0,0.3)" }}>
              <nav className="flex flex-col gap-3 mt-8">
                <div className="text-center mb-4">
                  <p className="text-lg font-black" style={{ color: "#ffd700" }}>👑 VĂN MINH</p>
                  <p className="text-[10px] tracking-[0.2em]" style={{ color: "#ff8c00" }}>UY TÍN • CHẤT LƯỢNG</p>
                </div>
                {isAdmin && (
                  <button className="text-left px-4 py-3 rounded-xl font-bold text-sm border transition" style={{ borderColor: "rgba(255,174,0,0.3)", color: "#ffd700" }} onClick={() => navigate("/admin")}>
                    🔧 Admin
                  </button>
                )}
                <button className="text-left px-4 py-3 rounded-xl font-bold text-sm border transition" style={{ borderColor: "rgba(255,174,0,0.3)", color: "#ffd700" }} onClick={() => navigate("/buy-key")}>
                  🔑 Mua Key
                </button>
                <button className="text-left px-4 py-3 rounded-xl font-bold text-sm border transition" style={{ borderColor: "rgba(255,174,0,0.3)", color: "#ffd700" }} onClick={() => navigate("/history")}>
                  📜 Lịch sử
                </button>
                <button className="text-left px-4 py-3 rounded-xl font-bold text-sm transition text-white/50 hover:text-white" onClick={signOut}>
                  🚪 Đăng xuất
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section className="relative z-10 text-center px-4 pb-2">
        <p className="text-xs font-bold tracking-[0.3em] mb-1" style={{ color: "#ff8c00" }}>⚡ UY TÍN • CHẤT LƯỢNG • VIP PRO ⚡</p>
        <p className="text-sm text-white/80">Xin chào, <span className="font-bold" style={{ color: "#ffd700" }}>{user?.email}</span></p>
      </section>

      <section className="relative z-10 text-center py-4 px-4">
        <h2 className="text-xl font-black tracking-wide" style={{
          background: "linear-gradient(135deg, #ffae00, #ffd700)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>🎮 CHỌN NHÀ CÁI</h2>
      </section>

      <section className="relative z-10 max-w-lg mx-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-4">
          {GAMES.map((game) => (
            <div key={game.id} className="rounded-2xl p-[2px] cursor-pointer transition-transform hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #ffae00, #ff8c00, #ffae00)" }}
              onClick={() => navigate(`/game/${game.id}`)}>
              <div className="rounded-2xl p-4 flex flex-col items-center gap-3" style={{ background: "rgba(255,248,230,0.95)" }}>
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl" style={{
                  background: "linear-gradient(135deg, #fff5e0, #ffe4b3)",
                  boxShadow: "0 4px 15px rgba(255,174,0,0.3)",
                }}>
                  {game.icon}
                </div>
                <span className="font-bold text-sm" style={{ color: "#1a0a00" }}>{game.name}</span>
                <button className="w-full py-2.5 rounded-xl font-black text-sm tracking-wider" style={{
                  background: "linear-gradient(135deg, #ff8c00, #ffae00, #ffd000)",
                  color: "#1a0a00",
                  boxShadow: "0 3px 12px rgba(255,174,0,0.4)",
                }}>MỞ TOOL</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-lg mx-auto px-4 pb-6">
        <button onClick={signOut} className="w-full py-4 rounded-full font-black text-base tracking-wider" style={{
          background: "linear-gradient(135deg, rgba(255,174,0,0.15), rgba(255,174,0,0.05))",
          border: "2px solid rgba(255,174,0,0.4)",
          color: "#ff6a6a",
        }}>🚪 ĐĂNG XUẤT</button>
      </section>

      <section className="relative z-10 max-w-lg mx-auto px-4 pb-8">
        <p className="text-center text-xs text-white/50">
          👑 <span style={{ color: "#ffd700" }}>Văn Minh Tool</span> — Uy tín • Chất lượng
        </p>
        <p className="text-center mt-1 text-xs text-white/40">
          📱 Hỗ trợ: <a href="mailto:mvanminh45@gmail.com" className="hover:underline" style={{ color: "#ffd700" }}>mvanminh45@gmail.com</a>
        </p>
      </section>
    </div>
  );
}
