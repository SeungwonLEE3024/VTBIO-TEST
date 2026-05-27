import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './MyPage.css'

type Tab = 'info' | 'password' | 'delete'

interface ProfileData {
  height: string | null
  weight: string | null
  photo_url: string | null
}

export default function MyPage({ session, onBack, onSignOut }: {
  session: Session
  onBack: () => void
  onSignOut: () => void
}) {
  const [tab, setTab] = useState<Tab>('info')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('height, weight, photo_url')
        .eq('id', session.user.id)
        .single()
      setProfile(data)
      setProfileLoading(false)
    }
    load()
  }, [session])

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
          const err = await res.json() as { error?: string }
          errorMsg = err.error ?? errorMsg
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
        <div style={{ width: 40 }} />
      </header>

      <main className="mypage-main">
        <div className="mypage-profile-top">
          <div className="mypage-avatar">
            {profile?.photo_url
              ? <img src={profile.photo_url} alt="profile" />
              : <span className="material-symbols-outlined">person</span>}
          </div>
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
          <button className={`mypage-tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
            <span className="material-symbols-outlined">person</span>내 정보
          </button>
          <button className={`mypage-tab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
            <span className="material-symbols-outlined">lock</span>비밀번호
          </button>
          <button className={`mypage-tab ${tab === 'delete' ? 'active' : ''}`} onClick={() => setTab('delete')}>
            <span className="material-symbols-outlined">delete</span>회원 탈퇴
          </button>
        </div>

        {/* 내 정보 */}
        {tab === 'info' && (
          <div className="mypage-section">
            {profileLoading ? (
              <div className="mypage-loading"><span className="mypage-spinner" /></div>
            ) : (
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
                  <span className="material-symbols-outlined mypage-info-icon">login</span>
                  <div>
                    <p className="mypage-info-label">로그인 방법</p>
                    <p className="mypage-info-value">{isGoogleUser ? 'Google' : '이메일/비밀번호'}</p>
                  </div>
                </div>
              </div>
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
