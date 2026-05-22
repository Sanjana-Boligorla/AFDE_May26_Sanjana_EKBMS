/**
 * Automated screenshot tool for EKBMS
 * Usage:
 *   npm install puppeteer --save-dev   (run once, from project root)
 *   node scripts/take-screenshots.js
 *
 * Requires: frontend running on http://localhost:3000
 *           backend  running on http://localhost:8000
 */

const puppeteer = require('puppeteer')
const path      = require('path')
const fs        = require('fs')

const FRONTEND  = 'http://localhost:3000'
const OUT_DIR   = path.join(__dirname, '..', 'screenshots')
const VIEWPORT  = { width: 1440, height: 900 }
const DELAY_MS  = 2000

// Credentials for auto-login
const ADMIN_EMAIL    = 'admin@ekbms.com'
const ADMIN_PASSWORD = 'Password@123'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function login(page) {
  console.log('🔐 Logging in as admin...')
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'networkidle2' })
  await sleep(1000)
  await page.type('input[type="email"]', ADMIN_EMAIL)
  await page.type('input[type="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await sleep(2500)
  console.log('   ✓ Logged in')
}

const pages = [
  { name: 'login',               path: '/login',            file: '01-login.png',              auth: false },
  { name: 'dashboard',           path: '/dashboard',        file: '02-dashboard.png',          auth: true  },
  { name: 'all-articles',        path: '/articles',         file: '03-all-articles.png',       auth: true  },
  { name: 'article-detail',      path: '/articles/1',       file: '04-article-detail.png',     auth: true  },
  { name: 'new-article',         path: '/articles/new',     file: '05-new-article.png',        auth: true  },
  { name: 'my-articles',         path: '/my-articles',      file: '06-my-articles.png',        auth: true  },
  { name: 'search',              path: '/search?q=security',file: '07-search.png',             auth: true  },
  { name: 'notifications',       path: '/notifications',    file: '08-notifications.png',      auth: true  },
  { name: 'bookmarks',           path: '/bookmarks',        file: '09-bookmarks.png',          auth: true  },
  { name: 'approval-queue',      path: '/approval-queue',   file: '10-approval-queue.png',     auth: true  },
  { name: 'analytics',           path: '/analytics',        file: '11-analytics.png',          auth: true  },
  { name: 'etl-jobs',            path: '/etl-jobs',         file: '12-etl-jobs.png',           auth: true  },
  { name: 'category-management', path: '/admin/categories', file: '13-categories.png',         auth: true  },
  { name: 'tag-management',      path: '/admin/tags',       file: '14-tags.png',               auth: true  },
  { name: 'user-management',     path: '/admin/users',      file: '15-users.png',              auth: true  },
]

;(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('🚀 Launching browser...')
  const browser = await puppeteer.launch({ headless: 'new' })
  const page    = await browser.newPage()
  await page.setViewport(VIEWPORT)

  // Take login screenshot first (no auth)
  const loginPage = pages.find(p => !p.auth)
  console.log(`📸 Capturing: ${loginPage.name}...`)
  await page.goto(`${FRONTEND}${loginPage.path}`, { waitUntil: 'networkidle2' })
  await sleep(DELAY_MS)
  await page.screenshot({ path: path.join(OUT_DIR, loginPage.file), fullPage: false })
  console.log(`   ✓ Saved → screenshots/${loginPage.file}`)

  // Login once
  await login(page)

  // Take all authenticated screenshots
  for (const p of pages.filter(p => p.auth)) {
    console.log(`📸 Capturing: ${p.name}...`)
    try {
      await page.goto(`${FRONTEND}${p.path}`, { waitUntil: 'networkidle2' })
      await sleep(DELAY_MS)
      const outPath = path.join(OUT_DIR, p.file)
      await page.screenshot({ path: outPath, fullPage: false })
      console.log(`   ✓ Saved → screenshots/${p.file}`)
    } catch (err) {
      console.log(`   ⚠ Skipped ${p.name}: ${err.message}`)
    }
  }

  await browser.close()
  console.log('\n✅ All screenshots saved to /screenshots/')
})()
