// ============================================================
// Shared UI components
// ============================================================
const { useState, useContext, useEffect, useRef } = React;

function Badge({ tone = 'info', children }) {
  return <span className={'badge badge-' + tone}>{children}</span>;
}

function StatusBadge({ map, value, lang }) {
  const s = map[value];
  if (!s) return null;
  return <Badge tone={s.tone}>{t(s, lang)}</Badge>;
}

function Card({ children, className = '', onClick, hoverable }) {
  return (
    <div
      className={'card ' + (hoverable ? 'card-hover ' : '') + className}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function Button({ children, variant = 'primary', size = 'md', onClick, icon, type = 'button', full }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn btn-${variant} btn-${size}` + (full ? ' btn-full' : '')}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
}

function IconChip({ icon, hue = 155, size = 44 }) {
  return (
    <span
      className="icon-chip"
      style={{
        width: size, height: size,
        background: `oklch(0.95 0.05 ${hue})`,
        color: `oklch(0.5 0.12 ${hue})`,
        fontSize: size * 0.45,
      }}
    >
      {icon}
    </span>
  );
}

function StatCard({ icon, hue, label, value, sub, delta }) {
  return (
    <Card className="stat-card">
      <IconChip icon={icon} hue={hue} />
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
      {delta != null && (
        <span className={'stat-delta ' + (delta >= 0 ? 'up' : 'down')}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </span>
      )}
    </Card>
  );
}

function Progress({ value, max = 100, hue = 155 }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: pct + '%', background: `oklch(0.7 0.15 ${hue})` }} />
    </div>
  );
}

function Avatar({ name, hue = 155 }) {
  const initial = (name || '?').replace(/\(.*\)/, '').trim().charAt(0).toUpperCase();
  return (
    <span className="avatar" style={{ background: `oklch(0.88 0.08 ${hue})`, color: `oklch(0.42 0.12 ${hue})` }}>
      {initial}
    </span>
  );
}

// trend pill for demand board
function TrendPill({ trend, lang }) {
  const map = {
    hot: { t: { th: 'มาแรง', vn: 'Hot', en: 'Hot' }, tone: 'hot' },
    up: { t: { th: 'เพิ่มขึ้น', vn: 'Tăng', en: 'Rising' }, tone: 'good' },
    steady: { t: { th: 'คงที่', vn: 'Ổn định', en: 'Steady' }, tone: 'info' },
  };
  const s = map[trend] || map.steady;
  return <span className={'trend-pill trend-' + s.tone}>{trend === 'hot' ? '🔥 ' : trend === 'up' ? '📈 ' : '• '}{t(s.t, lang)}</span>;
}

// product image with condition tag
function ProductThumb({ product, lang, size = 'md' }) {
  return (
    <div className={'thumb thumb-' + size}>
      <img src={ph(t(CAT_LABEL[product.cat], lang) || product.cat, product.hue)} alt="" />
      <span className="thumb-cond">เกรด {product.condition}</span>
    </div>
  );
}

// section header
function SectionHead({ title, sub, action }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// tracking timeline (vertical)
function Timeline({ currentStage, lang, compact }) {
  return (
    <div className={'timeline' + (compact ? ' timeline-compact' : '')}>
      {TRACK_STAGES.map((st, i) => {
        const state = i < currentStage ? 'done' : i === currentStage ? 'active' : 'todo';
        return (
          <div key={st.key} className={'tl-row tl-' + state}>
            <div className="tl-marker">
              <span className="tl-dot">{state === 'done' ? '✓' : st.icon}</span>
              {i < TRACK_STAGES.length - 1 && <span className="tl-line" />}
            </div>
            <div className="tl-content">
              <div className="tl-label">{t(st.label, lang)}</div>
              <div className="tl-place">{t(st.place, lang)}</div>
            </div>
            {state === 'active' && <span className="tl-now">{t({ th: 'ตอนนี้', vn: 'Hiện tại', en: 'Now' }, lang)}</span>}
          </div>
        );
      })}
    </div>
  );
}

// points / loyalty ring
function PointsRing({ points, tier, hue = 95 }) {
  const max = 5000;
  const pct = Math.min(100, (points / max) * 100);
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="points-ring">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke={`oklch(0.92 0.04 ${hue})`} strokeWidth="11" />
        <circle
          cx="65" cy="65" r={r} fill="none" stroke={`oklch(0.72 0.16 ${hue})`} strokeWidth="11"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="points-ring-center">
        <div className="points-num">{points.toLocaleString()}</div>
        <div className="points-tier">{tier}</div>
      </div>
    </div>
  );
}

function Toast({ msg, onDone }) {
  useEffect(() => {
    const tm = setTimeout(onDone, 2400);
    return () => clearTimeout(tm);
  }, []);
  return <div className="toast">✓ {msg}</div>;
}

Object.assign(window, {
  Badge, StatusBadge, Card, Button, IconChip, StatCard, Progress,
  Avatar, TrendPill, ProductThumb, SectionHead, Timeline, PointsRing, Toast,
});
