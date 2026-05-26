import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const rootEl = document.getElementById('root')!

function showError(title: string, msg: string) {
  rootEl.innerHTML =
    `<div style="padding:40px;font-family:sans-serif;color:#dc2626">
      <h2>${title}</h2>
      <pre style="background:#fef2f2;padding:16px;border-radius:8px;font-size:13px;white-space:pre-wrap">${msg}</pre>
    </div>`
}

window.onerror = (msg, src, line, col, err) => {
  showError('JS 오류', `${msg}\n${src}:${line}:${col}\n${err?.stack ?? ''}`)
}

window.addEventListener('unhandledrejection', (e) => {
  showError('Promise 오류', String(e.reason))
})

// Dynamic import ensures error handlers above are registered BEFORE any
// module-level code in App (and its deps like supabase.ts) runs.
import('./App.tsx')
  .then(({ default: App }) => {
    try {
      createRoot(rootEl).render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
    } catch (e) {
      showError('렌더링 오류', e instanceof Error ? (e.stack ?? e.message) : String(e))
    }
  })
  .catch((e) => {
    const msg = e instanceof Error ? (e.stack ?? e.message) : String(e)
    // Check for the common misconfiguration
    if (msg.includes('supabaseUrl') || msg.includes('Invalid supabase')) {
      showError(
        '환경 변수 오류',
        '.env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 올바르게 설정해 주세요.\n\n' + msg,
      )
    } else {
      showError('모듈 로드 오류', msg)
    }
  })
