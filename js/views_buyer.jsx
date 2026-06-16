// ============================================================
// BUYER (Vietnam) views — browse, buy, points
// ============================================================
const { useState: useStateB } = React;

function BuyerShop({ lang, products, onCheckout, pushToast }) {
  const [cart, setCart] = useStateB([]);
  const [filter, setFilter] = useStateB('all');
  const cats = ['all', ...Array.from(new Set(products.map(p => p.cat)))];
  const shown = filter === 'all' ? products : products.filter(p => p.cat === filter);
  const inCart = (id) => cart.includes(id);
  const cartItems = products.filter(p => cart.includes(p.id));
  const totalThb = cartItems.reduce((s, p) => s + p.priceTHB, 0);

  function toggle(id) {
    setCart(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  }
  async function checkout() {
    const ok = await onCheckout(cartItems);
    if (ok) setCart([]);
  }

  return (
    <div className="view">
      <SectionHead
        title={t({ th: 'ช้อปสินค้ามือสองจากไทย', vn: 'Mua hàng cũ từ Thái Lan', en: 'Shop second-hand from Thailand' }, lang)}
        sub={t({ th: 'ของแท้ คัดเกรด ส่งตรงถึงเวียดนาม ราคาดง', vn: 'Hàng thật, tuyển chọn, giá VND', en: 'Authentic, graded, priced in VND' }, lang)}
      />
      <div className="cat-filter">
        {cats.map(c => (
          <button key={c} className={'cat-pill' + (filter === c ? ' active' : '')} onClick={() => setFilter(c)}>
            {c === 'all' ? t({ th: 'ทั้งหมด', vn: 'Tất cả', en: 'All' }, lang) : t(CAT_LABEL[c], lang)}
          </button>
        ))}
      </div>

      <div className="shop-layout">
        <div className="grid-3 product-grid">
          {shown.map(p => (
            <Card key={p.id} className="product-card buy-card" hoverable>
              <ProductThumb product={p} lang={lang} />
              <div className="pc-body">
                <div className="pc-name">{t(p.name, lang)}</div>
                <div className="pc-cat">{t(CAT_LABEL[p.cat], lang)} · {t({ th: 'เกรด', vn: 'Loại', en: 'Grade' }, lang)} {p.condition}</div>
                <div className="buy-price">
                  <span className="buy-vnd">{fmtVND(thbToVnd(p.priceTHB))}</span>
                  <span className="buy-thb muted">{fmtTHB(p.priceTHB)}</span>
                </div>
                <Button full variant={inCart(p.id) ? 'soft' : 'primary'} size="sm" onClick={() => toggle(p.id)}>
                  {inCart(p.id) ? '✓ ' + t({ th: 'อยู่ในตะกร้า', vn: 'Trong giỏ', en: 'In cart' }, lang) : '🛒 ' + t({ th: 'หยิบใส่ตะกร้า', vn: 'Thêm vào giỏ', en: 'Add to cart' }, lang)}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <aside className="cart-panel">
          <Card className="pad cart-inner">
            <h3 className="cart-title">🛒 {t({ th: 'ตะกร้าสินค้า', vn: 'Giỏ hàng', en: 'Cart' }, lang)} ({cartItems.length})</h3>
            {cartItems.length === 0 && <p className="muted cart-empty">{t({ th: 'ยังไม่มีสินค้าในตะกร้า', vn: 'Giỏ hàng trống', en: 'Cart is empty' }, lang)}</p>}
            {cartItems.map(p => (
              <div key={p.id} className="cart-row">
                <img src={ph(t(CAT_LABEL[p.cat], lang), p.hue)} alt="" />
                <div className="cart-row-info">
                  <div className="cart-row-name">{t(p.name, lang)}</div>
                  <div className="muted small">{fmtVND(thbToVnd(p.priceTHB))}</div>
                </div>
                <button className="cart-x" onClick={() => toggle(p.id)}>✕</button>
              </div>
            ))}
            {cartItems.length > 0 && (
              <div className="cart-foot">
                <div className="cart-total-row"><span>{t({ th: 'รวม (ดง)', vn: 'Tổng (VND)', en: 'Total (VND)' }, lang)}</span><b>{fmtVND(thbToVnd(totalThb))}</b></div>
                <div className="cart-total-row muted small"><span>{t({ th: 'เทียบเท่า', vn: 'Tương đương', en: 'Equivalent' }, lang)}</span><span>{fmtTHB(totalThb)}</span></div>
                <div className="cart-total-row earn"><span>⭐ {t({ th: 'จะได้รับแต้ม', vn: 'Sẽ nhận điểm', en: 'You earn' }, lang)}</span><b>+{Math.round(totalThb / 10)}</b></div>
                <Button full icon="💳" onClick={checkout}>{t({ th: 'ชำระเงิน (VND)', vn: 'Thanh toán', en: 'Checkout' }, lang)}</Button>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function BuyerPoints({ lang, profile, rewards, redemptions, onRedeem }) {
  return (
    <div className="view">
      <SectionHead
        title={t({ th: 'แต้มสะสมของฉัน', vn: 'Điểm của tôi', en: 'My points' }, lang)}
        sub={t({ th: 'สะสมแต้มทุกการช้อป แลกส่วนลดและสิทธิพิเศษ', vn: 'Tích điểm mỗi đơn, đổi ưu đãi', en: 'Earn on every order, redeem perks' }, lang)}
      />
      <div className="points-hero buyer">
        <PointsRing points={profile.points} tier={pointsTier(profile.points, lang)} hue={200} />
        <div className="points-hero-info">
          <h3>{t({ th: `สวัสดี, ${profile.display_name} 👋`, vn: `Xin chào, ${profile.display_name}`, en: `Hi, ${profile.display_name}` }, lang)}</h3>
          <p className="muted">{nextTierMsg(profile.points, lang)}</p>
        </div>
      </div>
      <SectionHead title={t({ th: 'แลกของรางวัล', vn: 'Đổi quà', en: 'Redeem rewards' }, lang)} />
      <div className="grid-4">
        {rewards.map(r => {
          const can = profile.points >= r.cost;
          return (
            <Card key={r.id} className="pad reward-card" hoverable>
              <span className="reward-ico">{r.icon}</span>
              <div className="reward-name">{t(r.label, lang)}</div>
              <div className="reward-cost">{r.cost} {t({ th: 'แต้ม', vn: 'điểm', en: 'pts' }, lang)}</div>
              <Button size="sm" full variant={can ? 'primary' : 'ghost'} onClick={() => can && onRedeem(r.id)}>
                {can ? t({ th: 'แลกเลย', vn: 'Đổi ngay', en: 'Redeem' }, lang) : t({ th: 'แต้มไม่พอ', vn: 'Chưa đủ', en: 'Locked' }, lang)}
              </Button>
            </Card>
          );
        })}
      </div>
      {redemptions.length > 0 && (
        <Card className="pad">
          <SectionHead title={t({ th: 'ประวัติการแลกของรางวัล', vn: 'Lịch sử đổi quà', en: 'Redemption history' }, lang)} />
          <ul className="pts-history">
            {redemptions.map(r => {
              const reward = rewards.find(x => x.id === r.reward_id);
              return (
                <li key={r.id}>
                  <span className="pts-ico">{reward ? reward.icon : '🎁'}</span>
                  <span className="pts-label">{reward ? t(reward.label, lang) : ''}</span>
                  <time>{fmtDate(r.created_at)}</time>
                  <span className="pts-plus neg">-{r.cost}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

Object.assign(window, { BuyerShop, BuyerPoints });
