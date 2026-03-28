import { useState, useRef, useEffect } from 'react'
import './ProfileInput.css'

interface ProfileData {
  photo: File | null
  photoPreview: string | null
  height: string
  weight: string
}

export default function ProfileInput() {
  const [profile, setProfile] = useState<ProfileData>({
    photo: null,
    photoPreview: null,
    height: '',
    weight: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [showCamera])

  const openCamera = async (facing: 'user' | 'environment' = facingMode) => {
    setCameraError(null)
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
      })
      streamRef.current = stream
      setFacingMode(facing)
      setShowCamera(true)
    } catch {
      setCameraError('카메라 접근 권한이 필요합니다.\n브라우저 설정에서 카메라를 허용해주세요.')
      setShowCamera(true)
    }
  }

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
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
      reader.onload = () => {
        setProfile((prev) => ({ ...prev, photo: file, photoPreview: reader.result as string }))
      }
      reader.readAsDataURL(file)
      closeCamera()
    }, 'image/jpeg', 0.92)
  }

  const switchCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    openCamera(next)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setProfile((prev) => ({
        ...prev,
        photo: file,
        photoPreview: reader.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      setProfile((prev) => ({
        ...prev,
        photo: file,
        photoPreview: reader.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.photo || !profile.height || !profile.weight) return
    setSubmitted(true)
  }

  const handleReset = () => {
    setProfile({ photo: null, photoPreview: null, height: '', weight: '' })
    setSubmitted(false)
  }

  const bmi =
    profile.height && profile.weight
      ? (
          Number(profile.weight) /
          Math.pow(Number(profile.height) / 100, 2)
        ).toFixed(1)
      : null

  if (submitted) {
    return (
      <div className="profile-result">
        <div className="result-avatar">
          <img src={profile.photoPreview!} alt="프로필 사진" />
        </div>
        <h2>분석 준비 완료!</h2>
        <p className="result-subtitle">입력하신 정보를 바탕으로 맞춤 뷰티 서비스를 제공할게요.</p>
        <div className="result-stats">
          <div className="stat-card">
            <span className="stat-label">키</span>
            <span className="stat-value">{profile.height}<span className="stat-unit">cm</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-label">몸무게</span>
            <span className="stat-value">{profile.weight}<span className="stat-unit">kg</span></span>
          </div>
          <div className="stat-card">
            <span className="stat-label">BMI</span>
            <span className="stat-value">{bmi}</span>
          </div>
        </div>
        <button className="btn-primary" onClick={handleReset}>다시 입력하기</button>
      </div>
    )
  }

  return (
    <>
      <div className="profile-container">
        <div className="profile-header">
          <div className="logo-badge">✨ VTBIO</div>
          <h1>퍼스널 뷰티 분석</h1>
          <p>사진과 체형 정보를 입력하면 맞춤 뷰티 솔루션을 제안해드려요.</p>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          {/* 사진 업로드 */}
          <div className="form-section">
            <label className="section-label">얼굴 사진</label>
            <div
              className={`photo-upload ${profile.photoPreview ? 'has-photo' : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {profile.photoPreview ? (
                <>
                  <img src={profile.photoPreview} alt="미리보기" className="photo-preview" />
                  <div className="photo-overlay">
                    <button type="button" className="overlay-btn" onClick={() => fileInputRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      갤러리
                    </button>
                    <button type="button" className="overlay-btn" onClick={() => openCamera()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      카메라
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
                  <p className="upload-text">사진을 업로드하세요</p>
                  <div className="upload-actions">
                    <button type="button" className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      갤러리
                    </button>
                    <button type="button" className="upload-btn upload-btn-camera" onClick={() => openCamera()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                      카메라
                    </button>
                  </div>
                  <p className="upload-hint">드래그 앤 드롭도 가능해요</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* 키 & 몸무게 */}
          <div className="form-section">
            <label className="section-label">체형 정보</label>
            <div className="input-row">
              <div className="input-group">
                <label htmlFor="height">키</label>
                <div className="input-wrapper">
                  <input
                    id="height"
                    type="number"
                    min="100"
                    max="250"
                    placeholder="165"
                    value={profile.height}
                    onChange={(e) => setProfile((prev) => ({ ...prev, height: e.target.value }))}
                    required
                  />
                  <span className="input-unit">cm</span>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="weight">몸무게</label>
                <div className="input-wrapper">
                  <input
                    id="weight"
                    type="number"
                    min="20"
                    max="300"
                    placeholder="55"
                    value={profile.weight}
                    onChange={(e) => setProfile((prev) => ({ ...prev, weight: e.target.value }))}
                    required
                  />
                  <span className="input-unit">kg</span>
                </div>
              </div>
            </div>

            {bmi && (
              <div className="bmi-preview">
                <span>BMI</span>
                <strong>{bmi}</strong>
                <span className="bmi-label">{getBmiLabel(Number(bmi))}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary btn-submit"
            disabled={!profile.photo || !profile.height || !profile.weight}
          >
            뷰티 분석 시작하기
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
              <span className="camera-title">카메라</span>
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
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                playsInline
                muted
              />
            )}

            <div className="camera-bottombar">
              <button type="button" className="camera-switch" onClick={switchCamera} title="카메라 전환">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
              <button
                type="button"
                className="camera-capture"
                onClick={capturePhoto}
                disabled={!!cameraError}
              >
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

function getBmiLabel(bmi: number): string {
  if (bmi < 18.5) return '저체중'
  if (bmi < 23) return '정상'
  if (bmi < 25) return '과체중'
  return '비만'
}
