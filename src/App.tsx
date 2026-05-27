import { useState, useEffect, useRef, Component, lazy, Suspense, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import Landing from './components/Landing'

// ProfileInput/MyPage: 초기 번들에서 제외, 필요 시 지연 로드
const ProfileInput = lazy(() => import('./components/ProfileInput'))
const MyPage = lazy(() => import('./components/MyPage'))

// Supabase: 초기 렌더링과 분리하여 병렬 로드 시작
//   → Landing이 즉시 렌더링되고, auth 상태는 비동기로 업데이트
const supabasePromise = import('./lib/supabase').then(m => m.supabase)

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#dc2626' }}>
        <h2>오류 발생</h2>
        <pre style={{ background: '#fef2f2', padding: 16, borderRadius: 8, fontSize: 13 }}>{this.state.error}</pre>
      </div>
    )
    return this.props.children
  }
}

type View = 'landing' | 'assessment' | 'mypage'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [view, setView] = useState<View>('landing')
  const sbRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    let cleanup: (() => void) | null = null

    supabasePromise.then(supabase => {
      sbRef.current = supabase

      supabase.auth.getSession().then(({ data }) => setSession(data.session))

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        if (!session) setView('landing')
      })

      cleanup = () => subscription.unsubscribe()
    })

    return () => { cleanup?.() }
  }, [])

  const handleSignOut = () => {
    sbRef.current?.auth.signOut()
    setView('landing')
  }

  const resolvedSession = session ?? null

  if (view === 'mypage' && resolvedSession) return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <MyPage
          session={resolvedSession}
          onBack={() => setView('landing')}
          onSignOut={handleSignOut}
        />
      </Suspense>
    </ErrorBoundary>
  )

  if (view === 'assessment') return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <ProfileInput
          session={resolvedSession}
          onSignOut={handleSignOut}
          onNeedAuth={() => setView('landing')}
          onGoHome={() => setView('landing')}
        />
      </Suspense>
    </ErrorBoundary>
  )

  return (
    <ErrorBoundary>
      <Landing
        session={resolvedSession}
        onStart={() => setView('assessment')}
        onMyPage={() => setView('mypage')}
        onSignOut={handleSignOut}
      />
    </ErrorBoundary>
  )
}
