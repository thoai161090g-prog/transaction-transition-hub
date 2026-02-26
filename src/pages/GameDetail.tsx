import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GAMES, analyzeMD5 } from "@/lib/md5-analyzer";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface SunwinApiResult {
  id: string;
  phien: number;
  xuc_xac_1: number;
  xuc_xac_2: number;
  xuc_xac_3: number;
  tong: number;
  ket_qua: string;
  du_doan: string;
  pattern: string;
  so_sanh: string;
}

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasActiveKey } = useAuth();
  const { toast } = useToast();
  const [md5Input, setMd5Input] = useState("");
  const [result, setResult] = useState<any>(null);
  const [sunwinResult, setSunwinResult] = useState<SunwinApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [robotPhase, setRobotPhase] = useState<string | null>(null);

  const game = GAMES.find((g) => g.id === id);
  if (!game) return <div className="min-h-screen flex items-center justify-center text-white">Game không tồn tại</div>;

  const isSunwin = game.id === "sunwin";

  const handleAnalyze = async () => {
    if (!isSunwin && !md5Input.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập mã MD5", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setSunwinResult(null);
    setRobotPhase(null);

    const hasKey = await hasActiveKey();
    if (!hasKey) {
      toast({ title: "⚠️ Chưa có Key", description: "Vui lòng mua key để sử dụng tool.", variant: "destructive" });
      setLoading(false);
      navigate("/buy-key");
      return;
    }

    if (isSunwin) {
      // Sunwin: robot animation then fetch API
      const phases = ["🤖 Robot đang khởi động...", "📡 Đang kết nối server...", "🔍 Đang thu thập dữ liệu...", "⚡ Đang phân tích kết quả..."];
      for (const phase of phases) {
        setRobotPhase(phase);
        await new Promise(r => setTimeout(r, 800));
      }

      try {
        const res = await fetch("https://apisuntcbm.onrender.com/sunlon");
        if (!res.ok) throw new Error("API error");
        const data: SunwinApiResult = await res.json();
        setSunwinResult(data);
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 3000);

        if (user) {
          await supabase.from("analysis_history").insert({
            user_id: user.id,
            game: game.name,
            md5_input: `Phiên #${data.phien}`,
            result: data.du_doan,
            tai_percent: data.ket_qua === "Tài" ? 70 : 30,
            xiu_percent: data.ket_qua === "Xỉu" ? 70 : 30,
            confidence: 85,
          });
        }
      } catch {
        toast({ title: "Lỗi", description: "Không thể kết nối API Sunwin", variant: "destructive" });
      }
    } else {
      // Other games: MD5 analysis
      await new Promise(r => setTimeout(r, 1200));
      const analysis = analyzeMD5(md5Input);
      if (!analysis) {
        toast({ title: "Lỗi", description: "Mã MD5 không hợp lệ", variant: "destructive" });
        setLoading(false);
        return;
      }
      setResult(analysis);
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 3000);

      if (user) {
        await supabase.from("analysis_history").insert({
          user_id: user.id,
          game: game.name,
          md5_input: md5Input,
          result: analysis.result,
          tai_percent: analysis.taiPercent,
          xiu_percent: analysis.xiuPercent,
          confidence: analysis.confidence,
        });
      }
    }

    setRobotPhase(null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #0a0015 0%, #1a0030 30%, #0d001a 60%, #050008 100%)"
    }}>
      {/* Animated background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20" style={{
          background: "radial-gradient(circle, #ffd700 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "pulse-glow 4s ease-in-out infinite"
        }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10" style={{
          background: "radial-gradient(circle, #ff6b00 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "float-left 6s ease-in-out infinite"
        }} />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] rounded-full opacity-10" style={{
          background: "radial-gradient(circle, #c026d3 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "float-right 5s ease-in-out infinite"
        }} />
      </div>

      {/* Gold particle effects */}
      {showParticles && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute w-2 h-2 rounded-full" style={{
              background: i % 3 === 0 ? "#ffd700" : i % 3 === 1 ? "#ff8c00" : "#fff",
              left: `${Math.random() * 100}%`,
              top: `-5%`,
              animation: `particle-fall ${2 + Math.random() * 2}s linear ${Math.random() * 0.5}s forwards`,
              boxShadow: "0 0 6px rgba(255,215,0,0.8)"
            }} />
          ))}
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm font-bold transition-all hover:scale-105" style={{ color: "#ffd700" }}>
            <span style={{ filter: "drop-shadow(0 0 4px rgba(255,215,0,0.5))" }}>← Trang chủ</span>
          </button>
          <h1 className="text-xl font-black tracking-wider" style={{
            background: "linear-gradient(135deg, #ffd700, #ff8c00, #ffd700)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 8px rgba(255,215,0,0.3))"
          }}>
            {game.icon} {game.name}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Input Section */}
        <div className="rounded-3xl p-[2px] shadow-2xl" style={{
          background: "linear-gradient(135deg, #ffd700, #ff8c00, #ffd700, #ffae00)",
          boxShadow: "0 0 40px rgba(255,215,0,0.2), 0 0 80px rgba(255,140,0,0.1)"
        }}>
          <div className="rounded-3xl p-6 space-y-5 backdrop-blur-xl" style={{
            background: "linear-gradient(135deg, rgba(15,5,25,0.97), rgba(25,10,40,0.97))"
          }}>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider" style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,0,0.1))",
                border: "1px solid rgba(255,215,0,0.3)",
                color: "#ffd700"
              }}>
                {isSunwin ? "🤖 SUNWIN AI ENGINE 🤖" : "✨ VIP ANALYSIS ENGINE ✨"}
              </div>
              <h2 className="text-2xl font-black tracking-wide" style={{
                background: "linear-gradient(135deg, #fff, #ffd700)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {isSunwin ? "🤖 Robot Phân Tích" : "🔮 Phân Tích MD5"}
              </h2>
              {isSunwin && (
                <p className="text-xs" style={{ color: "rgba(255,215,0,0.6)" }}>
                  Dữ liệu realtime từ Sunwin API
                </p>
              )}
            </div>

            {!isSunwin && (
              <div className="relative">
                <Input
                  placeholder="Nhập mã MD5 tại đây..."
                  value={md5Input}
                  onChange={(e) => setMd5Input(e.target.value)}
                  className="font-mono text-center text-lg py-6 rounded-2xl border-2 transition-all focus:shadow-lg"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,215,0,0.3)",
                    color: "#fff",
                    boxShadow: "inset 0 2px 10px rgba(0,0,0,0.3)"
                  }}
                />
              </div>
            )}

            {/* Robot animation during loading for Sunwin */}
            {isSunwin && robotPhase && (
              <div className="text-center py-4 space-y-3">
                <div className="text-6xl" style={{ animation: "robot-bounce 0.6s ease-in-out infinite" }}>🤖</div>
                <p className="text-sm font-bold" style={{ color: "#ffd700", animation: "blink 1s ease-in-out infinite" }}>{robotPhase}</p>
                <div className="flex justify-center gap-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full" style={{
                      background: "#ffd700",
                      animation: `dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-5 rounded-2xl font-black text-lg tracking-widest disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #ffd700, #ff8c00, #ffd700)",
                color: "#1a0a00",
                boxShadow: "0 4px 30px rgba(255,215,0,0.4), 0 0 60px rgba(255,140,0,0.2)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full" style={{ animation: "spin 0.8s linear infinite" }} />
                  {isSunwin ? "ROBOT ĐANG LÀM VIỆC..." : "ĐANG PHÂN TÍCH..."}
                </span>
              ) : isSunwin ? "🤖 BẮT ĐẦU PHÂN TÍCH" : "🚀 PHÂN TÍCH NGAY"}
            </button>
          </div>
        </div>

        {/* Sunwin API Result */}
        {sunwinResult && (
          <div className="rounded-3xl p-[2px] shadow-2xl" style={{
            background: "linear-gradient(135deg, #ffd700, #ff6b00, #ffd700)",
            boxShadow: "0 0 50px rgba(255,107,0,0.3), 0 0 100px rgba(255,215,0,0.15)",
            animation: "result-appear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}>
            <div className="rounded-3xl p-6 text-center space-y-5 backdrop-blur-xl" style={{
              background: "linear-gradient(135deg, rgba(15,5,25,0.97), rgba(25,10,40,0.97))"
            }}>
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold tracking-wider" style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.1))",
                border: "1px solid rgba(255,215,0,0.25)",
                color: "#ffd700"
              }}>
                🤖 KẾT QUẢ TỪ ROBOT
              </div>

              {/* Phiên */}
              <div className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
                Phiên #{sunwinResult.phien}
              </div>

              {/* Dice display */}
              <div className="flex justify-center gap-4 py-2">
                {[sunwinResult.xuc_xac_1, sunwinResult.xuc_xac_2, sunwinResult.xuc_xac_3].map((dice, i) => (
                  <div key={i} className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black" style={{
                    background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,0,0.1))",
                    border: "2px solid rgba(255,215,0,0.3)",
                    color: "#ffd700",
                    animation: `dice-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.15}s both`
                  }}>
                    {dice}
                  </div>
                ))}
              </div>

              <div className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Tổng: <span className="font-black text-lg" style={{ color: "#ffd700" }}>{sunwinResult.tong}</span>
              </div>

              {/* Kết quả */}
              <div className="p-4 rounded-2xl" style={{
                background: sunwinResult.ket_qua === "Tài"
                  ? "linear-gradient(135deg, rgba(255,107,0,0.2), rgba(255,215,0,0.1))"
                  : "linear-gradient(135deg, rgba(0,195,255,0.2), rgba(124,58,237,0.1))",
                border: `1px solid ${sunwinResult.ket_qua === "Tài" ? "rgba(255,107,0,0.3)" : "rgba(0,195,255,0.3)"}`
              }}>
                <div className="text-xs font-bold tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>KẾT QUẢ PHIÊN HIỆN TẠI</div>
                <div className="text-4xl font-black" style={{
                  background: sunwinResult.ket_qua === "Tài"
                    ? "linear-gradient(135deg, #ffd700, #ff6b00)"
                    : "linear-gradient(135deg, #00c3ff, #7c3aed)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  {sunwinResult.ket_qua === "Tài" ? "🔥" : "❄️"} {sunwinResult.ket_qua}
                </div>
              </div>

              {/* Dự đoán */}
              <div className="p-4 rounded-2xl" style={{
                background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,200,100,0.05))",
                border: "1px solid rgba(0,255,136,0.2)"
              }}>
                <div className="text-xs font-bold tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>🤖 DỰ ĐOÁN PHIÊN SAU</div>
                <div className="text-5xl font-black" style={{
                  background: sunwinResult.du_doan === "Tài"
                    ? "linear-gradient(135deg, #ffd700, #ff6b00)"
                    : "linear-gradient(135deg, #00c3ff, #7c3aed)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  {sunwinResult.du_doan === "Tài" ? "🔥" : "❄️"} {sunwinResult.du_doan}
                </div>
              </div>

              {/* Pattern */}
              <div className="p-3 rounded-2xl" style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)"
              }}>
                <div className="text-xs font-bold tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>PATTERN GẦN ĐÂY</div>
                <div className="flex flex-wrap justify-center gap-1">
                  {sunwinResult.pattern.split("").map((c, i) => (
                    <span key={i} className="w-6 h-6 rounded text-xs font-black flex items-center justify-center" style={{
                      background: c === "T" ? "rgba(255,140,0,0.3)" : "rgba(0,195,255,0.3)",
                      color: c === "T" ? "#ffd700" : "#00c3ff",
                    }}>{c}</span>
                  ))}
                </div>
              </div>

              {/* So sánh */}
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {sunwinResult.so_sanh}
              </div>

              <button
                onClick={() => { setSunwinResult(null); }}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-wider transition-all hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,215,0,0.2)",
                  color: "#ffd700"
                }}
              >
                🔄 PHÂN TÍCH LẠI
              </button>
            </div>
          </div>
        )}

        {/* MD5 Result for other games */}
        {result && !isSunwin && (
          <div className="rounded-3xl p-[2px] shadow-2xl" style={{
            background: result.result === "Tài"
              ? "linear-gradient(135deg, #ffd700, #ff6b00, #ffd700)"
              : "linear-gradient(135deg, #00c3ff, #7c3aed, #00c3ff)",
            boxShadow: result.result === "Tài"
              ? "0 0 50px rgba(255,107,0,0.3), 0 0 100px rgba(255,215,0,0.15)"
              : "0 0 50px rgba(0,195,255,0.3), 0 0 100px rgba(124,58,237,0.15)",
            animation: "result-appear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}>
            <div className="rounded-3xl p-6 text-center space-y-5 backdrop-blur-xl" style={{
              background: "linear-gradient(135deg, rgba(15,5,25,0.97), rgba(25,10,40,0.97))"
            }}>
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold tracking-wider" style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.1))",
                border: "1px solid rgba(255,215,0,0.25)",
                color: "#ffd700"
              }}>
                📊 KẾT QUẢ PHÂN TÍCH
              </div>

              <div className="py-4 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full opacity-30" style={{
                    background: result.result === "Tài"
                      ? "radial-gradient(circle, #ff8c00, transparent)"
                      : "radial-gradient(circle, #00c3ff, transparent)",
                    filter: "blur(20px)",
                    animation: "pulse-glow 2s ease-in-out infinite"
                  }} />
                </div>
                <div className="text-7xl font-black relative" style={{
                  background: result.result === "Tài"
                    ? "linear-gradient(135deg, #ffd700, #ff6b00)"
                    : "linear-gradient(135deg, #00c3ff, #7c3aed)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 4px 20px rgba(255,215,0,0.3))"
                }}>
                  {result.result === "Tài" ? "🔥" : "❄️"} {result.result.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl relative overflow-hidden" style={{
                  background: "linear-gradient(135deg, rgba(255,140,0,0.15), rgba(255,215,0,0.05))",
                  border: "1px solid rgba(255,140,0,0.2)"
                }}>
                  <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000" style={{
                    height: `${result.taiPercent}%`,
                    background: "linear-gradient(180deg, rgba(255,140,0,0.3), rgba(255,140,0,0.05))",
                  }} />
                  <div className="relative">
                    <div className="text-xs font-bold tracking-wider mb-1" style={{ color: "#ff8c00" }}>🔥 TÀI</div>
                    <div className="text-4xl font-black" style={{
                      background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>{result.taiPercent}%</div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl relative overflow-hidden" style={{
                  background: "linear-gradient(135deg, rgba(0,195,255,0.15), rgba(124,58,237,0.05))",
                  border: "1px solid rgba(0,195,255,0.2)"
                }}>
                  <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000" style={{
                    height: `${result.xiuPercent}%`,
                    background: "linear-gradient(180deg, rgba(0,195,255,0.3), rgba(0,195,255,0.05))",
                  }} />
                  <div className="relative">
                    <div className="text-xs font-bold tracking-wider mb-1" style={{ color: "#00c3ff" }}>❄️ XỈU</div>
                    <div className="text-4xl font-black" style={{
                      background: "linear-gradient(135deg, #00c3ff, #7c3aed)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>{result.xiuPercent}%</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl" style={{
                background: "linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,200,100,0.05))",
                border: "1px solid rgba(0,255,136,0.15)"
              }}>
                <div className="text-xs font-bold tracking-wider mb-2" style={{ color: "#999" }}>ĐỘ TIN CẬY</div>
                <div className="w-full h-3 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full transition-all duration-1000" style={{
                    width: `${result.confidence}%`,
                    background: "linear-gradient(90deg, #00ff88, #ffd700, #ff6b00)",
                    boxShadow: "0 0 10px rgba(0,255,136,0.5)"
                  }} />
                </div>
                <div className="text-3xl font-black" style={{
                  background: "linear-gradient(135deg, #00ff88, #ffd700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>{result.confidence}%</div>
              </div>

              <button
                onClick={() => { setResult(null); setMd5Input(""); }}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-wider transition-all hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,215,0,0.2)",
                  color: "#ffd700"
                }}
              >
                🔄 PHÂN TÍCH MÃ KHÁC
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        @keyframes float-left {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -20px); }
        }
        @keyframes float-right {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 30px); }
        }
        @keyframes result-appear {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes particle-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes robot-bounce {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes dice-pop {
          0% { opacity: 0; transform: scale(0) rotate(-180deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
