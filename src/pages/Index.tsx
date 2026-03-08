import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GAMES } from "@/lib/md5-analyzer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import Fireworks from "@/components/Fireworks";
import { formatVND } from "@/lib/md5-analyzer";

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
      background: "linear-gradient(180deg, #05080f 0%, #0a1628 40%, #101d35 70%, #05080f 100%)",
      maxWidth: "100vw",
    }}>
      <Fireworks />

      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15" style={{
          background: "radial-gradient(ellipse, #ffd700 0%, transparent 70%)",
          filter: "blur(100px)",
        }} />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-10" style={{
          background: "radial-gradient(circle, #f97316 0%, transparent 70%)",
          filter: "blur(80px)",
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 py-2.5 px-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-base font-black tracking-wider flex items-center gap-1.5" style={{
            background: "linear-gradient(135deg, #ffd700, #ffae42, #ffd700)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 8px rgba(255,215,0,0.4))"
          }}>
            <span className="rainbow-blink-icon">⭐</span> <span className="rainbow-blink-text">VĂN MINH VIP</span> <span className="rainbow-blink-icon">👑</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold backdrop-blur-md" style={{
              background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,174,66,0.08))",
              color: "#ffd700",
              border: "1px solid rgba(255,215,0,0.25)",
              boxShadow: "0 2px 12px rgba(255,215,0,0.1)"
            }}>💰 {formatVND(balance)}</span>
            <Sheet>
              <SheetTrigger asChild>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all hover:scale-105" style={{
                  background: "linear-gradient(135deg, #ffd700, #f97316)",
                  color: "#1a0a00",
                  boxShadow: "0 4px 15px rgba(255,215,0,0.3)"
                }}>
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 border-0 p-0" style={{
                background: "linear-gradient(180deg, #0a1628, #101d35, #0a1628)",
                borderLeft: "1px solid rgba(255,215,0,0.1)"
              }}>
                <nav className="flex flex-col gap-2 p-6 mt-4">
                  {/* Profile section */}
                  <div className="text-center mb-6 pb-6" style={{ borderBottom: "1px solid rgba(255,215,0,0.1)" }}>
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-black" style={{
                      background: "linear-gradient(135deg, #ffd700, #f97316)",
                      color: "#1a0a00",
                      boxShadow: "0 4px 20px rgba(255,215,0,0.3)"
                    }}>
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <p className="text-lg font-black" style={{
                      background: "linear-gradient(135deg, #ffd700, #ffae42)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>👑 Văn Minh</p>
                    <p className="text-[10px] tracking-[0.25em] mt-1" style={{ color: "rgba(255,215,0,0.4)" }}>UY TÍN • CHẤT LƯỢNG</p>
                    <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>{user?.email}</p>
                    <div className="mt-3 px-4 py-2 rounded-xl" style={{
                      background: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,174,66,0.05))",
                      border: "1px solid rgba(255,215,0,0.15)"
                    }}>
                      <p className="text-sm font-black" style={{ color: "#ffd700" }}>💰 {formatVND(balance)}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <MenuButton icon="🔧" label="Admin" onClick={() => navigate("/admin")} />
                  )}
                  <MenuButton icon="🔑" label="Mua Key" onClick={() => navigate("/buy-key")} />
                  <MenuButton icon="💳" label="Nạp tiền" onClick={() => navigate("/topup")} />
                  <MenuButton icon="📜" label="Lịch sử" onClick={() => navigate("/history")} />
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]" style={{
                        background: "rgba(255,215,0,0.06)",
                        border: "1px solid rgba(255,215,0,0.08)",
                        color: "#ffd700"
                      }}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{
                          background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,174,66,0.1))"
                        }}>🎧</span>
                        Hỗ trợ
                      </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl border-0 max-w-sm p-6" style={{
                      background: "linear-gradient(135deg, #0a1628, #101d35)",
                      border: "1px solid rgba(255,215,0,0.15)"
                    }}>
                      <h3 className="text-center text-lg font-black mb-5" style={{
                        background: "linear-gradient(135deg, #ffd700, #ffae42)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}>🎧 Liên hệ hỗ trợ</h3>
                      <a href="https://t.me/nhan161019" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl mb-3 transition-all hover:scale-[1.02]" style={{
                        background: "rgba(255,215,0,0.06)",
                        border: "1px solid rgba(255,215,0,0.1)"
                      }}>
                        <span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{
                          background: "linear-gradient(135deg, #229ED9, #1a7fb8)",
                          boxShadow: "0 4px 12px rgba(34,158,217,0.3)"
                        }}>✈️</span>
                        <div>
                          <span className="font-black text-sm" style={{ color: "#fff" }}>THÀNH NHÂN</span>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>@nhan161019</p>
                        </div>
                      </a>
                      <a href="https://t.me/vanminh2603" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02]" style={{
                        background: "rgba(255,215,0,0.06)",
                        border: "1px solid rgba(255,215,0,0.1)"
                      }}>
                        <span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{
                          background: "linear-gradient(135deg, #229ED9, #1a7fb8)",
                          boxShadow: "0 4px 12px rgba(34,158,217,0.3)"
                        }}>✈️</span>
                        <div>
                          <span className="font-black text-sm" style={{ color: "#fff" }}>Văn Minh</span>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>@vanminh2603</p>
                        </div>
                      </a>
                    </DialogContent>
                  </Dialog>
                  <button className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] mt-4" style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.12)",
                    color: "rgba(255,255,255,0.4)"
                  }} onClick={signOut}>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{
                      background: "rgba(239,68,68,0.15)"
                    }}>🚪</span>
                    Đăng xuất
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Balance card */}
      <section className="relative z-10 max-w-lg mx-auto px-3 pb-3">
        <div className="rounded-xl p-3.5 relative overflow-hidden" style={{
          background: "linear-gradient(135deg, rgba(15,25,50,0.9), rgba(20,30,55,0.9))",
          border: "1px solid rgba(255,215,0,0.12)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,215,0,0.08)"
        }}>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10" style={{
            background: "radial-gradient(circle, #ffd700, transparent)",
            filter: "blur(20px)",
            transform: "translate(30%, -30%)"
          }} />
          <div className="relative">
            <p className="text-[10px] font-medium tracking-wider" style={{ color: "rgba(255,215,0,0.5)" }}>SỐ DƯ HIỆN TẠI</p>
            <p className="text-2xl font-black mt-0.5" style={{
              background: "linear-gradient(135deg, #ffd700, #ffae42, #ffd700)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 4px rgba(255,215,0,0.3))"
            }}>{formatVND(balance)}</p>
            <p className="text-[9px] mt-1 px-2 py-0.5 rounded-full inline-block font-medium" style={{
              background: "rgba(255,215,0,0.08)",
              color: "rgba(255,215,0,0.5)",
              border: "1px solid rgba(255,215,0,0.1)"
            }}>👑 Thành viên VIP</p>
          </div>
        </div>
      </section>

      {/* Games grid */}
      <section className="relative z-10 max-w-lg mx-auto px-3 py-1">
        <p className="text-xs font-bold mb-2.5 flex items-center gap-1.5" style={{
          background: "linear-gradient(135deg, #ffd700, #ffae42)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>🔥 Danh sách trò chơi</p>
        <div className="grid grid-cols-4 gap-2">
          {GAMES.map((game) => {
            const subtitle = GAME_SUBTITLES[game.id] || "";
            return (
              <div
                key={game.id}
                className="rounded-lg p-1.5 cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.96] flex flex-col items-center gap-1 group"
                style={{
                  background: "linear-gradient(135deg, rgba(15,25,50,0.8), rgba(20,30,55,0.6))",
                  border: "1px solid rgba(255,215,0,0.08)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
                }}
                onClick={() => navigate(`/game/${game.id}`)}
              >
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-base overflow-hidden transition-all group-hover:shadow-lg" style={{
                  background: game.image ? "transparent" : "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,174,66,0.1))",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}>
                  {game.image ? (
                    <img src={game.image} alt={game.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    game.icon
                  )}
                </div>
                <div className="text-center">
                  <p className="font-black text-[8px] text-white/90 leading-tight">{game.name.toUpperCase()}</p>
                  <p className="text-[7px]" style={{ color: "rgba(255,215,0,0.4)" }}>{subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Action buttons */}
      <section className="relative z-10 max-w-lg mx-auto px-3 py-3">
        <div className="flex gap-2">
          <button onClick={() => navigate("/buy-key")} className="flex-1 py-3 rounded-xl font-black text-xs tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]" style={{
            background: "linear-gradient(135deg, #ffd700, #f97316, #ffd700)",
            color: "#1a0a00",
            boxShadow: "0 4px 25px rgba(255,215,0,0.3), 0 0 60px rgba(255,215,0,0.1)"
          }}>🔑 MUA KEY</button>
          <button onClick={signOut} className="py-3 px-5 rounded-xl font-bold text-xs transition-all hover:scale-[1.02]" style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.4)",
          }}>🚪</button>
        </div>
      </section>

      {/* Footer */}
      <section className="relative z-10 max-w-lg mx-auto px-3 pb-6">
        <p className="text-center text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          👑 <span style={{
            background: "linear-gradient(135deg, #ffd700, #ffae42)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>Văn Minh Tool</span> — Uy tín • Chất lượng
        </p>
      </section>
    </div>
  );
}

function MenuButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]" style={{
      background: "rgba(255,215,0,0.06)",
      border: "1px solid rgba(255,215,0,0.08)",
      color: "#ffd700"
    }} onClick={onClick}>
      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{
        background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,174,66,0.1))"
      }}>{icon}</span>
      {label}
    </button>
  );
}
