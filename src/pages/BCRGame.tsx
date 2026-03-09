import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import RobotBubble from "@/components/RobotBubble";
import { analyzePatternV3 } from "@/lib/pattern-analyzer-v3";
import { playAlertByRisk } from "@/lib/alert-sounds";

interface BcrTableData {
  ban: string;
  cau: string;
  ket_qua: string;
  phien: number;
  time: string;
  phien_hien_tai: number;
  du_doan: string;
  thuat_toan: string;
  do_tin_cay: string;
}

export default function BCRGame() {
  const navigate = useNavigate();
  const { user, hasActiveKey } = useAuth();
  const { toast } = useToast();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [tables, setTables] = useState<BcrTableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [online, setOnline] = useState(false);
  const [popupVisible, setPopupVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const [botPos, setBotPos] = useState({ x: 20, y: 80 });
  const lastPhienRef = useRef<string | null>(null);
  
  // V3 Algorithm state - lưu lịch sử cho mỗi bàn
  const historyMapRef = useRef<Record<string, string[]>>({});
  const [v3Analysis, setV3Analysis] = useState<ReturnType<typeof analyzePatternV3> | null>(null);

  const POLL_MS = 3000;

  useEffect(() => {
    hasActiveKey().then(setHasKey);
  }, []);

  // Load lịch sử từ DB khi mount
  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      try {
        const { data } = await supabase
          .from("game_history")
          .select("phien, result")
          .eq("user_id", user.id)
          .eq("game", "BCR")
          .order("created_at", { ascending: true })
          .limit(30);
        if (data && data.length > 0) {
          // Parse phien để lấy bàn: "B1-123" → "B1"
          data.forEach(d => {
            const banMatch = String(d.phien).match(/^(\d+)-/);
            if (banMatch) {
              const ban = banMatch[1];
              if (!historyMapRef.current[ban]) historyMapRef.current[ban] = [];
              historyMapRef.current[ban].push(d.result);
            }
          });
        }
      } catch (e) {
        console.error("Load BCR history error:", e);
      }
    };
    loadHistory();
  }, [user]);

  const fetchData = useCallback(async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke("bcr-proxy");
      if (error) throw error;
      const arr = result as BcrTableData[];
      setTables(arr);
      setOnline(true);
      if (!selectedTable && arr.length > 0) {
        setSelectedTable(arr[0].ban);
      }

      // Process current table for V3 analysis
      const current = arr.find(t => t.ban === (selectedTable || arr[0]?.ban));
      if (current) {
        const key = `${current.ban}-${current.phien_hien_tai}`;
        
        if (key !== lastPhienRef.current) {
          lastPhienRef.current = key;
          
          // Parse last result from ket_qua: B=Banker, P=Player, T=Tie
          const lastChar = current.ket_qua.slice(-1);
          if (lastChar === "B" || lastChar === "P") {
            // Initialize history for this table if needed
            if (!historyMapRef.current[current.ban]) {
              historyMapRef.current[current.ban] = [];
            }
            
            // Add to history (skip Tie for analysis)
            const newHistory = [...historyMapRef.current[current.ban], lastChar].slice(-20);
            historyMapRef.current[current.ban] = newHistory;
            
            // Run V3 Analysis
            const analysis = analyzePatternV3(newHistory, "baccarat");
            setV3Analysis(analysis);
            
            // Play alert sounds
            const hasTrap = (analysis.warning ?? "").includes("BẪY");
            const hasPattern = (analysis.warning ?? "").includes("🔥");
            playAlertByRisk(analysis.riskLevel ?? "safe", { trapDetected: hasTrap, patternFound: hasPattern });
            
            // Save to DB
            if (user) {
              // Save to game_history for persistence
              const phienKey = parseInt(`${current.ban.replace(/\D/g, "")}${current.phien_hien_tai}`);
              await supabase.from("game_history").upsert({
                user_id: user.id,
                game: "BCR",
                phien: phienKey,
                result: lastChar,
              }, { onConflict: "user_id,game,phien" });
              
              // Save analysis
              await supabase.from("analysis_history").insert({
                user_id: user.id,
                game: "BCR",
                md5_input: `Bàn ${current.ban} - Phiên #${current.phien_hien_tai + 1} (V3)`,
                result: analysis.prediction === "BANKER" ? "Banker" : "Player",
                tai_percent: analysis.prediction === "BANKER" ? analysis.confidence : 100 - analysis.confidence,
                xiu_percent: analysis.prediction === "BANKER" ? 100 - analysis.confidence : analysis.confidence,
                confidence: analysis.confidence,
              });
            }
          }
        }
      }
    } catch {
      setOnline(false);
    }
  }, [user, selectedTable]);

  useEffect(() => {
    if (hasKey === false) {
      toast({ title: "⚠️ Chưa có Key", description: "Vui lòng mua key để sử dụng.", variant: "destructive" });
      navigate("/buy-key");
      return;
    }
    if (hasKey !== true) return;

    fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    return () => clearInterval(interval);
  }, [hasKey, fetchData]);

  if (hasKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#000" }}>
        <div className="text-xl font-bold" style={{ color: "#ffd700" }}>⏳ Đang kiểm tra key...</div>
      </div>
    );
  }

  const current = tables.find(t => t.ban === selectedTable);
  const currentHistory = historyMapRef.current[selectedTable] || [];
  
  // Parse ket_qua into dots: B=Banker(red), P=Player(blue), T=Tie(green)
  const resultDots = (current?.ket_qua || "").split("").slice(-20);

  return (
    <div className="game-page min-h-screen relative" style={{ background: "#000" }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet" />

      {/* Back button */}
      <div className="fixed top-2.5 left-2.5 z-[10001] px-3 py-1.5 rounded-xl font-bold text-sm cursor-pointer transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#000", boxShadow: "0 4px 15px rgba(255,215,0,0.4)", fontFamily: "Orbitron, sans-serif" }}
        onClick={() => navigate("/")}>
        ← Trang chủ
      </div>

      {/* BCR game iframe */}
      <iframe
        src="https://f1686s.com"
        className="absolute inset-0 w-full h-full border-none"
        style={{ zIndex: 1 }}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
        title="BCR Game"
      />

      {/* Robot + Chat bubble */}
      <RobotBubble
        robotImage="/images/robot_bcr.gif"
        robotAlt="Robot BCR V3"
        visible={popupVisible}
        onToggle={setPopupVisible}
        accentColor="#e0b0ff"
        glowColor="#8000ff"
        position={botPos}
        onPositionChange={setBotPos}
      >
        {!online ? (
          <>
            <span style={{ fontWeight: "bold", color: "#e0b0ff" }}>🤖 Robot BCR V3</span><br />
            <span style={{ color: "#4db8ff" }}>🔄 Đang kết nối API...</span>
          </>
        ) : (
          <>
            <div className="font-bold mb-1.5 flex items-center justify-between" style={{ color: "#e0b0ff", fontSize: 11 }}>
              <span>🤖 SEXY BCR <span style={{ color: "#ffd700" }}>V3</span></span>
              <div
                className="px-2 py-0.5 rounded text-[10px] cursor-pointer"
                style={{ background: "rgba(255,215,0,0.2)", border: "1px solid #ffd700", color: "#ffd700" }}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                Bàn {selectedTable} ▾
              </div>
            </div>

            {/* Table selector dropdown */}
            {menuOpen && (
              <div className="absolute top-8 right-0 z-50 max-h-[180px] overflow-y-auto rounded-lg"
                style={{
                  background: "rgba(10,0,30,0.98)",
                  border: "1px solid rgba(180,100,255,0.4)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.8)",
                  width: "100%",
                }}>
                {tables.map(t => (
                  <div
                    key={t.ban}
                    className="px-3 py-1.5 cursor-pointer text-xs hover:bg-white/10 flex justify-between"
                    style={{
                      color: t.ban === selectedTable ? "#ffd700" : "#ccc",
                      background: t.ban === selectedTable ? "rgba(255,215,0,0.1)" : "transparent",
                    }}
                    onClick={() => { setSelectedTable(t.ban); setMenuOpen(false); }}
                  >
                    <span>Bàn {t.ban}</span>
                    <span style={{ color: "#888" }}>P#{t.phien_hien_tai}</span>
                  </div>
                ))}
              </div>
            )}

            {current ? (
              <>
                <div className="mb-1">
                  🎯 Phiên <span style={{ color: "#4db8ff", fontWeight: "bold" }}>#{current.phien_hien_tai + 1}</span>
                  <span className="ml-1 text-[9px]" style={{ color: "#888" }}>{current.time}</span>
                </div>

                <div className="mb-0.5 text-[10px]" style={{ color: "#aaa" }}>
                  📊 P#{current.phien}: {
                    current.ket_qua.slice(-1) === "B" ? <span style={{ color: "#ff3b5c" }}>Banker</span>
                    : current.ket_qua.slice(-1) === "P" ? <span style={{ color: "#4d8bff" }}>Player</span>
                    : <span style={{ color: "#00ff99" }}>Tie</span>
                  }
                </div>

                {/* V3 Analysis Display */}
                {v3Analysis && (
                  <>
                    <div className="pt-1 mb-1" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      🤖 Dự đoán V3:<br />
                      <span style={{
                        color: v3Analysis.prediction === "BANKER" ? "#ff3b5c" : "#4d8bff",
                        fontWeight: "bold",
                        fontSize: 16,
                        textShadow: v3Analysis.prediction === "BANKER" ? "0 0 8px rgba(255,59,92,0.6)" : "0 0 8px rgba(77,139,255,0.6)",
                      }}>
                        {v3Analysis.prediction}
                      </span>
                      <div className="mt-0.5">
                        📊 Tin cậy: <span style={{ 
                          color: v3Analysis.confidence >= 85 ? "#00ff99" : v3Analysis.confidence >= 70 ? "#ffd966" : "#ff6b6b", 
                          fontWeight: "bold", 
                          fontSize: 13 
                        }}>{v3Analysis.confidence}%</span>
                      </div>
                      {v3Analysis.patternName && (
                        <div className="text-[9px]" style={{ color: "#e0b0ff" }}>
                          ⚙️ {v3Analysis.patternName}
                        </div>
                      )}
                      {v3Analysis.suggestion && (
                        <div className="text-[9px] mt-0.5" style={{ color: v3Analysis.riskLevel === "extreme" ? "#ff3b5c" : v3Analysis.riskLevel === "danger" ? "#ff6b6b" : "#ffd700" }}>
                          {v3Analysis.suggestion}
                        </div>
                      )}
                    </div>

                    {/* Warnings */}
                    {v3Analysis.warning && (
                      <div className="text-[8px] mt-1 max-h-[50px] overflow-y-auto" style={{ color: "#aaa", lineHeight: 1.3 }}>
                        {v3Analysis.warning.split("\n").slice(0, 4).map((w, i) => (
                          <div key={i}>{w}</div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* History dots */}
                <div className="flex gap-0.5 flex-wrap mt-1 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  {resultDots.map((c, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full text-[6px] flex items-center justify-center font-bold" style={{
                      background: c === "B" ? "#ff3b5c" : c === "P" ? "#4d8bff" : "#00ff99",
                      boxShadow: c === "B" ? "0 0 3px #ff3b5c" : c === "P" ? "0 0 3px #4d8bff" : "0 0 3px #00ff99",
                      color: "#fff",
                    }}>
                      {c}
                    </div>
                  ))}
                </div>

                {/* DNA & Stats */}
                {v3Analysis?.streakDNA && (
                  <div className="text-[8px] mt-1" style={{ color: "#888" }}>
                    🧬 DNA: {v3Analysis.streakDNA} {v3Analysis.winRate !== undefined && `| B: ${v3Analysis.winRate}%`}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "#aaa", fontSize: 10 }}>Chọn bàn để xem dự đoán</div>
            )}

            <div className="text-[9px] mt-1" style={{ color: "#666" }}>🟢 V3 Siêu Gắt | {currentHistory.length} phiên</div>
          </>
        )}
      </RobotBubble>
    </div>
  );
}
