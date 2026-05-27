import type { PagesFunction } from '@cloudflare/workers-types'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401)

  // 토큰으로 사용자 정보 조회
  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  })

  if (!userRes.ok) return json({ error: '유효하지 않은 토큰입니다.' }, 401)
  const user = await userRes.json() as { id?: string }
  const userId = user?.id
  if (!userId) return json({ error: '사용자를 찾을 수 없습니다.' }, 404)

  // 프로필 스토리지 파일 삭제 (webp, jpg 모두 시도)
  const extensions = ['webp', 'jpg']
  await Promise.all(extensions.map(ext =>
    fetch(`${env.SUPABASE_URL}/storage/v1/object/profile-photos/${userId}/avatar.${ext}`, {
      method: 'DELETE',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })
  ))

  // 프로필 데이터 삭제
  await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  // 사용자 계정 삭제
  const deleteRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (!deleteRes.ok) {
    const err = await deleteRes.text()
    return json({ error: '계정 삭제 중 오류가 발생했습니다.', detail: err }, 500)
  }

  return json({ success: true })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  })
}
