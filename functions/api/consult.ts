interface Env {
  OPENAI_API_KEY: string
}

interface ConsultRequest {
  height: number
  weight: number
  bmi: string
  bmiLabel: string
  skinType: string
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

  const { height, weight, bmi, bmiLabel, skinType, language } = body
  if (!height || !weight || !bmi || !skinType) {
    return json({ error: 'Missing required fields.' }, 400)
  }

  const responseLang = language || 'English'

  const prompt = `You are a professional beauty dermatologist and skincare consultant with 20 years of experience.
Based on the customer information below, write a personalized skincare consulting report in JSON format.

[Customer Information]
- Height: ${height}cm / Weight: ${weight}kg
- BMI: ${bmi} (${bmiLabel})
- Skin Type: ${skinType}

[Instructions]
- Analyze the skin condition in relation to the skin type and BMI (body fat level).
- Build a realistic morning and evening routine in order.
- Recommend ingredient types and product types that are easy to find.
- ALL text in the JSON response MUST be written in: ${responseLang}

아래 JSON 스키마를 정확히 따르세요:
{
  "summary": "피부 상태 및 체형 연관 분석 요약 (3문장 이내)",
  "morning": [
    { "step": "단계명", "product": "제품 유형", "reason": "이 제품이 필요한 이유", "tips": "사용 팁 (1문장)" }
  ],
  "evening": [
    { "step": "단계명", "product": "제품 유형", "reason": "이 제품이 필요한 이유", "tips": "사용 팁 (1문장)" }
  ],
  "ingredients": {
    "recommended": ["성분명: 효과 설명"],
    "avoid": ["성분명: 피해야 하는 이유"]
  },
  "lifestyle": "피부 개선을 위한 생활 습관 조언 (2문장 이내)"
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
        response_format: { type: "json_object" }
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
