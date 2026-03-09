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

  // === THUẬT TOÁN PHÂN TÍCH NHỊP CẦU LC79 NÂNG CAO - ĐÂM SÂU VÀO GAME ===
  const analyzePattern = (hist: string[]): { prediction: string; confidence: number; warning?: string; riskLevel?: "safe" | "caution" | "danger" | "extreme"; patternName?: string; suggestion?: string } => {
    const len = hist.length;
    if (len < 1) return { prediction: "TÀI", confidence: 50, riskLevel: "safe", patternName: "Chưa đủ dữ liệu" };
    if (len < 2) return { prediction: hist[0] === "T" ? "XỈU" : "TÀI", confidence: 55, riskLevel: "safe", patternName: "Khởi đầu" };

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

    // --- Thống kê nâng cao ---
    const w12 = hist.slice(-12);
    const w8 = hist.slice(-8);
    const w5 = hist.slice(-5);
    const tR12 = w12.filter(h => h === "T").length / w12.length;
    const tR8 = w8.filter(h => h === "T").length / w8.length;
    const tR5 = w5.filter(h => h === "T").length / w5.length;

    // --- Momentum: Xu hướng thay đổi gần đây ---
    const momentum = tR5 - tR12; // Dương = TÀI đang lên, Âm = XỈU đang lên
    const momentumStrength = Math.abs(momentum);

    const avgStreak = streaks.length > 2
      ? streaks.slice(0, -1).reduce((a, b) => a + b.count, 0) / (streaks.length - 1)
      : 2;

    // --- Nhịp 1-1 ---
    const r1_8 = len >= 8 && hist.slice(-8).every((v, i, a) => i === 0 || v !== a[i - 1]);
    const r1_6 = len >= 6 && hist.slice(-6).every((v, i, a) => i === 0 || v !== a[i - 1]);
    const r1_4 = len >= 4 && hist.slice(-4).every((v, i, a) => i === 0 || v !== a[i - 1]);
    const isR1 = r1_8 || r1_6 || r1_4;

    // --- Nhịp 2-2 ---
    const isR2 = streaks.length >= 3 && (() => {
      const r = streaks.slice(-4);
      return r.length >= 3 && r.every(s => s.count === 2) &&
        r.every((s, i) => i === 0 || s.value !== r[i - 1].value);
    })();

    // --- Nhịp 3-3 ---
    const isR3 = streaks.length >= 2 && (() => {
      const r = streaks.slice(-3);
      return r.filter(s => s.count === 3).length >= 2 &&
        r.every((s, i) => i === 0 || s.value !== r[i - 1].value);
    })();

    // --- Nhịp 4-4: TTTT XXXX TTTT ---
    const isR4 = streaks.length >= 2 && (() => {
      const r = streaks.slice(-3);
      return r.filter(s => s.count === 4).length >= 2 &&
        r.every((s, i) => i === 0 || s.value !== r[i - 1].value);
    })();

    // --- Bệt đảo ---
    const betDao = streaks.length >= 3 && (() => {
      const cur = streaks[streaks.length - 1];
      const mid = streaks[streaks.length - 2];
      const prev = streaks[streaks.length - 3];
      if (prev.count >= 3 && mid.count === 1 && cur.value === prev.value && cur.count >= 2)
        return { match: true, prevLen: prev.count };
      return { match: false, prevLen: 0 };
    })();

    // --- BẪY CẦU: phát hiện khi nhịp ổn định bất ngờ bị phá ---
    let trapDetected = false;
    let trapWarn = "";
    if (streaks.length >= 5) {
      const recent5 = streaks.slice(-5);
      const counts = recent5.map(s => s.count);
      // Nhịp ổn định rồi bất ngờ thay đổi
      const stable = counts.slice(0, 3);
      const stableAvg = stable.reduce((a, b) => a + b, 0) / 3;
      const lastTwo = counts.slice(3);
      if (Math.abs(stable[0] - stable[1]) <= 1 && Math.abs(stable[1] - stable[2]) <= 1) {
        if (lastTwo.some(c => Math.abs(c - stableAvg) >= 2)) {
          trapDetected = true;
          trapWarn = `🪤 BẪY CẦU: Nhịp ${stable.join("-")} bị phá → ${lastTwo.join("-")}`;
        }
      }
    }

    // --- Cầu xoắn: nhịp tăng dần hoặc giảm dần ---
    let spiralWarn = "";
    if (streaks.length >= 4) {
      const rc = streaks.slice(-4).map(s => s.count);
      const inc = rc.every((v, i) => i === 0 || v >= rc[i - 1]);
      const dec = rc.every((v, i) => i === 0 || v <= rc[i - 1]);
      if (inc && rc[3] >= 4) spiralWarn = "🌀 Cầu xoắn TĂNG: " + rc.join("→");
      else if (dec && rc[0] >= 4) spiralWarn = "🌀 Cầu xoắn GIẢM: " + rc.join("→");
      else {
        const avg = rc.reduce((a, b) => a + b, 0) / 4;
        const vari = rc.reduce((a, b) => a + (b - avg) ** 2, 0) / 4;
        if (vari > 3) spiralWarn = "⚡ Nhịp hỗn loạn: " + rc.join("-");
      }
    }

    // --- Cầu nghiêng ---
    const cauNghieng = tR12 >= 0.75 ? "T" : tR12 <= 0.25 ? "X" : null;

    // --- Phát hiện đảo chiều nhanh (whipsaw) ---
    let whipsaw = false;
    if (streaks.length >= 4) {
      const last4 = streaks.slice(-4);
      if (last4.every(s => s.count === 1)) {
        whipsaw = true;
      }
    }

    let prediction: string;
    let confidence: number;
    let warning: string | undefined;
    let riskLevel: "safe" | "caution" | "danger" | "extreme" = "safe";
    let patternName = "";
    let suggestion = "";

    // === ƯU TIÊN: 4-4 > 3-3 > 2-2 > 1-1 > Bệt đảo > Bệt dài > Bẫy cầu > Cầu nghiêng > Pattern ===

    if (isR4) {
      if (curStreak < 4) {
        prediction = toLabel(last);
        confidence = 90;
        suggestion = "Theo nhịp 4-4, tiếp tục cùng chiều";
      } else {
        prediction = toLabel(opp(last));
        confidence = 88;
        suggestion = "Nhịp 4-4 đạt đỉnh, đổi chiều";
      }
      patternName = `Nhịp 4-4`;
      warning = `🔥🔥 Nhịp 4-4 phát hiện (${curStreak}/4)`;
      riskLevel = "caution";
    } else if (isR3) {
      if (curStreak < 3) {
        prediction = toLabel(last);
        confidence = 93;
        suggestion = "Theo nhịp 3-3, đánh cùng chiều";
      } else {
        prediction = toLabel(opp(last));
        confidence = 91;
        suggestion = "Nhịp 3 đạt, chuẩn bị bẻ";
      }
      patternName = `Nhịp 3-3`;
      warning = `🔥 Nhịp 3-3 phát hiện (${curStreak}/3)`;
      riskLevel = "safe";
    } else if (isR2) {
      if (curStreak < 2) {
        prediction = toLabel(last);
        confidence = 91;
        suggestion = "Nhịp 2-2 ổn định, theo chiều";
      } else {
        prediction = toLabel(opp(last));
        confidence = 89;
        suggestion = "Nhịp 2 đạt, bẻ chiều";
      }
      patternName = `Nhịp 2-2`;
      warning = `🔥 Nhịp 2-2 phát hiện (${curStreak}/2)`;
      riskLevel = "safe";
    } else if (isR1) {
      prediction = toLabel(opp(last));
      confidence = r1_8 ? 96 : r1_6 ? 94 : 90;
      patternName = `Nhịp 1-1 luân phiên`;
      warning = `🔥 Nhịp 1-1 luân phiên${r1_8 ? " (8 phiên!)" : ""}`;
      riskLevel = "safe";
      suggestion = "Luân phiên đều, đánh ngược phiên trước";
    } else if (betDao && typeof betDao === "object" && betDao.match) {
      const prevLen = betDao.prevLen;
      if (curStreak < prevLen) {
        prediction = toLabel(last);
        confidence = 87;
        warning = `🔄 Bệt đảo: Tiếp (${curStreak}/${prevLen})`;
        suggestion = `Bệt đảo đang chạy, theo đến ${prevLen}`;
      } else {
        prediction = toLabel(opp(last));
        confidence = 78;
        warning = `🔄 Bệt đảo: Đạt ${curStreak} phiên - Có thể bẻ`;
        suggestion = "Bệt đảo đạt mốc, cân nhắc bẻ";
      }
      patternName = "Bệt đảo";
      riskLevel = "caution";
    } else if (curStreak >= 8) {
      prediction = toLabel(opp(last));
      confidence = 55;
      warning = `🚨🚨 BỆT SIÊU DÀI ${curStreak} phiên! CỰC KỲ NGUY HIỂM`;
      patternName = "Bệt siêu dài";
      riskLevel = "extreme";
      suggestion = "DỪNG CƯỢC! Chờ bẻ cầu rõ ràng mới vào";
    } else if (curStreak >= 6) {
      prediction = toLabel(opp(last));
      confidence = 58;
      warning = `🚨 BỆT CỰC DÀI ${curStreak} phiên! RẤT NGUY HIỂM`;
      patternName = "Bệt cực dài";
      riskLevel = "danger";
      suggestion = "Hạn chế cược, chờ tín hiệu bẻ";
    } else if (curStreak >= 5) {
      const breakLikely = curStreak >= avgStreak * 1.5;
      prediction = toLabel(opp(last));
      confidence = breakLikely ? 75 : 62;
      warning = `🚨 Bệt dài ${curStreak}!${breakLikely ? " Vượt TB - Bẻ CAO" : " CẨN THẬN"}`;
      patternName = "Bệt dài";
      riskLevel = "danger";
      suggestion = breakLikely ? "Vượt TB, khả năng bẻ cao" : "Cẩn thận, có thể tiếp bệt";
    } else if (curStreak === 4) {
      prediction = toLabel(opp(last));
      confidence = curStreak >= avgStreak * 1.3 ? 73 : 65;
      warning = `⚠️ Bệt ${curStreak} phiên${curStreak >= avgStreak * 1.3 ? " - Sắp bẻ" : ""}`;
      patternName = "Bệt 4";
      riskLevel = "caution";
      suggestion = curStreak >= avgStreak * 1.3 ? "Gần TB bẻ, cân nhắc đánh ngược" : "Theo dõi thêm";
    } else if (curStreak === 3) {
      if (streaks.length >= 2 && streaks[streaks.length - 2].count === 3) {
        prediction = toLabel(last);
        confidence = 80;
        warning = "🔥 Có thể hình thành nhịp 3-3";
        patternName = "Nhịp 3-3 đang hình thành";
        suggestion = "Nếu nhịp 3-3, tiếp cùng chiều... KHÔNG, đã đủ 3 → bẻ";
        // Đã đủ 3 như streak trước → bẻ
        prediction = toLabel(opp(last));
        confidence = 82;
        suggestion = "Nhịp 3-3: streak trước = 3, streak này = 3 → BẺ";
      } else {
        prediction = toLabel(opp(last));
        confidence = 70;
        warning = `⚠️ Chuỗi 3 - Có thể đổi chiều`;
        patternName = "Chuỗi 3";
        suggestion = "Chuỗi 3 thường bẻ, cân nhắc ngược";
      }
      riskLevel = "caution";
    } else if (trapDetected) {
      prediction = toLabel(opp(last));
      confidence = 65;
      warning = trapWarn;
      patternName = "Bẫy cầu";
      riskLevel = "danger";
      suggestion = "Cầu bị phá nhịp! Giảm mức cược, quan sát";
    } else if (cauNghieng) {
      prediction = toLabel(opp(cauNghieng));
      confidence = 72;
      warning = `📐 Cầu nghiêng ${toLabel(cauNghieng)} (${Math.round((cauNghieng === "T" ? tR12 : 1 - tR12) * 100)}%)`;
      patternName = "Cầu nghiêng";
      riskLevel = "caution";
      suggestion = `Cầu nghiêng nặng về ${toLabel(cauNghieng)}, đánh ngược`;
    } else {
      if (streaks.length >= 2) {
        const prev = streaks[streaks.length - 2];
        if (prev.count === curStreak && prev.value !== last) {
          prediction = toLabel(opp(last));
          confidence = 72;
          warning = `📊 Pattern lặp ${prev.count}-${curStreak}`;
          patternName = "Pattern lặp";
          suggestion = "Lặp pattern, đánh theo quy luật";
        } else if (curStreak < avgStreak) {
          prediction = toLabel(last);
          confidence = 66;
          patternName = "Chưa đạt TB";
          suggestion = "Streak chưa đạt TB, tiếp cùng chiều";
        } else {
          prediction = toLabel(opp(last));
          confidence = 66;
          patternName = "Đạt TB";
          suggestion = "Đạt TB streak, cân nhắc bẻ";
        }
      } else {
        prediction = toLabel(opp(last));
        confidence = 60;
        patternName = "Cơ bản";
      }
      riskLevel = whipsaw ? "caution" : "safe";
    }

    // --- Cảnh báo bổ sung ---
    const warnings: string[] = [];
    if (warning) warnings.push(warning);
    if (spiralWarn) { warnings.push(spiralWarn); confidence = Math.max(55, confidence - 3); }
    if (trapDetected && !warning?.includes("BẪY")) { warnings.push(trapWarn); confidence = Math.max(55, confidence - 5); }
    if (whipsaw && !isR1) { warnings.push("⚡ Đảo chiều liên tục - WHIPSAW"); riskLevel = "caution"; }

    // Momentum adjustment
    if (momentumStrength > 0.3) {
      const momDir = momentum > 0 ? "T" : "X";
      warnings.push(`📈 Momentum mạnh: ${toLabel(momDir)} (${Math.round(momentumStrength * 100)}%)`);
      if ((prediction === "TÀI" && momDir === "T") || (prediction === "XỈU" && momDir === "X")) {
        confidence = Math.min(98, confidence + 3);
      }
    }

    // Tỉ lệ TÀI/XỈU gần đây
    if (len >= 8) {
      const taiPct = Math.round(tR8 * 100);
      warnings.push(`📊 8 phiên: TÀI ${taiPct}% | XỈU ${100 - taiPct}%`);
    }

    return {
      prediction,
      confidence: Math.min(98, confidence),
      warning: warnings.join("\n"),
      riskLevel,
      patternName,
      suggestion,
    };
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
    if (history.length < 1) return { result: "…", percent: 0, warning: undefined as string | undefined, riskLevel: "safe" as const, patternName: "", suggestion: "" };
    const analysis = analyzePattern(history);
    return { result: analysis.prediction, percent: analysis.confidence, warning: analysis.warning, riskLevel: analysis.riskLevel ?? "safe", patternName: analysis.patternName ?? "", suggestion: analysis.suggestion ?? "" };
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

            {/* Risk Level Badge */}
            {prediction.riskLevel && prediction.riskLevel !== "safe" && (
              <div className="mb-2 px-2 py-1 rounded-md text-center text-[10px] font-bold" style={{
                background: prediction.riskLevel === "extreme" ? "rgba(255,0,0,0.3)" :
                  prediction.riskLevel === "danger" ? "rgba(255,59,92,0.25)" :
                  "rgba(255,165,0,0.2)",
                color: prediction.riskLevel === "extreme" ? "#ff0000" :
                  prediction.riskLevel === "danger" ? "#ff3b5c" : "#ffa500",
                border: `1px solid ${prediction.riskLevel === "extreme" ? "#ff0000" : prediction.riskLevel === "danger" ? "#ff3b5c" : "#ffa500"}`,
                animation: prediction.riskLevel === "extreme" ? "pulse 0.5s infinite" : prediction.riskLevel === "danger" ? "pulse 1s infinite" : "none",
              }}>
                {prediction.riskLevel === "extreme" ? "🚨 CỰC KỲ NGUY HIỂM" :
                 prediction.riskLevel === "danger" ? "⚠️ NGUY HIỂM" : "⚡ CẨN THẬN"}
              </div>
            )}

            <div className="pt-2 mb-2" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              {prediction.patternName && (
                <div className="mb-1" style={{ fontSize: 10, color: "#4db8ff", fontWeight: "bold" }}>
                  🧠 {prediction.patternName}
                </div>
              )}
              🤖 Dự đoán phiên tiếp {nextSessionId && <span style={{ color: "#4db8ff", fontWeight: "bold" }}>#{nextSessionId}</span>}:<br />
              <span style={{
                color: prediction.result === "TÀI" ? "#00ff99" : "#ff3b5c",
                fontWeight: "bold",
                fontSize: 16,
                textShadow: prediction.result === "TÀI" ? "0 0 8px rgba(0,255,153,0.5)" : "0 0 8px rgba(255,59,92,0.5)",
              }}>
                {prediction.result}
              </span>
              <br />
              📊 Độ tin cậy: <span style={{ color: prediction.percent >= 85 ? "#00ff99" : prediction.percent >= 70 ? "#ffd966" : "#ff3b5c", fontWeight: "bold", fontSize: 13 }}>{prediction.percent}%</span>
              
              {/* Suggestion */}
              {prediction.suggestion && (
                <div style={{ fontSize: 9, color: "#4db8ff", marginTop: 4, padding: "3px 6px", background: "rgba(77,184,255,0.1)", borderRadius: 4, borderLeft: "2px solid #4db8ff" }}>
                  💡 {prediction.suggestion}
                </div>
              )}

              {/* Warnings */}
              {prediction.warning && prediction.warning.split("\n").map((w, i) => (
                <div key={i} style={{
                  fontSize: 9,
                  color: w.includes("🚨") || w.includes("NGUY") ? "#ff3b5c" :
                    w.includes("🪤") || w.includes("BẪY") ? "#ff6b00" :
                    w.includes("🔥") ? "#ffd700" :
                    w.includes("📈") || w.includes("📊") ? "#aaa" : "#ffd700",
                  marginTop: 3,
                  fontWeight: w.includes("🚨") ? "bold" : "normal",
                }}>
                  {w}
                </div>
              ))}
            </div>

            <div className="flex gap-1 flex-wrap mt-1 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {history.slice(-12).map((h, i) => (
                <div key={i} className="w-3 h-3 rounded-full" title={h === "T" ? "TÀI" : "XỈU"} style={{
                  background: h === "T" ? "#00ff99" : "#ff3b5c",
                  boxShadow: h === "T" ? "0 0 5px #00ff99" : "0 0 5px #ff3b5c",
                }} />
              ))}
            </div>

            {betting && (
              <div className="text-[11px] mt-1.5" style={{ color: "#aaa" }}>
                Cược: <span style={{ color: "#00ff99" }}>TÀI {betting.nguoi_cuoc.tai}</span> / <span style={{ color: "#ff3b5c" }}>XỈU {betting.nguoi_cuoc.xiu}</span>
                {/* Phân tích lệch cược */}
                {(() => {
                  const total = betting.nguoi_cuoc.tai + betting.nguoi_cuoc.xiu;
                  if (total > 0) {
                    const taiPct = Math.round(betting.nguoi_cuoc.tai / total * 100);
                    const lech = Math.abs(taiPct - 50);
                    if (lech >= 20) {
                      return <div style={{ fontSize: 9, color: "#ff6b00", marginTop: 2 }}>⚠️ Lệch cược {lech}% - {taiPct > 50 ? "Đông TÀI" : "Đông XỈU"}</div>;
                    }
                  }
                  return null;
                })()}
              </div>
            )}

            <div className="relative h-1 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{
                width: `${progress * 100}%`,
                background: prediction.riskLevel === "extreme" ? "linear-gradient(90deg, #ff0000, #ff3b5c)" :
                  prediction.riskLevel === "danger" ? "linear-gradient(90deg, #ff3b5c, #ff8c00)" :
                  "linear-gradient(90deg, #ffd700, #ff8c00)",
                transition: "width 0.1s linear"
              }} />
            </div>

            <div className="text-[10px] mt-1" style={{ color: "#666" }}>🟢 Đã đồng bộ game | 📊 {history.length} phiên</div>
          </>
        ) : null}
      </RobotBubble>
    </div>
  );
}
