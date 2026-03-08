import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/lib/md5-analyzer";
import { useToast } from "@/hooks/use-toast";

const TELCOS = [
  { id: "viettel", name: "Viettel", color: "#e60000" },
  { id: "mobifone", name: "Mobifone", color: "#005baa" },
  { id: "vinaphone", name: "Vinaphone", color: "#0066b3" },
  { id: "vietnamobile", name: "Vietnamobile", color: "#ffc600" },
  { id: "zing", name: "Zing", color: "#00a651" },
  { id: "garena", name: "Garena", color: "#ff5500" },
];

const CARD_AMOUNTS = [10000, 20000, 35000, 50000, 55000, 100000, 130000, 200000, 220000, 300000, 500000];

export default function TopUp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [cardTelco, setCardTelco] = useState("");
  const [cardSerial, setCardSerial] = useState("");
  const [cardCode, setCardCode] = useState("");
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [cardSubmitting, setCardSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("balance").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setBalance(data.balance);
    });
  }, [user]);

  const handleCardTopup = async () => {
    if (!user) return;
    if (!cardTelco) { toast({ title: "Lỗi", description: "Vui lòng chọn nhà mạng", variant: "destructive" }); return; }
    if (!cardSerial.trim()) { toast({ title: "Lỗi", description: "Vui lòng nhập số serial", variant: "destructive" }); return; }
    if (!cardCode.trim()) { toast({ title: "Lỗi", description: "Vui lòng nhập mã thẻ", variant: "destructive" }); return; }
    if (!cardAmount) { toast({ title: "Lỗi", description: "Vui lòng chọn mệnh giá", variant: "destructive" }); return; }

    setCardSubmitting(true);

    const { error } = await supabase.from("card_topups").insert({
      user_id: user.id,
      telco: cardTelco,
      serial_number: cardSerial.trim(),
      card_code: cardCode.trim(),
      amount: cardAmount,
      package: "topup",
      status: "pending",
    });

    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Đã gửi thẻ cào!", description: "Hệ thống đang xử lý, vui lòng chờ Admin duyệt." });
      try {
        await supabase.functions.invoke("telegram-notify", {
          body: { email: user.email, amount: cardAmount, package_name: "Nạp tiền", transfer_content: `TOPUP_CARD_${cardTelco}_${cardAmount}`, status: "card_pending" },
        });
      } catch (e) { console.error("Telegram notify failed:", e); }
      setCardTelco("");
      setCardSerial("");
      setCardCode("");
      setCardAmount(0);
    }
    setCardSubmitting(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #05080f 0%, #0a1628 40%, #101d35 70%, #05080f 100%)"
    }}>
      <header className="relative z-10 py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm font-bold" style={{ color: "#ffd700" }}>← Trang chủ</button>
          <h1 className="text-lg font-black" style={{
            background: "linear-gradient(135deg, #ffd700, #ffae42)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>💳 Nạp Tiền</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Balance display */}
        <div className="rounded-2xl p-5" style={{
          background: "linear-gradient(135deg, rgba(15,25,50,0.9), rgba(20,30,55,0.9))",
          border: "1px solid rgba(255,215,0,0.12)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
        }}>
          <p className="text-xs font-medium tracking-wider" style={{ color: "rgba(255,215,0,0.5)" }}>SỐ DƯ HIỆN TẠI</p>
          <p className="text-3xl font-black mt-1" style={{
            background: "linear-gradient(135deg, #ffd700, #ffae42)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>{formatVND(balance)}</p>
        </div>

        {/* Card top-up form */}
        <div className="rounded-2xl p-6 space-y-4" style={{
          background: "linear-gradient(135deg, rgba(15,25,50,0.9), rgba(20,30,55,0.9))",
          border: "1px solid rgba(255,215,0,0.1)",
        }}>
          <h2 className="text-center font-black text-lg" style={{ color: "#ffd700" }}>📱 Nạp thẻ cào</h2>

          {/* Telco selection */}
          <div>
            <p className="text-sm font-bold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Chọn nhà mạng:</p>
            <div className="grid grid-cols-3 gap-2">
              {TELCOS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCardTelco(t.id)}
                  className="py-2.5 rounded-xl font-bold text-xs transition-all"
                  style={{
                    background: cardTelco === t.id ? t.color : "rgba(255,255,255,0.05)",
                    color: cardTelco === t.id ? "#fff" : "rgba(255,255,255,0.6)",
                    border: cardTelco === t.id ? `2px solid ${t.color}` : "2px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Card amount */}
          <div>
            <p className="text-sm font-bold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Mệnh giá thẻ:</p>
            <div className="grid grid-cols-3 gap-2">
              {CARD_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setCardAmount(a)}
                  className="py-2.5 rounded-xl font-bold text-xs transition-all"
                  style={{
                    background: cardAmount === a ? "linear-gradient(135deg, #ffd700, #f97316)" : "rgba(255,255,255,0.05)",
                    color: cardAmount === a ? "#1a0a00" : "rgba(255,255,255,0.6)",
                    border: cardAmount === a ? "2px solid #ffd700" : "2px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {formatVND(a)}
                </button>
              ))}
            </div>
          </div>

          {/* Serial */}
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>Số Serial:</p>
            <input
              value={cardSerial}
              onChange={(e) => setCardSerial(e.target.value)}
              placeholder="Nhập số serial thẻ"
              className="w-full px-4 py-3 rounded-xl text-sm font-mono"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,215,0,0.15)", color: "#fff" }}
            />
          </div>

          {/* Card code */}
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>Mã thẻ:</p>
            <input
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value)}
              placeholder="Nhập mã thẻ cào"
              className="w-full px-4 py-3 rounded-xl text-sm font-mono"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,215,0,0.15)", color: "#fff" }}
            />
          </div>

          <div className="text-center text-xs p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>
            ⚠️ Nhập đúng thông tin thẻ, thẻ sai hoặc đã sử dụng sẽ không được hoàn!
          </div>

          <button onClick={handleCardTopup} disabled={cardSubmitting}
            className="w-full py-4 rounded-xl font-black text-base tracking-wider disabled:opacity-60 transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #ffd700, #f97316)", color: "#1a0a00", boxShadow: "0 4px 20px rgba(255,215,0,0.3)" }}>
            {cardSubmitting ? "Đang xử lý..." : "📱 Gửi Thẻ Cào"}
          </button>
        </div>

        <p className="text-center text-xs pb-6" style={{ color: "rgba(255,255,255,0.2)" }}>
          👑 <span style={{ color: "#ffd700" }}>Văn Minh Tool</span> — Uy tín • Chất lượng
        </p>
      </main>
    </div>
  );
}
