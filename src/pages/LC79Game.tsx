import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface BettingInfo {
  phien_cuoc: number;
  tick: number;
  sub_tick: number;
  trang_thai: string;
  tong_nguoi_cuoc: number;
  tong_tien_cuoc: string;
  nguoi_cuoc: { tai: number; xiu: number };
  tien_cuoc: { tai: string; xiu: string };
}

interface LC79ApiResponse {
  phien: string;
  ket_qua: string;
  xuc_xac_1: number;
  xuc_xac_2: number;
  xuc_xac_3: number;
  tong: number;
  md5_raw: string;
  betting_info: BettingInfo;
  update_at: string;
  tick_update_at: string;
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

  const POLL_MS = 3000;

  useEffect(() => {
    hasActiveKey().then(setHasKey);
  }, []);

  const historyRef = useRef<string[]>([]); // "T" or "X"

  // Enhanced pattern analysis - predicts NEXT session from previous results
  const analyzePattern = (hist: string[]): { prediction: string; confidence: number; warning?: string } => {
    const len = hist.length;
    if (len < 1) return { prediction: "TÀI", confidence: 50 };
    if (len < 2) return { prediction: hist[0] === "T" ? "XỈU" : "TÀI", confidence: 70 };

    const last = hist[len - 1];
    let streakCount = 1;
    for (let i = len - 2; i >= 0; i--) {
      if (hist[i] === last) streakCount++;
      else break;
    }

    // === Check 3-3 rhythm ===
    const check33 = (h: string[]): boolean => {
      if (h.length < 6) return false;
      const recent = h.slice(-Math.min(12, h.length));
      let groups: string[] = [];
      let cur = recent[0], cnt = 1;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i] === cur) cnt++; else { groups.push(`${cur}${cnt}`); cur = recent[i]; cnt = 1; }
      }
      groups.push(`${cur}${cnt}`);
      return groups.filter(g => parseInt(g.slice(1)) === 3).length >= 2;
    };

    // === Check 2-2 rhythm ===
    const check22 = (h: string[]): boolean => {
      if (h.length < 4) return false;
      const recent = h.slice(-Math.min(10, h.length));
      let groups: string[] = [];
      let cur = recent[0], cnt = 1;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i] === cur) cnt++; else { groups.push(`${cur}${cnt}`); cur = recent[i]; cnt = 1; }
      }
      groups.push(`${cur}${cnt}`);
      return groups.filter(g => parseInt(g.slice(1)) === 2).length >= 2;
    };

    // === Check 1-1 alternating ===
    const check11 = (h: string[]): boolean => {
      if (h.length < 4) return false;
      const recent = h.slice(-6);
      return recent.length >= 4 && recent.every((v, i, a) => i === 0 || v !== a[i - 1]);
    };

    const is33 = check33(hist);
    const is22 = check22(hist);
    const is11 = check11(hist);

    let prediction: string;
    let confidence: number;
    let warning: string | undefined;

    // === Bệt dài - GIẢM độ tin cậy mạnh ===
    if (streakCount >= 7) {
      prediction = last === "T" ? "XỈU" : "TÀI";
      confidence = 45;
      warning = `🚨 BỆT CỰC DÀI ${streakCount} phiên! Rất rủi ro`;
    } else if (streakCount >= 5) {
      prediction = last === "T" ? "XỈU" : "TÀI";
      confidence = 55;
      warning = `⚠️ Bệt dài ${streakCount} phiên! Cẩn thận gấp`;
    } else if (streakCount >= 4) {
      prediction = last === "T" ? "XỈU" : "TÀI";
      confidence = 62;
      warning = `⚠️ Bệt ${streakCount} phiên - Khả năng đảo chiều`;
    }
    // === Nhịp cầu - ĐỘ TIN CẬY CAO ===
    else if (is33) {
      const groupPos = streakCount % 3;
      if (groupPos === 0) {
        prediction = last === "T" ? "XỈU" : "TÀI";
        confidence = 94;
      } else {
        prediction = last === "T" ? "TÀI" : "XỈU";
        confidence = 93;
      }
      warning = "🔥 Nhịp cầu 3-3 phát hiện";
    } else if (is22) {
      const groupPos = streakCount % 2;
      if (groupPos === 0) {
        prediction = last === "T" ? "XỈU" : "TÀI";
        confidence = 92;
      } else {
        prediction = last === "T" ? "TÀI" : "XỈU";
        confidence = 91;
      }
      warning = "🔥 Nhịp cầu 2-2 phát hiện";
    } else if (is11) {
      prediction = last === "T" ? "XỈU" : "TÀI";
      confidence = 93;
      warning = "🔥 Nhịp cầu 1-1 phát hiện";
    }
    // === Chuỗi ngắn ===
    else if (streakCount === 3) {
      prediction = last === "T" ? "XỈU" : "TÀI";
      confidence = 75;
      warning = `⚠️ Chuỗi ${streakCount} - Có thể đổi chiều`;
    }
    // === Mặc định ===
    else {
      const window10 = hist.slice(-10);
      const tCount = window10.filter(h => h === "T").length;
      const xCount = window10.length - tCount;
      const diff = Math.abs(tCount - xCount);
      if (diff >= 4) {
        prediction = tCount > xCount ? "XỈU" : "TÀI";
        confidence = 80 + diff;
      } else {
        prediction = last === "T" ? "TÀI" : "XỈU";
        confidence = 76 + diff * 2;
      }
    }

    return { prediction, confidence: Math.min(98, Math.max(40, confidence)), warning };
  };

  const fetchData = useCallback(async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke("lc79-proxy");
      if (error) throw error;
      const apiResult = result as LC79ApiResponse;
      setApiData(apiResult);
      setOnline(true);

      // Parse current result
      const currentResult = apiResult.ket_qua?.toLowerCase().includes("t") ? "T" : "X";
      const phienId = parseInt(apiResult.phien);
      
      // Only update when new session detected
      if (phienId !== lastSessionRef.current) {
        // Analyze pattern BEFORE adding current result — predict for CURRENT session
        const analysis = analyzePattern(historyRef.current);
        
        // Now add result to history for future predictions
        historyRef.current = [...historyRef.current, currentResult].slice(-20);
        lastSessionRef.current = phienId;

        if (user && historyRef.current.length >= 1) {
          await supabase.from("analysis_history").insert({
            user_id: user.id,
            game: "LC79",
            md5_input: `Phiên #${apiResult.betting_info?.phien_cuoc ?? phienId + 1} (dự đoán)`,
            result: analysis.prediction === "TÀI" ? "Tài" : "Xỉu",
            tai_percent: analysis.prediction === "TÀI" ? analysis.confidence : 100 - analysis.confidence,
            xiu_percent: analysis.prediction === "TÀI" ? 100 - analysis.confidence : analysis.confidence,
            confidence: analysis.confidence,
          });
        }
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
      x: Math.max(0, Math.min(window.innerWidth - 230, dragState.current.startLeft + (e.clientX - dragState.current.startX))),
      y: Math.max(0, Math.min(window.innerHeight - 190, dragState.current.startTop + (e.clientY - dragState.current.startY))),
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

  const phienId = apiData ? parseInt(apiData.phien) : null;
  const dices = apiData ? [apiData.xuc_xac_1, apiData.xuc_xac_2, apiData.xuc_xac_3] : [];
  const point = apiData?.tong ?? 0;
  const resultText = apiData?.ket_qua ?? "";
  const isTai = !resultText.toLowerCase().includes("x");
  const betting = apiData?.betting_info;
  const nextSessionId = betting?.phien_cuoc ?? (phienId ? phienId + 1 : null);

  const prediction = (() => {
    if (historyRef.current.length < 1) return { result: "…", percent: 0, warning: undefined as string | undefined };
    const analysis = analyzePattern(historyRef.current);
    return { result: analysis.prediction, percent: analysis.confidence, warning: analysis.warning };
  })();

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
        style={{ left: botPos.x, top: botPos.y, touchAction: "none", maxWidth: "calc(100vw - 8px)" }}
      >
        {/* Robot GIF */}
        <img
          src="/images/robot.gif"
          alt="Robot"
          className="w-[42px] h-[42px] cursor-move"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />

        {/* Chat bubble */}
        {popupVisible && (
          <div className="ml-1 relative" style={{
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: 8,
            borderRadius: 10,
            width: "min(170px, calc(100vw - 78px))",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 0 20px rgba(0,0,0,0.6)",
            fontSize: 10,
          }}>
            {!online ? (
              <>
                <span>🤖 Robot LC79</span><br />
                <span style={{ color: "#4db8ff" }}>🔄 Đang kết nối API...</span>
              </>
            ) : apiData ? (
              <>
                <div className="font-bold mb-1" style={{ color: "#ffd700", fontSize: 11 }}>🤖 Robot LC79</div>

                {/* Current session */}
                <div className="mb-2">
                  🎯 Phiên <span style={{ color: "#4db8ff", fontWeight: "bold" }}>#{phienId}</span>
                  <br />
                  🎲 Xúc xắc: <span style={{ fontWeight: "bold", color: "#fff" }}>{dices.join(" - ")}</span>
                  <br />
                  📊 Điểm: <span style={{ fontWeight: "bold", color: "#facc15" }}>{point}</span>
                  <span style={{
                    marginLeft: 8,
                    fontWeight: "bold",
                    color: isTai ? "#00ff99" : "#ff3b5c",
                  }}>
                    {isTai ? "TÀI" : "XỈU"}
                  </span>
                </div>

                {/* Prediction */}
                <div className="pt-2 mb-2" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                  🤖 Dự đoán phiên tiếp {nextSessionId && <span style={{ color: "#4db8ff", fontWeight: "bold" }}>#{nextSessionId}</span>}:<br />
                  <span style={{
                    color: prediction.result === "TÀI" ? "#00ff99" : "#ff3b5c",
                    fontWeight: "bold",
                    fontSize: 15,
                  }}>
                    {prediction.result}
                  </span>
                  <br />
                  📊 Độ tin cậy: <span style={{ color: "#ffd966", fontWeight: "bold", fontSize: 13 }}>{prediction.percent}%</span>
                  {prediction.warning && (
                    <div style={{ fontSize: 9, color: prediction.warning.includes("Bệt") ? "#ff3b5c" : "#ffd700", marginTop: 4 }}>
                      {prediction.warning}
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: "#aaa", marginTop: 3 }}>📈 {historyRef.current.slice(-8).join(" ")}</div>
                </div>

                {/* History dots */}
                <div className="flex gap-1 flex-wrap mt-1 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  {historyRef.current.slice(-10).map((h, i) => (
                    <div key={i} className="w-3 h-3 rounded-full" title={h === "T" ? "TÀI" : "XỈU"} style={{
                      background: h === "T" ? "#00ff99" : "#ff3b5c",
                      boxShadow: h === "T" ? "0 0 5px #00ff99" : "0 0 5px #ff3b5c",
                    }} />
                  ))}
                </div>

                {/* Betting info */}
                {betting && (
                  <div className="text-[11px] mt-1.5" style={{ color: "#aaa" }}>
                    Cược: <span style={{ color: "#00ff99" }}>TÀI {betting.nguoi_cuoc.tai}</span> / <span style={{ color: "#ff3b5c" }}>XỈU {betting.nguoi_cuoc.xiu}</span>
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
