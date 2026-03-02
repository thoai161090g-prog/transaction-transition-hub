import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface LC79ApiResult {
  phien?: number;
  du_doan?: string;
  confidence?: string;
  ty_le_thanh_cong?: string;
  [key: string]: any;
}

export default function LC79Game() {
  const navigate = useNavigate();
  const { user, hasActiveKey } = useAuth();
  const { toast } = useToast();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [data, setData] = useState<LC79ApiResult | null>(null);
  const [online, setOnline] = useState(false);
  const [progress, setProgress] = useState(0);
  const botRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startLeft: 50, startTop: 50 });
  const [botPos, setBotPos] = useState({ x: 50, y: 50 });

  const POLL_MS = 8000;

  useEffect(() => {
    hasActiveKey().then(setHasKey);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke("lc79-proxy");
      if (error) throw error;
      setData(result);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

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
      const p = (elapsed % POLL_MS) / POLL_MS;
      setProgress(p);
      frame = requestAnimationFrame(animateProgress);
    };
    frame = requestAnimationFrame(animateProgress);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(frame);
    };
  }, [hasKey]);

  // Drag logic
  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startLeft: botPos.x, startTop: botPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setBotPos({
      x: Math.max(0, Math.min(window.innerWidth - 300, dragState.current.startLeft + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 200, dragState.current.startTop + dy)),
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current.dragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (hasKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#000814" }}>
        <div className="text-xl font-bold" style={{ color: "#00ccff" }}>⏳ Đang kiểm tra key...</div>
      </div>
    );
  }

  const phien = data?.Phien_hien_tai ?? data?.phien ?? "…";
  const duDoan = data?.Du_doan_cuoi_cung ?? data?.du_doan ?? "…";
  const ketQua = data?.Ket_qua ?? data?.ket_qua ?? "…";
  const tong = data?.Tong ?? data?.tong ?? "…";

  const duDoanColor = (() => {
    const low = (duDoan + "").toLowerCase();
    if (low.includes("tài") || low.includes("tai")) return "#22d3ee";
    if (low.includes("xỉu") || low.includes("xiu")) return "#fca5a5";
    return "#eaf6ff";
  })();

  return (
    <div className="min-h-screen relative" style={{ background: "#000814", overflow: "hidden" }}>
      {/* Back button */}
      <div className="fixed top-2.5 left-2.5 z-[10000] px-3 py-1.5 rounded-xl font-bold text-sm cursor-pointer"
        style={{ background: "#00ccff", color: "#001018", boxShadow: "0 6px 18px rgba(0,204,255,.25)" }}
        onClick={() => navigate("/")}>
        ← Trang chủ
      </div>

      {/* Draggable Bot Panel */}
      <div
        ref={botRef}
        className="fixed z-[9999] flex items-center gap-2.5 select-none"
        style={{ left: botPos.x, top: botPos.y, touchAction: "none", cursor: dragState.current.dragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img
          src="https://i.postimg.cc/63bdy9D9/robotics-1.gif"
          alt="Robot"
          className="pointer-events-none select-none"
          style={{ width: 100, height: "auto" }}
          draggable={false}
        />
        <div className="min-w-[260px] max-w-[420px] p-3 rounded-xl backdrop-blur-md"
          style={{
            background: "rgba(11,34,48,0.8)",
            border: "1px solid #0ea5b7",
            boxShadow: "0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.04)",
            color: "#eaf6ff"
          }}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#012734", border: "1px solid #0ea5b7" }}>
              BOT DỰ ĐOÁN LC79
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Trạng thái</span>
              <div className="w-2.5 h-2.5 rounded-full" style={{
                background: online ? "#22c55e" : "#f97316",
                boxShadow: online ? "0 0 0 3px #16a34a22" : "0 0 0 3px #ff7d1a22"
              }} />
            </div>
          </div>

          <div className="font-extrabold text-base mb-2">
            KQ: {ketQua} • Tổng: {tong} • <span style={{ color: duDoanColor }}>{duDoan}</span> • Phiên: {phien}
          </div>

          <div className="space-y-1 text-sm">
            <p className="opacity-90">Kết quả: <span className="font-extrabold" style={{ color: "#22d3ee" }}>{ketQua}</span></p>
            <p className="opacity-90">Tổng: <span className="font-extrabold" style={{ color: "#facc15" }}>{tong}</span></p>
            <p className="opacity-90">Dự đoán: <span className="font-extrabold" style={{ color: duDoanColor }}>{duDoan}</span></p>
            <p className="opacity-90">Phiên: <span className="font-extrabold">{phien}</span></p>
          </div>

          <div className="relative h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "#0a2a38" }}>
            <div className="absolute inset-y-0 left-0 rounded-full" style={{
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, #22d3ee, #0ea5b7)",
              transition: "width 0.1s linear"
            }} />
          </div>

          <div className="text-xs mt-1.5 opacity-80">
            {data ? `Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN")}` : "Đang tải dữ liệu…"}
          </div>
        </div>
      </div>

      {/* LC79 game iframe */}
      <iframe
        src="https://lc79b.bet"
        className="absolute inset-0 w-full h-full border-0"
        title="LC79 Game"
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
      />
    </div>
  );
}
