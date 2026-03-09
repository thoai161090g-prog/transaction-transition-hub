import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import RobotBubble from "@/components/RobotBubble";
import { useToast } from "@/hooks/use-toast";

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

  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startLeft: 20, startTop: 80 });
  const [botPos, setBotPos] = useState({ x: 20, y: 80 });
  const lastPhienRef = useRef<string | null>(null);

  const POLL_MS = 5000;

  useEffect(() => {
    hasActiveKey().then(setHasKey);
  }, []);

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

      // Save to history if new session on selected table
      const current = arr.find(t => t.ban === (selectedTable || arr[0]?.ban));
      if (current && user) {
        const key = `${current.ban}-${current.phien_hien_tai}`;
        if (key !== lastPhienRef.current) {
          lastPhienRef.current = key;
          const isPlayer = current.du_doan.includes("Con");
          const conf = parseFloat(current.do_tin_cay) || 90;
          await supabase.from("analysis_history").insert({
            user_id: user.id,
            game: "BCR",
            md5_input: `Bàn ${current.ban} - Phiên #${current.phien_hien_tai}`,
            result: isPlayer ? "Player" : "Banker",
            tai_percent: isPlayer ? conf : 100 - conf,
            xiu_percent: isPlayer ? 100 - conf : conf,
            confidence: conf,
          });
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

  const current = tables.find(t => t.ban === selectedTable);
  const isPlayer = current?.du_doan?.includes("Con");

  // Parse ket_qua into dots: B=Banker(red), P=Player(blue), T=Tie(green)
  const resultDots = (current?.ket_qua || "").split("").slice(-20);

  return (
    <div className="min-h-screen relative" style={{ background: "#000", overflow: "hidden" }}>
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
      <div
        className="fixed z-[9999] flex items-start select-none"
        style={{ left: botPos.x, top: botPos.y, touchAction: "none", maxWidth: "calc(100vw - 8px)" }}
      >
        {/* Robot GIF */}
        <img
          src="/images/robot_bcr.gif"
          alt="Robot BCR"
          className="w-[40px] h-[40px] cursor-move rounded-full"
          style={{ border: "2px solid #ffd700", boxShadow: "0 0 10px rgba(255,215,0,0.5)" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />

        {/* Chat bubble */}
        {popupVisible && (
          <div className="ml-0.5 relative" style={{
            background: "linear-gradient(145deg, rgba(10,0,30,0.95), rgba(30,0,60,0.9))",
            color: "#fff",
            padding: 6,
            borderRadius: 8,
            width: "min(165px, calc(100vw - 76px))",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(180,100,255,0.3)",
            boxShadow: "0 0 15px rgba(128,0,255,0.3)",
            fontSize: 8.5,
          }}>
            {!online ? (
              <>
                <span style={{ fontWeight: "bold", color: "#e0b0ff" }}>🤖 Robot BCR</span><br />
                <span style={{ color: "#4db8ff" }}>🔄 Đang kết nối API...</span>
              </>
            ) : (
              <>
                <div className="font-bold mb-1.5 flex items-center justify-between" style={{ color: "#e0b0ff", fontSize: 11 }}>
                  <span>🤖 SEXY BCR VIP TOOL</span>
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
                      🎯 Phiên <span style={{ color: "#4db8ff", fontWeight: "bold" }}>#{current.phien_hien_tai}</span>
                      <span className="ml-1 text-[9px]" style={{ color: "#888" }}>{current.time}</span>
                    </div>

                    {/* Last result */}
                    <div className="mb-0.5 text-[10px]" style={{ color: "#aaa" }}>
                      📊 P#{current.phien}: {
                        current.ket_qua.slice(-1) === "B" ? <span style={{ color: "#ff3b5c" }}>Banker</span>
                        : current.ket_qua.slice(-1) === "P" ? <span style={{ color: "#4d8bff" }}>Player</span>
                        : <span style={{ color: "#00ff99" }}>Tie</span>
                      }
                    </div>

                    {current.cau && (
                      <div className="text-[10px] mb-1" style={{ color: "#e0b0ff" }}>
                        🔮 Cầu: {current.cau}
                      </div>
                    )}

                    {/* Prediction */}
                    <div className="pt-1 mb-1" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      🤖 Dự đoán:<br />
                      <span style={{
                        color: isPlayer ? "#4d8bff" : "#ff3b5c",
                        fontWeight: "bold",
                        fontSize: 16,
                        textShadow: isPlayer ? "0 0 8px rgba(77,139,255,0.6)" : "0 0 8px rgba(255,59,92,0.6)",
                      }}>
                        {current.du_doan}
                      </span>
                      <div className="mt-0.5">
                        📊 Tin cậy: <span style={{ color: "#ffd966", fontWeight: "bold", fontSize: 13 }}>{current.do_tin_cay}</span>
                      </div>
                      <div className="text-[9px]" style={{ color: "#888" }}>
                        ⚙️ {current.thuat_toan}
                      </div>
                    </div>

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
                  </>
                ) : (
                  <div style={{ color: "#aaa", fontSize: 10 }}>Chọn bàn để xem dự đoán</div>
                )}

                <div className="text-[9px] mt-1" style={{ color: "#666" }}>🟢 Đã đồng bộ game</div>
              </>
            )}

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
            style={{ background: "rgba(0,0,0,0.8)", border: "1px solid #e0b0ff", color: "#e0b0ff" }}
          >💬</div>
        )}
      </div>
    </div>
  );
}
