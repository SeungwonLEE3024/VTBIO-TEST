import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import './Landing.css'

// Supabase를 이벤트 핸들러에서만 지연 로드 → 초기 번들에서 제외
const getSupabase = () => import('../lib/supabase').then(m => m.supabase)

const WMO_GREETINGS: Record<number, string> = {
  0: '오늘은 하늘이 맑아요!',
  1: '대체로 맑은 하늘이에요!',
  2: '구름이 조금 끼었어요.',
  3: '흐린 날씨네요.',
  45: '안개가 자욱해요.',
  48: '안개가 자욱해요.',
  51: '가랑비가 내리고 있어요.',
  53: '가랑비가 내리고 있어요.',
  55: '가랑비가 내리고 있어요.',
  61: '비가 내리고 있어요.',
  63: '비가 제법 내리고 있어요.',
  65: '비가 많이 내리고 있어요.',
  71: '눈이 내리고 있어요!',
  73: '눈이 제법 내리고 있어요!',
  75: '눈이 많이 내리고 있어요!',
  80: '소나기가 내리고 있어요.',
  81: '소나기가 내리고 있어요.',
  82: '강한 소나기가 내리고 있어요.',
  95: '천둥번개가 치고 있어요!',
  96: '우박을 동반한 폭풍이에요!',
  99: '우박을 동반한 폭풍이에요!',
}

async function fetchWeatherGreeting(): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // 위치 API 없으면 IP 기반으로 대략적 위치 사용 (서울 기본값)
      fetchWeatherByCoords(37.5665, 126.9780).then(resolve)
      return
    }
    const timer = setTimeout(() => resolve('환영합니다!'), 8000)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        clearTimeout(timer)
        const result = await fetchWeatherByCoords(coords.latitude, coords.longitude)
        resolve(result)
      },
      async () => {
        clearTimeout(timer)
        // 위치 거부 시 IP 기반 위치 시도
        try {
          const ipRes = await fetch('https://ipapi.co/json/')
          const ipData = await ipRes.json() as { latitude?: number; longitude?: number }
          if (ipData.latitude && ipData.longitude) {
            const result = await fetchWeatherByCoords(ipData.latitude, ipData.longitude)
            resolve(result)
          } else {
            resolve('환영합니다!')
          }
        } catch {
          resolve('환영합니다!')
        }
      },
      { timeout: 6000 }
    )
  })
}

async function fetchWeatherByCoords(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m&timezone=auto`
    )
    const data = await res.json() as { current?: { weather_code?: number; temperature_2m?: number } }
    const code = data.current?.weather_code ?? 0
    const temp = data.current?.temperature_2m
    const weather = WMO_GREETINGS[code] ?? '오늘도 좋은 하루예요!'
    const tempStr = temp != null ? ` (${Math.round(temp)}°C)` : ''
    return `${weather}${tempStr}`
  } catch {
    return '환영합니다!'
  }
}

interface LandingProps {
  session: Session | null
  onStart: () => void
  onMyPage: () => void
  onSignOut: () => void
}

type AuthMode = 'login' | 'signup'

export default function Landing({ session, onStart, onMyPage, onSignOut }: LandingProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [weatherGreeting, setWeatherGreeting] = useState('환영합니다!')

  useEffect(() => {
    if (!session) return
    fetchWeatherGreeting().then(setWeatherGreeting)
  }, [session?.user.id])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const supabase = await getSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

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
      const supabase = await getSupabase()
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('가입 확인 이메일을 발송했습니다. 이메일을 확인해 주세요.')
    } else {
      const supabase = await getSupabase()
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
              <button className="landing-btn-ghost" onClick={onMyPage}>
                <span className="material-symbols-outlined">manage_accounts</span>
                마이페이지
              </button>
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
                <p className="landing-logged-greeting" style={{ whiteSpace: 'pre-line' }}>{weatherGreeting}</p>
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

                <div className="landing-auth-divider">
                  <span>또는</span>
                </div>

                <button className="landing-google-btn" onClick={handleGoogleLogin} disabled={loading}>
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Google로 계속하기
                </button>
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
