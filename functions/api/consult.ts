interface Env {
  OPENAI_API_KEY: string
}

interface ConsultRequest {
  height: number
  weight: number
  bmi: string
  bmiLabel: string
  skinType: string
  concerns: string[]
  sensitivity: number
  language: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (!env.OPENAI_API_KEY) {
    return json({ error: 'OPENAI_API_KEY가 설정되지 않았습니다.' }, 500)
  }

  let body: ConsultRequest
  try {
    body = await request.json()
  } catch {
    return json({ error: '요청 형식이 올바르지 않습니다.' }, 400)
  }

  const { height, weight, bmi, bmiLabel, skinType, concerns, sensitivity, language } = body
  if (!height || !weight || !bmi || !skinType) {
    return json({ error: 'Missing required fields.' }, 400)
  }

  const responseLang = language || 'English'
  const sensitivityLabel = sensitivity < 33 ? 'Low (Resilient)' : sensitivity < 66 ? 'Moderate' : 'High (Very Sensitive)'
  const concernsText = concerns && concerns.length > 0 ? concerns.join(', ') : 'None specified'

  const prompt = `You are a professional beauty dermatologist and skincare consultant with 20 years of experience.
Based on the customer information below, write a personalized skincare consulting report in JSON format.

[Customer Information]
- Height: ${height}cm / Weight: ${weight}kg
- BMI: ${bmi} (${bmiLabel})
- Skin Type: ${skinType}
- Main Concerns: ${concernsText}
- Skin Sensitivity: ${sensitivityLabel} (${sensitivity}/100)

[Instructions]
- Analyze the skin condition in relation to the skin type, concerns, sensitivity level, and BMI.
- Build a realistic morning and evening routine in order.
- Recommend 3 specific product types as "Prescribed Essentials" tailored to the user's concerns and skin type.
- Recommend ingredient types that are easy to find.
- ALL text in the JSON response MUST be written in: ${responseLang}

Return ONLY valid JSON matching this exact schema:
{
  "summary": "Skin condition and body analysis summary (max 3 sentences)",
  "morning": [
    { "step": "Step Name", "product": "Product Type", "reason": "Why this product is needed", "tips": "Usage tip (1 sentence)" }
  ],
  "evening": [
    { "step": "Step Name", "product": "Product Type", "reason": "Why this product is needed", "tips": "Usage tip (1 sentence)" }
  ],
  "ingredients": {
    "recommended": ["Ingredient: Effect description"],
    "avoid": ["Ingredient: Why to avoid"]
  },
  "lifestyle": "Lifestyle advice for skin improvement (max 2 sentences)",
  "products": [
    {
      "stepLabel": "Gentle Cleansing",
      "name": "Specific Product Name",
      "type": "Product Category",
      "price": "$65",
      "reason": "Why this specific product works for this user's concerns and skin type",
      "ingredients": ["Key Ingredient 1", "Key Ingredient 2", "Key Ingredient 3"]
    }
  ]
}`

  let openaiRes: Response
  try {
    openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt }
        ],
        response_format: { type: 'json_object' }
      }),
    })
  } catch (e) {
    console.error(e)
    return json({ error: 'OpenAI 서버에 연결할 수 없습니다.' }, 502)
  }

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    return json({ error: 'OpenAI API 오류', detail: errText }, openaiRes.status)
  }

  const data = await openaiRes.json() as { choices: { message: { content: string } }[] }
  const content = data.choices[0].message.content
  if (!content) {
    return json({ error: '응답을 파싱할 수 없습니다.' }, 502)
  }

  return new Response(content, {
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  })
}
