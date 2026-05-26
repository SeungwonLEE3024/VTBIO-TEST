import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Landing from './components/Landing'
import ProfileInput from './components/ProfileInput'

type View = 'landing' | 'auth' | 'assessment'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [view, setView] = useState<View>('landing')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) setView('landing')
    })

    return () => subscription.unsubscribe()
  }, [])

  const resolvedSession = session ?? null

  if (view === 'auth') return (
    <Auth onBack={() => setView('landing')} />
  )

  if (view === 'assessment') return (
    <ProfileInput
      session={resolvedSession}
      onSignOut={() => { supabase.auth.signOut(); setView('landing') }}
      onNeedAuth={() => setView('auth')}
    />
  )

  return (
    <Landing
      session={resolvedSession}
      onStart={() => setView('assessment')}
      onLogin={() => setView('auth')}
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}
