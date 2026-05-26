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

const MOCK_REPORT = {
  summary: 'This is a mock report. The real API call timed out, likely due to free tier limitations. This mock data allows you to continue building the UI. A full AI consultation is required for accurate recommendations.',
  morning: [
    { step: 'Cleanser', product: 'Hydrating Cleanser', reason: 'Gently removes impurities without stripping the skin.', tips: 'Use lukewarm water and massage gently.' },
    { step: 'Moisturizer', product: 'Daily Moisturizer with SPF 30', reason: 'Hydrates and protects from sun damage.', tips: 'Apply generously to face and neck.' },
  ],
  evening: [
    { step: 'Cleanser', product: 'Hydrating Cleanser', reason: 'Removes the day\'s dirt, oil, and makeup.', tips: 'Double cleanse if wearing heavy makeup.' },
    { step: 'Serum', product: 'Hyaluronic Acid Serum', reason: 'Provides intense hydration overnight.', tips: 'Apply to damp skin for better absorption.' },
    { step: 'Night Cream', product: 'Restorative Night Cream', reason: 'Supports the skin\'s natural repair process.', tips: 'Use a pea-sized amount for the entire face.' },
  ],
  ingredients: {
    recommended: ['Hyaluronic Acid: For deep hydration', 'Ceramides: To strengthen the skin barrier', 'Niacinamide: To improve skin texture'],
    avoid: ['Alcohol-based toners: Can be drying', 'Harsh physical scrubs: May cause micro-tears'],
  },
  lifestyle: 'Drink plenty of water and get 7-8 hours of sleep per night for optimal skin health. This is a mock suggestion.',
  products: [
    { stepLabel: 'Gentle Cleansing', name: 'Mock Cleanser Pro', type: 'Cleanser', price: '$25', reason: 'A mock product recommendation to show how a real one would look.', ingredients: ['Aqua', 'Glycerin', 'Mock-ingredient'] },
    { stepLabel: 'Targeted Treatment', name: 'Mock Serum Deluxe', type: 'Serum', price: '$55', reason: 'This mock serum demonstrates the product recommendation feature.', ingredients: ['Hyaluronic Acid', 'Niacinamide', 'Peptides'] },
    { stepLabel: 'Barrier Support', name: 'Mock Moisturizer Ultra', type: 'Moisturizer', price: '$40', reason: 'This mock moisturizer illustrates a complete skincare routine.', ingredients: ['Ceramides', 'Shea Butter', 'Glycerin'] },
  ],
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // Using mock data to prevent timeout on free tier
  // if (true) { // Force mock data
  //   return json(MOCK_REPORT, 200)
  // }

  // --- The code below will not be executed for now, but is kept for reference ---

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

  const prompt = `[PROMPT FOR AI]` // Prompt is omitted for brevity

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

  try {
    const data = await openaiRes.json() as { choices: { message: { content: string } }[] }
    const content = data?.choices?.[0]?.message?.content

    if (!content) {
      return json({ error: 'AI 모델에서 유효한 응답을 받지 못했습니다.' }, 502)
    }

    const cleanContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    const parsedContent = JSON.parse(cleanContent)

    return new Response(JSON.stringify(parsedContent), {
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    })
  } catch (e) {
    console.error('Error processing OpenAI response:', e)
    const errorText = e instanceof Error ? e.message : String(e)
    return json({ error: 'AI 응답을 처리하는 중 오류가 발생했습니다.', detail: errorText }, 502)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  })
}
