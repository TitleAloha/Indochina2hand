// ============================================================
// ADMIN views
// ============================================================

function catIcon(cat) {
  return cat === 'bags' ? '👜' : cat === 'shoes' ? '👟' : cat === 'camera' ? '📷'
    : cat === 'watch' ? '⌚' : cat === 'tech' ? '📱' : cat === 'home' ? '🏠' : '👕';
}

function AdminOverview({ lang, onGo, products, demands, transactions, orders, pointsLedger }) {
  const matched = products.filter(p => ['matched', 'shipping', 'delivered'].includes(p.status)).length;
  const revenue = transactions.reduce((s, x) => s + x.thb, 0);
  const inTransit = orders.filter(o => o.stage > 0 && o.stage < 6).length;
  const pointsIssued = pointsLedger.filter(l => l.pts > 0).reduce((s, l) => s + l.pts, 0);

  const activity = [
    ...products.slice(0, 3).map(p => ({
      key: 'p' + p.id, time: p.created_at, dot: p.status === 'review' ? 'warn' : 'info',
      text: { th: `${t(p.name, 'th')} · ${t(PRODUCT_STATUS[p.status], 'th')}`, vn: `${t(p.name, 'vn')} · ${t(PRODUCT_STATUS[p.status], 'vn')}`, en: `${t(p.name, 'en')} · ${t(PRODUCT_STATUS[p.status], 'en')}` },
    })),
    ...transactions.slice(0, 3).map(x => ({
      key: 'x' + x.id, time: x.created_at, dot: x.status === 'paid_out' ? 'good' : 'info',
      text: { th: `${x.buyer} ชำระเงิน ${fmtTHB(x.thb)}`, vn: `${x.buyer} thanh toán ${fmtTHB(x.thb)}`, en: `${x.buyer} paid ${fmtTHB(x.thb)}` },
    })),
    ...orders.slice(0, 3).map(o => ({
      key: 'o' + o.id, time: o.updated_at || o.created_at, dot: o.stage >= 6 ? 'good' : 'info',
      text: { th: `${o.code} · ${t((TRACK_STAGES[o.stage] || {}).label, 'th')}`, vn: `${o.code} · ${t((TRACK_STAGES[o.stage] || {}).label, 'vn')}`, en: `${o.code} · ${t((TRACK_STAGES[o.stage] || {}).label, 'en')}` },
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

  return (
    <div className="view">
      <SectionHead
        title={t({ th: 'ภาพรวมระบบ', vn: 'Tổng quan', en: 'Overview' }, lang)}
        sub={t({ th: 'สรุปการซื้อขายมือสองไทย → เวียดนาม วันนี้', vn: 'Tóm tắt giao dịch hôm nay', en: "Today's cross-border activity" }, lang)}
      />
      <div className="grid-4">
        <StatCard icon="🛍️" hue={155}
          label={t({ th: 'สินค้าในระบบ', vn: 'Sản phẩm', en: 'Listings' }, lang)}
          value={products.length} sub={t({ th: 'จับคู่แล้ว ' + matched, vn: 'Đã ghép ' + matched, en: matched + ' matched' }, lang)} />
        <StatCard icon="💸" hue={250}
          label={t({ th: 'ยอดขายรวม', vn: 'Doanh thu', en: 'Revenue' }, lang)}
          value={fmtTHB(revenue)} sub={fmtVND(thbToVnd(revenue))} />
        <StatCard icon="🚚" hue={25}
          label={t({ th: 'กำลังจัดส่ง', vn: 'Đang giao', en: 'In transit' }, lang)}
          value={inTransit} sub={t({ th: 'ออเดอร์ข้ามแดน', vn: 'Đơn xuyên biên', en: 'cross-border' }, lang)} />
        <StatCard icon="⭐" hue={95}
          label={t({ th: 'แต้มที่แจกทั้งหมด', vn: 'Điểm phát hành', en: 'Points issued' }, lang)}
          value={pointsIssued.toLocaleString()} sub={t({ th: 'ผู้ซื้อ + ผู้ขาย', vn: 'Mua + Bán', en: 'buyers + sellers' }, lang)} />
      </div>

      <div className="grid-2-1">
        <Card className="pad">
          <SectionHead title={t({ th: 'ดีมานด์ยอดฮิตจากเวียดนาม', vn: 'Nhu cầu hot từ VN', en: 'Top demand from Vietnam' }, lang)}
            action={<Button variant="ghost" size="sm" onClick={() => onGo('demand')}>{t({ th: 'ดูทั้งหมด', vn: 'Xem tất cả', en: 'View all' }, lang)} →</Button>} />
          <div className="demand-mini">
            {demands.slice(0, 4).map(d => (
              <div key={d.id} className="demand-mini-row">
                <IconChip icon={catIcon(d.cat)} hue={d.hue} size={38} />
                <div className="dm-info">
                  <div className="dm-label">{t(d.label, lang)}</div>
                  <Progress value={d.filled} max={d.qty} hue={d.hue} />
                </div>
                <div className="dm-meta">
                  <TrendPill trend={d.trend} lang={lang} />
                  <span className="dm-qty">{d.filled}/{d.qty}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="pad">
          <SectionHead title={t({ th: 'กิจกรรมล่าสุด', vn: 'Hoạt động', en: 'Activity' }, lang)} />
          <ul className="activity">
            {activity.map(a => (
              <li key={a.key}><span className={'act-dot ' + a.dot} />{t(a.text, lang)}<time>{fmtDate(a.time)}</time></li>
            ))}
            {activity.length === 0 && <li className="muted">{t({ th: 'ยังไม่มีกิจกรรม', vn: 'Chưa có hoạt động', en: 'No activity yet' }, lang)}</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function AdminDemand({ lang, demands }) {
  return (
    <div className="view">
      <SectionHead
        title={t({ th: 'สินค้าที่เวียดนามต้องการจากไทย', vn: 'Hàng VN muốn từ Thái', en: 'What Vietnam wants from Thailand' }, lang)}
        sub={t({ th: 'อัปเดตตามความต้องการตลาดเวียดนามแบบเรียลไทม์', vn: 'Cập nhật theo nhu cầu thị trường VN', en: 'Live Vietnamese market demand' }, lang)}
      />
      <div className="grid-3">
        {demands.map(d => (
          <Card key={d.id} className="pad demand-card" hoverable>
            <div className="demand-card-top">
              <IconChip icon={catIcon(d.cat)} hue={d.hue} />
              <TrendPill trend={d.trend} lang={lang} />
            </div>
            <h3 className="demand-card-title">{t(d.label, lang)}</h3>
            <div className="demand-card-budget">
              {t({ th: 'งบเฉลี่ย', vn: 'Ngân sách', en: 'Budget' }, lang)} · {fmtTHB(d.budgetTHB)}
              <span className="muted"> ({fmtVND(thbToVnd(d.budgetTHB))})</span>
            </div>
            <Progress value={d.filled} max={d.qty} hue={d.hue} />
            <div className="demand-card-foot">
              <span>{t({ th: 'จัดหาแล้ว', vn: 'Đã có', en: 'Sourced' }, lang)} <b>{d.filled}</b> / {d.qty}</span>
              <span className="need">{t({ th: 'ต้องการอีก', vn: 'Cần thêm', en: 'Need' }, lang)} {Math.max(0, d.qty - d.filled)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminMatching({ lang, products, demands, onMatch, pushToast }) {
  const open = products.filter(p => ['review', 'listed'].includes(p.status));
  return (
    <div className="view">
      <SectionHead
        title={t({ th: 'จับคู่สินค้า (Matching)', vn: 'Ghép sản phẩm', en: 'Matching' }, lang)}
        sub={t({ th: 'จับคู่สินค้าไทยที่ลงขาย เข้ากับดีมานด์ของเวียดนาม', vn: 'Ghép hàng Thái với nhu cầu VN', en: 'Pair Thai listings with Vietnamese demand' }, lang)}
      />
      <div className="match-list">
        {open.map(p => {
          const candidates = demands.filter(d => d.cat === p.cat);
          return (
            <Card key={p.id} className="pad match-row">
              <ProductThumb product={p} lang={lang} size="sm" />
              <div className="match-info">
                <div className="match-name">{t(p.name, lang)}</div>
                <div className="match-meta">{p.code} · {p.seller} · {fmtTHB(p.priceTHB)}</div>
              </div>
              <div className="match-arrow">→</div>
              <div className="match-targets">
                {candidates.length === 0 && <span className="muted">{t({ th: 'ยังไม่มีดีมานด์ที่ตรง', vn: 'Chưa có nhu cầu', en: 'No demand yet' }, lang)}</span>}
                {candidates.map(d => (
                  <button key={d.id} className="match-chip" onClick={() => onMatch(p.id, d.id)}>
                    {t(d.label, lang)}
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
        {open.length === 0 && (
          <p className="muted">{t({ th: 'ไม่มีสินค้าที่ต้องจับคู่ในขณะนี้', vn: 'Không có sản phẩm cần ghép', en: 'Nothing to match right now' }, lang)}</p>
        )}
      </div>
    </div>
  );
}

function AdminFinance({ lang, transactions, onAdvance, pushToast }) {
  const rows = transactions;
  const totalVnd = rows.reduce((s, r) => s + r.vnd, 0);
  const totalThb = rows.reduce((s, r) => s + r.thb, 0);
  const payout = rows.filter(r => r.status === 'paid_out').reduce((s, r) => s + (r.thb - r.fee), 0);
  return (
    <div className="view">
      <SectionHead
        title={t({ th: 'การเงิน & แปลงสกุลเงิน', vn: 'Tài chính & quy đổi', en: 'Finance & FX' }, lang)}
        sub={t({ th: 'รับเงินดง (VND) จากผู้ซื้อ แปลงเป็นบาท แล้วโอนให้ผู้ขายไทย', vn: 'Nhận VND, đổi sang Baht, trả người bán', en: 'Receive VND, convert to THB, pay Thai sellers' }, lang)}
      />
      <div className="fx-banner">
        <div className="fx-rate">
          <span className="fx-big">1 ฿ = {FX_VND_PER_THB} ₫</span>
          <span className="muted">{t({ th: 'อัตราแลกเปลี่ยนวันนี้', vn: 'Tỷ giá hôm nay', en: "Today's rate" }, lang)}</span>
        </div>
        <div className="fx-flow">
          <div className="fx-node vnd">{fmtVND(totalVnd)}<small>{t({ th: 'รับจากเวียดนาม', vn: 'Nhận từ VN', en: 'In from VN' }, lang)}</small></div>
          <span className="fx-conv">⇄</span>
          <div className="fx-node thb">{fmtTHB(totalThb)}<small>{t({ th: 'แปลงเป็นบาท', vn: 'Đổi sang Baht', en: 'Converted' }, lang)}</small></div>
          <span className="fx-conv">→</span>
          <div className="fx-node pay">{fmtTHB(payout)}<small>{t({ th: 'โอนให้ผู้ขายแล้ว', vn: 'Đã trả người bán', en: 'Paid out' }, lang)}</small></div>
        </div>
      </div>

      <Card className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t({ th: 'รหัส', vn: 'Mã', en: 'ID' }, lang)}</th>
              <th>{t({ th: 'ผู้ซื้อ (VN)', vn: 'Người mua', en: 'Buyer' }, lang)}</th>
              <th>{t({ th: 'รับเงิน (ดง)', vn: 'Nhận (VND)', en: 'Received (VND)' }, lang)}</th>
              <th>{t({ th: 'แปลง (บาท)', vn: 'Đổi (THB)', en: 'THB' }, lang)}</th>
              <th>{t({ th: 'ค่าธรรมเนียม', vn: 'Phí', en: 'Fee' }, lang)}</th>
              <th>{t({ th: 'สถานะ', vn: 'Trạng thái', en: 'Status' }, lang)}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="mono">{r.code}</td>
                <td><div className="cell-user"><Avatar name={r.buyer} hue={250} />{r.buyer}</div></td>
                <td className="mono">{fmtVND(r.vnd)}</td>
                <td className="mono strong">{fmtTHB(r.thb)}</td>
                <td className="mono muted">{fmtTHB(r.fee)}</td>
                <td><StatusBadge map={TXN_STATUS} value={r.status} lang={lang} /></td>
                <td>
                  {r.status !== 'paid_out'
                    ? <Button size="sm" variant="soft" onClick={() => onAdvance(r.id)}>
                        {r.status === 'pending' ? t({ th: 'แปลงเงิน', vn: 'Đổi', en: 'Convert' }, lang) : t({ th: 'โอนให้ผู้ขาย', vn: 'Trả', en: 'Pay out' }, lang)}
                      </Button>
                    : <span className="muted small">✓ {t({ th: 'เสร็จสิ้น', vn: 'Xong', en: 'Done' }, lang)}</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="7" className="muted">{t({ th: 'ยังไม่มีรายการ', vn: 'Chưa có giao dịch', en: 'No transactions yet' }, lang)}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

Object.assign(window, { AdminOverview, AdminDemand, AdminMatching, AdminFinance });
