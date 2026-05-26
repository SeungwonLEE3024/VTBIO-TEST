
import type { PagesFunction } from '@cloudflare/workers-types'
import { Ai } from '@cloudflare/ai'

// AI 모델 프롬프트 (수정됨: 더 자세하고 구조적인 답변 생성)
const getAiPrompt = (
  lang: string,
  skinType: string,
  concerns: string[],
  sensitivity: number,
  height: number,
  weight: number,
  bmi: string,
  bmiLabel: string
) => `
As a world-class AI skincare consultant, "Atelier AI", create a comprehensive, personalized beauty blueprint.
Your response MUST be a valid JSON object. Do not add any text before or after the JSON.
The user's language is ${lang}. All text in the JSON response must be in ${lang}.

User Profile:
- Skin Type: ${skinType}
- Key Concerns: ${concerns.join(', ') || 'Not specified'}
- Sensitivity Score: ${sensitivity}/100
- Body Metrics: Height ${height}cm, Weight ${weight}kg, BMI ${bmi} (${bmiLabel})

Generate a detailed report with the following structure:
{
  "summary": "A 2-3 sentence holistic summary of their skin profile and the recommended approach.",
  "morning": [
    { "step": "...", "product": "...", "reason": "...", "tips": "..." },
    { "step": "...", "product": "...", "reason": "...", "tips": "..." }
  ],
  "evening": [
    { "step": "...", "product": "...", "reason": "...", "tips": "..." },
    { "step": "...", "product": "...", "reason": "...", "tips": "..." }
  ],
  "ingredients": {
    "recommended": ["Ingredient 1", "Ingredient 2"],
    "avoid": ["Ingredient 1", "Ingredient 2"]
  },
  "lifestyle": "Provide 2-3 actionable lifestyle tips (e.g., diet, sleep, stress management) tailored to their profile.",
  "products": [
    { "stepLabel": "Cleanser", "name": "Specific Product Name", "type": "Foam Cleanser", "price": "$25", "reason": "Why this specific product is recommended.", "ingredients": ["Key Ingredient 1", "Key Ingredient 2"] },
    { "stepLabel": "Serum", "name": "Specific Product Name", "type": "Hydrating Serum", "price": "$50", "reason": "...", "ingredients": ["..."] },
    { "stepLabel": "Moisturizer", "name": "Specific Product Name", "type": "Gel-Cream", "price": "$40", "reason": "...", "ingredients": ["..."] }
  ]
}

Specific Instructions:
1.  **Summary**: Start with a captivating and reassuring tone.
2.  **Routines**: Create distinct, synergistic morning (3-4 steps) and evening (4-5 steps) routines. Steps should be logical (e.g., Cleanse, Treat, Hydrate, Protect).
3.  **Product Names**: For routines, use generic but descriptive names (e.g., "Hydrating Hyaluronic Acid Serum", "Gentle Cream Cleanser"). For the "products" section, invent specific, appealing product names (e.g., "Dewdrop pH-Balance Cleanser", "Starlight Retinal Elixir").
4.  **Reasons & Tips**: Provide clear, scientific-based reasons for each step and practical application tips.
5.  **Ingredients**: Recommend 5-7 beneficial ingredients and 2-4 to approach with caution, based on their profile.
6.  **Lifestyle**: Connect tips directly to their skin concerns.
7.  **Product Recommendations**: Recommend 3-4 specific (but fictional) products. Ensure they align with the routines. Provide a step label, type, fictional price (in USD), a compelling reason, and 2-3 key ingredients.
`

interface Env {
  AI: any
}

interface RequestBody {
  language: string
  skinType: string
  concerns: string[]
  sensitivity: number
  height: number
  weight: number
  bmi: string
  bmiLabel: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context
    const body: RequestBody = await request.json()

    const ai = new Ai(env.AI)

    const prompt = getAiPrompt(
      body.language || 'English',
      body.skinType,
      body.concerns,
      body.sensitivity,
      body.height,
      body.weight,
      body.bmi,
      body.bmiLabel
    )

    const stream = await ai.run('@cf/mistral/mistral-7b-instruct-v0.1', {
      prompt,
      stream: true,
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    })

  } catch (error) {
    console.error("Error in AI consultation API:", error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.'
    return new Response(JSON.stringify({ error: 'Failed to get AI response.', detail: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
