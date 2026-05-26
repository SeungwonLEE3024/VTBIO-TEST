import type { Session } from '@supabase/supabase-js'
import './Landing.css'

interface LandingProps {
  session: Session | null
  onStart: () => void
  onLogin: () => void
  onSignOut: () => void
}

export default function Landing({ session, onStart, onLogin, onSignOut }: LandingProps) {
  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <span className="material-symbols-outlined landing-brand-icon">auto_fix_high</span>
            <span className="landing-brand-name">Atelier Beauty</span>
          </div>
          <div className="landing-header-auth">
            {session ? (
              <>
                <div className="landing-user-chip">
                  <span className="material-symbols-outlined">person</span>
                  <span className="landing-user-email">{session.user.email}</span>
                </div>
                <button className="landing-btn-ghost" onClick={onSignOut}>
                  <span className="material-symbols-outlined">logout</span>
                  로그아웃
                </button>
              </>
            ) : (
              <button className="landing-btn-ghost" onClick={onLogin}>
                <span className="material-symbols-outlined">login</span>
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="landing-main">
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-hero-text">
            <span className="landing-overline">AI-Powered Precision</span>
            <h1 className="landing-hero-title">
              나만의 완벽한<br />
              <em>뷰티 분석</em>을<br />
              경험하세요
            </h1>
            <p className="landing-hero-desc">
              AI 기반 얼굴 인식과 전문 심미 원칙으로 구동되는
              맞춤형 뷰티 컨설팅. 당신의 고유한 특성에 맞게
              최적화된 스킨케어 루틴을 제안합니다.
            </p>

            {session ? (
              <div className="landing-hero-actions">
                <div className="landing-logged-in-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                  로그인됨 · {session.user.email}
                </div>
                <button className="landing-cta-primary" onClick={onStart}>
                  분석 시작하기
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            ) : (
              <div className="landing-hero-actions">
                <button className="landing-cta-primary" onClick={onStart}>
                  분석 시작하기
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button className="landing-cta-secondary" onClick={onLogin}>
                  로그인 / 회원가입
                </button>
              </div>
            )}
          </div>

          <div className="landing-hero-visual">
            <div className="landing-hero-img-wrap">
              <div className="landing-hero-img-placeholder">
                <span className="material-symbols-outlined">face_6</span>
              </div>
            </div>
            <div className="landing-float-card">
              <div className="landing-float-card-row">
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 18 }}>verified</span>
                <span className="landing-float-card-label">AI 피부 분석</span>
              </div>
              <p className="landing-float-card-desc">"정확한 피부 진단으로 딱 맞는 제품을 추천받았어요."</p>
            </div>
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
            <span className="material-symbols-outlined landing-feature-icon">spa</span>
            <h3 className="landing-feature-title">전문가 성분 가이드</h3>
            <p className="landing-feature-desc">피부 타입에 맞는 추천 성분과 피해야 할 성분을 명확하게 알려드립니다.</p>
          </div>
          <div className="landing-feature-card landing-feature-card-light">
            <span className="material-symbols-outlined landing-feature-icon">morning_routine</span>
            <h3 className="landing-feature-title">아침 · 저녁 루틴</h3>
            <p className="landing-feature-desc">시간대별로 최적화된 스킨케어 루틴으로 피부 건강을 유지하세요.</p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="landing-bottom-cta">
          <span className="landing-overline">지금 바로 시작하세요</span>
          <h2 className="landing-bottom-cta-title">나만의 뷰티 블루프린트</h2>
          <p className="landing-bottom-cta-desc">무료로 맞춤 피부 분석을 받아보세요.</p>
          <button className="landing-cta-primary" onClick={onStart}>
            무료 분석 시작
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="material-symbols-outlined">auto_fix_high</span>
        <span>Atelier Beauty · Privacy Grade A</span>
      </footer>
    </div>
  )
}
