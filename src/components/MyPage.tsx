import { useState, useEffect, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './MyPage.css'

type Tab = 'info' | 'password' | 'delete'

type SkinTypeKey = 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal'

const SKIN_TYPE_LABELS: Record<SkinTypeKey, string> = {
  oily: '지성',
  dry: '건성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
}

interface ProfileData {
  height: string | null
  weight: string | null
  photo_url: string | null
  skin_type: SkinTypeKey | null
  concerns: string[] | null
  sensitivity: number | null
}

export default function MyPage({ session, onBack, onSignOut }: {
  session: Session
  onBack: () => void
  onSignOut: () => void
}) {
  const [tab, setTab] = useState<Tab>('info')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<ProfileData>({ height: null, weight: null, photo_url: null, skin_type: null, concerns: [], sensitivity: 30 })
  const [editPhoto, setEditPhoto] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('height, weight, photo_url, skin_type, concerns, sensitivity')
        .eq('id', session.user.id)
        .single()
      setProfile(data as ProfileData | null)
      setProfileLoading(false)
    }
    load()
  }, [session])

  const startEditing = () => {
    setEditData({
      height: profile?.height ?? null,
      weight: profile?.weight ?? null,
      photo_url: profile?.photo_url ?? null,
      skin_type: profile?.skin_type ?? null,
      concerns: profile?.concerns ?? [],
      sensitivity: profile?.sensitivity ?? 30,
    })
    setEditPhoto(null)
    setEditPhotoPreview(null)
    setSaveError(null)
    setIsEditing(true)
  }

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditPhoto(file)
    const reader = new FileReader()
    reader.onload = () => setEditPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const toggleConcern = (concern: string) => {
    setEditData(prev => ({
      ...prev,
      concerns: prev.concerns?.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...(prev.concerns ?? []), concern],
    }))
  }

  const handleSaveProfile = async () => {
    setSaveLoading(true)
    setSaveError(null)
    try {
      let photoUrl = editData.photo_url

      if (editPhoto) {
        const formData = new FormData()
        formData.append('file', editPhoto)
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
      }

      await supabase.from('profiles').upsert({
        id: session.user.id,
        height: editData.height ? Number(editData.height) : null,
        weight: editData.weight ? Number(editData.weight) : null,
        photo_url: photoUrl,
        skin_type: editData.skin_type,
        concerns: editData.concerns && editData.concerns.length > 0 ? editData.concerns : null,
        sensitivity: editData.sensitivity,
        updated_at: new Date().toISOString(),
      })

      setProfile({ ...editData, photo_url: photoUrl })
      setIsEditing(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaveLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(session.user.email!, {
      redirectTo: window.location.origin,
    })
    setResetSent(true)
    setResetLoading(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== '탈퇴') return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const { data: { session: current } } = await supabase.auth.getSession()
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${current?.access_token ?? ''}`,
        },
      })
      if (!res.ok) {
        let errorMsg = '탈퇴 처리 중 오류가 발생했습니다.'
        try {
          const err = await res.json() as { error?: string; step?: string; detail?: string }
          errorMsg = `[${err.step ?? '?'}] ${err.error ?? errorMsg}${err.detail ? ` (${err.detail})` : ''}`
        } catch { /* 빈 응답 무시 */ }
        throw new Error(errorMsg)
      }
      await supabase.auth.signOut()
      onSignOut()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '오류가 발생했습니다.')
      setDeleteLoading(false)
    }
  }

  const isGoogleUser = session.user.app_metadata?.provider === 'google'
  const joinedAt = new Date(session.user.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const CONCERN_OPTIONS = ['여드름', '주름', '미백', '모공', '건조함', '홍조', '색소침착', '탄력']

  const currentPhotoUrl = editPhotoPreview ?? (isEditing ? editData.photo_url : profile?.photo_url)

  return (
    <div className="mypage">
      <header className="mypage-header">
        <button className="mypage-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="mypage-brand">
          <span className="material-symbols-outlined">auto_fix_high</span>
          <span>Atelier Beauty</span>
        </div>
        <button className="mypage-back-btn" onClick={onSignOut} title="로그아웃">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      <main className="mypage-main">
        <div className="mypage-profile-top">
          <div className="mypage-avatar" style={{ position: 'relative' }}>
            {currentPhotoUrl
              ? <img src={currentPhotoUrl} alt="profile" />
              : <span className="material-symbols-outlined">person</span>}
            {isEditing && (
              <button className="mypage-avatar-edit-btn" onClick={() => fileInputRef.current?.click()}>
                <span className="material-symbols-outlined">photo_camera</span>
              </button>
            )}
          </div>
          {isEditing && (
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditPhotoChange} />
          )}
          <p className="mypage-user-email">{session.user.email}</p>
          <p className="mypage-user-joined">가입일 {joinedAt}</p>
          {isGoogleUser && (
            <span className="mypage-provider-badge">
              <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Google 계정
            </span>
          )}
        </div>

        <div className="mypage-tabs">
          <button className={`mypage-tab ${tab === 'info' ? 'active' : ''}`} onClick={() => { setTab('info'); setIsEditing(false) }}>
            <span className="material-symbols-outlined">person</span>내 정보
          </button>
          <button className={`mypage-tab ${tab === 'password' ? 'active' : ''}`} onClick={() => { setTab('password'); setIsEditing(false) }}>
            <span className="material-symbols-outlined">lock</span>비밀번호
          </button>
          <button className={`mypage-tab ${tab === 'delete' ? 'active' : ''}`} onClick={() => { setTab('delete'); setIsEditing(false) }}>
            <span className="material-symbols-outlined">delete</span>회원 탈퇴
          </button>
        </div>

        {/* 내 정보 */}
        {tab === 'info' && (
          <div className="mypage-section">
            {profileLoading ? (
              <div className="mypage-loading"><span className="mypage-spinner" /></div>
            ) : isEditing ? (
              /* 편집 모드 */
              <div className="mypage-edit-form">
                <div className="mypage-edit-group">
                  <label className="mypage-edit-label">키 (cm)</label>
                  <input className="mypage-edit-input" type="number" placeholder="165" value={editData.height ?? ''} onChange={e => setEditData(p => ({ ...p, height: e.target.value }))} />
                </div>
                <div className="mypage-edit-group">
                  <label className="mypage-edit-label">몸무게 (kg)</label>
                  <input className="mypage-edit-input" type="number" placeholder="55" value={editData.weight ?? ''} onChange={e => setEditData(p => ({ ...p, weight: e.target.value }))} />
                </div>
                <div className="mypage-edit-group">
                  <label className="mypage-edit-label">피부 타입</label>
                  <div className="mypage-skin-type-grid">
                    {(Object.keys(SKIN_TYPE_LABELS) as SkinTypeKey[]).map(key => (
                      <button
                        key={key}
                        type="button"
                        className={`mypage-skin-btn ${editData.skin_type === key ? 'active' : ''}`}
                        onClick={() => setEditData(p => ({ ...p, skin_type: key }))}
                      >
                        {SKIN_TYPE_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mypage-edit-group">
                  <label className="mypage-edit-label">피부 고민</label>
                  <div className="mypage-concern-pills">
                    {CONCERN_OPTIONS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`mypage-concern-pill ${editData.concerns?.includes(c) ? 'active' : ''}`}
                        onClick={() => toggleConcern(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mypage-edit-group">
                  <label className="mypage-edit-label">민감도 <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{editData.sensitivity ?? 30}</span></label>
                  <input
                    type="range" min={0} max={100}
                    value={editData.sensitivity ?? 30}
                    onChange={e => setEditData(p => ({ ...p, sensitivity: Number(e.target.value) }))}
                    className="mypage-sensitivity-slider"
                  />
                  <div className="mypage-slider-labels">
                    <span>낮음</span><span>높음</span>
                  </div>
                </div>
                {saveError && <p className="mypage-error">{saveError}</p>}
                <div className="mypage-edit-actions">
                  <button className="mypage-btn-ghost-cancel" onClick={() => setIsEditing(false)}>취소</button>
                  <button className="mypage-btn-primary" onClick={handleSaveProfile} disabled={saveLoading}>
                    {saveLoading ? <span className="mypage-spinner" /> : '저장'}
                  </button>
                </div>
              </div>
            ) : (
              /* 보기 모드 */
              <>
                <div className="mypage-info-grid">
                  <div className="mypage-info-card">
                    <span className="material-symbols-outlined mypage-info-icon">mail</span>
                    <div>
                      <p className="mypage-info-label">이메일</p>
                      <p className="mypage-info-value">{session.user.email}</p>
                    </div>
                  </div>
                  <div className="mypage-info-card">
                    <span className="material-symbols-outlined mypage-info-icon">height</span>
                    <div>
                      <p className="mypage-info-label">키</p>
                      <p className="mypage-info-value">{profile?.height ? `${profile.height} cm` : '미입력'}</p>
                    </div>
                  </div>
                  <div className="mypage-info-card">
                    <span className="material-symbols-outlined mypage-info-icon">monitor_weight</span>
                    <div>
                      <p className="mypage-info-label">몸무게</p>
                      <p className="mypage-info-value">{profile?.weight ? `${profile.weight} kg` : '미입력'}</p>
                    </div>
                  </div>
                  <div className="mypage-info-card">
                    <span className="material-symbols-outlined mypage-info-icon">face</span>
                    <div>
                      <p className="mypage-info-label">피부 타입</p>
                      <p className="mypage-info-value">{profile?.skin_type ? SKIN_TYPE_LABELS[profile.skin_type] : '미입력'}</p>
                    </div>
                  </div>
                  <div className="mypage-info-card">
                    <span className="material-symbols-outlined mypage-info-icon">psychology</span>
                    <div>
                      <p className="mypage-info-label">피부 고민</p>
                      <p className="mypage-info-value">{profile?.concerns && profile.concerns.length > 0 ? profile.concerns.join(', ') : '미입력'}</p>
                    </div>
                  </div>
                  <div className="mypage-info-card">
                    <span className="material-symbols-outlined mypage-info-icon">thermometer</span>
                    <div>
                      <p className="mypage-info-label">민감도</p>
                      <p className="mypage-info-value">{profile?.sensitivity != null ? `${profile.sensitivity} / 100` : '미입력'}</p>
                    </div>
                  </div>
                  <div className="mypage-info-card">
                    <span className="material-symbols-outlined mypage-info-icon">login</span>
                    <div>
                      <p className="mypage-info-label">로그인 방법</p>
                      <p className="mypage-info-value">{isGoogleUser ? 'Google' : '이메일/비밀번호'}</p>
                    </div>
                  </div>
                </div>
                <button className="mypage-btn-edit" onClick={startEditing} style={{ marginTop: 20 }}>
                  <span className="material-symbols-outlined">edit</span>
                  정보 수정
                </button>
              </>
            )}
          </div>
        )}

        {/* 비밀번호 재설정 */}
        {tab === 'password' && (
          <div className="mypage-section">
            {isGoogleUser ? (
              <div className="mypage-notice">
                <span className="material-symbols-outlined">info</span>
                <p>Google 계정으로 로그인한 경우 비밀번호 재설정을 사용할 수 없습니다.</p>
              </div>
            ) : resetSent ? (
              <div className="mypage-success">
                <span className="material-symbols-outlined">mark_email_read</span>
                <p>비밀번호 재설정 이메일을 발송했습니다.<br />이메일함을 확인해 주세요.</p>
              </div>
            ) : (
              <div className="mypage-password-section">
                <p className="mypage-desc">
                  <span className="material-symbols-outlined">lock_reset</span>
                  가입한 이메일 주소로 비밀번호 재설정 링크를 발송합니다.
                </p>
                <div className="mypage-email-preview">{session.user.email}</div>
                <button className="mypage-btn-primary" onClick={handlePasswordReset} disabled={resetLoading}>
                  {resetLoading ? <span className="mypage-spinner" /> : '재설정 이메일 발송'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 회원 탈퇴 */}
        {tab === 'delete' && (
          <div className="mypage-section">
            <div className="mypage-danger-box">
              <span className="material-symbols-outlined">warning</span>
              <div>
                <strong>탈퇴 전 꼭 확인하세요</strong>
                <ul>
                  <li>모든 분석 기록이 영구 삭제됩니다</li>
                  <li>프로필 사진 및 신체 정보가 삭제됩니다</li>
                  <li>삭제된 데이터는 복구할 수 없습니다</li>
                </ul>
              </div>
            </div>
            <div className="mypage-delete-field">
              <label>탈퇴를 확인하려면 아래에 <strong>탈퇴</strong>를 입력하세요</label>
              <input
                type="text"
                placeholder="탈퇴"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
            </div>
            {deleteError && <p className="mypage-error">{deleteError}</p>}
            <button
              className="mypage-btn-danger"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== '탈퇴' || deleteLoading}
            >
              {deleteLoading ? <span className="mypage-spinner" /> : '회원 탈퇴'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
