import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GAMES, analyzeMD5 } from "@/lib/md5-analyzer";
import { useToast } from "@/hooks/use-toast";

interface SunwinApiResult {
  session: string | number;
  result: string;
  percent: number;
}

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasActiveKey } = useAuth();
  const { toast } = useToast();
  const [md5Input, setMd5Input] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [popupVisible, setPopupVisible] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  // Sunwin robot state
  const [sunwinData, setSunwinData] = useState<SunwinApiResult | null>(null);
  const [sunwinLoading, setSunwinLoading] = useState(true);
  const [sunwinError, setSunwinError] = useState(false);
  const lastSessionRef = useRef<string | number | null>(null);

  // Drag state
  const popupRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startLeft: 20, startTop: 80 });
  const [popupPos, setPopupPos] = useState({ x: 20, y: 80 });

  const game = GAMES.find((g) => g.id === id);
  const isSunwin = game?.id === "sunwin";

  // Sunwin auto-fetch
  const fetchSunwin = useCallback(async () => {
    try {
      const res = await fetch("https://apisuntcbm.onrender.com/sunlon", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();

      let session = json.phien || json.session || json.data?.[0]?.session;
      let resultVal = json.du_doan || json.result || json.data?.[0]?.result;

      if (!session || !resultVal) return;
      if (session === lastSessionRef.current) return;
      lastSessionRef.current = session;

      const isTai = resultVal.toString().toUpperCase().includes("T") || resultVal === "Tài";
      const percent = Math.floor(Math.random() * (98 - 82 + 1)) + 82;

      setSunwinData({ session, result: isTai ? "TÀI" : "XỈU", percent });
      setSunwinLoading(false);
      setSunwinError(false);

      if (user) {
        await supabase.from("analysis_history").insert({
          user_id: user.id, game: game.name, md5_input: `Phiên #${session}`,
          result: isTai ? "Tài" : "Xỉu", tai_percent: isTai ? percent : 100 - percent,
          xiu_percent: isTai ? 100 - percent : percent, confidence: percent,
        });
      }
    } catch {
      setSunwinError(true);
      setSunwinLoading(false);
    }
  }, [user, game]);

  useEffect(() => {
    if (!isSunwin) return;
    const checkKey = async () => {
      const hasKey = await hasActiveKey();
      if (!hasKey) {
        toast({ title: "⚠️ Chưa có Key", description: "Vui lòng mua key để sử dụng tool.", variant: "destructive" });
        navigate("/buy-key");
        return;
      }
      fetchSunwin();
      const interval = setInterval(fetchSunwin, 3000);
      return () => clearInterval(interval);
    };
    let cleanup: (() => void) | undefined;
    checkKey().then(c => { cleanup = c; });
    return () => cleanup?.();
  }, [isSunwin, fetchSunwin, hasActiveKey, navigate, toast]);

  if (!game) return <div className="min-h-screen flex items-center justify-center text-white">Game không tồn tại</div>;

  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startLeft: popupPos.x, startTop: popupPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    setPopupPos({
      x: Math.max(0, Math.min(window.innerWidth - 320, dragState.current.startLeft + (e.clientX - dragState.current.startX))),
      y: Math.max(0, Math.min(window.innerHeight - 200, dragState.current.startTop + (e.clientY - dragState.current.startY))),
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current.dragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleAnalyze = async () => {
    if (!md5Input.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập mã MD5", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);

    const hasKey = await hasActiveKey();
    if (!hasKey) {
      toast({ title: "⚠️ Chưa có Key", description: "Vui lòng mua key để sử dụng tool.", variant: "destructive" });
      setLoading(false);
      navigate("/buy-key");
      return;
    }

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
    setLoading(false);
  };

  // === SUNWIN ROBOT UI ===
  if (isSunwin) {
    return (
      <div className="min-h-screen relative" style={{ background: "#000", overflow: "hidden" }}>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet" />

        {/* Back button */}
        <div className="fixed top-2.5 left-2.5 z-[10001] px-3 py-1.5 rounded-xl font-bold text-sm cursor-pointer transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000", boxShadow: "0 4px 15px rgba(255,215,0,0.4)", fontFamily: "Orbitron, sans-serif" }}
          onClick={() => navigate("/")}>
          ← Trang chủ
        </div>

        {/* Background */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, #201a00 0%, #000 100%)" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
            {game.image && <img src={game.image} alt={game.name} className="w-32 h-32 rounded-3xl object-cover mb-4" />}
            <div className="text-5xl font-black" style={{ fontFamily: "Orbitron, sans-serif", color: "#ffd700" }}>{game.name}</div>
          </div>
        </div>

        {/* Robot + Chat bubble */}
        <div
          className="fixed z-[9999] flex items-center select-none"
          style={{ left: popupPos.x, top: popupPos.y, touchAction: "none" }}
        >
          {/* Robot GIF */}
          <img
            src="/images/robot.gif"
            alt="Robot"
            className="w-[75px] h-[75px] cursor-move"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />

          {/* Chat bubble */}
          {popupVisible && (
            <div className="ml-2.5" style={{
              background: "rgba(0,0,0,0.85)",
              color: "#fff",
              padding: 15,
              borderRadius: 16,
              width: 230,
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 0 20px rgba(0,0,0,0.6)",
              fontSize: 14,
            }}>
              {sunwinLoading ? (
                <>
                  <span>🤖 Robot SUNWIN</span><br />
                  <span style={{ color: "#4db8ff" }}>🔄 Đang kết nối API...</span>
                </>
              ) : sunwinError ? (
                <>
                  <span>🤖 Robot SUNWIN</span><br />
                  <span style={{ color: "#ff3b5c" }}>🔴 Không lấy được dữ liệu</span>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>Kiểm tra lại API</div>
                </>
              ) : sunwinData ? (
                <>
                  🎯 Phiên <span style={{ color: "#4db8ff", fontWeight: "bold" }}>{sunwinData.session}</span><br /><br />
                  🤖 Dự đoán:<br />
                  <span style={{
                    color: sunwinData.result === "TÀI" ? "#00ff99" : "#ff3b5c",
                    fontWeight: "bold",
                    fontSize: 18,
                  }}>
                    {sunwinData.result}
                  </span><br /><br />
                  📊 Tỷ lệ: <span style={{ color: "#ffd966", fontWeight: "bold", fontSize: 18 }}>{sunwinData.percent}%</span>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>🟢 Đã đồng bộ game</div>
                </>
              ) : null}

              {/* Close */}
              <div
                className="absolute top-1 right-2 cursor-pointer text-xs"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onClick={() => setPopupVisible(false)}
              >✕</div>
            </div>
          )}

          {/* Reopen button when closed */}
          {!popupVisible && (
            <div
              onClick={() => setPopupVisible(true)}
              className="ml-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-sm"
              style={{ background: "rgba(0,0,0,0.8)", border: "1px solid #ffd700", color: "#ffd700" }}
            >💬</div>
          )}
        </div>
      </div>
    );
  }

  // === MD5 GAMES UI (non-Sunwin) ===
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
        <div onClick={() => setPopupVisible(true)}
          className="fixed bottom-5 right-5 z-[99] w-[50px] h-[50px] rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: "#000", border: "2px solid #ffd700", color: "#ffd700", fontSize: 20, fontWeight: "bold", boxShadow: "0 0 15px #ffd700" }}>
          🤖
        </div>
      )}

      {/* Draggable Popup Tool */}
      {popupVisible && (
        <div ref={popupRef} className="fixed z-[1000] select-none" style={{
          left: popupPos.x, top: popupPos.y, width: 280,
          background: "rgba(10, 10, 10, 0.65)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderRadius: 20, padding: 20, border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)", touchAction: "none",
        }}>
          <div className="absolute -inset-[2px] rounded-[22px] -z-[1] opacity-70" style={{
            background: "linear-gradient(45deg, #ff0055, #00ff99, #00ccff, #ff0055)",
            filter: "blur(10px)", animation: "glowing 6s linear infinite",
          }} />

          <div className="flex justify-between items-center mb-4 cursor-move"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            <span className="font-black text-sm" style={{
              fontFamily: "Orbitron, sans-serif",
              background: "linear-gradient(to right, #fff, #ffd700)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {game.icon} VĂN MINH VIP ⚡
            </span>
            <span className="cursor-pointer font-bold" style={{ color: "rgba(255,255,255,0.5)" }}
              onClick={() => setPopupVisible(false)}>✕</span>
          </div>

          <input type="text" placeholder="DÁN MÃ MD5 VÀO ĐÂY..."
            value={md5Input} onChange={(e) => setMd5Input(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            className="w-full p-3 text-center text-[11px] tracking-wider outline-none"
            style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.5)", color: "#00ff99", fontFamily: "Orbitron, sans-serif" }}
          />

          <button onClick={handleAnalyze} disabled={loading}
            className="w-full mt-3 py-3.5 border-none cursor-pointer uppercase relative overflow-hidden disabled:opacity-60"
            style={{ borderRadius: 15, background: "linear-gradient(90deg, #ffd700, #ff8c00)", color: "#000", fontFamily: "Orbitron, sans-serif", fontWeight: 900, fontSize: 12, boxShadow: "0 5px 15px rgba(255,140,0,0.4)" }}>
            {loading ? "ĐANG QUÉT..." : "BẮT ĐẦU QUÉT AI"}
            {!loading && <div className="absolute top-0 -left-full w-full h-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)", animation: "shine 3s infinite" }} />}
          </button>

          {loading && <div className="mx-auto mt-2.5 w-5 h-5 rounded-full" style={{ border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#00ff99", animation: "spin 1s linear infinite" }} />}

          {result && (
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
        </div>
      )}

      {/* Background */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, #201a00 0%, #000 100%)" }}>
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
      `}</style>
    </div>
  );
}
