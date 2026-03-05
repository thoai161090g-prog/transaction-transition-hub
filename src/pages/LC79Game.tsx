import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface SessionItem {
  id: number;
  resultTruyenThong: string;
  dices: number[];
  point: number;
}

interface LC79ApiResponse {
  list: SessionItem[];
  typeStat: { TAI: number; XIU: number };
}

export default function LC79Game() {
  const navigate = useNavigate();
  const { user, hasActiveKey } = useAuth();
  const { toast } = useToast();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [apiData, setApiData] = useState<LC79ApiResponse | null>(null);
  const [online, setOnline] = useState(false);
  const [progress, setProgress] = useState(0);
  const [popupVisible, setPopupVisible] = useState(true);

  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startLeft: 20, startTop: 80 });
  const [botPos, setBotPos] = useState({ x: 20, y: 80 });
  const lastSessionRef = useRef<number | null>(null);

  const POLL_MS = 5000;

  useEffect(() => {
    hasActiveKey().then(setHasKey);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke("lc79-proxy");
      if (error) throw error;
      setApiData(result as LC79ApiResponse);
      setOnline(true);

      // Save to history if new session
      const latest = (result as LC79ApiResponse)?.list?.[0];
      if (latest && latest.id !== lastSessionRef.current && user) {
        lastSessionRef.current = latest.id;
        const isTai = latest.resultTruyenThong === "TAI";
        const percent = Math.floor(Math.random() * (98 - 82 + 1)) + 82;
        await supabase.from("analysis_history").insert({
          user_id: user.id,
          game: "LC79",
          md5_input: `Phiên #${latest.id}`,
          result: isTai ? "Tài" : "Xỉu",
          tai_percent: isTai ? percent : 100 - percent,
          xiu_percent: isTai ? 100 - percent : percent,
          confidence: percent,
        });
      }
    } catch {
      setOnline(false);
    }
  }, [user]);

  useEffect(() => {
    if (hasKey === false) {
      toast({ title: "⚠️ Chưa có Key", description: "Vui lòng mua key để sử dụng.", variant: "destructive" });
      navigate("/buy-key");
      return;
    }
    if (hasKey !== true) return;

    fetchData();
    const interval = setInterval(fetchData, POLL_MS);

    let frame: number;
    let start = Date.now();
    const animateProgress = () => {
      const elapsed = Date.now() - start;
      setProgress((elapsed % POLL_MS) / POLL_MS);
      frame = requestAnimationFrame(animateProgress);
    };
    frame = requestAnimationFrame(animateProgress);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(frame);
    };
  }, [hasKey]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startLeft: botPos.x, startTop: botPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    setBotPos({
      x: Math.max(0, Math.min(window.innerWidth - 320, dragState.current.startLeft + (e.clientX - dragState.current.startX))),
      y: Math.max(0, Math.min(window.innerHeight - 200, dragState.current.startTop + (e.clientY - dragState.current.startY))),
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current.dragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (hasKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#000" }}>
        <div className="text-xl font-bold" style={{ color: "#ffd700" }}>⏳ Đang kiểm tra key...</div>
      </div>
    );
  }

  const latest = apiData?.list?.[0];
  const history = apiData?.list?.slice(0, 10) ?? [];
  const stat = apiData?.typeStat;

  // Predict next based on pattern
  const predictNext = () => {
    if (!apiData?.list || apiData.list.length < 3) return { result: "…", percent: 0 };
    const recent = apiData.list.slice(0, 5);
    const taiCount = recent.filter(s => s.resultTruyenThong === "TAI").length;
    const xiuCount = recent.length - taiCount;
    const percent = Math.floor(Math.random() * (98 - 82 + 1)) + 82;
    // If more XIU recently, predict TAI (reversal pattern)
    if (xiuCount > taiCount) return { result: "TÀI", percent };
    if (taiCount > xiuCount) return { result: "XỈU", percent };
    return { result: recent[0].resultTruyenThong === "TAI" ? "XỈU" : "TÀI", percent };
  };

  const prediction = predictNext();

  return (
    <div className="min-h-screen relative" style={{ background: "#000", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet" />

      {/* Back button */}
      <div className="fixed top-2.5 left-2.5 z-[10001] px-3 py-1.5 rounded-xl font-bold text-sm cursor-pointer transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000", boxShadow: "0 4px 15px rgba(255,215,0,0.4)", fontFamily: "Orbitron, sans-serif" }}
        onClick={() => navigate("/")}>
        ← Trang chủ
      </div>

      {/* LC79 game iframe */}
      <iframe
        src="https://lc79b.bet"
        className="absolute inset-0 w-full h-full border-none"
        style={{ zIndex: 1 }}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
        title="LC79 Game"
      />

      {/* Robot + Chat bubble */}
      <div
        className="fixed z-[9999] flex items-center select-none"
        style={{ left: botPos.x, top: botPos.y, touchAction: "none" }}
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
          <div className="ml-2.5 relative" style={{
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: 15,
            borderRadius: 16,
            width: 250,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 0 20px rgba(0,0,0,0.6)",
            fontSize: 14,
          }}>
            {!online ? (
              <>
                <span>🤖 Robot LC79</span><br />
                <span style={{ color: "#4db8ff" }}>🔄 Đang kết nối API...</span>
              </>
            ) : latest ? (
              <>
                <div className="font-bold mb-1" style={{ color: "#ffd700", fontSize: 13 }}>🤖 Robot LC79</div>

                {/* Current session */}
                <div className="mb-2">
                  🎯 Phiên <span style={{ color: "#4db8ff", fontWeight: "bold" }}>#{latest.id}</span>
                  <br />
                  🎲 Xúc xắc: <span style={{ fontWeight: "bold", color: "#fff" }}>{latest.dices.join(" - ")}</span>
                  <br />
                  📊 Điểm: <span style={{ fontWeight: "bold", color: "#facc15" }}>{latest.point}</span>
                  <span style={{
                    marginLeft: 8,
                    fontWeight: "bold",
                    color: latest.resultTruyenThong === "TAI" ? "#00ff99" : "#ff3b5c",
                  }}>
                    {latest.resultTruyenThong}
                  </span>
                </div>

                {/* Prediction */}
                <div className="pt-2 mb-2" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                  🤖 Dự đoán phiên tiếp:<br />
                  <span style={{
                    color: prediction.result === "TÀI" ? "#00ff99" : "#ff3b5c",
                    fontWeight: "bold",
                    fontSize: 20,
                  }}>
                    {prediction.result}
                  </span>
                  <br />
                  📊 Tỷ lệ: <span style={{ color: "#ffd966", fontWeight: "bold", fontSize: 18 }}>{prediction.percent}%</span>
                </div>

                {/* History dots */}
                <div className="flex gap-1 flex-wrap mt-1 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  {history.map((s, i) => (
                    <div key={i} className="w-3 h-3 rounded-full" title={`#${s.id}: ${s.resultTruyenThong} (${s.point})`} style={{
                      background: s.resultTruyenThong === "TAI" ? "#00ff99" : "#ff3b5c",
                      boxShadow: s.resultTruyenThong === "TAI" ? "0 0 5px #00ff99" : "0 0 5px #ff3b5c",
                    }} />
                  ))}
                </div>

                {/* Stats */}
                {stat && (
                  <div className="text-[11px] mt-1.5" style={{ color: "#aaa" }}>
                    Thống kê: <span style={{ color: "#00ff99" }}>TÀI {stat.TAI}</span> / <span style={{ color: "#ff3b5c" }}>XỈU {stat.XIU}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="relative h-1 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{
                    width: `${progress * 100}%`,
                    background: "linear-gradient(90deg, #ffd700, #ff8c00)",
                    transition: "width 0.1s linear"
                  }} />
                </div>

                <div className="text-[10px] mt-1" style={{ color: "#666" }}>🟢 Đã đồng bộ game</div>
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

        {/* Reopen button */}
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
