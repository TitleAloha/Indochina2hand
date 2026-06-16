// ============================================================
// Auth screen — sign in / sign up via Supabase Auth
// ============================================================
const { useState: useStateAuth } = React;

function AuthView({ lang, onLangChange }) {
  const [mode, setMode] = useStateAuth('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useStateAuth('');
  const [password, setPassword] = useStateAuth('');
  const [displayName, setDisplayName] = useStateAuth('');
  const [role, setRole] = useStateAuth('buyer'); // 'seller' | 'buyer'
  const [error, setError] = useStateAuth('');
  const [info, setInfo] = useStateAuth('');
  const [busy, setBusy] = useStateAuth(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const country = role === 'seller' ? 'TH' : 'VN';
        const { error, data } = await sb.auth.signUp({
          email, password,
          options: { data: { role, display_name: displayName || email.split('@')[0], country } },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo(t({
            th: 'ลงทะเบียนสำเร็จ! กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
            vn: 'Đăng ký thành công! Vui lòng xác nhận email trước khi đăng nhập',
            en: 'Registered! Please check your email to confirm before signing in.',
          }, lang));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">🌏 <b>ReViet</b></div>
        <p className="muted">{t({
          th: 'ตลาดของมือสองข้ามแดน ไทย ↔ เวียดนาม',
          vn: 'Chợ đồ cũ xuyên biên giới Thái ↔ Việt',
          en: 'Cross-border second-hand marketplace TH ↔ VN',
        }, lang)}</p>

        <div className="auth-tabs">
          <button type="button" className={'auth-tab' + (mode === 'signin' ? ' active' : '')} onClick={() => setMode('signin')}>
            {t({ th: 'เข้าสู่ระบบ', vn: 'Đăng nhập', en: 'Sign in' }, lang)}
          </button>
          <button type="button" className={'auth-tab' + (mode === 'signup' ? ' active' : '')} onClick={() => setMode('signup')}>
            {t({ th: 'สร้างบัญชี', vn: 'Đăng ký', en: 'Sign up' }, lang)}
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              <span>{t({ th: 'ชื่อที่แสดง', vn: 'Tên hiển thị', en: 'Display name' }, lang)}</span>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t({ th: 'เช่น ใบเฟิร์น', vn: 'VD: Linh', en: 'e.g. Alex' }, lang)} />
            </label>
          )}
          <label>
            <span>Email</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>
            <span>{t({ th: 'รหัสผ่าน', vn: 'Mật khẩu', en: 'Password' }, lang)}</span>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
          </label>

          {mode === 'signup' && (
            <div className="auth-role">
              <span>{t({ th: 'คุณคือ', vn: 'Bạn là', en: 'I am a' }, lang)}</span>
              <div className="auth-role-options">
                <button type="button" className={'auth-tab' + (role === 'seller' ? ' active' : '')} onClick={() => setRole('seller')}>
                  🇹🇭 {t({ th: 'ผู้ขาย (ไทย)', vn: 'Người bán (Thái)', en: 'Seller (TH)' }, lang)}
                </button>
                <button type="button" className={'auth-tab' + (role === 'buyer' ? ' active' : '')} onClick={() => setRole('buyer')}>
                  🇻🇳 {t({ th: 'ผู้ซื้อ (เวียดนาม)', vn: 'Người mua (Việt)', en: 'Buyer (VN)' }, lang)}
                </button>
              </div>
            </div>
          )}

          {error && <div className="auth-error">⚠ {error}</div>}
          {info && <div className="auth-info">ℹ {info}</div>}

          <button type="submit" className="btn btn-primary btn-md btn-full" disabled={busy}>
            {busy
              ? '…'
              : mode === 'signin'
                ? t({ th: 'เข้าสู่ระบบ', vn: 'Đăng nhập', en: 'Sign in' }, lang)
                : t({ th: 'สร้างบัญชี', vn: 'Tạo tài khoản', en: 'Create account' }, lang)}
          </button>
        </form>

        <div className="auth-langs">
          {LANGS.map(l => (
            <button key={l.id} type="button" className={'lang-pill' + (lang === l.id ? ' active' : '')} onClick={() => onLangChange(l.id)}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthView });
