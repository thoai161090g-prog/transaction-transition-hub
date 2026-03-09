// === THUẬT TOÁN PHÂN TÍCH NHỊP CẦU V3 - SIÊU GẮT ===
// Dùng chung cho LC79, Sunwin, BCR
// Hỗ trợ 2 chế độ: Tài/Xỉu (T/X) và Banker/Player (B/P)

export type GameMode = "taixiu" | "baccarat";
export type RiskLevel = "safe" | "caution" | "danger" | "extreme";

export interface AnalysisResult {
  prediction: string;          // "TÀI", "XỈU", "BANKER", "PLAYER"
  confidence: number;          // 50-98
  warning?: string;            // Chuỗi cảnh báo
  riskLevel: RiskLevel;
  patternName?: string;
  suggestion?: string;
  streakDNA?: string;
  winRate?: number;
}

export function analyzePatternV3(hist: string[], mode: GameMode = "taixiu"): AnalysisResult {
  // Normalize input: T/X for taixiu, B/P for baccarat
  const isA = (v: string) => mode === "taixiu" ? v === "T" : v === "B";
  const labelA = mode === "taixiu" ? "TÀI" : "BANKER";
  const labelB = mode === "taixiu" ? "XỈU" : "PLAYER";
  const markerA = mode === "taixiu" ? "T" : "B";
  const markerB = mode === "taixiu" ? "X" : "P";

  const len = hist.length;
  if (len < 1) return { prediction: labelA, confidence: 50, riskLevel: "safe", patternName: "Chưa đủ dữ liệu" };
  if (len < 2) return { prediction: isA(hist[0]) ? labelB : labelA, confidence: 55, riskLevel: "safe", patternName: "Khởi đầu" };

  const last = hist[len - 1];
  const opp = (v: string) => isA(v) ? markerB : markerA;
  const toLabel = (v: string) => isA(v) ? labelA : labelB;

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
  const streakDNA = streaks.slice(-8).map(s => `${s.count}${s.value}`).join("-");
  const dnaShort = streaks.slice(-4).map(s => s.count).join("");

  // ========== THỐNG KÊ ĐA TẦNG ==========
  const windows = [5, 8, 12, 16, 20].map(w => {
    const slice = hist.slice(-w);
    const aCount = slice.filter(h => isA(h)).length;
    return { w, aR: aCount / slice.length, bR: (slice.length - aCount) / slice.length, len: slice.length };
  }).filter(s => s.len >= s.w * 0.8);

  const aR5 = windows.find(w => w.w === 5)?.aR ?? 0.5;
  const aR8 = windows.find(w => w.w === 8)?.aR ?? 0.5;
  const aR12 = windows.find(w => w.w === 12)?.aR ?? 0.5;
  const aR16 = windows.find(w => w.w === 16)?.aR ?? 0.5;
  const aR20 = windows.find(w => w.w === 20)?.aR ?? 0.5;

  // ========== MOMENTUM ĐA TẦNG ==========
  const momShort = aR5 - aR12;
  const momMid = aR8 - aR16;
  const momLong = aR12 - aR20;
  const momTotal = (momShort * 3 + momMid * 2 + momLong) / 6;
  const momStrength = Math.abs(momTotal);

  // ========== DIVERGENCE ==========
  let divergence = false;
  let divWarn = "";
  if (Math.sign(momShort) !== Math.sign(momLong) && Math.abs(momShort) > 0.15 && Math.abs(momLong) > 0.1) {
    divergence = true;
    const shortDir = momShort > 0 ? labelA : labelB;
    const longDir = momLong > 0 ? labelA : labelB;
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

  // ========== CẦU GÃY ==========
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

  // ========== CẦU ĐÔI ==========
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

  // ========== CẦU BA ==========
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

  // ========== BỆT ĐẢO ==========
  const betDao = streaks.length >= 3 && (() => {
    const cur = streaks[streaks.length - 1];
    const mid = streaks[streaks.length - 2];
    const prev = streaks[streaks.length - 3];
    if (prev.count >= 3 && mid.count === 1 && cur.value === prev.value && cur.count >= 2)
      return { match: true, prevLen: prev.count };
    if (streaks.length >= 5) {
      const s5 = streaks.slice(-5);
      if (s5[0].count >= 3 && s5[1].count === 1 && s5[2].count >= 3 && s5[3].count === 1 && s5[4].value === s5[0].value) {
        return { match: true, prevLen: s5[2].count, double: true };
      }
    }
    return { match: false, prevLen: 0 };
  })();

  // ========== BẪY CẦU ==========
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
    if (counts.slice(0, 4).every(c => c <= 2) && counts[4] >= 5) {
      trapDetected = true;
      trapWarn = `🪤 BẪY SẬP: ${counts.slice(0, 4).join("-")} → BỆT ${counts[4]}!`;
    }
  }

  // ========== WHIPSAW ==========
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

  // ========== CẦU NGHIÊNG ==========
  const cauNghieng12 = aR12 >= 0.75 ? markerA : aR12 <= 0.25 ? markerB : null;
  const cauNghieng8 = aR8 >= 0.8 ? markerA : aR8 <= 0.2 ? markerB : null;
  const cauNghiengDouble = cauNghieng12 && cauNghieng8 && cauNghieng12 === cauNghieng8;

  // ========== WEIGHTED SCORING ==========
  interface Signal { dir: string; weight: number; name: string; }
  const signals: Signal[] = [];

  if (isR1) signals.push({ dir: opp(last), weight: r1_10 ? 30 : r1_8 ? 25 : r1_6 ? 20 : 15, name: "Nhịp 1-1" });
  if (isR2) signals.push({ dir: curStreak < 2 ? last : opp(last), weight: 22, name: "Nhịp 2-2" });
  if (isR3) signals.push({ dir: curStreak < 3 ? last : opp(last), weight: 24, name: "Nhịp 3-3" });
  if (isR4) signals.push({ dir: curStreak < 4 ? last : opp(last), weight: 22, name: "Nhịp 4-4" });
  if (isR5) signals.push({ dir: curStreak < 5 ? last : opp(last), weight: 20, name: "Nhịp 5-5" });

  if (cauDoi) {
    const parts = cauDoiPattern.split("-").map(Number);
    const expectedLen = parts[streaks.length % 2 === 0 ? 0 : 1] ?? parts[0];
    signals.push({ dir: curStreak < expectedLen ? last : opp(last), weight: 18, name: `Cầu đôi ${cauDoiPattern}` });
  }
  if (cauBa) signals.push({ dir: curStreak < (Number(cauBaPattern.split("-")[streaks.length % 3]) || 2) ? last : opp(last), weight: 20, name: `Cầu ba ${cauBaPattern}` });

  if (curStreak >= 8) signals.push({ dir: opp(last), weight: 8, name: "Bệt siêu dài" });
  else if (curStreak >= 6) signals.push({ dir: opp(last), weight: 12, name: "Bệt cực dài" });
  else if (curStreak >= 4) {
    const breakProb = curStreak >= avgStreak * 1.3;
    signals.push({ dir: opp(last), weight: breakProb ? 16 : 10, name: `Bệt ${curStreak}` });
  }

  if (momStrength > 0.15) {
    const momDir = momTotal > 0 ? markerA : markerB;
    signals.push({ dir: momDir, weight: Math.round(momStrength * 30), name: "Momentum" });
  }

  if (cauNghiengDouble) {
    signals.push({ dir: opp(cauNghieng12!), weight: 14, name: "Cầu nghiêng đôi" });
  } else if (cauNghieng12) {
    signals.push({ dir: opp(cauNghieng12), weight: 10, name: "Cầu nghiêng" });
  }

  if (isFibStreak) {
    signals.push({ dir: curStreak < nextFib ? last : opp(last), weight: 8, name: "Fibonacci" });
  }

  if (spiralType === "inc") signals.push({ dir: last, weight: 6, name: "Xoắn tăng" });
  else if (spiralType === "dec") signals.push({ dir: opp(last), weight: 8, name: "Xoắn giảm" });

  if (divergence) {
    const shortDir = momShort > 0 ? markerA : markerB;
    signals.push({ dir: shortDir, weight: 12, name: "Phân kỳ" });
  }

  // ========== TỔNG HỢP ==========
  const aScore = signals.filter(s => s.dir === markerA).reduce((a, b) => a + b.weight, 0);
  const bScore = signals.filter(s => s.dir === markerB).reduce((a, b) => a + b.weight, 0);
  const totalScore = aScore + bScore;

  let prediction: string;
  let confidence: number;
  let warning: string | undefined;
  let riskLevel: RiskLevel = "safe";
  let patternName = "";
  let suggestion = "";

  if (totalScore > 0) {
    const winDir = aScore >= bScore ? markerA : markerB;
    prediction = toLabel(winDir);
    const dominance = Math.max(aScore, bScore) / totalScore;
    confidence = Math.round(50 + dominance * 45);

    const topSignal = signals.sort((a, b) => b.weight - a.weight)[0];
    patternName = topSignal.name;

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

    const topNames = signals.sort((a, b) => b.weight - a.weight).slice(0, 3).map(s => `${s.name}(${isA(s.dir) ? labelA[0] : labelB[0]})`);
    warning = `🧠 ${topNames.join(" | ")}`;
  } else {
    prediction = toLabel(opp(last));
    confidence = 58;
    patternName = "Phân tích cơ bản";
    suggestion = "Chưa đủ tín hiệu rõ ràng";
  }

  // ========== OVERRIDE ==========
  if (curStreak >= 8) {
    riskLevel = "extreme";
    suggestion = "🚨 DỪNG CƯỢC! Bệt " + curStreak + " phiên - Chờ bẻ rõ";
  } else if (curStreak >= 6) {
    riskLevel = "danger";
  }

  if (trapDetected) {
    if (riskLevel === "safe") riskLevel = "caution";
    else if (riskLevel === "caution") riskLevel = "danger";
  }
  if (cauGay) {
    if (riskLevel === "safe") riskLevel = "caution";
  }

  // ========== COMPILE WARNINGS ==========
  const warnings: string[] = [];
  if (warning) warnings.push(warning);

  if (isR1) warnings.push(`🔥 Nhịp 1-1 luân phiên${r1_10 ? " (10 phiên!)" : r1_8 ? " (8 phiên)" : ""}`);
  if (isR2) warnings.push(`🔥 Nhịp 2-2 (${curStreak}/2)`);
  if (isR3) warnings.push(`🔥 Nhịp 3-3 (${curStreak}/3)`);
  if (isR4) warnings.push(`🔥🔥 Nhịp 4-4 (${curStreak}/4)`);
  if (isR5) warnings.push(`🔥🔥🔥 Nhịp 5-5 (${curStreak}/5) HIẾM!`);

  if (cauDoi) warnings.push(`🔗 Cầu đôi: ${cauDoiPattern} lặp lại`);
  if (cauBa) warnings.push(`🔗🔗 Cầu ba: ${cauBaPattern} HIẾM`);
  if (cauGay) warnings.push(cauGayWarn);
  if (trapDetected) warnings.push(trapWarn);
  if (spiralWarn) warnings.push(spiralWarn);
  if (divWarn) warnings.push(divWarn);
  if (whipsaw) warnings.push(`⚡ WHIPSAW: ${whipsawCount}/4 đảo chiều liên tục`);
  if (isFibStreak) warnings.push(`🔢 Fibonacci streak: ${streaks.slice(-2).map(s => s.count).join("→")} (next: ${nextFib})`);

  if (curStreak >= 8) warnings.push(`🚨🚨 BỆT SIÊU DÀI ${curStreak} phiên! CỰC KỲ NGUY HIỂM`);
  else if (curStreak >= 6) warnings.push(`🚨 BỆT CỰC DÀI ${curStreak}! TB bẻ: ${avgStreak.toFixed(1)} | Max: ${maxStreak}`);
  else if (curStreak >= 4) warnings.push(`⚠️ Bệt ${curStreak} | TB: ${avgStreak.toFixed(1)} | Median: ${medianStreak}`);

  if (cauNghiengDouble) {
    warnings.push(`📐📐 Cầu nghiêng ĐÔI ${toLabel(cauNghieng12!)} (8p: ${Math.round(aR8 * 100)}% | 12p: ${Math.round(aR12 * 100)}%)`);
  } else if (cauNghieng12) {
    warnings.push(`📐 Cầu nghiêng ${toLabel(cauNghieng12)} (${Math.round((isA(cauNghieng12) ? aR12 : 1 - aR12) * 100)}%)`);
  }

  if (momStrength > 0.15) {
    const dir = momTotal > 0 ? labelA : labelB;
    warnings.push(`📈 Momentum: ${dir} ${momStrength > 0.3 ? "MẠNH" : ""} (${Math.round(momStrength * 100)}%)`);
  }

  if (len >= 8) {
    warnings.push(`📊 Tỉ lệ gần: 5p=${Math.round(aR5 * 100)}${labelA[0]} | 8p=${Math.round(aR8 * 100)}${labelA[0]} | 12p=${Math.round(aR12 * 100)}${labelA[0]}`);
  }

  if (streaks.length >= 4) {
    warnings.push(`🧬 DNA: ${streakDNA}`);
  }

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
    winRate: len >= 5 ? Math.round(aR12 * 100) : undefined,
  };
}
