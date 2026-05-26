interface Env {
  RESEND_API_KEY: string
}

interface RoutineStep {
  step: string
  product: string
  reason: string
  tips: string
}

interface ProductRecommendation {
  stepLabel: string
  name: string
  type: string
  price: string
  reason: string
  ingredients: string[]
}

interface SendReportRequest {
  email: string
  skinType: string
  bmi: string | null
  height: string
  weight: string
  report: {
    summary: string
    morning: RoutineStep[]
    evening: RoutineStep[]
    ingredients: { recommended: string[]; avoid: string[] }
    lifestyle: string
    products?: ProductRecommendation[]
  }
}

function buildHtml(data: SendReportRequest): string {
  const { report, skinType, bmi, height, weight } = data

  const routineRows = (steps: RoutineStep[]) =>
    steps.map((s, i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0ede9;width:28px;vertical-align:top">
          <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#765848;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:24px">${i + 1}</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ede9;vertical-align:top">
          <strong style="color:#1c1c1a;font-size:14px">${s.step}</strong>
          <span style="color:#82756a;font-size:13px"> · ${s.product}</span>
          <p style="margin:4px 0 0;color:#50453b;font-size:13px;line-height:1.5">${s.reason}</p>
        </td>
      </tr>`).join('')

  const ingredientList = (items: string[], color: string) =>
    items.map(item => `<li style="padding:4px 0;color:${color};font-size:13px">${item}</li>`).join('')

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fcf9f5;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fcf9f5;padding:40px 0">
<tr><td>
<table width="600" align="center" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(28,28,26,0.08)">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#765848 0%,#caa493 100%);padding:40px 40px 32px;text-align:center">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.75)">Personalized Dossier</p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;font-weight:700;color:#fff;line-height:1.2">Your Beauty<br><em>Blueprint</em></h1>
    </td>
  </tr>

  <!-- Body Metrics -->
  <tr>
    <td style="padding:32px 40px 0">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#765848;font-weight:700">피부 프로필</p>
      <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;color:#1c1c1a">Skin Analysis Overview</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:33%;text-align:center;background:#f6f3ef;border-radius:12px;padding:16px;margin-right:8px">
            <div style="font-size:22px;font-weight:700;color:#765848">${height}<span style="font-size:13px">cm</span></div>
            <div style="font-size:11px;color:#82756a;text-transform:uppercase;letter-spacing:0.1em">Height</div>
          </td>
          <td style="width:8px"></td>
          <td style="width:33%;text-align:center;background:#f6f3ef;border-radius:12px;padding:16px">
            <div style="font-size:22px;font-weight:700;color:#765848">${weight}<span style="font-size:13px">kg</span></div>
            <div style="font-size:11px;color:#82756a;text-transform:uppercase;letter-spacing:0.1em">Weight</div>
          </td>
          <td style="width:8px"></td>
          <td style="width:33%;text-align:center;background:#f6f3ef;border-radius:12px;padding:16px">
            <div style="font-size:22px;font-weight:700;color:#765848">${bmi ?? '—'}</div>
            <div style="font-size:11px;color:#82756a;text-transform:uppercase;letter-spacing:0.1em">BMI</div>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#50453b"><strong>피부 타입:</strong> ${skinType}</p>
    </td>
  </tr>

  <!-- Summary -->
  <tr>
    <td style="padding:24px 40px 0">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#765848;font-weight:700">Summary</p>
      <p style="margin:0;font-size:14px;color:#50453b;line-height:1.7;background:#f6f3ef;border-radius:12px;padding:20px">${report.summary}</p>
    </td>
  </tr>

  <!-- Morning Routine -->
  <tr>
    <td style="padding:28px 40px 0">
      <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#765848;font-weight:700">Morning Routine</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${routineRows(report.morning)}
      </table>
    </td>
  </tr>

  <!-- Evening Routine -->
  <tr>
    <td style="padding:28px 40px 0">
      <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#765848;font-weight:700">Evening Routine</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${routineRows(report.evening)}
      </table>
    </td>
  </tr>

  <!-- Ingredients -->
  <tr>
    <td style="padding:28px 40px 0">
      <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#765848;font-weight:700">Ingredients Guide</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top;width:50%;padding-right:12px">
            <div style="background:#f0fdf4;border-radius:12px;padding:16px">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.1em">추천 성분</p>
              <ul style="margin:0;padding-left:16px">${ingredientList(report.ingredients.recommended, '#166534')}</ul>
            </div>
          </td>
          <td style="vertical-align:top;width:50%;padding-left:12px">
            <div style="background:#fff7ed;border-radius:12px;padding:16px">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:0.1em">피해야 할 성분</p>
              <ul style="margin:0;padding-left:16px">${ingredientList(report.ingredients.avoid, '#9a3412')}</ul>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Lifestyle -->
  <tr>
    <td style="padding:28px 40px">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#765848;font-weight:700">Lifestyle Tips</p>
      <p style="margin:0;font-size:14px;color:#50453b;line-height:1.7;background:#f6f3ef;border-radius:12px;padding:20px">${report.lifestyle}</p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f6f3ef;padding:24px 40px;text-align:center;border-top:1px solid #ede8e3">
      <p style="margin:0;font-size:12px;color:#82756a">Atelier Beauty · AI-Powered Skin Analysis</p>
      <p style="margin:4px 0 0;font-size:11px;color:#b0a09a">Privacy Grade A · Your data is encrypted and secure</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  let body: SendReportRequest
  try {
    body = await request.json()
  } catch {
    return json({ error: '요청 형식이 올바르지 않습니다.' }, 400)
  }

  if (!body.email || !body.report) {
    return json({ error: 'Missing required fields.' }, 400)
  }

  const html = buildHtml(body)

  let resendRes: Response
  try {
    resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Atelier Beauty <onboarding@resend.dev>',
        to: [body.email],
        subject: '✨ Your Atelier Beauty Blueprint',
        html,
      }),
    })
  } catch (e) {
    return json({ error: 'Resend 서버에 연결할 수 없습니다.' }, 502)
  }

  if (!resendRes.ok) {
    const errText = await resendRes.text()
    return json({ error: 'Resend API 오류', detail: errText }, resendRes.status)
  }

  return json({ success: true })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
  })
}
