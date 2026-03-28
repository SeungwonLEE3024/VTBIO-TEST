interface Env {
  OPENAI_API_KEY: string
}

interface ConsultRequest {
  height: number
  weight: number
  bmi: string
  bmiLabel: string
  skinType: string
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

  const { height, weight, bmi, bmiLabel, skinType } = body
  if (!height || !weight || !bmi || !skinType) {
    return json({ error: '필수 항목이 누락되었습니다.' }, 400)
  }

  const prompt = `당신은 10년 경력의 전문 뷰티 더마톨로지스트 겸 기초화장품 컨설턴트입니다.
아래 고객 정보를 바탕으로 맞춤 기초화장품 컨설팅 보고서를 JSON 형식으로 작성해주세요.

[고객 정보]
- 키: ${height}cm / 몸무게: ${weight}kg
- BMI: ${bmi} (${bmiLabel})
- 피부 타입: ${skinType}

[작성 지침]
- 피부 타입과 BMI(체지방 수준)를 연관지어 피부 상태를 분석하세요.
- 루틴은 아침/저녁 순서대로 현실적으로 구성하세요.
- 한국 시장에서 구하기 쉬운 성분과 제품 유형을 추천하세요.
- 모든 텍스트는 한국어로 작성하세요.

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
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })
  } catch {
    return json({ error: 'OpenAI 서버에 연결할 수 없습니다.' }, 502)
  }

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    return json({ error: 'OpenAI API 오류', detail: errText }, 502)
  }

  const data = await openaiRes.json() as {
    choices: { message: { content: string } }[]
  }

  const content = data.choices?.[0]?.message?.content
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
