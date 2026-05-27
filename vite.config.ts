import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

const MOCK_REPORT = {
  summary: 'Based on your profile, your skin shows signs of a balanced yet slightly reactive nature. Prioritizing hydration and barrier support will help maintain your complexion\'s natural equilibrium.',
  morning: [
    { step: 'Cleanser', product: 'Gentle Foaming Cleanser', reason: 'Removes overnight impurities without disrupting the moisture barrier.', tips: 'Use lukewarm water and massage gently for 60 seconds.' },
    { step: 'Toner', product: 'Hydrating Essence Toner', reason: 'Restores pH balance and preps skin for subsequent steps.', tips: 'Pat gently onto skin, do not rub.' },
    { step: 'Moisturizer + SPF', product: 'Daily Moisturizer SPF 30', reason: 'Locks in hydration and shields against UV damage.', tips: 'Apply generously to face and neck 15 minutes before going outside.' },
  ],
  evening: [
    { step: 'Oil Cleanser', product: 'Cleansing Balm', reason: 'Dissolves sunscreen and sebum effectively.', tips: 'Massage onto dry skin for 1 minute before rinsing.' },
    { step: 'Serum', product: 'Hyaluronic Acid Serum', reason: 'Delivers deep hydration to plump and smooth the skin.', tips: 'Apply to slightly damp skin for better absorption.' },
    { step: 'Night Cream', product: 'Barrier Repair Night Cream', reason: 'Supports the skin\'s overnight regeneration cycle.', tips: 'Use a pea-sized amount and warm between fingertips before applying.' },
  ],
  ingredients: {
    recommended: ['Hyaluronic Acid — deep hydration', 'Ceramides — barrier reinforcement', 'Niacinamide — pore refinement', 'Centella Asiatica — soothing & repair'],
    avoid: ['Alcohol denat. — strips moisture barrier', 'Fragrance — potential irritant', 'Harsh physical exfoliants — may cause micro-tears'],
  },
  lifestyle: 'Aim for 7–8 hours of sleep to maximize skin regeneration. Stay hydrated with at least 2L of water daily, and incorporate antioxidant-rich foods to combat oxidative stress.',
  products: [
    { stepLabel: 'Gentle Cleansing', name: 'CeraVe Hydrating Cleanser', type: 'Cleanser', price: '$14', reason: 'Ceramide-rich formula that cleanses while maintaining the skin barrier.', ingredients: ['Ceramides', 'Hyaluronic Acid', 'Glycerin'] },
    { stepLabel: 'Targeted Treatment', name: 'The Ordinary Niacinamide 10%', type: 'Serum', price: '$8', reason: 'Minimizes pores, controls sebum, and evens skin tone.', ingredients: ['Niacinamide', 'Zinc PCA'] },
    { stepLabel: 'Barrier Support', name: 'Cetaphil Moisturizing Cream', type: 'Moisturizer', price: '$16', reason: 'Clinically proven to restore and maintain the skin\'s natural barrier.', ingredients: ['Ceramides', 'Shea Butter', 'Glycerin'] },
  ],
}

function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server: { middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/consult' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json;charset=UTF-8')
          res.statusCode = 200
          res.end(JSON.stringify(MOCK_REPORT))
          return
        }
        if (req.url === '/api/send-report' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json;charset=UTF-8')
          res.statusCode = 200
          res.end(JSON.stringify({ success: true, mock: true }))
          return
        }
        if (req.url === '/api/delete-account' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json;charset=UTF-8')
          res.statusCode = 200
          res.end(JSON.stringify({ success: true, mock: true }))
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/VTBIO-TEST/' : '/',
  plugins: [react(), localApiPlugin()],
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }
        },
      },
    },
  },
})
