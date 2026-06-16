// ============================================================
// TH-VN Second-hand Shop — sample data + i18n
// ============================================================

// ---- i18n ---------------------------------------------------
const LangContext = React.createContext('th');
// t(obj, lang) where obj = {th, vn, en}
function t(obj, lang) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.th || obj.en || '';
}
const LANGS = [
  { id: 'th', label: 'ไทย', flag: '🇹🇭' },
  { id: 'vn', label: 'Tiếng Việt', flag: '🇻🇳' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
];

// ---- currency ----------------------------------------------
const FX_VND_PER_THB = 730; // 1 THB = 730 VND
const fmtTHB = (n) => '฿' + Math.round(n).toLocaleString('en-US');
const fmtVND = (n) => Math.round(n).toLocaleString('en-US') + '₫';
const thbToVnd = (thb) => thb * FX_VND_PER_THB;
const vndToThb = (vnd) => vnd / FX_VND_PER_THB;

// ---- placeholder image (striped svg) -----------------------
function ph(label, hue) {
  hue = hue == null ? 155 : hue;
  const bg = `hsl(${hue},30%,92%)`;
  const stripe = `hsl(${hue},32%,86%)`;
  const fg = `hsl(${hue},26%,46%)`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <defs><pattern id='p' width='16' height='16' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>
      <rect width='16' height='16' fill='${bg}'/><rect width='8' height='16' fill='${stripe}'/></pattern></defs>
    <rect width='400' height='400' fill='url(#p)'/>
    <text x='50%' y='50%' fill='${fg}' font-family='monospace' font-size='20' text-anchor='middle' dominant-baseline='middle'>${label}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// ---- date formatting -----------------------------------------
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---- loyalty tiers --------------------------------------------
function pointsTier(points, lang) {
  if (points >= 3000) return t({ th: 'แพลทินัม', vn: 'Hạng Bạch kim', en: 'Platinum' }, lang);
  if (points >= 1000) return t({ th: 'ทอง', vn: 'Hạng Vàng', en: 'Gold' }, lang);
  return t({ th: 'เงิน', vn: 'Hạng Bạc', en: 'Silver' }, lang);
}

function nextTierMsg(points, lang) {
  if (points < 1000) {
    const need = 1000 - points;
    return t({ th: `อีก ${need} แต้ม เลื่อนเป็นระดับ ทอง`, vn: `Còn ${need} điểm lên hạng Vàng`, en: `${need} pts to Gold` }, lang);
  }
  if (points < 3000) {
    const need = 3000 - points;
    return t({ th: `อีก ${need} แต้ม เลื่อนเป็นระดับ แพลทินัม`, vn: `Còn ${need} điểm lên hạng Bạch Kim`, en: `${need} pts to Platinum` }, lang);
  }
  return t({ th: 'คุณอยู่ในระดับสูงสุดแล้ว 🎉', vn: 'Bạn đã đạt hạng cao nhất 🎉', en: 'You are at the top tier 🎉' }, lang);
}

// ---- tracking stages ---------------------------------------
const TRACK_STAGES = [
  { key: 'received', icon: '📦', label: { th: 'รับสินค้าจากผู้ขาย', vn: 'Đã nhận hàng', en: 'Picked up' }, place: { th: 'กรุงเทพฯ', vn: 'Bangkok', en: 'Bangkok' } },
  { key: 'qc',       icon: '🔍', label: { th: 'ตรวจสอบ & แพ็ก', vn: 'Kiểm tra & đóng gói', en: 'QC & Packing' }, place: { th: 'คลังกรุงเทพฯ', vn: 'Kho Bangkok', en: 'BKK Warehouse' } },
  { key: 'th_customs', icon: '🛂', label: { th: 'ศุลกากรไทย', vn: 'Hải quan Thái', en: 'TH Customs' }, place: { th: 'หนองคาย', vn: 'Nong Khai', en: 'Nong Khai' } },
  { key: 'border',   icon: '🚚', label: { th: 'ขนส่งข้ามแดน', vn: 'Vận chuyển qua biên giới', en: 'Cross-border transit' }, place: { th: 'ลาว → เวียดนาม', vn: 'Lào → Việt Nam', en: 'Laos → Vietnam' } },
  { key: 'vn_customs', icon: '🛂', label: { th: 'ศุลกากรเวียดนาม', vn: 'Hải quan Việt Nam', en: 'VN Customs' }, place: { th: 'ฮานอย', vn: 'Hà Nội', en: 'Hanoi' } },
  { key: 'sorting',  icon: '🏬', label: { th: 'กระจายสินค้า', vn: 'Trung tâm phân phối', en: 'Sorting hub' }, place: { th: 'โฮจิมินห์', vn: 'TP.HCM', en: 'Ho Chi Minh' } },
  { key: 'delivered', icon: '🎉', label: { th: 'ส่งถึงผู้ซื้อ', vn: 'Đã giao đến người mua', en: 'Delivered' }, place: { th: 'ปลายทาง', vn: 'Điểm đến', en: 'Destination' } },
];

// ---- category -> placeholder hue (used for newly listed products) --
const CAT_HUE = { bags: 70, shoes: 25, camera: 250, fashion: 320, watch: 200, tech: 230, home: 220 };

const TXN_STATUS = {
  pending:   { th: 'รอชำระ', vn: 'Chờ thanh toán', en: 'Pending', tone: 'warn' },
  converted: { th: 'แปลงเป็นบาทแล้ว', vn: 'Đã đổi sang Baht', en: 'Converted', tone: 'info' },
  paid_out:  { th: 'โอนให้ผู้ขายแล้ว', vn: 'Đã trả người bán', en: 'Paid out', tone: 'good' },
};

const PRODUCT_STATUS = {
  review:    { th: 'รอตรวจสอบ', vn: 'Chờ duyệt', en: 'In review', tone: 'warn' },
  listed:    { th: 'กำลังขาย', vn: 'Đang bán', en: 'Listed', tone: 'info' },
  matched:   { th: 'จับคู่แล้ว', vn: 'Đã ghép', en: 'Matched', tone: 'good' },
  shipping:  { th: 'กำลังจัดส่ง', vn: 'Đang giao', en: 'Shipping', tone: 'info' },
  delivered: { th: 'ส่งสำเร็จ', vn: 'Đã giao', en: 'Delivered', tone: 'good' },
};

const CAT_LABEL = {
  bags: { th: 'กระเป๋า', vn: 'Túi xách', en: 'Bags' },
  shoes: { th: 'รองเท้า', vn: 'Giày', en: 'Shoes' },
  camera: { th: 'กล้อง', vn: 'Máy ảnh', en: 'Cameras' },
  fashion: { th: 'แฟชั่น', vn: 'Thời trang', en: 'Fashion' },
  watch: { th: 'นาฬิกา', vn: 'Đồng hồ', en: 'Watches' },
  tech: { th: 'เทคโนโลยี', vn: 'Công nghệ', en: 'Tech' },
  home: { th: 'ของแต่งบ้าน', vn: 'Đồ gia dụng', en: 'Home' },
};

Object.assign(window, {
  LangContext, t, LANGS,
  FX_VND_PER_THB, fmtTHB, fmtVND, thbToVnd, vndToThb,
  ph, fmtDate, pointsTier, nextTierMsg, TRACK_STAGES, CAT_HUE, TXN_STATUS,
  PRODUCT_STATUS, CAT_LABEL,
});
