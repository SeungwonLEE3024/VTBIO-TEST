import { useState, useRef } from 'react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {profile.photoPreview ? (
              <>
                <img src={profile.photoPreview} alt="미리보기" className="photo-preview" />
                <div className="photo-overlay">
                  <span>사진 변경</span>
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
                <p className="upload-hint">클릭하거나 파일을 드래그하세요<br />JPG, PNG, WEBP 지원</p>
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
  )
}

function getBmiLabel(bmi: number): string {
  if (bmi < 18.5) return '저체중'
  if (bmi < 23) return '정상'
  if (bmi < 25) return '과체중'
  return '비만'
}
