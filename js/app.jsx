// ============================================================
// APP shell — auth, data loading, roles, nav, language, toasts
// ============================================================
const { useState: useApp, useEffect: useAppEffect } = React;

const ROLES = [
  { id: 'admin',    icon: '🛠️', label: { th: 'แอดมิน', vn: 'Quản trị', en: 'Admin' } },
  { id: 'seller',   icon: '🇹🇭', label: { th: 'ผู้ขายไทย', vn: 'Người bán (TH)', en: 'Seller (TH)' } },
  { id: 'buyer',    icon: '🇻🇳', label: { th: 'ผู้ซื้อเวียดนาม', vn: 'Người mua (VN)', en: 'Buyer (VN)' } },
  { id: 'tracking', icon: '📍', label: { th: 'ติดตามสินค้า', vn: 'Theo dõi', en: 'Tracking' } },
];

const NAV = {
  admin: [
    { id: 'overview', icon: '📊', label: { th: 'ภาพรวม', vn: 'Tổng quan', en: 'Overview' } },
    { id: 'demand',   icon: '🇻🇳', label: { th: 'ดีมานด์เวียดนาม', vn: 'Nhu cầu VN', en: 'VN demand' } },
    { id: 'matching', icon: '🔗', label: { th: 'จับคู่สินค้า', vn: 'Ghép hàng', en: 'Matching' } },
    { id: 'finance',  icon: '💱', label: { th: 'การเงิน', vn: 'Tài chính', en: 'Finance' } },
  ],
  seller: [
    { id: 'listings', icon: '🏬', label: { th: 'หน้าร้านฉัน', vn: 'Cửa hàng', en: 'My shop' } },
    { id: 'points',   icon: '⭐', label: { th: 'แต้มขาย', vn: 'Điểm bán', en: 'Rewards' } },
  ],
  buyer: [
    { id: 'shop',   icon: '🛍️', label: { th: 'ช้อปสินค้า', vn: 'Mua sắm', en: 'Shop' } },
    { id: 'points', icon: '⭐', label: { th: 'แต้มสะสม', vn: 'Điểm của tôi', en: 'My points' } },
  ],
  tracking: [],
};

// ---- map raw Supabase rows to the shapes views expect ------
function mapProduct(p) {
  return {
    ...p,
    priceTHB: Number(p.price_thb),
    seller: p.seller ? `${p.seller.display_name} (${p.seller.country})` : '',
  };
}
function mapDemand(d) {
  return { ...d, budgetTHB: Number(d.budget_thb) };
}
function mapTransaction(x) {
  return {
    ...x,
    vnd: Number(x.vnd), thb: Number(x.thb), fee: Number(x.fee),
    buyer: x.buyer ? `${x.buyer.display_name} (${x.buyer.country})` : '',
  };
}
function mapOrder(o) {
  return {
    ...o,
    product: o.product ? mapProduct(o.product) : null,
    buyer: o.buyer ? `${o.buyer.display_name} (${o.buyer.country})` : '',
  };
}

