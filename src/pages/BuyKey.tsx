import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { KEY_PACKAGES, formatVND } from "@/lib/md5-analyzer";
import { useToast } from "@/hooks/use-toast";
import { Star, Sun, Cloud, Calendar, Infinity } from "lucide-react";

const PKG_META: Record<string, { icon: React.ReactNode; iconBg: string; subtitle: string; badge?: string; badgeColor?: string; features: string[]; suffix: string }> = {
  "1day": {
    icon: <Sun className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #3b82f6, #2563eb)",
    subtitle: "Có thời hạn",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói"],
    suffix: "/gói"
  },
  "3days": {
    icon: <Cloud className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    subtitle: "Có thời hạn",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói"],
    suffix: "/gói"
  },
  "1week": {
    icon: <Star className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #ec4899, #be185d)",
    subtitle: "Có thời hạn",
    badge: "⭐ Phổ biến nhất",
    badgeColor: "linear-gradient(135deg, #ec4899, #f97316)",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói"],
    suffix: "/gói"
  },
  "1month": {
    icon: <Calendar className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #f97316, #ea580c)",
    subtitle: "Có thời hạn",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói"],
    suffix: "/gói"
  },
  "lifetime": {
    icon: <Infinity className="w-6 h-6 text-white" />,
    iconBg: "linear-gradient(135deg, #ef4444, #dc2626)",
    subtitle: "Một lần duy nhất",
    badge: "💎 VIP TRỌN ĐỜI",
    badgeColor: "linear-gradient(135deg, #ffd700, #f97316)",
    features: ["Sử dụng tất cả tool", "Hỗ trợ ưu tiên 24/7", "Bảo hành trọn gói", "Không giới hạn thiết bị", "Cập nhật trọn đời"],
    suffix: "/vĩnh viễn"
  },
};

