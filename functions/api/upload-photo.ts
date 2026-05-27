import type { PagesFunction } from '@cloudflare/workers-types'

interface Env {
  PROFILE_PHOTOS: R2Bucket
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context

    if (!env.PROFILE_PHOTOS) {
      return json({ error: 'R2 바인딩이 설정되지 않았습니다.' }, 500)
    }

    const authHeader = request.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401)

    // 사용자 확인
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

    // 파일 업로드
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return json({ error: '파일이 없습니다.' }, 400)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const key = `${userId}/avatar.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    await env.PROFILE_PHOTOS.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    })

    return json({ success: true, key, url: `/api/photo/${key}` })
  } catch (e) {
    return json({ error: '업로드 중 오류가 발생했습니다.', detail: String(e) }, 500)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  })
}
