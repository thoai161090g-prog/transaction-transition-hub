import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatVND, KEY_PACKAGES } from "@/lib/md5-analyzer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [keys, setKeys] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [cardTopups, setCardTopups] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  // Withdrawal form
  const [wAmount, setWAmount] = useState("");
  const [wBank, setWBank] = useState("MSB");
  const [wAccount, setWAccount] = useState("4526032009");
  const [wHolder, setWHolder] = useState("Nguyen Van Minh");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    const [keysRes, txRes, usersRes, cardRes, wdRes] = await Promise.all([
      supabase.from("license_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("card_topups").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
    ]);
    setKeys(keysRes.data || []);
    setTransactions(txRes.data || []);
    setUsers(usersRes.data || []);
    setCardTopups(cardRes.data || []);
    setWithdrawals(wdRes.data || []);
    setTotalRevenue((txRes.data || []).filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + t.amount, 0));
    setTotalBalance((usersRes.data || []).reduce((s: number, u: any) => s + (u.balance || 0), 0));
  };

  const toggleKey = async (keyId: string, currentActive: boolean) => {
    await supabase.from("license_keys").update({ is_active: !currentActive }).eq("id", keyId);
    toast({ title: currentActive ? "Đã hủy key" : "Đã kích hoạt key" });
    loadData();
  };

  const approveTransaction = async (tx: any) => {
    const pkg = KEY_PACKAGES.find((p) => p.id === tx.package);
    if (!pkg) return;

    let expiresAt: string | null = null;
    if (pkg.days) {
      const d = new Date();
      d.setDate(d.getDate() + pkg.days);
      expiresAt = d.toISOString();
    }

    const { data: keyData, error: keyError } = await supabase
      .from("license_keys")
      .insert({ user_id: tx.user_id, package: tx.package, price: tx.amount, expires_at: expiresAt })
      .select()
      .single();

    if (keyError) {
      toast({ title: "Lỗi", description: keyError.message, variant: "destructive" });
      return;
    }

    await supabase.from("transactions").update({ status: "completed", license_key_id: keyData.id }).eq("id", tx.id);
    toast({ title: "✅ Đã duyệt!", description: `Key ${pkg.label} đã được cấp cho người dùng.` });

    try {
      await supabase.functions.invoke("telegram-notify", {
        body: { email: tx.transfer_content, amount: tx.amount, package_name: pkg.label, transfer_content: tx.transfer_content, status: "completed" },
      });
    } catch (e) { console.error("Telegram notify failed:", e); }

    loadData();
  };

  const rejectTransaction = async (tx: any) => {
    await supabase.from("transactions").update({ status: "rejected" }).eq("id", tx.id);
    toast({ title: "❌ Đã từ chối giao dịch" });
    try {
      await supabase.functions.invoke("telegram-notify", {
        body: { email: tx.transfer_content, amount: tx.amount, package_name: tx.package, transfer_content: tx.transfer_content, status: "rejected" },
      });
    } catch (e) { console.error("Telegram notify failed:", e); }
    loadData();
  };

  const approveCardTopup = async (card: any) => {
    // Add balance to user's profile
    const { data: profile } = await supabase.from("profiles").select("balance").eq("user_id", card.user_id).single();
    const currentBalance = profile?.balance || 0;
    
    await supabase.from("profiles").update({ balance: currentBalance + card.amount }).eq("user_id", card.user_id);
    await supabase.from("card_topups").update({ status: "completed" }).eq("id", card.id);
    
    toast({ title: "✅ Đã duyệt thẻ cào!", description: `Đã cộng ${formatVND(card.amount)} vào tài khoản người dùng.` });
    
    try {
      await supabase.functions.invoke("telegram-notify", {
        body: { email: card.user_id.slice(0, 8), amount: card.amount, package_name: `Thẻ ${card.telco}`, transfer_content: `CARD_${card.telco}`, status: "card_completed" },
      });
    } catch (e) { console.error("Telegram notify failed:", e); }
    
    loadData();
  };

  const rejectCardTopup = async (card: any) => {
    await supabase.from("card_topups").update({ status: "rejected" }).eq("id", card.id);
    toast({ title: "❌ Đã từ chối thẻ cào" });
    loadData();
  };

  const handleWithdraw = async () => {
    const amount = parseInt(wAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Lỗi", description: "Nhập số tiền hợp lệ", variant: "destructive" });
      return;
    }
    setWithdrawing(true);
    
    const { error } = await supabase.from("withdrawals").insert({
      admin_user_id: (await supabase.auth.getUser()).data.user?.id,
      amount,
      bank_name: wBank,
      account_number: wAccount,
      account_holder: wHolder,
    });

    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Đã tạo lệnh rút tiền", description: `Rút ${formatVND(amount)} về ${wBank} - ${wAccount}` });
      setWAmount("");
    }
    setWithdrawing(false);
    loadData();
  };

  if (!isAdmin) return null;

  const pendingCards = cardTopups.filter((c: any) => c.status === "pending").length;

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(180deg, #c0392b 0%, #e74c3c 20%, #d35400 50%, #1a0a00 100%)"
    }}>
      <header className="py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button variant="ghost" className="font-bold" style={{ color: "#ffd700" }} onClick={() => navigate("/")}>← Trang chủ</Button>
          <h1 className="text-xl font-bold" style={{ color: "#ffd700" }}>🔧 Quản Trị Admin</h1>
          <div />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.3)", boxShadow: "0 0 20px rgba(255,174,0,0.15)" }}>
            <CardContent className="p-6 text-center">
              <div className="text-sm text-white/60">Tổng Doanh Thu</div>
              <div className="text-2xl font-bold" style={{ color: "#ffd700" }}>{formatVND(totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
            <CardContent className="p-6 text-center">
              <div className="text-sm text-white/60">Tổng Số Dư Users</div>
              <div className="text-2xl font-bold" style={{ color: "#22c55e" }}>{formatVND(totalBalance)}</div>
            </CardContent>
          </Card>
          <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
            <CardContent className="p-6 text-center">
              <div className="text-sm text-white/60">Tổng Key</div>
              <div className="text-2xl font-bold text-white">{keys.length}</div>
            </CardContent>
          </Card>
          <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
            <CardContent className="p-6 text-center">
              <div className="text-sm text-white/60">Thẻ Cào Chờ</div>
              <div className="text-2xl font-bold" style={{ color: pendingCards > 0 ? "#ef4444" : "#22c55e" }}>{pendingCards}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions">
          <TabsList className="w-full flex-wrap" style={{ background: "rgba(26,10,0,0.8)" }}>
            <TabsTrigger value="transactions" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">💰 Giao Dịch</TabsTrigger>
            <TabsTrigger value="cards" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">
              📱 Thẻ Cào {pendingCards > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white">{pendingCards}</span>}
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">🔑 Key</TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">🏦 Rút Tiền</TabsTrigger>
            <TabsTrigger value="users" className="flex-1 text-white/70 data-[state=active]:text-[#ffd700]">👥 Users</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead className="text-white/60">User ID</TableHead><TableHead className="text-white/60">Gói</TableHead><TableHead className="text-white/60">Số tiền</TableHead><TableHead className="text-white/60">Nội dung CK</TableHead><TableHead className="text-white/60">Trạng thái</TableHead><TableHead className="text-white/60">Thời gian</TableHead><TableHead className="text-white/60">Hành động</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs text-white/80">{t.user_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-white/80">{t.package}</TableCell>
                        <TableCell className="font-bold" style={{ color: "#ffd700" }}>{formatVND(t.amount)}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{t.transfer_content}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            t.status === "completed" ? "bg-green-900 text-green-300" :
                            t.status === "rejected" ? "bg-red-900 text-red-300" :
                            "bg-yellow-900 text-yellow-300"
                          }`}>{t.status === "pending" ? "Chờ duyệt" : t.status === "completed" ? "Đã duyệt" : "Từ chối"}</span>
                        </TableCell>
                        <TableCell className="text-white/80">{new Date(t.created_at).toLocaleString("vi-VN")}</TableCell>
                        <TableCell>
                          {t.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => approveTransaction(t)}>✅ Duyệt</Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectTransaction(t)}>❌</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cards">
            <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white/60">User ID</TableHead>
                      <TableHead className="text-white/60">Nhà mạng</TableHead>
                      <TableHead className="text-white/60">Serial</TableHead>
                      <TableHead className="text-white/60">Mã thẻ</TableHead>
                      <TableHead className="text-white/60">Mệnh giá</TableHead>
                      <TableHead className="text-white/60">Gói</TableHead>
                      <TableHead className="text-white/60">Trạng thái</TableHead>
                      <TableHead className="text-white/60">Thời gian</TableHead>
                      <TableHead className="text-white/60">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cardTopups.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs text-white/80">{c.user_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-white/80 font-bold uppercase">{c.telco}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{c.serial_number}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{c.card_code}</TableCell>
                        <TableCell className="font-bold" style={{ color: "#ffd700" }}>{formatVND(c.amount)}</TableCell>
                        <TableCell className="text-white/80">{c.package}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            c.status === "completed" ? "bg-green-900 text-green-300" :
                            c.status === "rejected" ? "bg-red-900 text-red-300" :
                            "bg-yellow-900 text-yellow-300"
                          }`}>{c.status === "pending" ? "Chờ duyệt" : c.status === "completed" ? "Đã duyệt" : "Từ chối"}</span>
                        </TableCell>
                        <TableCell className="text-white/80">{new Date(c.created_at).toLocaleString("vi-VN")}</TableCell>
                        <TableCell>
                          {c.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => approveCardTopup(c)}>✅ Duyệt</Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectCardTopup(c)}>❌</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {cardTopups.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-white/40 py-8">Chưa có thẻ cào nào</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keys">
            <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead className="text-white/60">User ID</TableHead><TableHead className="text-white/60">Key</TableHead><TableHead className="text-white/60">Gói</TableHead><TableHead className="text-white/60">Giá</TableHead><TableHead className="text-white/60">Hết hạn</TableHead><TableHead className="text-white/60">Trạng thái</TableHead><TableHead className="text-white/60">Hành động</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-mono text-xs text-white/80">{k.user_id.slice(0, 8)}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{k.key_string.slice(0, 12)}...</TableCell>
                        <TableCell className="text-white/80">{k.package}</TableCell>
                        <TableCell className="text-white/80">{formatVND(k.price)}</TableCell>
                        <TableCell className="text-white/80">{k.expires_at ? new Date(k.expires_at).toLocaleDateString("vi-VN") : "∞"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${k.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                            {k.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant={k.is_active ? "destructive" : "default"} onClick={() => toggleKey(k.id, k.is_active)}>
                            {k.is_active ? "Hủy" : "Kích hoạt"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.3)" }}>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-bold" style={{ color: "#ffd700" }}>🏦 Rút Tiền Về Ngân Hàng</h3>
                  
                  <div>
                    <label className="text-sm text-white/60 block mb-1">Số tiền rút (VNĐ)</label>
                    <input value={wAmount} onChange={(e) => setWAmount(e.target.value)} type="number" placeholder="Nhập số tiền"
                      className="w-full px-4 py-3 rounded-xl text-sm font-mono" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,174,0,0.2)", color: "#fff" }} />
                  </div>
                  <div>
                    <label className="text-sm text-white/60 block mb-1">Ngân hàng</label>
                    <input value={wBank} onChange={(e) => setWBank(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,174,0,0.2)", color: "#fff" }} />
                  </div>
                  <div>
                    <label className="text-sm text-white/60 block mb-1">Số tài khoản</label>
                    <input value={wAccount} onChange={(e) => setWAccount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm font-mono" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,174,0,0.2)", color: "#fff" }} />
                  </div>
                  <div>
                    <label className="text-sm text-white/60 block mb-1">Chủ tài khoản</label>
                    <input value={wHolder} onChange={(e) => setWHolder(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,174,0,0.2)", color: "#fff" }} />
                  </div>

                  <Button onClick={handleWithdraw} disabled={withdrawing} className="w-full py-4 font-bold"
                    style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff" }}>
                    {withdrawing ? "Đang xử lý..." : "💰 Xác Nhận Rút Tiền"}
                  </Button>
                </CardContent>
              </Card>

              <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4" style={{ color: "#ffd700" }}>📋 Lịch Sử Rút Tiền</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {withdrawals.map((w) => (
                      <div key={w.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold" style={{ color: "#22c55e" }}>{formatVND(w.amount)}</span>
                          <span className="text-xs text-white/40">{new Date(w.created_at).toLocaleString("vi-VN")}</span>
                        </div>
                        <div className="text-xs text-white/60">
                          {w.bank_name} • {w.account_number} • {w.account_holder}
                        </div>
                      </div>
                    ))}
                    {withdrawals.length === 0 && (
                      <p className="text-center text-white/40 py-4">Chưa có lệnh rút tiền</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card style={{ background: "rgba(26,10,0,0.9)", borderColor: "rgba(255,174,0,0.2)" }}>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white/60">Email</TableHead>
                      <TableHead className="text-white/60">User ID</TableHead>
                      <TableHead className="text-white/60">Số dư</TableHead>
                      <TableHead className="text-white/60">Ngày đăng ký</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-white/80">{u.email}</TableCell>
                        <TableCell className="font-mono text-xs text-white/80">{u.user_id.slice(0, 8)}</TableCell>
                        <TableCell className="font-bold" style={{ color: "#22c55e" }}>{formatVND(u.balance || 0)}</TableCell>
                        <TableCell className="text-white/80">{new Date(u.created_at).toLocaleDateString("vi-VN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
