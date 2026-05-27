import { useState, useRef, useEffect } from 'react'
import { type Lang, type SkinTypeKey, type Translations, LANGUAGES, LANG_FULL_NAMES, detectLang, translations } from '../i18n'
import { supabase } from '../lib/supabase'
import './ProfileInput.css'

type Theme = 'light' | 'dark'
type AppStep = 'basic_info' | 'skin_assessment' | 'loading' | 'report'

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
  concerns: string[]
  sensitivity: number
}

interface RoutineStep {
  step: string
  product: string
  reason: string
  tips: string
}

interface ProductRecommendation {
  stepLabel: string
  name: string
  type: string
  price: string
  reason: string
  ingredients: string[]
}

interface ConsultReport {
  summary: string
  morning: RoutineStep[]
  evening: RoutineStep[]
  ingredients: { recommended: string[]; avoid: string[] }
  lifestyle: string
  products?: ProductRecommendation[]
}

const SKIN_TYPE_KEYS: SkinTypeKey[] = ['oily', 'dry', 'combination', 'sensitive', 'normal']

import type { Session } from '@supabase/supabase-js'

export default function ProfileInput({ session, onSignOut, onNeedAuth, onGoHome }: { session: Session | null; onSignOut: () => void; onNeedAuth: () => void; onGoHome?: () => void }) {
  const [lang, setLang] = useState<Lang>(detectLang)
  const [theme, setTheme] = useState<Theme>(detectTheme)
  const [appStep, setAppStep] = useState<AppStep>('basic_info')
  const [profile, setProfile] = useState<ProfileData>({
    photo: null, photoPreview: null, height: '', weight: '', skinType: '',
    concerns: [], sensitivity: 30,
  })
  const [report, setReport] = useState<ConsultReport | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [profileLoading, setProfileLoading] = useState(!!session)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Load saved profile from DB on login
  useEffect(() => {
    if (!session) { setProfileLoading(false); return }
    setProfileLoading(true)
    const load = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('height, weight, photo_url, skin_type, concerns, sensitivity')
          .eq('id', session.user.id)
          .single()
        if (data) {
          setProfile(prev => ({
            ...prev,
            height: data.height ? String(data.height) : prev.height,
            weight: data.weight ? String(data.weight) : prev.weight,
            photoPreview: data.photo_url ? `${data.photo_url}?t=${Date.now()}` : prev.photoPreview,
            skinType: (data.skin_type as SkinTypeKey) ?? prev.skinType,
            concerns: (data.concerns as string[]) ?? prev.concerns,
            sensitivity: data.sensitivity ?? prev.sensitivity,
          }))
        }
      } finally {
        setProfileLoading(false)
      }
    }
    load()
  }, [session])
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

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [showCamera])

  const openCamera = async (facing: 'user' | 'environment' = facingMode) => {
    setCameraError(null)
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
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
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setShowCamera(false)
    setCameraError(null)
  }

  // 이미지를 최대 800px로 리사이즈 후 WebP 압축 (품질 0.85)
  const optimizeImage = (source: HTMLImageElement | HTMLVideoElement, w: number, h: number): Promise<File> => {
    return new Promise(resolve => {
      const MAX = 800
      let dw = w, dh = h
      if (dw > MAX || dh > MAX) {
        if (dw > dh) { dh = Math.round(dh * MAX / dw); dw = MAX }
        else { dw = Math.round(dw * MAX / dh); dh = MAX }
      }
      const offscreen = document.createElement('canvas')
      offscreen.width = dw
      offscreen.height = dh
      offscreen.getContext('2d')?.drawImage(source, 0, 0, dw, dh)
      const useWebP = offscreen.toDataURL('image/webp').startsWith('data:image/webp')
      const mime = useWebP ? 'image/webp' : 'image/jpeg'
      const ext = useWebP ? 'webp' : 'jpg'
      offscreen.toBlob(blob => {
        if (!blob) return
        resolve(new File([blob], `photo.${ext}`, { type: mime }))
      }, mime, 0.85)
    })
  }

  const applyPhoto = async (source: HTMLImageElement | HTMLVideoElement, w: number, h: number) => {
    const file = await optimizeImage(source, w, h)
    const reader = new FileReader()
    reader.onload = () => setProfile(prev => ({ ...prev, photo: file, photoPreview: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    applyPhoto(video, video.videoWidth, video.videoHeight)
    closeCamera()
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      applyPhoto(img, img.naturalWidth, img.naturalHeight)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      applyPhoto(img, img.naturalWidth, img.naturalHeight)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const bmi = profile.height && profile.weight
    ? (Number(profile.weight) / Math.pow(Number(profile.height) / 100, 2)).toFixed(1)
    : null

  const toggleConcern = (concern: string) => {
    setProfile(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern],
    }))
  }

  const saveProfileToDB = async () => {
    if (!session) return
    let photoUrl = profile.photoPreview

    if (profile.photo) {
      try {
        const formData = new FormData()
        formData.append('file', profile.photo)
        const { data: { session: current } } = await supabase.auth.getSession()
        const res = await fetch('/api/upload-photo', {
          method: 'POST',
          headers: { Authorization: `Bearer ${current?.access_token ?? ''}` },
          body: formData,
        })
        if (res.ok) {
          const result = await res.json() as { url?: string }
          if (result.url) photoUrl = result.url
        }
      } catch { /* 업로드 실패 시 기존 URL 유지 */ }
    }

    await supabase.from('profiles').upsert({
      id: session.user.id,
      height: Number(profile.height),
      weight: Number(profile.weight),
      photo_url: photoUrl,
      skin_type: profile.skinType || null,
      concerns: profile.concerns.length > 0 ? profile.concerns : null,
      sensitivity: profile.sensitivity,
      updated_at: new Date().toISOString(),
    })
  }

  const handleStep1Continue = () => {
    if ((!profile.photo && !profile.photoPreview) || !profile.height || !profile.weight) return
    if (!session) { onNeedAuth(); return }
    saveProfileToDB()
    setAppStep('skin_assessment')
    window.scrollTo({ top: 0 })
  }

  const handleSubmit = async () => {
    if (!profile.skinType) return
    setAppStep('loading')
    setApiError(null)
    window.scrollTo({ top: 0 })
    saveProfileToDB()

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
          concerns: profile.concerns,
          sensitivity: profile.sensitivity,
          language: LANG_FULL_NAMES[lang],
        }),
      })
      if (!res.ok) {
        // More robust error handling
        const contentType = res.headers.get('content-type')
        let errorText = tr.serverError
        if (contentType && contentType.includes('application/json')) {
          const errJson = await res.json() as { error?: string, detail?: string }
          errorText = errJson.error || errJson.detail || errorText
        } else {
          errorText = (await res.text()) || errorText
        }
        throw new Error(errorText)
      }
      const data: ConsultReport = await res.json()
      setReport(data)
      setAppStep('report')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : tr.unknownError)
      setAppStep('skin_assessment')
    }
  }

  const handleReset = () => {
    setProfile({ photo: null, photoPreview: null, height: '', weight: '', skinType: '', concerns: [], sensitivity: 30 })
    setReport(null)
    setApiError(null)
    setAppStep('basic_info')
    window.scrollTo({ top: 0 })
  }

  // ── Loading ──────────────────────────────────────────
  if (appStep === 'loading') {
    return <LoadingScreen tr={tr} />
  }

  // ── Report ───────────────────────────────────────────
  if (appStep === 'report' && report) {
    return (
      <div className="atelier-wide">
        <header className="top-bar">
          <button className="top-bar-back" onClick={handleReset}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="top-bar-brand">
            <span className="material-symbols-outlined">auto_fix_high</span>
            Atelier Beauty
          </div>
          <div className="top-bar-right">
            <LangSelector lang={lang} onChange={setLang} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {session && (
              <button type="button" className="sign-out-btn" onClick={onSignOut} title="로그아웃">
                <span className="material-symbols-outlined">logout</span>
              </button>
            )}
          </div>
        </header>

        <ReportPage
          report={report}
          profile={profile}
          bmi={bmi}
          tr={tr}
          onReset={handleReset}
          userEmail={session?.user.email ?? ''}
          onGoHome={onGoHome}
        />
      </div>
    )
  }

  // ── Step 1: Basic Info ───────────────────────────────
  if (appStep === 'basic_info' && profileLoading) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="loading-step-spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>저장된 프로필 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (appStep === 'basic_info') {
    return (
      <>
        <div className="atelier-container">
          <div className="header-controls">
            <LangSelector lang={lang} onChange={setLang} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {session && (
              <button type="button" className="sign-out-btn" onClick={onSignOut} title="로그아웃">
                <span className="material-symbols-outlined">logout</span>
              </button>
            )}
          </div>

          <div className="progress-header">
            <span className="progress-overline">Assessment Journey</span>
            <h1 className="progress-title">Personal Blueprint</h1>
            <div className="progress-bar-track">
              <div className="progress-bar-seg active" />
              <div className="progress-bar-seg" />
            </div>
            <p className="progress-desc">Step 1 of 2: Upload your photo and enter your body measurements.</p>
          </div>

          <div className="atelier-form">
            {/* Photo Upload */}
            <div className="form-section">
              <span className="section-overline">Category 01</span>
              <h3 className="section-label">{tr.facePhoto}</h3>

              <div
                className={`photo-upload ${profile.photoPreview ? 'has-photo' : ''}`}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
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
                      <span className="material-symbols-outlined">person</span>
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

            {/* Body Info */}
            <div className="form-section">
              <span className="section-overline">Category 02</span>
              <h3 className="section-label">{tr.bodyInfo}</h3>
              <div className="input-row">
                <div className="input-group">
                  <label htmlFor="height">{tr.height}</label>
                  <div className="input-wrapper">
                    <input
                      id="height" type="number" min="100" max="250" step="0.01" placeholder="165"
                      value={profile.height}
                      onChange={e => setProfile(prev => ({ ...prev, height: truncate2(e.target.value) }))}
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
                      onChange={e => setProfile(prev => ({ ...prev, weight: truncate2(e.target.value) }))}
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

            <button
              type="button"
              className="btn-primary"
              onClick={handleStep1Continue}
              disabled={(!profile.photo && !profile.photoPreview) || !profile.height || !profile.weight}
            >
              {tr.continueBtn}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <p className="btn-footer-note">Atelier Beauty · Privacy Grade A</p>
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="camera-modal" onClick={e => e.target === e.currentTarget && closeCamera()}>
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

  // ── Step 2: Skin Assessment ──────────────────────────
  return (
    <>
      <div className="atelier-container">
        <div className="header-controls">
          <LangSelector lang={lang} onChange={setLang} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button type="button" className="sign-out-btn" onClick={onSignOut} title="로그아웃">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>

        <div className="progress-header">
          <span className="progress-overline">Assessment Journey</span>
          <h1 className="progress-title">Detailed Skin Profile</h1>
          <div className="progress-bar-track">
            <div className="progress-bar-seg done" />
            <div className="progress-bar-seg active" />
          </div>
          <p className="progress-desc">Step 2 of 2: Let's delve deeper into your skin's unique characteristics.</p>
        </div>

        <div className="atelier-form">
          {/* Skin Type */}
          <div className="form-section">
            <span className="section-overline">Category 01</span>
            <h3 className="section-label">{tr.skinTypeLabel}</h3>
            <div className="skin-type-grid">
              {SKIN_TYPE_KEYS.map(key => (
                <button
                  key={key}
                  type="button"
                  className={`skin-type-btn ${profile.skinType === key ? 'selected' : ''}`}
                  onClick={() => setProfile(prev => ({ ...prev, skinType: key }))}
                >
                  <span className="material-symbols-outlined skin-type-icon">
                    {tr.skinTypes[key].icon}
                  </span>
                  <span className="skin-type-label">{tr.skinTypes[key].label}</span>
                  <span className="skin-type-desc">{tr.skinTypes[key].desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Concerns */}
          <div className="form-section">
            <span className="section-overline">Category 02</span>
            <h3 className="section-label">{tr.concernsLabel}</h3>
            <p className="section-sublabel">{tr.concernsSubLabel}</p>
            <div className="concerns-wrap">
              {tr.skinConcerns.map(concern => (
                <button
                  key={concern}
                  type="button"
                  className={`concern-pill ${profile.concerns.includes(concern) ? 'selected' : ''}`}
                  onClick={() => toggleConcern(concern)}
                >
                  {concern}
                </button>
              ))}
            </div>
          </div>

          {/* Sensitivity */}
          <div className="form-section">
            <span className="section-overline">Category 03</span>
            <h3 className="section-label">{tr.sensitivityLabel}</h3>
            <div className="sensitivity-section">
              <div className="sensitivity-header">
                <p className="section-sublabel" style={{ marginBottom: 0 }}>{tr.sensitivitySubLabel}</p>
              </div>
              <div className="sensitivity-slider-wrap">
                <input
                  type="range"
                  className="sensitivity-slider"
                  min={0}
                  max={100}
                  value={profile.sensitivity}
                  onChange={e => setProfile(prev => ({ ...prev, sensitivity: Number(e.target.value) }))}
                />
                <div className="sensitivity-labels">
                  <div className="sensitivity-label-item">
                    <span>{tr.sensitivityLow}</span>
                    <span>{tr.sensitivityLowSub}</span>
                  </div>
                  <div className="sensitivity-label-item" style={{ textAlign: 'right' }}>
                    <span>{tr.sensitivityHigh}</span>
                    <span>{tr.sensitivityHighSub}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {apiError && <p className="form-error">{apiError}</p>}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{
                flex: '0 0 auto',
                padding: '16px 24px',
                borderRadius: '9999px',
                border: '1.5px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
              onClick={() => setAppStep('basic_info')}
            >
              ← Back
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={!profile.skinType}
            >
              {tr.finishBtn}
              <span className="material-symbols-outlined">science</span>
            </button>
          </div>
          <p className="btn-footer-note">Powered by Atelier AI · Secured with Privacy Grade A</p>
        </div>
      </div>

      {/* Camera Modal (reuse) */}
      {showCamera && (
        <div className="camera-modal" onClick={e => e.target === e.currentTarget && closeCamera()}>
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
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>
      )}
    </>
  )
}

// ── Loading Screen ─────────────────────────────────────
function LoadingScreen({ tr }: { tr: Translations }) {
  const [completedSteps, setCompletedSteps] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setCompletedSteps(1), 1500),
      setTimeout(() => setCompletedSteps(2), 3200),
      setTimeout(() => setCompletedSteps(3), 5000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="loading-screen">
      <div className="loading-bg-blur loading-bg-blur-1" />
      <div className="loading-bg-blur loading-bg-blur-2" />

      <div className="loading-content">
        <div className="pulse-container">
          <div className="pulse-ring pulse-ring-1" />
          <div className="pulse-ring pulse-ring-2" />
          <div className="pulse-ring pulse-ring-3" />
          <div className="pulse-core">
            <span className="material-symbols-outlined">auto_fix_high</span>
          </div>
          <div className="scan-line" />
        </div>

        <span className="loading-overline">The Atelier Intelligence</span>
        <h2 className="loading-title">{tr.loadingText}</h2>

        <div className="loading-steps-panel">
          {tr.loadingSteps.map((text, i) => {
            const done = i < completedSteps
            const active = i === completedSteps
            const pending = i > completedSteps
            return (
              <div key={i} className={`loading-step-row ${pending ? 'pending' : ''}`}>
                <div className="loading-step-icon">
                  {done && <span className="material-symbols-outlined">check_circle</span>}
                  {active && <div className="loading-step-spinner" />}
                  {pending && <div className="loading-step-empty" />}
                </div>
                <p className="loading-step-text">{text}</p>
              </div>
            )
          })}
        </div>

        <p className="loading-quote">"True beauty is an alchemy of proportions and spirit."</p>
      </div>
    </div>
  )
}

// ── Report Page ────────────────────────────────────────
function ReportPage({
  report, profile, bmi, tr, onReset, userEmail, onGoHome,
}: {
  report: ConsultReport
  profile: ProfileData
  bmi: string | null
  tr: Translations
  onReset: () => void
  userEmail: string
  onGoHome?: () => void
}) {
  const [emailInput, setEmailInput] = useState(userEmail)
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [sendError, setSendError] = useState<string | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const handleSendEmail = async () => {
    setSendState('sending')
    setSendError(null)
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          skinType: profile.skinType,
          bmi,
          height: profile.height,
          weight: profile.weight,
          report,
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? '전송 실패')
      }
      setSendState('sent')
    } catch (e) {
      setSendError(e instanceof Error ? e.message : '알 수 없는 오류')
      setSendState('error')
    }
  }
  const skinTypeInfo = profile.skinType ? tr.skinTypes[profile.skinType as SkinTypeKey] : null
  const analysisDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  const sensitivityLabel = profile.sensitivity < 33 ? tr.sensitivityLow : profile.sensitivity < 66 ? 'Moderate' : tr.sensitivityHigh

  // Derive products: API products or fall back from morning routine
  const products: ProductRecommendation[] = report.products && report.products.length > 0
    ? report.products
    : report.morning.slice(0, 3).map((s) => ({
        stepLabel: s.step,
        name: s.product,
        type: s.step,
        price: '',
        reason: s.reason,
        ingredients: [],
      }))

  const stepNames = ['Gentle Cleansing', 'Targeted Treatment', 'Barrier Support']

  return (
    <div className="report-inner">
      {/* Hero */}
      <section className="report-hero">
        <span className="report-hero-overline">Personalized Dossier</span>
        <h2 className="report-hero-title">
          Your Beauty <br /><em>Blueprint</em>
        </h2>
        <div className="report-hero-meta" style={{ marginBottom: 20 }}>
          {profile.photoPreview && (
            <div className="report-avatar-chip">
              <div className="report-avatar-img">
                <img src={profile.photoPreview} alt="profile" />
              </div>
              <div className="report-avatar-text">
                <p>Analysis Date</p>
                <p>{analysisDate}</p>
              </div>
            </div>
          )}
        </div>
        <p className="report-summary-text">{report.summary}</p>
      </section>

      {/* Analysis Bento Grid */}
      <div className="analysis-grid">
        {/* Skin Profile */}
        <div className="analysis-card analysis-card-lg">
          <span className="analysis-card-overline">01. Skin Profile</span>
          <h3 className="analysis-card-title">{skinTypeInfo?.label ?? 'Unknown'}</h3>
          <p className="analysis-card-body">{skinTypeInfo?.desc}</p>
          {profile.concerns.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {profile.concerns.map(c => (
                <span key={c} className="concern-tag">{c}</span>
              ))}
            </div>
          )}
          <div className="analysis-stat-row">
            <span className="analysis-stat-label">Skin Type</span>
            <span className="analysis-stat-value">{skinTypeInfo?.label}</span>
          </div>
          <div className="analysis-stat-row">
            <span className="analysis-stat-label">Sensitivity</span>
            <span className="analysis-stat-value">{sensitivityLabel} ({profile.sensitivity}/100)</span>
          </div>
          <div className="analysis-stat-row">
            <span className="analysis-stat-label">Key Concerns</span>
            <span className="analysis-stat-value">{profile.concerns.length > 0 ? profile.concerns.length + ' identified' : 'None selected'}</span>
          </div>
        </div>

        {/* Body Metrics */}
        <div className="analysis-card analysis-card-sm">
          <span className="analysis-card-overline">02. Body Metrics</span>
          <h3 className="analysis-card-title">{bmi ? `BMI ${bmi}` : '—'}</h3>
          <div className="analysis-metric-grid" style={{ marginBottom: 16 }}>
            <div className="analysis-metric-item">
              <div className="analysis-metric-num">{profile.height}<span style={{ fontSize: '1rem' }}>cm</span></div>
              <div className="analysis-metric-label">Height</div>
            </div>
            <div className="analysis-metric-item">
              <div className="analysis-metric-num">{profile.weight}<span style={{ fontSize: '1rem' }}>kg</span></div>
              <div className="analysis-metric-label">Weight</div>
            </div>
            <div className="analysis-metric-item" style={{ gridColumn: 'span 2' }}>
              <div className="analysis-metric-num">{bmi ?? '—'}</div>
              <div className="analysis-metric-label">{bmi ? getBmiLabel(Number(bmi), tr) : 'BMI'}</div>
            </div>
          </div>
        </div>

        {/* Dermal Status */}
        <div className="analysis-card analysis-card-md">
          <span className="analysis-card-overline">03. Dermal Status</span>
          <h3 className="analysis-card-title">
            {profile.sensitivity < 33 ? 'High Resilience' : profile.sensitivity < 66 ? 'Moderate' : 'Sensitive Profile'}
          </h3>
          <div className="analysis-stat-row">
            <span className="analysis-stat-label">Barrier Strength</span>
            <span className="analysis-stat-value">{profile.sensitivity < 33 ? 'Strong' : profile.sensitivity < 66 ? 'Moderate' : 'Delicate'}</span>
          </div>
          <div className="analysis-stat-row">
            <span className="analysis-stat-label">Sensitivity Index</span>
            <span className="analysis-stat-value">{profile.sensitivity}/100</span>
          </div>
          <div className="analysis-stat-row">
            <span className="analysis-stat-label">Profile Status</span>
            <span className="analysis-stat-value">{profile.sensitivity < 33 ? 'OPTIMAL' : profile.sensitivity < 66 ? 'NORMAL' : 'CARE NEEDED'}</span>
          </div>
        </div>

        {/* Routine Overview */}
        <div className="analysis-card analysis-card-md2">
          <span className="analysis-card-overline">04. Routine Blueprint</span>
          <h3 className="analysis-card-title">Personalized Protocol</h3>
          <div className="analysis-metric-grid">
            <div className="analysis-metric-item">
              <div className="analysis-metric-num">{report.morning.length}</div>
              <div className="analysis-metric-label">Morning Steps</div>
            </div>
            <div className="analysis-metric-item">
              <div className="analysis-metric-num">{report.evening.length}</div>
              <div className="analysis-metric-label">Evening Steps</div>
            </div>
            <div className="analysis-metric-item">
              <div className="analysis-metric-num">{report.ingredients.recommended.length}</div>
              <div className="analysis-metric-label">Key Ingredients</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prescribed Essentials */}
      <section className="products-section">
        <div className="products-header">
          <div className="products-header-left">
            <p>{tr.productsSubTitle}</p>
            <h3>{tr.productsTitle}</h3>
          </div>
        </div>

        <div className="products-list">
          {products.map((product, i) => (
            <div key={i} className="product-entry">
              <div>
                <span className="product-step-label">Step {String(i + 1).padStart(2, '0')}</span>
                <h4 className="product-step-name">{product.stepLabel || stepNames[i] || product.name}</h4>
                <p className="product-step-desc">{product.reason}</p>
              </div>
              <div className="product-card">
                <div className="product-img-wrap">
                  <div className="product-img-placeholder">
                    <span className="material-symbols-outlined">spa</span>
                    <span>{product.type || 'Skincare'}</span>
                  </div>
                </div>
                <div className="product-info">
                  <div className="product-info-header">
                    <div>
                      <h5 className="product-name">{product.name}</h5>
                      <p className="product-type">{product.type}</p>
                    </div>
                    {product.price && <span className="product-price">{product.price}</span>}
                  </div>
                  <div className="product-reason-box">
                    <span className="product-reason-label">{tr.whyItWorks}</span>
                    <p className="product-reason-text">{product.reason}</p>
                  </div>
                  {product.ingredients.length > 0 && (
                    <div className="product-ingredients">
                      {product.ingredients.map(ing => (
                        <span key={ing} className="ingredient-tag">{ing}</span>
                      ))}
                    </div>
                  )}
                  <button type="button" className="btn-add-routine">
                    {tr.addToRoutine}
                    <span className="material-symbols-outlined">shopping_bag</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Daily Ritual */}
      <section className="daily-ritual-section">
        <div className="daily-ritual-card">
          <span className="daily-ritual-overline">The Ritual</span>
          <h3 className="daily-ritual-title">{tr.dailyRitualTitle}</h3>
          <div className="ritual-steps">
            {report.morning.slice(0, 2).map((s, i) => (
              <div key={i} className="ritual-step">
                <span className="ritual-time">{i === 0 ? '08:00' : '14:00'}</span>
                <div>
                  <p className="ritual-step-title">{s.step}</p>
                  <p className="ritual-step-desc">{s.reason}</p>
                </div>
              </div>
            ))}
            {report.evening.slice(0, 1).map((s, i) => (
              <div key={i} className="ritual-step">
                <span className="ritual-time">21:00</span>
                <div>
                  <p className="ritual-step-title">{s.step}</p>
                  <p className="ritual-step-desc">{s.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Morning / Evening Routine (full) */}
      <section className="report-ingredients" style={{ marginBottom: 0 }}>
        <h3 className="report-section-heading" style={{ marginBottom: 20 }}>{tr.morningRoutine}</h3>
        <div className="routine-steps" style={{ marginBottom: 32 }}>
          {report.morning.map((s, i) => <RoutineCard key={i} index={i + 1} step={s} />)}
        </div>

        <h3 className="report-section-heading" style={{ marginBottom: 20 }}>{tr.eveningRoutine}</h3>
        <div className="routine-steps" style={{ marginBottom: 32 }}>
          {report.evening.map((s, i) => <RoutineCard key={i} index={i + 1} step={s} />)}
        </div>
      </section>

      {/* Ingredients Guide */}
      <section className="report-ingredients">
        <h3 className="report-section-heading">{tr.ingredientsTitle}</h3>
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
      </section>

      {/* Lifestyle */}
      <div className="lifestyle-card" style={{ marginTop: 24 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        <p>{report.lifestyle}</p>
      </div>

      {/* Email Report */}
      <div className="email-report-section">
        {!showEmailForm ? (
          <button type="button" className="btn-email-report" onClick={() => setShowEmailForm(true)}>
            <span className="material-symbols-outlined">mail</span>
            리포트 이메일로 받기
          </button>
        ) : (
          <div className="email-report-form">
            <p className="email-report-label">리포트를 받을 이메일 주소</p>
            <div className="email-report-input-row">
              <input
                type="email"
                className="email-report-input"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                disabled={sendState === 'sending' || sendState === 'sent'}
              />
              <button
                type="button"
                className="email-report-send-btn"
                onClick={handleSendEmail}
                disabled={!emailInput || sendState === 'sending' || sendState === 'sent'}
              >
                {sendState === 'sending' ? (
                  <span className="btn-spinner" />
                ) : sendState === 'sent' ? (
                  <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span> 전송됨</>
                ) : (
                  <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span> 전송</>
                )}
              </button>
            </div>
            {sendState === 'sent' && (
              <p className="email-report-success">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                {emailInput} 으로 리포트를 전송했습니다.
              </p>
            )}
            {sendState === 'error' && (
              <p className="email-report-error">{sendError}</p>
            )}
          </div>
        )}
      </div>

      <div className="btn-reset-wrap">
        <button type="button" className="btn-reset" onClick={onReset}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
          {tr.resetBtn}
        </button>
        {onGoHome && (
          <button type="button" className="btn-reset" onClick={onGoHome} style={{ marginTop: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>
            메인으로 돌아가기
          </button>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────
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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find(l => l.code === lang)!

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="lang-dropdown" ref={ref}>
      <button type="button" className="lang-dropdown-trigger" onClick={() => setOpen(v => !v)}>
        <span className="lang-flag">{current.flag}</span>
        <span className="lang-label">{current.label}</span>
        <svg className={`lang-chevron ${open ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="lang-dropdown-menu">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              type="button"
              className={`lang-dropdown-item ${lang === l.code ? 'active' : ''}`}
              onClick={() => { onChange(l.code); setOpen(false) }}
            >
              <span className="lang-flag">{l.flag}</span>
              <span className="lang-label">{l.label}</span>
              {lang === l.code && (
                <svg className="lang-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Utilities ──────────────────────────────────────────
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
