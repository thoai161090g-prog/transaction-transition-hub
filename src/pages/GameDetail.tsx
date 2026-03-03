import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GAMES, analyzeMD5 } from "@/lib/md5-analyzer";
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
  const [robotPhase, setRobotPhase] = useState<string | null>(null);
  const [popupVisible, setPopupVisible] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  // Drag state
  const popupRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startLeft: 20, startTop: 80 });
  const [popupPos, setPopupPos] = useState({ x: 20, y: 80 });

  const game = GAMES.find((g) => g.id === id);
  if (!game) return <div className="min-h-screen flex items-center justify-center text-white">Game không tồn tại</div>;

  const isSunwin = game.id === "sunwin";

  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startLeft: popupPos.x, startTop: popupPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    setPopupPos({
      x: Math.max(0, Math.min(window.innerWidth - 280, dragState.current.startLeft + (e.clientX - dragState.current.startX))),
      y: Math.max(0, Math.min(window.innerHeight - 200, dragState.current.startTop + (e.clientY - dragState.current.startY))),
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current.dragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

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
        if (user) {
          await supabase.from("analysis_history").insert({
            user_id: user.id, game: game.name, md5_input: `Phiên #${data.phien}`,
            result: data.du_doan, tai_percent: data.ket_qua === "Tài" ? 70 : 30,
            xiu_percent: data.ket_qua === "Xỉu" ? 70 : 30, confidence: 85,
          });
        }
      } catch {
        toast({ title: "Lỗi", description: "Không thể kết nối API Sunwin", variant: "destructive" });
      }
    } else {
      await new Promise(r => setTimeout(r, 1200));
      const analysis = analyzeMD5(md5Input);
      if (!analysis) {
        toast({ title: "Lỗi", description: "Mã MD5 không hợp lệ", variant: "destructive" });
        setLoading(false);
        return;
      }
      setResult(analysis);
      setHistory(prev => [...prev.slice(-7), analysis.result === "Tài" ? "T" : "X"]);
      if (user) {
        await supabase.from("analysis_history").insert({
          user_id: user.id, game: game.name, md5_input: md5Input,
          result: analysis.result, tai_percent: analysis.taiPercent,
          xiu_percent: analysis.xiuPercent, confidence: analysis.confidence,
        });
      }
    }

    setRobotPhase(null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative" style={{ background: "#000", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Montserrat:wght@400;700&display=swap" rel="stylesheet" />

      {/* Back button */}
      <div className="fixed top-2.5 left-2.5 z-[10001] px-3 py-1.5 rounded-xl font-bold text-sm cursor-pointer transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000", boxShadow: "0 4px 15px rgba(255,215,0,0.4)", fontFamily: "Orbitron, sans-serif" }}
        onClick={() => navigate("/")}>
        ← Trang chủ
      </div>

      {/* Open tool button */}
      {!popupVisible && (
        <div
          onClick={() => setPopupVisible(true)}
          className="fixed bottom-5 right-5 z-[99] w-[50px] h-[50px] rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: "#000", border: "2px solid #ffd700", color: "#ffd700", fontSize: 20, fontWeight: "bold", boxShadow: "0 0 15px #ffd700" }}
        >
          🤖
        </div>
      )}

      {/* Draggable Popup Tool */}
      {popupVisible && (
        <div
          ref={popupRef}
          className="fixed z-[1000] select-none"
          style={{
            left: popupPos.x, top: popupPos.y, width: 280,
            background: "rgba(10, 10, 10, 0.65)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: 20, padding: 20,
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            touchAction: "none",
          }}
        >
          {/* Neon glow border */}
          <div className="absolute -inset-[2px] rounded-[22px] -z-[1] opacity-70" style={{
            background: "linear-gradient(45deg, #ff0055, #00ff99, #00ccff, #ff0055)",
            filter: "blur(10px)",
            animation: "glowing 6s linear infinite",
          }} />

          {/* Header - draggable */}
          <div className="flex justify-between items-center mb-4 cursor-move"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            <span className="font-black text-sm" style={{
              fontFamily: "Orbitron, sans-serif",
              background: "linear-gradient(to right, #fff, #ffd700)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              textShadow: "0 0 10px rgba(255,215,0,0.5)",
            }}>
              {game.icon} VĂN MINH VIP ⚡
            </span>
            <span className="cursor-pointer font-bold" style={{ color: "rgba(255,255,255,0.5)" }}
              onClick={() => setPopupVisible(false)}>✕</span>
          </div>

          {/* Input */}
          {!isSunwin && (
            <input
              type="text"
              placeholder="DÁN MÃ MD5 VÀO ĐÂY..."
              value={md5Input}
              onChange={(e) => setMd5Input(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              className="w-full p-3 text-center text-[11px] tracking-wider outline-none transition-all"
              style={{
                borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(0,0,0,0.5)", color: "#00ff99",
                fontFamily: "Orbitron, sans-serif",
              }}
            />
          )}

          {/* Sunwin robot animation */}
          {isSunwin && robotPhase && (
            <div className="text-center py-2 space-y-1">
              <div className="text-3xl" style={{ animation: "robotBounce 0.6s ease-in-out infinite" }}>🤖</div>
              <p className="text-[10px] font-bold" style={{ color: "#ffd700", animation: "blink 1s ease-in-out infinite" }}>{robotPhase}</p>
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full mt-3 py-3.5 border-none cursor-pointer uppercase relative overflow-hidden disabled:opacity-60"
            style={{
              borderRadius: 15,
              background: "linear-gradient(90deg, #ffd700, #ff8c00)",
              color: "#000", fontFamily: "Orbitron, sans-serif",
              fontWeight: 900, fontSize: 12,
              boxShadow: "0 5px 15px rgba(255,140,0,0.4)",
            }}
          >
            {loading ? "ĐANG QUÉT..." : isSunwin ? "🤖 BẮT ĐẦU QUÉT AI" : "BẮT ĐẦU QUÉT AI"}
            {!loading && <div className="absolute top-0 -left-full w-full h-full" style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
              animation: "shine 3s infinite",
            }} />}
          </button>

          {/* Spinner */}
          {loading && (
            <div className="mx-auto mt-2.5 w-5 h-5 rounded-full" style={{
              border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#00ff99",
              animation: "spin 1s linear infinite",
            }} />
          )}

          {/* MD5 Result */}
          {result && !isSunwin && (
            <div className="mt-4 text-center" style={{ animation: "popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)" }}>
              <div className="text-[48px] font-black tracking-wider" style={{
                fontFamily: "Orbitron, sans-serif",
                color: result.result === "Tài" ? "#00ff99" : "#ff0055",
                textShadow: result.result === "Tài" ? "0 0 20px rgba(0,255,153,0.8)" : "0 0 20px rgba(255,0,85,0.8)",
              }}>
                {result.result.toUpperCase()}
              </div>
              <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "#00ffff" }}>
                ĐỘ CHÍNH XÁC: {result.confidence}%
              </div>

              {/* History dots */}
              <div className="flex justify-center gap-1.5 mt-2.5 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                {history.map((h, i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{
                    background: h === "T" ? "#00ff99" : "#ff0055",
                    boxShadow: h === "T" ? "0 0 5px #00ff99" : "0 0 5px #ff0055",
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Sunwin Result */}
          {sunwinResult && (
            <div className="mt-4 text-center space-y-2" style={{ animation: "popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)" }}>
              <div className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>Phiên #{sunwinResult.phien}</div>
              <div className="flex justify-center gap-2">
                {[sunwinResult.xuc_xac_1, sunwinResult.xuc_xac_2, sunwinResult.xuc_xac_3].map((d, i) => (
                  <div key={i} className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black" style={{
                    background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", color: "#ffd700",
                  }}>{d}</div>
                ))}
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Tổng: <span className="font-bold" style={{ color: "#ffd700" }}>{sunwinResult.tong}</span></div>
              <div className="text-[36px] font-black" style={{
                fontFamily: "Orbitron, sans-serif",
                color: sunwinResult.du_doan === "Tài" ? "#00ff99" : "#ff0055",
                textShadow: sunwinResult.du_doan === "Tài" ? "0 0 20px rgba(0,255,153,0.8)" : "0 0 20px rgba(255,0,85,0.8)",
              }}>
                {sunwinResult.du_doan.toUpperCase()}
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#00ffff" }}>DỰ ĐOÁN PHIÊN SAU</div>
            </div>
          )}
        </div>
      )}

      {/* Background - dark with radial gradient */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(circle at 50% 50%, #201a00 0%, #000 100%)",
      }}>
        {/* Game info center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
          {game.image && <img src={game.image} alt={game.name} className="w-32 h-32 rounded-3xl object-cover mb-4" />}
          <div className="text-5xl font-black" style={{ fontFamily: "Orbitron, sans-serif", color: "#ffd700" }}>{game.name}</div>
        </div>
      </div>

      <style>{`
        @keyframes glowing { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
        @keyframes shine { 100% { left: 100%; } }
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes robotBounce { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-10px) rotate(5deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
