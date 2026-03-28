import { useState, useRef, useEffect } from 'react'
import { type Lang, type SkinTypeKey, LANGUAGES, LANG_FULL_NAMES, detectLang, translations } from '../i18n'
import './ProfileInput.css'

type Theme = 'light' | 'dark'

function detectTheme(): Theme {
  try {
    const stored = localStorage.getItem('vtbio_theme') as Theme | null
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* ignore */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ProfileData {
  photo: File | null
  photoPreview: string | null
  height: string
  weight: string
  skinType: SkinTypeKey | ''
}

interface RoutineStep {
  step: string
  product: string
  reason: string
  tips: string
}

interface ConsultReport {
  summary: string
  morning: RoutineStep[]
  evening: RoutineStep[]
  ingredients: { recommended: string[]; avoid: string[] }
  lifestyle: string
}

const SKIN_TYPE_KEYS: SkinTypeKey[] = ['dry', 'oily', 'combination', 'sensitive', 'normal']

export default function ProfileInput() {
  const [lang, setLang] = useState<Lang>(detectLang)
  const [theme, setTheme] = useState<Theme>(detectTheme)
  const [profile, setProfile] = useState<ProfileData>({
    photo: null, photoPreview: null, height: '', weight: '', skinType: '',
  })
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ConsultReport | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const tr = translations[lang]

  useEffect(() => {
    try { localStorage.setItem('vtbio_lang', lang) } catch { /* ignore */ }
  }, [lang])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('vtbio_theme', theme) } catch { /* ignore */ }
  }, [theme])

  const toggleTheme = () => setTheme((t) => t === 'light' ? 'dark' : 'light')

  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [showCamera])

  const openCamera = async (facing: 'user' | 'environment' = facingMode) => {
    setCameraError(null)
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } })
      streamRef.current = stream
      setFacingMode(facing)
      setShowCamera(true)
    } catch {
      setCameraError(tr.cameraPermissionError)
      setShowCamera(true)
    }
  }

  const closeCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    setShowCamera(false)
    setCameraError(null)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })
      const reader = new FileReader()
      reader.onload = () => setProfile((prev) => ({ ...prev, photo: file, photoPreview: reader.result as string }))
      reader.readAsDataURL(file)
      closeCamera()
    }, 'image/jpeg', 0.92)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProfile((prev) => ({ ...prev, photo: file, photoPreview: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setProfile((prev) => ({ ...prev, photo: file, photoPreview: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const bmi = profile.height && profile.weight
    ? (Number(profile.weight) / Math.pow(Number(profile.height) / 100, 2)).toFixed(1)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.photo || !profile.height || !profile.weight || !profile.skinType) return
    setLoading(true)
    setApiError(null)
    try {
      const res = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          height: Number(profile.height),
          weight: Number(profile.weight),
          bmi,
          bmiLabel: getBmiLabel(Number(bmi), tr),
          skinType: profile.skinType,
          language: LANG_FULL_NAMES[lang],
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { error: string }
        throw new Error(err.error ?? tr.serverError)
      }
      const data: ConsultReport = await res.json()
      setReport(data)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : tr.unknownError)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setProfile({ photo: null, photoPreview: null, height: '', weight: '', skinType: '' })
    setReport(null)
    setApiError(null)
  }

  // ── 보고서 화면 ──────────────────────────────────────
  if (report) {
    const skinLabel = profile.skinType ? tr.skinTypes[profile.skinType].label : ''
    return (
      <div className="report-container">
        <div className="header-controls">
          <LangSelector lang={lang} onChange={setLang} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div className="report-header">
          <div className="report-avatar">
            <img src={profile.photoPreview!} alt="profile" />
          </div>
          <div className="report-badges">
            <span className="badge badge-skin">{tr.skinBadge(skinLabel)}</span>
            <span className="badge badge-bmi">BMI {bmi} · {getBmiLabel(Number(bmi), tr)}</span>
          </div>
          <h2>{tr.reportTitle}</h2>
        </div>

        <div className="report-summary"><p>{report.summary}</p></div>

        <div className="report-section">
          <h3 className="routine-title">
            <span className="routine-badge morning-badge">AM</span> {tr.morningRoutine}
          </h3>
          <div className="routine-steps">
            {report.morning.map((s, i) => <RoutineCard key={i} index={i + 1} step={s} />)}
          </div>
        </div>

        <div className="report-section">
          <h3 className="routine-title">
            <span className="routine-badge evening-badge">PM</span> {tr.eveningRoutine}
          </h3>
          <div className="routine-steps">
            {report.evening.map((s, i) => <RoutineCard key={i} index={i + 1} step={s} />)}
          </div>
        </div>

        <div className="report-section">
          <h3 className="section-heading">{tr.ingredientsTitle}</h3>
          <div className="ingredients-grid">
            <div className="ingredients-col ingredients-good">
              <div className="ingredients-col-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {tr.recommended}
              </div>
              <ul>{report.ingredients.recommended.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
            <div className="ingredients-col ingredients-bad">
              <div className="ingredients-col-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {tr.avoid}
              </div>
              <ul>{report.ingredients.avoid.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
          </div>
        </div>

        <div className="report-section">
          <h3 className="section-heading">{tr.lifestyleTitle}</h3>
          <div className="lifestyle-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            <p>{report.lifestyle}</p>
          </div>
        </div>

        <button className="btn-primary btn-reset" onClick={handleReset}>{tr.resetBtn}</button>
      </div>
    )
  }

  // ── 로딩 화면 ────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">{tr.loadingText}</p>
        <p className="loading-sub">{tr.loadingSubText}</p>
      </div>
    )
  }

  // ── 입력 폼 ──────────────────────────────────────────
  return (
    <>
      <div className="profile-container">
        <div className="header-controls">
          <LangSelector lang={lang} onChange={setLang} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        <div className="profile-header">
          <div className="logo-badge">✨ VTBIO</div>
          <h1>{tr.headerTitle}</h1>
          <p>{tr.headerSubtitle}</p>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          {/* 사진 업로드 */}
          <div className="form-section">
            <label className="section-label">{tr.facePhoto}</label>
            <div
              className={`photo-upload ${profile.photoPreview ? 'has-photo' : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {profile.photoPreview ? (
                <>
                  <img src={profile.photoPreview} alt="preview" className="photo-preview" />
                  <div className="photo-overlay">
                    <button type="button" className="overlay-btn" onClick={() => fileInputRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      {tr.gallery}
                    </button>
                    <button type="button" className="overlay-btn" onClick={() => openCamera()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      {tr.camera}
                    </button>
                  </div>
                </>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <p className="upload-text">{tr.uploadText}</p>
                  <div className="upload-actions">
                    <button type="button" className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      {tr.gallery}
                    </button>
                    <button type="button" className="upload-btn upload-btn-camera" onClick={() => openCamera()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      {tr.camera}
                    </button>
                  </div>
                  <p className="upload-hint">{tr.dragHint}</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
          </div>

          {/* 체형 정보 */}
          <div className="form-section">
            <label className="section-label">{tr.bodyInfo}</label>
            <div className="input-row">
              <div className="input-group">
                <label htmlFor="height">{tr.height}</label>
                <div className="input-wrapper">
                  <input
                    id="height" type="number" min="100" max="250" step="0.01" placeholder="165"
                    value={profile.height}
                    onChange={(e) => setProfile((prev) => ({ ...prev, height: truncate2(e.target.value) }))}
                    required
                  />
                  <span className="input-unit">cm</span>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="weight">{tr.weight}</label>
                <div className="input-wrapper">
                  <input
                    id="weight" type="number" min="20" max="300" step="0.01" placeholder="55"
                    value={profile.weight}
                    onChange={(e) => setProfile((prev) => ({ ...prev, weight: truncate2(e.target.value) }))}
                    required
                  />
                  <span className="input-unit">kg</span>
                </div>
              </div>
            </div>

            <div className="bmi-bar-section">
              <div className="bmi-bar-header">
                <span className="bmi-bar-title">BMI</span>
                {bmi && (
                  <span className="bmi-bar-value">
                    {bmi} <em>{getBmiLabel(Number(bmi), tr)}</em>
                  </span>
                )}
              </div>
              <div className="bmi-track-wrap">
                <div className="bmi-track">
                  {bmi && (
                    <div className="bmi-marker" style={{ left: `${getBmiPosition(Number(bmi))}%` }}>
                      <div className="bmi-marker-bubble">{bmi}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bmi-range-labels">
                <span>{tr.bmi.underweight}</span>
                <span>{tr.bmi.normal}</span>
                <span>{tr.bmi.overweight}</span>
                <span>{tr.bmi.obese}</span>
              </div>
            </div>
          </div>

          {/* 피부 타입 */}
          <div className="form-section">
            <label className="section-label">{tr.skinTypeLabel}</label>
            <div className="skin-type-grid">
              {SKIN_TYPE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`skin-type-btn ${profile.skinType === key ? 'selected' : ''}`}
                  onClick={() => setProfile((prev) => ({ ...prev, skinType: key }))}
                >
                  <span className="skin-type-label">{tr.skinTypes[key].label}</span>
                  <span className="skin-type-desc">{tr.skinTypes[key].desc}</span>
                </button>
              ))}
            </div>
          </div>

          {apiError && <p className="form-error">{apiError}</p>}

          <button
            type="submit"
            className="btn-primary btn-submit"
            disabled={!profile.photo || !profile.height || !profile.weight || !profile.skinType}
          >
            {tr.startBtn}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </form>
      </div>

      {/* 카메라 모달 */}
      {showCamera && (
        <div className="camera-modal" onClick={(e) => e.target === e.currentTarget && closeCamera()}>
          <div className="camera-modal-inner">
            <div className="camera-topbar">
              <span className="camera-title">{tr.cameraTitle}</span>
              <button type="button" className="camera-close" onClick={closeCamera}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {cameraError ? (
              <div className="camera-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p>{cameraError}</p>
              </div>
            ) : (
              <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
            )}
            <div className="camera-bottombar">
              <button type="button" className="camera-switch" onClick={() => openCamera(facingMode === 'user' ? 'environment' : 'user')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
              <button type="button" className="camera-capture" onClick={capturePhoto} disabled={!!cameraError}>
                <span className="camera-capture-inner" />
              </button>
              <div style={{ width: 48 }} />
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}
    </>
  )
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button type="button" className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
      {theme === 'light' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25 9.75 9.75 0 0 0 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      )}
    </button>
  )
}

function LangSelector({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="lang-selector">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-btn ${lang === l.code ? 'active' : ''}`}
          onClick={() => onChange(l.code)}
        >
          <span className="lang-flag">{l.flag}</span>
          <span className="lang-label">{l.label}</span>
        </button>
      ))}
    </div>
  )
}

function RoutineCard({ index, step }: { index: number; step: RoutineStep }) {
  return (
    <div className="routine-card">
      <div className="routine-card-num">{index}</div>
      <div className="routine-card-body">
        <div className="routine-card-header">
          <span className="routine-step-name">{step.step}</span>
          <span className="routine-product">{step.product}</span>
        </div>
        <p className="routine-reason">{step.reason}</p>
        <p className="routine-tips">💡 {step.tips}</p>
      </div>
    </div>
  )
}

function getBmiLabel(bmi: number, tr: { bmi: { underweight: string; normal: string; overweight: string; obese: string } }): string {
  if (bmi < 18.5) return tr.bmi.underweight
  if (bmi < 23) return tr.bmi.normal
  if (bmi < 25) return tr.bmi.overweight
  return tr.bmi.obese
}

function getBmiPosition(bmi: number): number {
  return Math.min(Math.max((bmi - 10) / 30 * 100, 2), 98)
}

function truncate2(value: string): string {
  if (value === '' || value === '-') return value
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return String(Math.floor(num * 100) / 100)
}
