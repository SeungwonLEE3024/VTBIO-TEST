import { useState, useEffect, Component, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Landing from './components/Landing'
import ProfileInput from './components/ProfileInput'
import MyPage from './components/MyPage'

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setView('landing')
    })

    return () => subscription.unsubscribe()
  }, [])

  const resolvedSession = session ?? null

  if (view === 'mypage' && resolvedSession) return (
    <ErrorBoundary>
      <MyPage
        session={resolvedSession}
        onBack={() => setView('landing')}
        onSignOut={() => { supabase.auth.signOut(); setView('landing') }}
      />
    </ErrorBoundary>
  )

  if (view === 'assessment') return (
    <ErrorBoundary>
      <ProfileInput
        session={resolvedSession}
        onSignOut={() => { supabase.auth.signOut(); setView('landing') }}
        onNeedAuth={() => setView('landing')}
        onGoHome={() => setView('landing')}
      />
    </ErrorBoundary>
  )

  return (
    <ErrorBoundary>
      <Landing
        session={resolvedSession}
        onStart={() => setView('assessment')}
        onMyPage={() => setView('mypage')}
        onSignOut={() => supabase.auth.signOut()}
      />
    </ErrorBoundary>
  )
}
