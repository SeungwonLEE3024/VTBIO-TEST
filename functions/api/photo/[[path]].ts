import type { PagesFunction } from '@cloudflare/workers-types'

interface Env {
  PROFILE_PHOTOS: R2Bucket
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context
  const path = (params.path as string[]).join('/')

  const object = await env.PROFILE_PHOTOS.get(path)
  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Cache-Control', 'public, max-age=31536000')

  return new Response(object.body, { headers })
}
