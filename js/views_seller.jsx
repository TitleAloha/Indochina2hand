// ============================================================
// SELLER (Thailand) views — list products, earn sales points
// ============================================================
const { useState: useStateS } = React;

function SellerListings({ lang, products, onAdd, pushToast }) {
  const [showForm, setShowForm] = useStateS(false);
  return (
    <div className="view">
      <SectionHead
        title={t({ th: 'หน้าร้านของฉัน', vn: 'Cửa hàng của tôi', en: 'My shop' }, lang)}
        sub={t({ th: 'ลงขายสินค้ามือสอง ส่งตรงถึงผู้ซื้อชาวเวียดนาม', vn: 'Đăng bán hàng cũ tới người mua VN', en: 'List second-hand items for Vietnamese buyers' }, lang)}
        action={<Button icon="＋" onClick={() => setShowForm(s => !s)}>{t({ th: 'ลงขายสินค้า', vn: 'Đăng bán', en: 'List item' }, lang)}</Button>}
      />

      {showForm && <SellForm lang={lang} onSubmit={async (p) => {
        try {
          await onAdd(p);
          setShowForm(false);
          pushToast(t({ th: 'ลงขายสำเร็จ! รอแอดมินตรวจสอบ', vn: 'Đăng thành công!', en: 'Listed! Pending review' }, lang));
        } catch (err) { /* error toast already shown */ }
      }} onCancel={() => setShowForm(false)} />}

      <div className="grid-4 product-grid">
        {products.map(p => (
          <Card key={p.id} className="product-card" hoverable>
            <ProductThumb product={p} lang={lang} />
            <div className="pc-body">
              <div className="pc-name">{t(p.name, lang)}</div>
              <div className="pc-cat">{t(CAT_LABEL[p.cat], lang)}</div>
              <div className="pc-foot">
                <span className="pc-price">{fmtTHB(p.priceTHB)}</span>
                <StatusBadge map={PRODUCT_STATUS} value={p.status} lang={lang} />
              </div>
              <div className="pc-likes">❤ {p.likes} {t({ th: 'คนสนใจ', vn: 'quan tâm', en: 'interested' }, lang)}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SellForm({ lang, onSubmit, onCancel }) {
  const [form, setForm] = useStateS({ name: '', cat: 'bags', priceTHB: '', condition: 'A' });
  const cats = Object.keys(CAT_LABEL);
  const conds = ['A', 'B', 'C'];
  const valid = form.name.trim() && form.priceTHB;
  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      name: { th: form.name, vn: form.name, en: form.name },
      cat: form.cat, priceTHB: Number(form.priceTHB), condition: form.condition,
    });
  }
  return (
    <Card className="pad sell-form">
      <form onSubmit={submit}>
        <div className="sell-grid">
          <div className="sell-drop">
            <span className="sell-drop-icon">📷</span>
            <span>{t({ th: 'ลากรูปสินค้ามาวาง', vn: 'Kéo ảnh vào đây', en: 'Drop product photos' }, lang)}</span>
            <small className="muted">{t({ th: 'หรือคลิกเพื่ออัปโหลด', vn: 'hoặc bấm để tải lên', en: 'or click to upload' }, lang)}</small>
          </div>
          <div className="sell-fields">
            <label className="fld">
              <span>{t({ th: 'ชื่อสินค้า', vn: 'Tên sản phẩm', en: 'Item name' }, lang)}</span>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t({ th: 'เช่น กระเป๋าหนังวินเทจ', vn: 'VD: túi da vintage', en: 'e.g. vintage leather bag' }, lang)} />
            </label>
            <div className="fld-row">
              <label className="fld">
                <span>{t({ th: 'หมวดหมู่', vn: 'Danh mục', en: 'Category' }, lang)}</span>
                <select value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })}>
                  {cats.map(c => <option key={c} value={c}>{t(CAT_LABEL[c], lang)}</option>)}
                </select>
              </label>
              <label className="fld">
                <span>{t({ th: 'ราคา (บาท)', vn: 'Giá (THB)', en: 'Price (THB)' }, lang)}</span>
                <input type="number" value={form.priceTHB} onChange={e => setForm({ ...form, priceTHB: e.target.value })} placeholder="0" />
                {form.priceTHB ? <small className="fx-hint">≈ {fmtVND(thbToVnd(Number(form.priceTHB)))}</small> : null}
              </label>
            </div>
            <div className="fld">
              <span>{t({ th: 'สภาพสินค้า', vn: 'Tình trạng', en: 'Condition' }, lang)}</span>
              <div className="seg">
                {conds.map(c => (
                  <button type="button" key={c} className={'seg-btn' + (form.condition === c ? ' active' : '')} onClick={() => setForm({ ...form, condition: c })}>
                    {t({ th: 'เกรด', vn: 'Loại', en: 'Grade' }, lang)} {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="sell-actions">
              <Button variant="ghost" onClick={onCancel}>{t({ th: 'ยกเลิก', vn: 'Hủy', en: 'Cancel' }, lang)}</Button>
              <Button type="submit" icon="✓">{t({ th: 'ลงขายเลย', vn: 'Đăng bán', en: 'List it' }, lang)}</Button>
            </div>
          </div>
        </div>
      </form>
    </Card>
  );
}

function SellerPoints({ lang, profile, ledger }) {
  const history = ledger.filter(h => h.profile_id === profile.id);
  return (
    <div className="view">
      <SectionHead
        title={t({ th: 'แต้มสะสมจากการขาย', vn: 'Điểm thưởng người bán', en: 'Seller rewards' }, lang)}
        sub={t({ th: 'ยิ่งขายดี ยิ่งได้แต้ม แลกค่าธรรมเนียมและสิทธิพิเศษ', vn: 'Bán càng nhiều, điểm càng cao', en: 'Earn points on every sale' }, lang)}
      />
      <div className="points-hero seller">
        <PointsRing points={profile.points} tier={pointsTier(profile.points, lang)} hue={95} />
        <div className="points-hero-info">
          <h3>{t({ th: `สวัสดี, ${profile.display_name} 👋`, vn: `Xin chào, ${profile.display_name}`, en: `Hi, ${profile.display_name}` }, lang)}</h3>
          <p className="muted">{nextTierMsg(profile.points, lang)}</p>
          <div className="perk-row">
            <span className="perk">🎟️ {t({ th: 'ลดค่าธรรมเนียม 2%', vn: 'Giảm phí 2%', en: '2% fee off' }, lang)}</span>
            <span className="perk">⚡ {t({ th: 'อนุมัติด่วน', vn: 'Duyệt nhanh', en: 'Fast approval' }, lang)}</span>
            <span className="perk">📢 {t({ th: 'ดันโพสต์ฟรี', vn: 'Đẩy tin free', en: 'Free boost' }, lang)}</span>
          </div>
        </div>
      </div>
      <Card className="pad">
        <SectionHead title={t({ th: 'ประวัติการได้แต้ม', vn: 'Lịch sử điểm', en: 'Points history' }, lang)} />
        <ul className="pts-history">
          {history.map(h => (
            <li key={h.id}>
              <span className="pts-ico">⭐</span>
              <span className="pts-label">{t(h.label, lang)}</span>
              <time>{fmtDate(h.created_at)}</time>
              <span className={'pts-plus' + (h.pts < 0 ? ' neg' : '')}>{h.pts > 0 ? '+' : ''}{h.pts}</span>
            </li>
          ))}
          {history.length === 0 && <li className="muted">{t({ th: 'ยังไม่มีประวัติแต้ม', vn: 'Chưa có lịch sử điểm', en: 'No points history yet' }, lang)}</li>}
        </ul>
      </Card>
    </div>
  );
}

Object.assign(window, { SellerListings, SellForm, SellerPoints });
