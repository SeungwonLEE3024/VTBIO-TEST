import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Auth.css'

type AuthMode = 'login' | 'signup'

export default function Auth({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signup') {
      if (password.length < 8) {
        setError('비밀번호는 8자리 이상이어야 합니다.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('가입 확인 이메일을 발송했습니다. 이메일을 확인해 주세요.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          {onBack && (
            <button type="button" className="auth-back-btn" onClick={onBack}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <span className="material-symbols-outlined auth-brand-icon">auto_fix_high</span>
          <span className="auth-brand-name">Atelier Beauty</span>
        </div>

        <h2 className="auth-title">
          {mode === 'login' ? '로그인' : '회원가입'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? '계정에 로그인하여 피부 분석을 시작하세요.'
            : '계정을 만들고 맞춤 뷰티 케어를 받아보세요.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="auth-email">이메일</label>
            <input
              id="auth-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">비밀번호</label>
            <div className="auth-password-wrap">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'signup' ? '8자리 이상 비밀번호를 입력하세요' : '비밀번호 입력'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              mode === 'login' ? '로그인' : '가입하기'
            )}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>계정이 없으신가요? <button type="button" onClick={() => { setMode('signup'); setError(null); setMessage(null) }}>회원가입</button></>
          ) : (
            <>이미 계정이 있으신가요? <button type="button" onClick={() => { setMode('login'); setError(null); setMessage(null) }}>로그인</button></>
          )}
        </p>
      </div>
    </div>
  )
}
