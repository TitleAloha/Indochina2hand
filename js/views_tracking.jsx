// ============================================================
// TRACKING view — step-by-step status timeline
// ============================================================
const { useState: useStateT, useEffect: useEffectT } = React;

function TrackingView({ lang, orders }) {
  const [selected, setSelected] = useStateT(null);

  useEffectT(() => {
    if (orders.length > 0 && !orders.some(o => o.id === selected)) {
      setSelected(orders[0].id);
    }
    if (orders.length === 0 && selected !== null) {
      setSelected(null);
    }
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="view">
        <SectionHead
          title={t({ th: 'ติดตามสินค้า', vn: 'Theo dõi đơn hàng', en: 'Track shipment' }, lang)}
          sub={t({ th: 'ดูสถานะการเดินทางของสินค้าจากต้นทางไทย ถึงปลายทางเวียดนาม', vn: 'Trạng thái từ Thái đến Việt Nam', en: 'Origin (TH) → destination (VN) status' }, lang)}
        />
        <Card className="pad">
          <p className="muted">{t({ th: 'ยังไม่มีออเดอร์ที่ต้องติดตาม', vn: 'Chưa có đơn hàng để theo dõi', en: 'No orders to track yet' }, lang)}</p>
        </Card>
      </div>
    );
  }

  const order = orders.find(o => o.id === selected) || orders[0];
  const product = order.product;

  return (
    <div className="view">
      <SectionHead
        title={t({ th: 'ติดตามสินค้า', vn: 'Theo dõi đơn hàng', en: 'Track shipment' }, lang)}
        sub={t({ th: 'ดูสถานะการเดินทางของสินค้าจากต้นทางไทย ถึงปลายทางเวียดนาม', vn: 'Trạng thái từ Thái đến Việt Nam', en: 'Origin (TH) → destination (VN) status' }, lang)}
      />
      <div className="track-layout">
        <aside className="track-orders">
          {orders.map(o => {
            const p = o.product;
            return (
              <button key={o.id} className={'track-order' + (o.id === order.id ? ' active' : '')} onClick={() => setSelected(o.id)}>
                <img src={ph(t(CAT_LABEL[p.cat], lang), p.hue)} alt="" />
                <div className="to-info">
                  <div className="to-id">{o.code}</div>
                  <div className="to-name">{t(p.name, lang)}</div>
                  <Progress value={o.stage} max={TRACK_STAGES.length - 1} hue={p.hue} />
                  <div className="to-stage">{t(TRACK_STAGES[o.stage].label, lang)}</div>
                </div>
              </button>
            );
          })}
        </aside>

        <div className="track-detail">
          <Card className="pad track-head">
            <div className="th-left">
              <ProductThumb product={product} lang={lang} />
              <div>
                <div className="th-name">{t(product.name, lang)}</div>
                <div className="muted">{order.code} · {t({ th: 'ผู้รับ', vn: 'Người nhận', en: 'To' }, lang)}: {order.buyer}</div>
                <div className="th-route">
                  <span>🇹🇭 {t({ th: 'กรุงเทพฯ', vn: 'Bangkok', en: 'Bangkok' }, lang)}</span>
                  <span className="route-line" />
                  <span>🇻🇳 {t({ th: 'เวียดนาม', vn: 'Việt Nam', en: 'Vietnam' }, lang)}</span>
                </div>
              </div>
            </div>
            <div className="th-eta">
              <span className="muted small">{t({ th: 'คาดว่าถึง', vn: 'Dự kiến', en: 'ETA' }, lang)}</span>
              <span className="eta-val">{order.eta || '—'}</span>
            </div>
          </Card>

          <Card className="pad">
            <Timeline currentStage={order.stage} lang={lang} />
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TrackingView });
