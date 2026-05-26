import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Landing from './components/Landing'
import ProfileInput from './components/ProfileInput'
import MyPage from './components/MyPage'

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
    <MyPage
      session={resolvedSession}
      onBack={() => setView('landing')}
      onSignOut={() => { supabase.auth.signOut(); setView('landing') }}
    />
  )

  if (view === 'assessment') return (
    <ProfileInput
      session={resolvedSession}
      onSignOut={() => { supabase.auth.signOut(); setView('landing') }}
      onNeedAuth={() => setView('landing')}
    />
  )

  return (
    <Landing
      session={resolvedSession}
      onStart={() => setView('assessment')}
      onMyPage={() => setView('mypage')}
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}
