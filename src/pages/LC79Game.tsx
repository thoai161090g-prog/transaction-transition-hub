import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import RobotBubble from "@/components/RobotBubble";

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

  const [botPos, setBotPos] = useState({ x: 20, y: 80 });
  const lastSessionRef = useRef<number | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const POLL_MS = 3000;

  useEffect(() => {
    hasActiveKey().then(setHasKey);
  }, []);

  // === THUẬT TOÁN PHÂN TÍCH NHỊP CẦU LC79 - KHÔNG RANDOM ===
  // Dự đoán PHIÊN TIẾP THEO dựa 100% vào nhịp cầu lịch sử
  const analyzePattern = (hist: string[]): { prediction: string; confidence: number; warning?: string } => {
    const len = hist.length;
    if (len < 1) return { prediction: "TÀI", confidence: 50 };
    if (len < 2) return { prediction: hist[0] === "T" ? "XỈU" : "TÀI", confidence: 55 };

    const last = hist[len - 1];
    const opp = (v: string) => v === "T" ? "X" : "T";
    const toLabel = (v: string) => v === "T" ? "TÀI" : "XỈU";

    // --- Tách streaks ---
    const streaks: { value: string; count: number }[] = [];
    let sVal = hist[0], sCount = 1;
    for (let i = 1; i < len; i++) {
      if (hist[i] === sVal) sCount++;
      else { streaks.push({ value: sVal, count: sCount }); sVal = hist[i]; sCount = 1; }
    }
    streaks.push({ value: sVal, count: sCount });
    const curStreak = streaks[streaks.length - 1].count;

    // --- Nhịp 1-1: T X T X T X ---
    const r1_6 = len >= 6 && hist.slice(-6).every((v, i, a) => i === 0 || v !== a[i - 1]);
    const r1_4 = len >= 4 && hist.slice(-4).every((v, i, a) => i === 0 || v !== a[i - 1]);
    const isR1 = r1_6 || r1_4;

    // --- Nhịp 2-2: TT XX TT XX ---
    const isR2 = streaks.length >= 3 && (() => {
      const r = streaks.slice(-4);
      return r.length >= 3 && r.every(s => s.count === 2) &&
        r.every((s, i) => i === 0 || s.value !== r[i - 1].value);
    })();

    // --- Nhịp 3-3: TTT XXX TTT ---
    const isR3 = streaks.length >= 2 && (() => {
      const r = streaks.slice(-3);
      return r.filter(s => s.count === 3).length >= 2 &&
        r.every((s, i) => i === 0 || s.value !== r[i - 1].value);
    })();

    // --- Bệt đảo: TTTT X TTT ---
    const betDao = streaks.length >= 3 && (() => {
      const cur = streaks[streaks.length - 1];
      const mid = streaks[streaks.length - 2];
      const prev = streaks[streaks.length - 3];
      if (prev.count >= 3 && mid.count === 1 && cur.value === prev.value && cur.count >= 2)
        return { match: true, prevLen: prev.count };
      return { match: false, prevLen: 0 };
    })();

    // --- Dị cầu: nhịp bất thường ---
    let diCauWarn: string | null = null;
    if (streaks.length >= 4) {
      const rc = streaks.slice(-4).map(s => s.count);
      const inc = rc.every((v, i) => i === 0 || v >= rc[i - 1]);
      const dec = rc.every((v, i) => i === 0 || v <= rc[i - 1]);
      if (inc && rc[3] >= 4) diCauWarn = "⚡ Dị cầu: Streak tăng dần - CẨN THẬN";
      else if (dec && rc[0] >= 4) diCauWarn = "⚡ Dị cầu: Streak giảm dần";
      else {
        const avg = rc.reduce((a, b) => a + b, 0) / 4;
        const vari = rc.reduce((a, b) => a + (b - avg) ** 2, 0) / 4;
        if (vari > 3) diCauWarn = "⚡ Dị cầu: Nhịp không đều - Theo dõi sát";
      }
    }

    // --- Cầu nghiêng ---
    const w12 = hist.slice(-12);
    const tR = w12.filter(h => h === "T").length / w12.length;
    const cauNghieng = tR >= 0.75 ? "T" : tR <= 0.25 ? "X" : null;

    const avgStreak = streaks.length > 2
      ? streaks.slice(0, -1).reduce((a, b) => a + b.count, 0) / (streaks.length - 1)
      : 2;

    let prediction: string;
    let confidence: number;
    let warning: string | undefined;

    // === ƯU TIÊN: Nhịp 3-3 > 2-2 > 1-1 > Bệt đảo > Bệt dài > Cầu nghiêng > Pattern ===

    if (isR3) {
      if (curStreak < 3) {
        prediction = toLabel(last);
        confidence = 93;
      } else {
        prediction = toLabel(opp(last));
        confidence = 91;
      }
      warning = `🔥 Nhịp 3-3 phát hiện (${curStreak}/3)`;
    } else if (isR2) {
      if (curStreak < 2) {
        prediction = toLabel(last);
        confidence = 91;
      } else {
        prediction = toLabel(opp(last));
        confidence = 89;
      }
      warning = `🔥 Nhịp 2-2 phát hiện (${curStreak}/2)`;
    } else if (isR1) {
      prediction = toLabel(opp(last));
      confidence = r1_6 ? 94 : 90;
      warning = "🔥 Nhịp 1-1 luân phiên";
    } else if (betDao && typeof betDao === "object" && betDao.match) {
      const prevLen = betDao.prevLen;
      if (curStreak < prevLen) {
        prediction = toLabel(last);
        confidence = 87;
        warning = `🔄 Bệt đảo: Tiếp (${curStreak}/${prevLen})`;
      } else {
        prediction = toLabel(opp(last));
        confidence = 78;
        warning = `🔄 Bệt đảo: Đạt ${curStreak} phiên - Có thể bẻ`;
      }
    } else if (curStreak >= 7) {
      prediction = toLabel(opp(last));
      confidence = 58;
      warning = `🚨 BỆT CỰC DÀI ${curStreak} phiên! RẤT NGUY HIỂM`;
    } else if (curStreak >= 5) {
      const breakLikely = curStreak >= avgStreak * 1.5;
      prediction = toLabel(opp(last));
      confidence = breakLikely ? 75 : 62;
      warning = `🚨 Bệt dài ${curStreak}!${breakLikely ? " Vượt TB - Bẻ CAO" : " CẨN THẬN"}`;
    } else if (curStreak === 4) {
      prediction = toLabel(opp(last));
      confidence = curStreak >= avgStreak * 1.3 ? 73 : 65;
      warning = `⚠️ Bệt ${curStreak} phiên${curStreak >= avgStreak * 1.3 ? " - Sắp bẻ" : ""}`;
    } else if (curStreak === 3) {
      // Nhịp 3-3 đang hình thành?
      if (streaks.length >= 2 && streaks[streaks.length - 2].count === 3) {
        prediction = toLabel(last);
        confidence = 80;
        warning = "🔥 Có thể hình thành nhịp 3-3";
      } else {
        prediction = toLabel(opp(last));
        confidence = 70;
        warning = `⚠️ Chuỗi 3 - Có thể đổi chiều`;
      }
    } else if (cauNghieng) {
      prediction = toLabel(opp(cauNghieng));
      confidence = 72;
      warning = `📐 Cầu nghiêng ${toLabel(cauNghieng)} (${Math.round((cauNghieng === "T" ? tR : 1 - tR) * 100)}%)`;
    } else {
      // Pattern lặp + xu hướng
      if (streaks.length >= 2) {
        const prev = streaks[streaks.length - 2];
        if (prev.count === curStreak && prev.value !== last) {
          prediction = toLabel(opp(last));
          confidence = 72;
          warning = `📊 Pattern lặp ${prev.count}-${curStreak}`;
        } else if (curStreak < avgStreak) {
          prediction = toLabel(last);
          confidence = 66;
        } else {
          prediction = toLabel(opp(last));
          confidence = 66;
        }
      } else {
        prediction = toLabel(opp(last));
        confidence = 60;
      }
    }

    // Cảnh báo dị cầu
    if (diCauWarn) {
      warning = warning ? `${warning}\n${diCauWarn}` : diCauWarn;
      confidence = Math.max(55, confidence - 5);
    }

    return { prediction, confidence: Math.min(98, confidence), warning };
  };

  const fetchData = useCallback(async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke("lc79-proxy");
      if (error) throw error;
      const apiResult = result as LC79ApiResponse;
      setApiData(apiResult);
      setOnline(true);

      // Add current result to history
      const currentResult = apiResult.ket_qua?.toLowerCase().includes("t") ? "T" : "X";
      const phienId = parseInt(apiResult.phien);
      
      // Only update history when new session
      if (phienId !== lastSessionRef.current) {
        const newHistory = [...history, currentResult].slice(-20);
        setHistory(newHistory);
        lastSessionRef.current = phienId;

        if (user && newHistory.length >= 1) {
          const analysis = analyzePattern(newHistory);
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
  }, [user, history]);

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
    if (history.length < 1) return { result: "…", percent: 0, warning: undefined as string | undefined };
    const analysis = analyzePattern(history);
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
      <RobotBubble
        robotImage="/images/robot.gif"
        robotAlt="Robot LC79"
        visible={popupVisible}
        onToggle={setPopupVisible}
        accentColor="#ffd700"
        glowColor="#ff8c00"
        position={botPos}
        onPositionChange={setBotPos}
      >
        {!online ? (
          <>
            <span className="font-bold" style={{ color: "#ffd700" }}>🤖 Robot LC79</span><br />
            <span style={{ color: "#4db8ff" }}>🔄 Đang kết nối API...</span>
          </>
        ) : apiData ? (
          <>
            <div className="font-bold mb-1" style={{ color: "#ffd700", fontSize: 11 }}>🤖 Robot LC79</div>

            <div className="mb-2">
              🎯 Phiên <span style={{ color: "#4db8ff", fontWeight: "bold" }}>#{phienId}</span>
              <br />
              🎲 Xúc xắc: <span style={{ fontWeight: "bold", color: "#fff" }}>{dices.join(" - ")}</span>
              <br />
              📊 Điểm: <span style={{ fontWeight: "bold", color: "#facc15" }}>{point}</span>
              <span style={{ marginLeft: 8, fontWeight: "bold", color: isTai ? "#00ff99" : "#ff3b5c" }}>
                {isTai ? "TÀI" : "XỈU"}
              </span>
            </div>

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
              <div style={{ fontSize: 9, color: "#aaa", marginTop: 3 }}>📈 {history.slice(-8).join(" ")}</div>
            </div>

            <div className="flex gap-1 flex-wrap mt-1 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {history.slice(-10).map((h, i) => (
                <div key={i} className="w-3 h-3 rounded-full" title={h === "T" ? "TÀI" : "XỈU"} style={{
                  background: h === "T" ? "#00ff99" : "#ff3b5c",
                  boxShadow: h === "T" ? "0 0 5px #00ff99" : "0 0 5px #ff3b5c",
                }} />
              ))}
            </div>

            {betting && (
              <div className="text-[11px] mt-1.5" style={{ color: "#aaa" }}>
                Cược: <span style={{ color: "#00ff99" }}>TÀI {betting.nguoi_cuoc.tai}</span> / <span style={{ color: "#ff3b5c" }}>XỈU {betting.nguoi_cuoc.xiu}</span>
              </div>
            )}

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
      </RobotBubble>
    </div>
  );
}
