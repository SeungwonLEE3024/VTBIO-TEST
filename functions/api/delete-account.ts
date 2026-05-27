import type { PagesFunction } from '@cloudflare/workers-types'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  PROFILE_PHOTOS: R2Bucket
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: '서버 환경변수가 설정되지 않았습니다.' }, 500)
    }

    const authHeader = request.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401)

    // 1단계: 토큰으로 사용자 정보 조회
    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })

    if (!userRes.ok) {
      const errText = await userRes.text()
      return json({ error: '유효하지 않은 토큰입니다.', detail: errText, step: 'get_user' }, 401)
    }

    const user = await userRes.json() as { id?: string }
    const userId = user?.id
    if (!userId) return json({ error: '사용자 ID를 찾을 수 없습니다.', step: 'parse_user' }, 404)

    // 2단계: R2 프로필 사진 삭제
    if (env.PROFILE_PHOTOS) {
      const extensions = ['webp', 'jpg']
      await Promise.all(extensions.map(ext =>
        env.PROFILE_PHOTOS.delete(`${userId}/avatar.${ext}`)
      ))
    }

    // 3단계: 프로필 테이블 삭제
    await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })

    // 4단계: Auth 계정 삭제
    const deleteRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })

    const deleteStatus = deleteRes.status
    const deleteBody = await deleteRes.text()

    if (!deleteRes.ok) {
      return json({
        error: '계정 삭제 중 오류가 발생했습니다.',
        step: 'delete_user',
        status: deleteStatus,
        detail: deleteBody,
      }, 500)
    }

    return json({ success: true, userId })
  } catch (e) {
    return json({ error: '서버 오류가 발생했습니다.', detail: String(e) }, 500)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  })
}
