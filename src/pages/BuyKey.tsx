import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { KEY_PACKAGES, formatVND } from "@/lib/md5-analyzer";
import { useToast } from "@/hooks/use-toast";

const PKG_META: Record<string, { emoji: string; badge?: string; badgeColor?: string; features: string[] }> = {
  "1day": { emoji: "📅", badge: "🧧 Lì Xì 1 Key", badgeColor: "#ff6a6a", features: ["24 giờ sử dụng", "1 thiết bị đồng thời", "Cập nhật liên tục", "Hỗ trợ 24/7"] },
  "3days": { emoji: "🔥", badge: "💰 TIẾT KIỆM 32%", badgeColor: "#ff8c00", features: ["3 ngày sử dụng", "1 thiết bị đồng thời", "Ưu tiên hỗ trợ", "Chỉ " + formatVND(Math.round(55000 / 3)) + "/ngày"] },
  "1week": { emoji: "⭐", badge: "🎉 TIẾT KIỆM 55%", badgeColor: "#00c3ff", features: ["7 ngày sử dụng", "1 thiết bị đồng thời", "Hỗ trợ ưu tiên"] },
  "1month": { emoji: "🏆", badge: "🏅 TIẾT KIỆM 76%", badgeColor: "#00ff88", features: ["30 ngày sử dụng", "1 thiết bị đồng thời", "Hỗ trợ 24/7"] },
  "lifetime": { emoji: "👑", badge: "💎 VIP TRỌN ĐỜI", badgeColor: "#ffd700", features: ["Sử dụng vĩnh viễn", "1 thiết bị đồng thời", "Hỗ trợ VIP ưu tiên", "Cập nhật miễn phí"] },
};

export default function BuyKey() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const pkg = KEY_PACKAGES.find((p) => p.id === selectedPkg);
  const transferContent = user ? `KEY_${user.id.slice(0, 8).toUpperCase()}_${selectedPkg?.toUpperCase()}` : "";

  const handleConfirmPayment = async () => {
    if (!user || !pkg) return;
    setConfirming(true);

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      package: pkg.id,
      amount: pkg.price,
      status: "pending",
      transfer_content: transferContent,
    });

    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Đã gửi yêu cầu!", description: "Vui lòng chờ Admin duyệt và kích hoạt key cho bạn." });
      try {
        await supabase.functions.invoke("telegram-notify", {
          body: { email: user.email, amount: pkg.price, package_name: pkg.label, transfer_content: transferContent, status: "pending" },
        });
      } catch (e) {
        console.error("Telegram notify failed:", e);
      }
    }
    setSelectedPkg(null);
    setConfirming(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(180deg, #c0392b 0%, #e74c3c 20%, #d35400 50%, #1a0a00 100%)"
    }}>
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,200,50,0.3) 0%, transparent 70%)"
      }} />

      <header className="relative z-10 py-3 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm font-bold" style={{ color: "#ffd700" }}>← Trang chủ</button>
          <h1 className="text-lg font-black" style={{
            background: "linear-gradient(135deg, #ffae00, #ffd700)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>🔑 Mua Key</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-4">
        {!selectedPkg ? (
          <div className="space-y-5">
            <div className="rounded-2xl p-5 text-center" style={{
              background: "rgba(255,248,230,0.95)",
              boxShadow: "0 4px 30px rgba(255,174,0,0.3)",
            }}>
              <h2 className="text-xl font-black tracking-wide" style={{ color: "#c0392b" }}>🏷️ BẢNG GIÁ KEY</h2>
              <div className="mt-2 inline-block px-6 py-2 rounded-full text-sm font-bold" style={{
                background: "linear-gradient(135deg, #ff8c00, #ffae00)",
                color: "#1a0a00",
              }}>✨ MUA KEY - NHẬN NGAY ✨</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {KEY_PACKAGES.map((p) => {
                const meta = PKG_META[p.id];
                return (
                  <div key={p.id} className="rounded-2xl p-[2px] cursor-pointer transition-transform hover:scale-[1.03] active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #ffae00, #ff8c00, #ffae00)" }}
                    onClick={() => setSelectedPkg(p.id)}>
                    <div className="rounded-2xl p-4 h-full flex flex-col" style={{ background: "rgba(255,248,230,0.95)" }}>
                      <div className="mb-2">
                        <h3 className="font-black text-sm" style={{ color: "#1a0a00" }}>{meta?.emoji} {p.label.toUpperCase()}</h3>
                        <p className="text-2xl font-black mt-1" style={{ color: "#c0392b" }}>{formatVND(p.price)}</p>
                      </div>
                      {meta?.badge && (
                        <span className="inline-block self-start px-3 py-1 rounded-full text-[10px] font-bold text-white mb-3" style={{ background: meta.badgeColor }}>{meta.badge}</span>
                      )}
                      <div className="flex-1 space-y-2 mb-3">
                        {meta?.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "#333" }}>
                            <span className="text-green-600 font-bold mt-0.5">✔</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4" style={{ animation: "fadeIn 0.4s ease-out" }}>
            <div className="rounded-2xl p-[2px]" style={{ background: "linear-gradient(135deg, #ffae00, #ff8c00, #ffae00)" }}>
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,248,230,0.95)" }}>
                <h2 className="text-center font-black text-lg" style={{ color: "#c0392b" }}>💳 Thanh Toán - Gói {pkg?.label}</h2>
                <p className="text-center text-3xl font-black" style={{ color: "#1a0a00" }}>{pkg && formatVND(pkg.price)}</p>

                <div className="p-3 rounded-xl space-y-2 text-sm" style={{
                  background: "rgba(255,174,0,0.1)",
                  border: "1px solid rgba(255,174,0,0.3)",
                }}>
                  <p style={{ color: "#666" }}>Ngân hàng: <span className="font-bold" style={{ color: "#1a0a00" }}>MSB</span></p>
                  <p style={{ color: "#666" }}>Chủ TK: <span className="font-bold" style={{ color: "#1a0a00" }}>Nguyen Van Minh</span></p>
                  <p style={{ color: "#666" }}>STK: <span className="font-bold" style={{ color: "#c0392b" }}>4526032009</span></p>
                  <p style={{ color: "#666" }}>Nội dung CK: <span className="font-mono font-bold" style={{ color: "#c0392b" }}>{transferContent}</span></p>
                </div>

                <button onClick={handleConfirmPayment} disabled={confirming}
                  className="w-full py-4 rounded-xl font-black text-base tracking-wider disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #ff8c00, #ffae00, #ffd000)", color: "#1a0a00", boxShadow: "0 4px 20px rgba(255,174,0,0.5)" }}>
                  {confirming ? "Đang xử lý..." : "✅ Đã Chuyển Khoản - Gửi Yêu Cầu"}
                </button>

                <button onClick={() => setSelectedPkg(null)} className="w-full py-3 rounded-xl font-bold text-sm" style={{ color: "#999" }}>
                  ← Quay lại chọn gói
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center mt-6 text-xs text-white/50">
          📱 Hỗ trợ: <a href="mailto:mvanminh45@gmail.com" className="hover:underline" style={{ color: "#ffd700" }}>mvanminh45@gmail.com</a>
        </p>
      </main>

      <style>{`@keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
