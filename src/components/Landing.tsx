import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './Landing.css'

interface LandingProps {
  session: Session | null
  onStart: () => void
  onSignOut: () => void
}

type AuthMode = 'login' | 'signup'

export default function Landing({ session, onStart, onSignOut }: LandingProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (authMode === 'signup') {
      if (password.length < 8) {
        setError('비밀번호는 8자리 이상이어야 합니다.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('가입 확인 이메일을 발송했습니다. 이메일을 확인해 주세요.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <span className="material-symbols-outlined landing-brand-icon">auto_fix_high</span>
            <span className="landing-brand-name">Atelier Beauty</span>
          </div>
          {session && (
            <div className="landing-header-auth">
              <div className="landing-user-chip">
                <span className="material-symbols-outlined">person</span>
                <span className="landing-user-email">{session.user.email}</span>
              </div>
              <button className="landing-btn-ghost" onClick={onSignOut}>
                <span className="material-symbols-outlined">logout</span>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="landing-main">
        {/* Hero + Auth */}
        <section className="landing-hero">
          {/* Left: Service Intro */}
          <div className="landing-hero-text">
            <span className="landing-overline">AI-Powered Precision</span>
            <h1 className="landing-hero-title">
              나만의 완벽한<br />
              <em>뷰티 분석</em>을<br />
              경험하세요
            </h1>
            <p className="landing-hero-desc">
              AI 기반 피부 분석으로 맞춤형 스킨케어 루틴과
              제품을 추천받고, 결과 리포트를 이메일로 받아보세요.
            </p>

            {/* Feature Highlights */}
            <div className="landing-feature-list">
              <div className="landing-feature-item">
                <span className="material-symbols-outlined">add_a_photo</span>
                <span>사진 업로드 후 AI 정밀 피부 분석</span>
              </div>
              <div className="landing-feature-item">
                <span className="material-symbols-outlined">auto_awesome</span>
                <span>맞춤 스킨케어 루틴 · 제품 추천</span>
              </div>
              <div className="landing-feature-item">
                <span className="material-symbols-outlined">mail</span>
                <span>분석 결과 리포트 이메일 전송</span>
              </div>
              <div className="landing-feature-item">
                <span className="material-symbols-outlined">spa</span>
                <span>추천/회피 성분 가이드 제공</span>
              </div>
            </div>

            {session && (
              <button className="landing-cta-primary" onClick={onStart} style={{ marginTop: 32 }}>
                분석 시작하기
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            )}
          </div>

          {/* Right: Auth Form or Logged In Card */}
          <div className="landing-auth-panel">
            {session ? (
              <div className="landing-logged-card">
                <div className="landing-logged-avatar">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <p className="landing-logged-greeting">환영합니다!</p>
                <p className="landing-logged-email">{session.user.email}</p>
                <button className="landing-cta-primary" onClick={onStart} style={{ width: '100%', justifyContent: 'center' }}>
                  피부 분석 시작하기
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button className="landing-cta-secondary" onClick={onSignOut} style={{ width: '100%', marginTop: 8 }}>
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="landing-auth-card">
                <div className="landing-auth-tabs">
                  <button
                    className={`landing-auth-tab ${authMode === 'login' ? 'active' : ''}`}
                    onClick={() => { setAuthMode('login'); setError(null); setMessage(null) }}
                  >
                    로그인
                  </button>
                  <button
                    className={`landing-auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                    onClick={() => { setAuthMode('signup'); setError(null); setMessage(null) }}
                  >
                    회원가입
                  </button>
                </div>

                <p className="landing-auth-subtitle">
                  {authMode === 'login'
                    ? '로그인하고 AI 피부 분석을 시작하세요.'
                    : '가입 후 맞춤 뷰티 케어를 받아보세요.'}
                </p>

                <form onSubmit={handleAuth} className="landing-auth-form">
                  <div className="landing-auth-field">
                    <label>이메일</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="landing-auth-field">
                    <label>비밀번호</label>
                    <div className="landing-auth-pw-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={authMode === 'signup' ? '8자리 이상 입력' : '비밀번호 입력'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      />
                      <button type="button" className="landing-pw-toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                        <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  {error && <p className="landing-auth-error">{error}</p>}
                  {message && <p className="landing-auth-message">{message}</p>}

                  <button type="submit" className="landing-auth-submit" disabled={loading}>
                    {loading ? <span className="landing-auth-spinner" /> : (authMode === 'login' ? '로그인' : '가입하기')}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

        {/* 3-Step Process */}
        <section className="landing-steps-section">
          <div className="landing-steps-header">
            <h2 className="landing-steps-title">분석 과정</h2>
            <div className="landing-steps-divider" />
          </div>
          <div className="landing-steps-grid">
            <div className="landing-step">
              <div className="landing-step-icon">
                <span className="material-symbols-outlined">add_a_photo</span>
              </div>
              <h3 className="landing-step-name">1. 사진 업로드</h3>
              <p className="landing-step-desc">자연광에서 찍은 선명한 사진을 업로드하세요. 데이터는 안전하게 보호됩니다.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-icon">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <h3 className="landing-step-name">2. AI 분석</h3>
              <p className="landing-step-desc">고급 AI가 피부 타입, 톤, 텍스처를 정밀 분석합니다.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-icon">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <h3 className="landing-step-name">3. 맞춤 리포트</h3>
              <p className="landing-step-desc">개인화된 스킨케어 루틴과 제품 추천 리포트를 받아보세요.</p>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="landing-features">
          <div className="landing-feature-card landing-feature-card-dark">
            <span className="material-symbols-outlined landing-feature-icon">mail</span>
            <h3 className="landing-feature-title">이메일 리포트 전송</h3>
            <p className="landing-feature-desc">분석 완료 후 상세한 스킨케어 리포트를 이메일로 받아 언제든지 다시 확인하세요.</p>
          </div>
          <div className="landing-feature-card landing-feature-card-light">
            <span className="material-symbols-outlined landing-feature-icon">spa</span>
            <h3 className="landing-feature-title">전문가 성분 가이드</h3>
            <p className="landing-feature-desc">피부 타입에 맞는 추천 성분과 피해야 할 성분을 명확하게 알려드립니다.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="material-symbols-outlined">auto_fix_high</span>
        <span>Atelier Beauty · Privacy Grade A</span>
      </footer>
    </div>
  )
}