export default function BuyKey() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [paymentTab, setPaymentTab] = useState<"bank" | "balance">("bank");
  const [balance, setBalance] = useState<number>(0);
  const [balancePaying, setBalancePaying] = useState(false);

  const pkg = KEY_PACKAGES.find((p) => p.id === selectedPkg);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("balance").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setBalance(data.balance);
    });
  }, [user]);

  const transferContent = user ? `KEY_${user.id.slice(0, 8).toUpperCase()}_${selectedPkg?.toUpperCase()}` : "";

  const handleConfirmPayment = async () => {
    if (!user || !pkg) return;
    setConfirming(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id, package: pkg.id, amount: pkg.price, status: "pending", transfer_content: transferContent,
    });
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Đã gửi yêu cầu!", description: "Vui lòng chờ Admin duyệt và kích hoạt key cho bạn." });
      try {
        await supabase.functions.invoke("telegram-notify", {
          body: { email: user.email, amount: pkg.price, package_name: pkg.label, transfer_content: transferContent, status: "pending" },
        });
      } catch (e) { console.error("Telegram notify failed:", e); }
    }
    setSelectedPkg(null);
    setConfirming(false);
  };

  const handleBalancePayment = async () => {
    if (!user || !pkg) return;
    if (balance < pkg.price) {
      toast({ title: "Không đủ số dư", description: `Bạn cần ${formatVND(pkg.price)} nhưng chỉ có ${formatVND(balance)}`, variant: "destructive" });
      return;
    }
    setBalancePaying(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("buy-key-balance", {
        body: { package_id: pkg.id, price: pkg.price, label: pkg.label, days: pkg.days },
      });
      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);
      
      setBalance(result.new_balance);
      toast({ title: "✅ Mua key thành công!", description: `Key đã được kích hoạt. Số dư còn: ${formatVND(result.new_balance)}` });
      
      try {
        await supabase.functions.invoke("telegram-notify", {
          body: { email: user.email, amount: pkg.price, package_name: pkg.label, transfer_content: `BALANCE_AUTO_${pkg.id.toUpperCase()}`, status: "approved_balance" },
        });
      } catch (e) { console.error("Telegram notify failed:", e); }
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message || "Không thể mua key", variant: "destructive" });
    }
    setSelectedPkg(null);
    setBalancePaying(false);
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
          }}>🔑 Mua Key</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-2">
        {!selectedPkg ? (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-black" style={{
                background: "linear-gradient(135deg, #ffd700, #ffae42)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>Chọn gói Key Premium</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Mua key để sử dụng tất cả tính năng cao cấp</p>
            </div>

            <div className="space-y-4">
              {KEY_PACKAGES.map((p) => {
                const meta = PKG_META[p.id];
                return (
                  <div key={p.id} className="relative">
                    {meta?.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-xs font-bold text-white whitespace-nowrap" style={{
                        background: meta.badgeColor,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
                      }}>
                        {meta.badge}
                      </div>
                    )}
                    <div
                      className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{
                        background: "linear-gradient(135deg, rgba(15,25,50,0.9), rgba(20,30,55,0.9))",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        border: meta?.badge ? "2px solid rgba(255,215,0,0.3)" : "1px solid rgba(255,255,255,0.06)"
                      }}
                      onClick={() => setSelectedPkg(p.id)}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: meta?.iconBg }}>
                          {meta?.icon}
                        </div>
                        <div>
                          <h3 className="font-black text-lg text-white">{p.label}</h3>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{meta?.subtitle}</p>
                        </div>
                      </div>

                      <p className="text-3xl font-black mb-4" style={{
                        background: "linear-gradient(135deg, #ffd700, #ffae42)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}>
                        {formatVND(p.price)}
                        <span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.3)" }}> {meta?.suffix}</span>
                      </p>

                      <div className="space-y-2.5">
                        {meta?.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>✓</div>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                      <button className="w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]" style={{
                        background: "linear-gradient(135deg, #ffd700, #f97316)",
                        color: "#1a0a00",
                        boxShadow: "0 4px 15px rgba(255,215,0,0.2)"
                      }}>
                        Mua ngay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4" style={{ animation: "fadeIn 0.4s ease-out" }}>
            {/* Payment method tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              {(["balance", "bank"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPaymentTab(tab)}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg font-bold text-xs transition-all"
                  style={{
                    background: paymentTab === tab ? "rgba(255,215,0,0.15)" : "transparent",
                    color: paymentTab === tab ? "#ffd700" : "rgba(255,255,255,0.4)",
                    border: paymentTab === tab ? "1px solid rgba(255,215,0,0.2)" : "1px solid transparent"
                  }}
                >
                  {tab === "balance" ? "💰 Số dư" : "💳 Chuyển khoản"}
                </button>
              ))}
            </div>

            {paymentTab === "balance" ? (
              <div className="rounded-2xl p-6 space-y-4" style={{
                background: "linear-gradient(135deg, rgba(15,25,50,0.9), rgba(20,30,55,0.9))",
                border: "1px solid rgba(255,215,0,0.1)",
              }}>
                <h2 className="text-center font-black text-lg" style={{ color: "#ffd700" }}>💰 Thanh toán bằng số dư - Gói {pkg?.label}</h2>
                <p className="text-center text-3xl font-black" style={{ color: "#ffd700" }}>{pkg && formatVND(pkg.price)}</p>
                <div className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Số dư hiện tại</p>
                  <p className="text-2xl font-black" style={{ color: balance >= (pkg?.price || 0) ? "#22c55e" : "#ef4444" }}>{formatVND(balance)}</p>
                  {pkg && balance < pkg.price && (
                    <p className="text-xs mt-1" style={{ color: "#fca5a5" }}>⚠️ Không đủ số dư, cần thêm {formatVND(pkg.price - balance)}</p>
                  )}
                </div>
                <button onClick={handleBalancePayment} disabled={balancePaying || balance < (pkg?.price || 0)}
                  className="w-full py-4 rounded-xl font-black text-base tracking-wider disabled:opacity-60 transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", boxShadow: "0 4px 20px rgba(34,197,94,0.3)" }}>
                  {balancePaying ? "Đang xử lý..." : "💰 Thanh toán ngay"}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl p-6 space-y-4" style={{
                background: "linear-gradient(135deg, rgba(15,25,50,0.9), rgba(20,30,55,0.9))",
                border: "1px solid rgba(255,215,0,0.1)",
              }}>
                <h2 className="text-center font-black text-lg" style={{ color: "#ffd700" }}>💳 Thanh Toán - Gói {pkg?.label}</h2>
                <p className="text-center text-3xl font-black" style={{ color: "#ffd700" }}>{pkg && formatVND(pkg.price)}</p>

                <div className="flex justify-center">
                  <div className="rounded-xl overflow-hidden p-2" style={{ border: "2px solid rgba(255,215,0,0.15)", background: "#fff" }}>
                    <img src="/images/qr-payment.jpeg" alt="QR Thanh toán" className="w-56 h-auto rounded-lg" />
                  </div>
                </div>

                <div className="p-4 rounded-xl space-y-2 text-sm" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ color: "rgba(255,255,255,0.5)" }}>Ngân hàng: <span className="font-bold text-white">MSB</span></p>
                  <p style={{ color: "rgba(255,255,255,0.5)" }}>Chủ TK: <span className="font-bold text-white">Nguyen Van Minh</span></p>
                  <p style={{ color: "rgba(255,255,255,0.5)" }}>STK: <span className="font-bold" style={{ color: "#ffd700" }}>4526032009</span></p>
                  <p style={{ color: "rgba(255,255,255,0.5)" }}>Nội dung CK: <span className="font-mono font-bold" style={{ color: "#ffd700" }}>{transferContent}</span></p>
                </div>

                <div className="text-center text-xs p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>
                  ⚠️ Quét mã QR hoặc chuyển khoản, ghi đúng nội dung CK!
                </div>

                <button onClick={handleConfirmPayment} disabled={confirming}
                  className="w-full py-4 rounded-xl font-black text-base tracking-wider disabled:opacity-60 transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #ffd700, #f97316)", color: "#1a0a00", boxShadow: "0 4px 20px rgba(255,215,0,0.3)" }}>
                  {confirming ? "Đang xử lý..." : "✅ Đã Chuyển Khoản - Gửi Yêu Cầu"}
                </button>
              </div>
            )}

            <button onClick={() => { setSelectedPkg(null); setPaymentTab("bank"); }} className="w-full py-3 rounded-xl font-bold text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              ← Quay lại chọn gói
            </button>
          </div>
        )}

        <p className="text-center mt-6 text-xs pb-6" style={{ color: "rgba(255,255,255,0.2)" }}>
          👑 <span style={{ color: "#ffd700" }}>Văn Minh Tool</span> — Uy tín • Chất lượng
        </p>
      </main>

      <style>{`@keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