function App() {
  const [lang, setLang] = useApp('th');
  const [session, setSession] = useApp(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useApp(null);
  const [role, setRole] = useApp('buyer');
  const [sub, setSub] = useApp('shop');
  const [products, setProducts] = useApp([]);
  const [demands, setDemands] = useApp([]);
  const [transactions, setTransactions] = useApp([]);
  const [orders, setOrders] = useApp([]);
  const [pointsLedger, setPointsLedger] = useApp([]);
  const [rewards, setRewards] = useApp([]);
  const [redemptions, setRedemptions] = useApp([]);
  const [toasts, setToasts] = useApp([]);
  const [langOpen, setLangOpen] = useApp(false);

  function pushToast(msg) {
    const id = Math.random();
    setToasts(ts => [...ts, { id, msg }]);
  }
  function goRole(r) {
    setRole(r);
    setSub((NAV[r][0] && NAV[r][0].id) || 'main');
  }

  async function refreshProfile(uid) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', uid).single();
    if (error) return null;
    setProfile(data);
    return data;
  }

  async function refreshAll() {
    const [pr, dm, tx, od, pl, rw, rd] = await Promise.all([
      sb.from('products').select('*, seller:profiles!seller_id(display_name,country)').order('created_at', { ascending: false }),
      sb.from('demands').select('*').order('created_at'),
      sb.from('transactions').select('*, buyer:profiles!buyer_id(display_name,country)').order('created_at', { ascending: false }),
      sb.from('orders').select('*, product:products(*), buyer:profiles!buyer_id(display_name,country)').order('created_at', { ascending: false }),
      sb.from('points_ledger').select('*').order('created_at', { ascending: false }),
      sb.from('rewards_catalog').select('*').eq('active', true),
      sb.from('redemptions').select('*').order('created_at', { ascending: false }),
    ]);
    if (pr.data) setProducts(pr.data.map(mapProduct));
    if (dm.data) setDemands(dm.data.map(mapDemand));
    if (tx.data) setTransactions(tx.data.map(mapTransaction));
    if (od.data) setOrders(od.data.map(mapOrder));
    if (pl.data) setPointsLedger(pl.data);
    if (rw.data) setRewards(rw.data);
    if (rd.data) setRedemptions(rd.data);
  }

  // bootstrap + watch auth state
  useAppEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = sb.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  // once signed in: load profile + app data
  useAppEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      setProfile(null);
      return;
    }
    (async () => {
      const p = await refreshProfile(session.user.id);
      if (!p) {
        pushToast(t({ th: 'ไม่พบโปรไฟล์ผู้ใช้ กรุณาเข้าสู่ระบบใหม่', vn: 'Không tìm thấy hồ sơ, vui lòng đăng nhập lại', en: 'Profile not found, please sign in again' }, lang));
        await sb.auth.signOut();
        return;
      }
      setRole(p.role);
      setSub((NAV[p.role][0] && NAV[p.role][0].id) || 'main');
      await refreshAll();
    })();
  }, [session]);

  // ---- write handlers ------------------------------------------
  async function addProduct(form) {
    const { error } = await sb.from('products').insert({
      name: form.name,
      cat: form.cat,
      price_thb: Number(form.priceTHB),
      condition: form.condition,
      seller_id: session.user.id,
      hue: CAT_HUE[form.cat] || 155,
    });
    if (error) { pushToast(error.message); throw error; }
    await refreshAll();
  }

  async function doMatch(productId, demandId) {
    const { error } = await sb.rpc('match_product', { p_product_id: productId, p_demand_id: demandId });
    if (error) { pushToast(error.message); return; }
    pushToast(t({ th: 'จับคู่สำเร็จ! ส่งให้ผู้ซื้อเวียดนามแล้ว', vn: 'Ghép thành công!', en: 'Matched successfully!' }, lang));
    await refreshAll();
  }

  async function advanceTransaction(txId) {
    const { error } = await sb.rpc('advance_transaction', { p_tx_id: txId });
    if (error) { pushToast(error.message); return; }
    pushToast(t({ th: 'อัปเดตสถานะการเงินแล้ว', vn: 'Đã cập nhật', en: 'Updated' }, lang));
    await refreshAll();
  }

  async function checkout(items) {
    const { error } = await sb.rpc('checkout', { product_ids: items.map(p => p.id) });
    if (error) { pushToast(error.message); return false; }
    pushToast(t({ th: 'สั่งซื้อสำเร็จ! ได้รับแต้มสะสมแล้ว', vn: 'Đặt hàng thành công! +điểm', en: 'Order placed! Points earned' }, lang));
    await refreshAll();
    await refreshProfile(session.user.id);
    return true;
  }

  async function redeemReward(rewardId) {
    const { error } = await sb.rpc('redeem_reward', { p_reward_id: rewardId });
    if (error) { pushToast(error.message); return; }
    pushToast(t({ th: 'แลกของรางวัลสำเร็จ!', vn: 'Đổi quà thành công!', en: 'Reward redeemed!' }, lang));
    await refreshAll();
    await refreshProfile(session.user.id);
  }

  // ---- render -----------------------------------------------
  if (session === undefined || (session && !profile)) {
    return (
      <div className="loading-screen">
        <div className="brand-mark">♻</div>
        <p>{t({ th: 'กำลังโหลด...', vn: 'Đang tải...', en: 'Loading...' }, lang)}</p>
      </div>
    );
  }
  if (session === null) {
    return <AuthView lang={lang} onLangChange={setLang} />;
  }

  const navItems = NAV[role];
  const curLang = LANGS.find(l => l.id === lang);

  let content = null;
  if (role === 'admin') {
    if (sub === 'overview') content = <AdminOverview lang={lang} onGo={setSub} products={products} demands={demands} transactions={transactions} orders={orders} pointsLedger={pointsLedger} />;
    else if (sub === 'demand') content = <AdminDemand lang={lang} demands={demands} />;
    else if (sub === 'matching') content = <AdminMatching lang={lang} products={products} demands={demands} onMatch={doMatch} pushToast={pushToast} />;
    else if (sub === 'finance') content = <AdminFinance lang={lang} transactions={transactions} onAdvance={advanceTransaction} pushToast={pushToast} />;
  } else if (role === 'seller') {
    if (sub === 'listings') content = <SellerListings lang={lang} products={products.filter(p => p.seller_id === profile.id)} onAdd={addProduct} pushToast={pushToast} />;
    else content = <SellerPoints lang={lang} profile={profile} ledger={pointsLedger} />;
  } else if (role === 'buyer') {
    if (sub === 'shop') content = <BuyerShop lang={lang} products={products.filter(p => ['listed', 'matched'].includes(p.status))} onCheckout={checkout} pushToast={pushToast} />;
    else content = <BuyerPoints lang={lang} profile={profile} rewards={rewards} redemptions={redemptions} onRedeem={redeemReward} pushToast={pushToast} />;
  } else if (role === 'tracking') {
    content = <TrackingView lang={lang} orders={profile.role === 'admin' ? orders : orders.filter(o => o.buyer_id === profile.id)} />;
  }

  return (
    <LangContext.Provider value={lang}>
      <div className="app">
        {/* top bar */}
        <header className="topbar">
          <div className="brand" onClick={() => goRole('admin')}>
            <span className="brand-mark">♻</span>
            <div className="brand-text">
              <span className="brand-name">ReViet</span>
              <span className="brand-sub">TH ↔ VN Resale</span>
            </div>
          </div>

          <nav className="role-tabs">
            {ROLES.map(r => (
              <button key={r.id} className={'role-tab' + (role === r.id ? ' active' : '')} onClick={() => goRole(r.id)}>
                <span className="role-ico">{r.icon}</span>
                <span className="role-label">{t(r.label, lang)}</span>
              </button>
            ))}
          </nav>

          <div className="topbar-right">
            <div className="lang-switch">
              <button className="lang-btn" onClick={() => setLangOpen(o => !o)}>
                {curLang.flag} {curLang.label} <span className="caret">▾</span>
              </button>
              {langOpen && (
                <div className="lang-menu">
                  {LANGS.map(l => (
                    <button key={l.id} className={'lang-item' + (l.id === lang ? ' active' : '')} onClick={() => { setLang(l.id); setLangOpen(false); }}>
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="topbar-user">
              <Avatar name={profile.display_name} hue={profile.avatar_hue} />
              <span className="topbar-user-name">{profile.display_name}</span>
              <button className="topbar-signout" onClick={() => sb.auth.signOut()} title={t({ th: 'ออกจากระบบ', vn: 'Đăng xuất', en: 'Sign out' }, lang)}>⎋</button>
            </div>
          </div>
        </header>

        <div className="body">
          {navItems.length > 0 && (
            <aside className="sidebar">
              <div className="sidebar-role">{t(ROLES.find(r => r.id === role).label, lang)}</div>
              {navItems.map(n => (
                <button key={n.id} className={'nav-item' + (sub === n.id ? ' active' : '')} onClick={() => setSub(n.id)}>
                  <span className="nav-ico">{n.icon}</span>
                  <span>{t(n.label, lang)}</span>
                </button>
              ))}
              <div className="sidebar-foot">
                <div className="fx-mini">
                  <span className="muted small">{t({ th: 'เรตวันนี้', vn: 'Tỷ giá', en: 'FX rate' }, lang)}</span>
                  <b>1฿ = {FX_VND_PER_THB}₫</b>
                </div>
              </div>
            </aside>
          )}
          <main className={'main' + (navItems.length === 0 ? ' main-full' : '')}>
            {content}
          </main>
        </div>

        <div className="toast-stack">
          {toasts.map(tt => (
            <Toast key={tt.id} msg={tt.msg} onDone={() => setToasts(ts => ts.filter(x => x.id !== tt.id))} />
          ))}
        </div>
      </div>
    </LangContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
