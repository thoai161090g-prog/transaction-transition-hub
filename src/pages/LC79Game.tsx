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
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const POLL_MS = 3000;

  useEffect(() => {
    hasActiveKey().then(setHasKey);
  }, []);

  // Load lịch sử từ DB khi mount
  useEffect(() => {
    if (!user) { setHistoryLoaded(true); return; }
    const loadHistory = async () => {
      try {
        const { data } = await supabase
          .from("game_history")
          .select("phien, result")
          .eq("user_id", user.id)
          .eq("game", "LC79")
          .order("created_at", { ascending: true })
          .limit(30);
        if (data && data.length > 0) {
          const loaded = data.map(d => d.result);
          setHistory(loaded.slice(-20));
          lastSessionRef.current = data[data.length - 1].phien;
        }
      } catch (e) {
        console.error("Load history error:", e);
      }
      setHistoryLoaded(true);
    };
    loadHistory();
  }, [user]);

  // === THUẬT TOÁN PHÂN TÍCH NHỊP CẦU LC79 V3 - SIÊU GẮT ===
  const analyzePattern = (hist: string[]): { prediction: string; confidence: number; warning?: string; riskLevel?: "safe" | "caution" | "danger" | "extreme"; patternName?: string; suggestion?: string; streakDNA?: string; winRate?: number } => {
    const len = hist.length;
    if (len < 1) return { prediction: "TÀI", confidence: 50, riskLevel: "safe", patternName: "Chưa đủ dữ liệu" };
    if (len < 2) return { prediction: hist[0] === "T" ? "XỈU" : "TÀI", confidence: 55, riskLevel: "safe", patternName: "Khởi đầu" };

    const last = hist[len - 1];
    const opp = (v: string) => v === "T" ? "X" : "T";
    const toLabel = (v: string) => v === "T" ? "TÀI" : "XỈU";

    // ========== TÁCH STREAKS ==========
    const streaks: { value: string; count: number }[] = [];
    let sVal = hist[0], sCount = 1;
    for (let i = 1; i < len; i++) {
      if (hist[i] === sVal) sCount++;
      else { streaks.push({ value: sVal, count: sCount }); sVal = hist[i]; sCount = 1; }
    }
    streaks.push({ value: sVal, count: sCount });
    const curStreak = streaks[streaks.length - 1].count;

    // ========== STREAK DNA FINGERPRINT ==========
    // Mã hóa nhịp cầu thành chuỗi DNA: "2T-1X-3T-2X" → nhận diện pattern lặp
    const streakDNA = streaks.slice(-8).map(s => `${s.count}${s.value}`).join("-");
    const dnaShort = streaks.slice(-4).map(s => s.count).join("");

    // ========== THỐNG KÊ ĐA TẦNG ==========
    const windows = [5, 8, 12, 16, 20].map(w => {
      const slice = hist.slice(-w);
      const tCount = slice.filter(h => h === "T").length;
      return { w, tR: tCount / slice.length, xR: (slice.length - tCount) / slice.length, len: slice.length };
    }).filter(s => s.len >= s.w * 0.8);

    const tR5 = windows.find(w => w.w === 5)?.tR ?? 0.5;
    const tR8 = windows.find(w => w.w === 8)?.tR ?? 0.5;
    const tR12 = windows.find(w => w.w === 12)?.tR ?? 0.5;
    const tR16 = windows.find(w => w.w === 16)?.tR ?? 0.5;
    const tR20 = windows.find(w => w.w === 20)?.tR ?? 0.5;

    // ========== MOMENTUM ĐA TẦNG ==========
    const momShort = tR5 - tR12;   // Ngắn vs Trung
    const momMid = tR8 - tR16;     // Trung vs Dài
    const momLong = tR12 - tR20;   // Dài vs Siêu dài
    const momTotal = (momShort * 3 + momMid * 2 + momLong) / 6; // Trọng số giảm dần
    const momStrength = Math.abs(momTotal);

    // ========== DIVERGENCE: Phân kỳ giữa các window ==========
    // Khi momentum ngắn đi ngược momentum dài → tín hiệu đảo chiều mạnh
    let divergence = false;
    let divWarn = "";
    if (Math.sign(momShort) !== Math.sign(momLong) && Math.abs(momShort) > 0.15 && Math.abs(momLong) > 0.1) {
      divergence = true;
      const shortDir = momShort > 0 ? "TÀI" : "XỈU";
      const longDir = momLong > 0 ? "TÀI" : "XỈU";
      divWarn = `🔀 PHÂN KỲ: Ngắn→${shortDir} vs Dài→${longDir}`;
    }

    const avgStreak = streaks.length > 2
      ? streaks.slice(0, -1).reduce((a, b) => a + b.count, 0) / (streaks.length - 1)
      : 2;
    const maxStreak = streaks.length > 1 ? Math.max(...streaks.slice(0, -1).map(s => s.count)) : curStreak;
    const medianStreak = (() => {
      if (streaks.length <= 1) return 2;
      const sorted = streaks.slice(0, -1).map(s => s.count).sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    })();

    // ========== FIBONACCI STREAK ==========
    // Streak lengths following Fibonacci: 1-1-2-3-5-8
    const fib = [1, 1, 2, 3, 5, 8, 13];
    const isFibStreak = fib.includes(curStreak) && streaks.length >= 2 && fib.includes(streaks[streaks.length - 2].count);
    const nextFib = fib.find(f => f > curStreak) ?? curStreak + 1;

    // ========== NHỊP CẦU DETECTION ==========
    const r1_10 = len >= 10 && hist.slice(-10).every((v, i, a) => i === 0 || v !== a[i - 1]);
    const r1_8 = len >= 8 && hist.slice(-8).every((v, i, a) => i === 0 || v !== a[i - 1]);
    const r1_6 = len >= 6 && hist.slice(-6).every((v, i, a) => i === 0 || v !== a[i - 1]);
    const r1_4 = len >= 4 && hist.slice(-4).every((v, i, a) => i === 0 || v !== a[i - 1]);
    const isR1 = r1_10 || r1_8 || r1_6 || r1_4;

    const checkRhythm = (n: number) => streaks.length >= n && (() => {
      const r = streaks.slice(-(n + 1));
      return r.length >= n && r.every(s => s.count === n) &&
        r.every((s, i) => i === 0 || s.value !== r[i - 1].value);
    })();
    const isR2 = checkRhythm(2);
    const isR3 = checkRhythm(3);
    const isR4 = checkRhythm(4);
    const isR5 = streaks.length >= 2 && (() => {
      const r = streaks.slice(-3);
      return r.filter(s => s.count === 5).length >= 2 &&
        r.every((s, i) => i === 0 || s.value !== r[i - 1].value);
    })();

    // ========== CẦU GÃY: Nhịp ổn rồi bị phá đột ngột ==========
    let cauGay = false;
    let cauGayWarn = "";
    if (streaks.length >= 4) {
      const prev3 = streaks.slice(-4, -1).map(s => s.count);
      const avgPrev = prev3.reduce((a, b) => a + b, 0) / 3;
      const variance = prev3.reduce((a, b) => a + (b - avgPrev) ** 2, 0) / 3;
      if (variance <= 0.5 && Math.abs(curStreak - avgPrev) >= 2) {
        cauGay = true;
        cauGayWarn = `💥 CẦU GÃY: Nhịp ${prev3.join("-")} → ${curStreak} (phá vỡ!)`;
      }
    }

    // ========== CẦU ĐÔI: Pattern A-B lặp lại ==========
    let cauDoi = false;
    let cauDoiPattern = "";
    if (streaks.length >= 6) {
      const last6 = streaks.slice(-6);
      const p1 = last6.slice(0, 2).map(s => s.count).join("-");
      const p2 = last6.slice(2, 4).map(s => s.count).join("-");
      const p3 = last6.slice(4, 6).map(s => s.count).join("-");
      if (p1 === p2 && p2 === p3) {
        cauDoi = true;
        cauDoiPattern = p1;
      } else if (p2 === p3) {
        cauDoi = true;
        cauDoiPattern = p2;
      }
    }

    // ========== CẦU BA: Pattern A-B-C lặp lại ==========
    let cauBa = false;
    let cauBaPattern = "";
    if (streaks.length >= 9) {
      const g1 = streaks.slice(-9, -6).map(s => s.count).join("-");
      const g2 = streaks.slice(-6, -3).map(s => s.count).join("-");
      const g3 = streaks.slice(-3).map(s => s.count).join("-");
      if (g1 === g2 && g2 === g3) {
        cauBa = true;
        cauBaPattern = g1;
      }
    }

    // ========== BỆT ĐẢO NÂNG CAO ==========
    const betDao = streaks.length >= 3 && (() => {
      const cur = streaks[streaks.length - 1];
      const mid = streaks[streaks.length - 2];
      const prev = streaks[streaks.length - 3];
      if (prev.count >= 3 && mid.count === 1 && cur.value === prev.value && cur.count >= 2)
        return { match: true, prevLen: prev.count };
      // Bệt đảo kép: ...TTTT X TTTT X TTTT
      if (streaks.length >= 5) {
        const s5 = streaks.slice(-5);
        if (s5[0].count >= 3 && s5[1].count === 1 && s5[2].count >= 3 && s5[3].count === 1 && s5[4].value === s5[0].value) {
          return { match: true, prevLen: s5[2].count, double: true };
        }
      }
      return { match: false, prevLen: 0 };
    })();

    // ========== BẪY CẦU NÂNG CAO ==========
    let trapDetected = false;
    let trapWarn = "";
    if (streaks.length >= 5) {
      const recent5 = streaks.slice(-5);
      const counts = recent5.map(s => s.count);
      const stable = counts.slice(0, 3);
      const stableAvg = stable.reduce((a, b) => a + b, 0) / 3;
      const lastTwo = counts.slice(3);
      if (Math.abs(stable[0] - stable[1]) <= 1 && Math.abs(stable[1] - stable[2]) <= 1) {
        if (lastTwo.some(c => Math.abs(c - stableAvg) >= 2)) {
          trapDetected = true;
          trapWarn = `🪤 BẪY CẦU: Nhịp ${stable.join("-")} bị phá → ${lastTwo.join("-")}`;
        }
      }
      // Bẫy cầu kiểu "cho ngon rồi quật": nhiều streak ngắn rồi bất ngờ streak dài
      if (counts.slice(0, 4).every(c => c <= 2) && counts[4] >= 5) {
        trapDetected = true;
        trapWarn = `🪤 BẪY SẬP: ${counts.slice(0, 4).join("-")} → BỆT ${counts[4]}!`;
      }
    }

    // ========== WHIPSAW NÂNG CAO ==========
    let whipsaw = false;
    let whipsawCount = 0;
    if (streaks.length >= 4) {
      const last4 = streaks.slice(-4);
      whipsawCount = last4.filter(s => s.count === 1).length;
      if (whipsawCount >= 3) whipsaw = true;
    }

    // ========== CẦU XOẮN ==========
    let spiralWarn = "";
    let spiralType: "inc" | "dec" | "chaos" | null = null;
    if (streaks.length >= 4) {
      const rc = streaks.slice(-4).map(s => s.count);
      const inc = rc.every((v, i) => i === 0 || v >= rc[i - 1]);
      const dec = rc.every((v, i) => i === 0 || v <= rc[i - 1]);
      if (inc && rc[3] >= 3) { spiralWarn = "🌀 Cầu xoắn TĂNG: " + rc.join("→"); spiralType = "inc"; }
      else if (dec && rc[0] >= 3) { spiralWarn = "🌀 Cầu xoắn GIẢM: " + rc.join("→"); spiralType = "dec"; }
      else {
        const avg = rc.reduce((a, b) => a + b, 0) / 4;
        const vari = rc.reduce((a, b) => a + (b - avg) ** 2, 0) / 4;
        if (vari > 3) { spiralWarn = "⚡ Nhịp hỗn loạn: " + rc.join("-"); spiralType = "chaos"; }
      }
    }

    // ========== CẦU NGHIÊNG ĐA TẦNG ==========
    const cauNghieng12 = tR12 >= 0.75 ? "T" : tR12 <= 0.25 ? "X" : null;
    const cauNghieng8 = tR8 >= 0.8 ? "T" : tR8 <= 0.2 ? "X" : null;
    const cauNghiengDouble = cauNghieng12 && cauNghieng8 && cauNghieng12 === cauNghieng8;

    // ========== TÍNH ĐIỂM WEIGHTED SCORING ==========
    // Mỗi tín hiệu có trọng số, tổng hợp để ra quyết định cuối
    interface Signal { dir: string; weight: number; name: string; }
    const signals: Signal[] = [];

    // Tín hiệu nhịp cầu
    if (isR1) signals.push({ dir: opp(last), weight: r1_10 ? 30 : r1_8 ? 25 : r1_6 ? 20 : 15, name: "Nhịp 1-1" });
    if (isR2) signals.push({ dir: curStreak < 2 ? last : opp(last), weight: 22, name: "Nhịp 2-2" });
    if (isR3) signals.push({ dir: curStreak < 3 ? last : opp(last), weight: 24, name: "Nhịp 3-3" });
    if (isR4) signals.push({ dir: curStreak < 4 ? last : opp(last), weight: 22, name: "Nhịp 4-4" });
    if (isR5) signals.push({ dir: curStreak < 5 ? last : opp(last), weight: 20, name: "Nhịp 5-5" });

    // Tín hiệu cầu đôi/ba
    if (cauDoi) {
      const parts = cauDoiPattern.split("-").map(Number);
      const expectedLen = parts[streaks.length % 2 === 0 ? 0 : 1] ?? parts[0];
      signals.push({ dir: curStreak < expectedLen ? last : opp(last), weight: 18, name: `Cầu đôi ${cauDoiPattern}` });
    }
    if (cauBa) signals.push({ dir: curStreak < (Number(cauBaPattern.split("-")[streaks.length % 3]) || 2) ? last : opp(last), weight: 20, name: `Cầu ba ${cauBaPattern}` });

    // Tín hiệu bệt
    if (curStreak >= 8) signals.push({ dir: opp(last), weight: 8, name: "Bệt siêu dài" });
    else if (curStreak >= 6) signals.push({ dir: opp(last), weight: 12, name: "Bệt cực dài" });
    else if (curStreak >= 4) {
      const breakProb = curStreak >= avgStreak * 1.3;
      signals.push({ dir: opp(last), weight: breakProb ? 16 : 10, name: `Bệt ${curStreak}` });
    }

    // Tín hiệu momentum
    if (momStrength > 0.15) {
      const momDir = momTotal > 0 ? "T" : "X";
      signals.push({ dir: momDir, weight: Math.round(momStrength * 30), name: "Momentum" });
    }

    // Tín hiệu cầu nghiêng
    if (cauNghiengDouble) {
      signals.push({ dir: opp(cauNghieng12!), weight: 14, name: "Cầu nghiêng đôi" });
    } else if (cauNghieng12) {
      signals.push({ dir: opp(cauNghieng12), weight: 10, name: "Cầu nghiêng" });
    }

    // Fibonacci
    if (isFibStreak) {
      signals.push({ dir: curStreak < nextFib ? last : opp(last), weight: 8, name: "Fibonacci" });
    }

    // Spiral
    if (spiralType === "inc") signals.push({ dir: last, weight: 6, name: "Xoắn tăng" });
    else if (spiralType === "dec") signals.push({ dir: opp(last), weight: 8, name: "Xoắn giảm" });

    // Divergence
    if (divergence) {
      const shortDir = momShort > 0 ? "T" : "X";
      signals.push({ dir: shortDir, weight: 12, name: "Phân kỳ" });
    }

    // ========== TỔNG HỢP SIGNALS ==========
    const taiScore = signals.filter(s => s.dir === "T").reduce((a, b) => a + b.weight, 0);
    const xiuScore = signals.filter(s => s.dir === "X").reduce((a, b) => a + b.weight, 0);
    const totalScore = taiScore + xiuScore;

    let prediction: string;
    let confidence: number;
    let warning: string | undefined;
    let riskLevel: "safe" | "caution" | "danger" | "extreme" = "safe";
    let patternName = "";
    let suggestion = "";

    // Nếu có signals → dùng weighted scoring
    if (totalScore > 0) {
      const winDir = taiScore >= xiuScore ? "T" : "X";
      prediction = toLabel(winDir);
      const dominance = Math.max(taiScore, xiuScore) / totalScore;
      confidence = Math.round(50 + dominance * 45); // 50-95

      // Tìm signal mạnh nhất
      const topSignal = signals.sort((a, b) => b.weight - a.weight)[0];
      patternName = topSignal.name;

      // Signal count agreement
      const agreeCount = signals.filter(s => s.dir === winDir).length;
      const totalSignals = signals.length;
      const agreement = agreeCount / totalSignals;

      if (agreement >= 0.8 && confidence >= 80) {
        suggestion = `🎯 ${agreeCount}/${totalSignals} tín hiệu đồng thuận - MẠNH`;
        riskLevel = "safe";
      } else if (agreement >= 0.6) {
        suggestion = `✅ ${agreeCount}/${totalSignals} tín hiệu đồng thuận`;
        riskLevel = "safe";
      } else if (agreement >= 0.4) {
        suggestion = `⚠️ Tín hiệu chia rẽ ${agreeCount}/${totalSignals} - Cẩn thận`;
        riskLevel = "caution";
        confidence = Math.max(55, confidence - 5);
      } else {
        suggestion = `🚨 Tín hiệu mâu thuẫn ${agreeCount}/${totalSignals} - KHÔNG NÊN CƯỢC`;
        riskLevel = "danger";
        confidence = Math.max(50, confidence - 10);
      }

      // Top signals breakdown
      const topNames = signals.sort((a, b) => b.weight - a.weight).slice(0, 3).map(s => `${s.name}(${s.dir === "T" ? "T" : "X"})`);
      warning = `🧠 ${topNames.join(" | ")}`;
    } else {
      // Fallback cơ bản
      prediction = toLabel(opp(last));
      confidence = 58;
      patternName = "Phân tích cơ bản";
      suggestion = "Chưa đủ tín hiệu rõ ràng";
    }

    // ========== OVERRIDE: Các trường hợp đặc biệt ==========

    // Bệt siêu dài → extreme
    if (curStreak >= 8) {
      riskLevel = "extreme";
      suggestion = "🚨 DỪNG CƯỢC! Bệt " + curStreak + " phiên - Chờ bẻ rõ";
    } else if (curStreak >= 6) {
      riskLevel = "danger";
    }

    // Bẫy cầu → tăng risk
    if (trapDetected) {
      if (riskLevel === "safe") riskLevel = "caution";
      else if (riskLevel === "caution") riskLevel = "danger";
    }

    // Cầu gãy → cảnh báo mạnh
    if (cauGay) {
      if (riskLevel === "safe") riskLevel = "caution";
    }

    // ========== COMPILE WARNINGS ==========
    const warnings: string[] = [];
    if (warning) warnings.push(warning);

    // Nhịp cầu chính
    if (isR1) warnings.push(`🔥 Nhịp 1-1 luân phiên${r1_10 ? " (10 phiên!)" : r1_8 ? " (8 phiên)" : ""}`);
    if (isR2) warnings.push(`🔥 Nhịp 2-2 (${curStreak}/2)`);
    if (isR3) warnings.push(`🔥 Nhịp 3-3 (${curStreak}/3)`);
    if (isR4) warnings.push(`🔥🔥 Nhịp 4-4 (${curStreak}/4)`);
    if (isR5) warnings.push(`🔥🔥🔥 Nhịp 5-5 (${curStreak}/5) HIẾM!`);

    // Pattern nâng cao
    if (cauDoi) warnings.push(`🔗 Cầu đôi: ${cauDoiPattern} lặp lại`);
    if (cauBa) warnings.push(`🔗🔗 Cầu ba: ${cauBaPattern} HIẾM`);
    if (cauGay) warnings.push(cauGayWarn);
    if (trapDetected) warnings.push(trapWarn);
    if (spiralWarn) warnings.push(spiralWarn);
    if (divWarn) warnings.push(divWarn);
    if (whipsaw) warnings.push(`⚡ WHIPSAW: ${whipsawCount}/4 đảo chiều liên tục`);
    if (isFibStreak) warnings.push(`🔢 Fibonacci streak: ${streaks.slice(-2).map(s => s.count).join("→")} (next: ${nextFib})`);

    // Bệt cảnh báo
    if (curStreak >= 8) warnings.push(`🚨🚨 BỆT SIÊU DÀI ${curStreak} phiên! CỰC KỲ NGUY HIỂM`);
    else if (curStreak >= 6) warnings.push(`🚨 BỆT CỰC DÀI ${curStreak}! TB bẻ: ${avgStreak.toFixed(1)} | Max: ${maxStreak}`);
    else if (curStreak >= 4) warnings.push(`⚠️ Bệt ${curStreak} | TB: ${avgStreak.toFixed(1)} | Median: ${medianStreak}`);

    // Cầu nghiêng
    if (cauNghiengDouble) {
      warnings.push(`📐📐 Cầu nghiêng ĐÔI ${toLabel(cauNghieng12!)} (8p: ${Math.round(tR8 * 100)}% | 12p: ${Math.round(tR12 * 100)}%)`);
    } else if (cauNghieng12) {
      warnings.push(`📐 Cầu nghiêng ${toLabel(cauNghieng12)} (${Math.round((cauNghieng12 === "T" ? tR12 : 1 - tR12) * 100)}%)`);
    }

    // Momentum
    if (momStrength > 0.15) {
      const dir = momTotal > 0 ? "TÀI" : "XỈU";
      warnings.push(`📈 Momentum: ${dir} ${momStrength > 0.3 ? "MẠNH" : ""} (${Math.round(momStrength * 100)}%)`);
    }

    // Thống kê
    if (len >= 8) {
      warnings.push(`📊 Tỉ lệ gần: 5p=${Math.round(tR5 * 100)}T | 8p=${Math.round(tR8 * 100)}T | 12p=${Math.round(tR12 * 100)}T`);
    }

    // Streak DNA
    if (streaks.length >= 4) {
      warnings.push(`🧬 DNA: ${streakDNA}`);
    }

    // BetDao
    if (betDao && typeof betDao === "object" && betDao.match) {
      const d = betDao as { match: boolean; prevLen: number; double?: boolean };
      warnings.push(`🔄 Bệt đảo${d.double ? " KÉP" : ""}: (${curStreak}/${d.prevLen})`);
    }

    return {
      prediction,
      confidence: Math.min(98, Math.max(50, confidence)),
      warning: warnings.join("\n"),
      riskLevel,
      patternName,
      suggestion,
      streakDNA: dnaShort,
      winRate: len >= 5 ? Math.round(tR12 * 100) : undefined,
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
    if (history.length < 1) return { result: "…", percent: 0, warning: undefined as string | undefined, riskLevel: "safe" as const, patternName: "", suggestion: "", streakDNA: "", winRate: undefined as number | undefined };
    const analysis = analyzePattern(history);
    return { result: analysis.prediction, percent: analysis.confidence, warning: analysis.warning, riskLevel: analysis.riskLevel ?? "safe", patternName: analysis.patternName ?? "", suggestion: analysis.suggestion ?? "", streakDNA: analysis.streakDNA ?? "", winRate: analysis.winRate };
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

            <div className="text-[10px] mt-1 flex justify-between" style={{ color: "#666" }}>
              <span>🟢 Đã đồng bộ | 📊 {history.length}p</span>
              {prediction.streakDNA && <span style={{ color: "#555" }}>🧬 {prediction.streakDNA}</span>}
            </div>
            {prediction.winRate !== undefined && (
              <div className="text-[9px] mt-0.5" style={{ color: "#555" }}>
                TÀI: {prediction.winRate}% | XỈU: {100 - prediction.winRate}% (12p)
              </div>
            )}
          </>
        ) : null}
      </RobotBubble>
    </div>
  );
}
