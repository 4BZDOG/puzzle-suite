# Puzzle Suite — Monetization Strategy Plan

> **Legend:**
> - 🤖 **Claude can implement** — code changes, integrations, config files, etc.
> - 👤 **You (owner) must lead** — accounts, legal, business decisions, external services

---

## Executive Summary

Puzzle Suite is a polished, client-side vocabulary worksheet generator with strong educator appeal. The app already has a compelling value proposition (instant multi-format PDF worksheets, zero signup required) and a clean architecture that can support monetization without compromising the core free experience. The recommended strategy is a **freemium + one-time purchase** model, avoiding subscription fatigue common in the EdTech space.

---

## Phase 1 — Foundation (Do Before Monetizing)

These steps create the infrastructure required for any revenue model.

### 1.1 Custom Domain & Branding

| Step | Owner | Notes |
|------|-------|-------|
| Choose and purchase a domain (e.g. `puzzlesuite.app`, `wordsheetsuite.com`) | 👤 You | ~$12/yr via Namecheap, Google Domains, etc. |
| Point domain to GitHub Pages via CNAME record | 👤 You + 🤖 Claude | Claude can add `CNAME` file to the repo and document DNS settings |
| Update all internal links/references to use new domain | 🤖 Claude | Find-and-replace in source files |
| Create a simple landing page / marketing homepage | 🤖 Claude | Separate from the app itself; can be `index.html` at root |

### 1.2 Analytics (Privacy-Respecting)

Without data, you can't make decisions. Add lightweight analytics before launching paid features.

| Step | Owner | Notes |
|------|-------|-------|
| Sign up for [Plausible](https://plausible.io) or [Fathom](https://usefathom.com) (~$9/mo) | 👤 You | Both are GDPR-compliant, no cookie banner needed |
| Add analytics snippet to `puzzle-suite.html` | 🤖 Claude | One `<script>` tag, no code changes required |
| Define key events to track: PDF exported, words entered, bulk count, page type | 🤖 Claude | Add `plausible.trackEvent()` calls at key user actions |

### 1.3 Email List

An email list lets you reach users who haven't paid yet. Critical for launch announcements.

| Step | Owner | Notes |
|------|-------|-------|
| Create account on [Mailchimp](https://mailchimp.com) (free tier), [ConvertKit](https://convertkit.com), or [Brevo](https://brevo.com) | 👤 You | Free up to 500–1,000 subscribers |
| Add an unobtrusive "Get notified of new features" signup to the app footer | 🤖 Claude | Small embedded form, hidden by default until first export |
| Set up a welcome email sequence (2–3 emails) | 👤 You | Templates exist; Claude can draft copy |

---

## Phase 2 — Free Tier Definition (Feature Gates)

Before charging, define exactly what is free vs. paid. The goal: make the free tier genuinely useful so users trust the product, while giving power users a reason to pay.

### Proposed Free Tier Limits

| Feature | Free | Pro |
|---------|------|-----|
| Words per puzzle | Up to 20 | Unlimited |
| Bulk export sets | 1 | Up to 50 |
| PDF page types | All 5 | All 5 |
| Fonts | Inter, Roboto | + Lora, Comic Neue |
| Watermark/logo | ❌ | ✓ |
| Custom subtitle text | ❌ | ✓ |
| Save/load JSON config | ❌ | ✓ |
| Dark mode | ✓ | ✓ |
| No "Made with Puzzle Suite" footer in PDF | ❌ | ✓ |

> **Note:** These are starting suggestions. Adjust based on what drives conversions. The word count and bulk export limits are the highest-value gates.

### Implementation

| Step | Owner | Notes |
|------|-------|-------|
| Add a `isPro` flag to `state` and a `checkProFeature()` gating utility | 🤖 Claude | Central place to check entitlement |
| Add soft UI gates — disable/gray-out restricted controls, show upgrade tooltip on hover | 🤖 Claude | No hard blocks initially; nudge not wall |
| Add "Made with Puzzle Suite" watermark text to PDF footer for free users | 🤖 Claude | Subtle, non-intrusive, removes on upgrade |
| Build an "Upgrade to Pro" modal with feature comparison table | 🤖 Claude | Triggered by clicking any locked feature |

---

## Phase 3 — Payment Integration

### Option A: One-Time Purchase (Recommended First)

A single lifetime purchase (~$12–$19) is the simplest model and best fit for educators who resist subscriptions. This avoids ongoing billing complexity.

**Recommended tool: [Lemon Squeezy](https://lemonsqueezy.com)**
- Handles taxes/VAT globally (critical for EdTech)
- Simple webhook/API integration
- No monthly fee; 5% + $0.50 per transaction
- Supports lifetime licenses and discount codes

| Step | Owner | Notes |
|------|-------|-------|
| Create Lemon Squeezy account and product ("Puzzle Suite Pro — Lifetime") | 👤 You | Set price ($12–$19), configure checkout |
| Set up a webhook endpoint to validate purchases | 👤 You + 🤖 Claude | Needs a tiny backend (see 3.1) |
| Implement license key delivery and validation flow | 🤖 Claude | See Section 3.1 |
| Add discount codes for teachers (e.g. `TEACHER25`) | 👤 You | Done in Lemon Squeezy dashboard |

### Option B: Annual Subscription (Add Later)

Recurring revenue is more sustainable long-term. Offer this as a lower-cost entry (~$7–$9/yr) once the lifetime option is established. Most users prefer lifetime; subscriptions work well for institutional buyers.

### 3.1 License Key Validation Architecture

Since Puzzle Suite is fully client-side, license validation requires a lightweight backend to prevent key sharing. Two approaches:

#### Option 1: Cloudflare Worker (Recommended — Free Tier)
A tiny serverless function validates the license key against Lemon Squeezy's API and returns a signed token stored in `localStorage`.

| Step | Owner | Notes |
|------|-------|-------|
| Create a Cloudflare account | 👤 You | Free tier is sufficient |
| Write and deploy a `validate-license` Worker (~30 lines) | 🤖 Claude | Calls Lemon Squeezy `/v1/licenses/validate`; returns signed JWT |
| Add "Enter License Key" input in the app's Export/Settings panel | 🤖 Claude | Stored in localStorage after validation |
| Add periodic re-validation (every 7 days) so revoked keys stop working | 🤖 Claude | Silent background check on app load |

#### Option 2: Netlify/Vercel Functions
Same concept, different platform. Slightly more complex deployment but familiar to many devs.

---

## Phase 4 — Pricing & Product Packaging

### Recommended Price Points

| Tier | Price | Who it's for |
|------|-------|-------------|
| **Free** | $0 | Casual users, first-time visitors |
| **Pro — Lifetime** | $14.99 | Individual teachers, homeschoolers |
| **Pro — Annual** | $7.99/yr | Users who prefer lower upfront cost |
| **School License (5 seats)** | $49.99 one-time | Small departments |
| **District License (unlimited)** | $299/yr | Larger institutions (requires invoicing) |

### Pricing Page

| Step | Owner | Notes |
|------|-------|-------|
| Design a `/pricing` page (or section on landing page) with tier comparison table | 🤖 Claude | Static HTML, no backend needed |
| Add social proof (testimonials, "used by X teachers") once you have users | 👤 You | Collect via email follow-ups |
| Add FAQ section (can I use offline? what if I change devices? school PO?) | 🤖 Claude | Claude can draft initial FAQ copy |

---

## Phase 5 — Distribution & Marketing

Revenue requires users. These channels are most effective for EdTech tools.

### 5.1 SEO & Content Marketing

| Step | Owner | Notes |
|------|-------|-------|
| Research top keywords: "vocabulary worksheet generator", "free word search maker for teachers", "crossword puzzle maker PDF" | 👤 You | Use Google Search Console (free) or Ahrefs |
| Optimize landing page `<title>`, `<meta description>`, headings with target keywords | 🤖 Claude | One-time HTML updates |
| Create a simple blog (GitHub Pages supports Jekyll) with teacher-focused posts | 🤖 Claude + 👤 You | Claude can scaffold; you create content |
| Submit sitemap to Google Search Console | 👤 You | Free; speeds up indexing |

### 5.2 Teacher Communities

| Channel | Action | Owner |
|---------|--------|-------|
| [Teachers Pay Teachers](https://teacherspayteachers.com) | Create a free listing that links to Puzzle Suite; sell premium worksheet packs | 👤 You |
| Reddit: r/Teachers, r/languageteachers, r/ESL | Share genuinely helpful posts; don't spam | 👤 You |
| Facebook Groups (ESL Teachers, K-12 educators) | Demo post with screenshots/GIF | 👤 You |
| Twitter/X (#TeacherTwitter, #EduTwitter) | Share a short screen recording | 👤 You |
| Product Hunt | Launch on a Tuesday/Wednesday; prepare tagline and screenshots | 👤 You + 🤖 Claude (prep assets) |

### 5.3 Affiliate / Referral Program

| Step | Owner | Notes |
|------|-------|-------|
| Create a referral link system (Lemon Squeezy supports affiliates natively) | 👤 You | Set 20–30% commission |
| Reach out to teacher bloggers / YouTube channels for review deals | 👤 You | Offer free Pro license for honest review |

---

## Phase 6 — Premium Features Roadmap

Additional features that justify the Pro price and future price increases.

### High-Value Features to Build

| Feature | Effort | Value | Who |
|---------|--------|-------|-----|
| **Cloud save / sync** across devices (via Supabase or similar) | High | High | 🤖 Claude + 👤 You (Supabase account) |
| **Google Classroom integration** — push worksheets directly | High | Very High | 👤 You (Google API credentials) + 🤖 Claude |
| **More puzzle types**: Fill-in-the-blank, matching columns, word bank only | Medium | High | 🤖 Claude |
| **Answer sheet separate PDF** | Low | Medium | 🤖 Claude |
| **Image support in clues** (visual vocabulary) | Medium | High | 🤖 Claude |
| **Export to DOCX / Google Docs** | High | High | 🤖 Claude |
| **Custom color themes for PDF** | Low | Medium | 🤖 Claude |
| **Grade-level readability hints** | Medium | Medium | 🤖 Claude |
| **Shared template library** (community-contributed word lists) | High | Very High | 👤 You (backend) + 🤖 Claude (UI) |

---

## Phase 7 — Institutional Sales (B2B)

Schools and districts can be large single buyers. This requires more manual effort but high revenue per customer.

| Step | Owner | Notes |
|------|-------|-------|
| Create a "For Schools" landing page explaining multi-user licensing | 🤖 Claude | Static page; link from main nav |
| Add a "Request a Quote" form (Google Form or Typeform) | 👤 You | Routes to your email |
| Prepare a one-page PDF overview / brochure for administrators | 🤖 Claude + 👤 You | Claude can draft; you brand/polish |
| Be able to issue invoices and accept PO (Purchase Orders) | 👤 You | Many schools can't use credit cards; use [Wave](https://wave.com) (free invoicing) |
| Consider SOC 2 compliance or FERPA documentation for district sales | 👤 You | Important for US public schools; requires legal review |

---

## Recommended Execution Order

```
Week 1–2:   Phase 1 (domain, analytics, email list)
Week 3–4:   Phase 2 (define free tier, build gates in code)
Week 5–6:   Phase 3 (Lemon Squeezy account, Cloudflare Worker, license validation)
Week 7:     Phase 4 (pricing page, upgrade modal, final polish)
Week 8:     Phase 5 (Product Hunt launch, community posts)
Ongoing:    Phase 6 (ship premium features quarterly)
Month 6+:   Phase 7 (institutional outreach)
```

---

## Revenue Projections (Conservative Estimate)

| Scenario | Monthly Visitors | Conversion | Revenue/mo |
|----------|-----------------|------------|------------|
| Early (month 3) | 1,000 | 2% @ $14.99 | ~$300 |
| Growth (month 6) | 5,000 | 2% @ $14.99 | ~$1,500 |
| Established (year 1) | 20,000 | 2% @ $14.99 | ~$6,000 |
| With school licenses | 20,000 | + 5 schools @ $49.99 | +$250 |

> These are illustrative. Actual conversion depends heavily on SEO traction and community distribution.

---

## Key Decisions Needed From You

Before Claude implements Phase 2–3, please decide:

1. **Which features should be gated?** Review the proposed free tier table in Phase 2 and adjust.
2. **What price?** $12, $15, or $19 for lifetime? (A/B test is possible later.)
3. **Lemon Squeezy or another payment processor?** (Alternatives: Paddle, Stripe, Gumroad)
4. **Cloudflare Worker or Netlify/Vercel for license validation?**
5. **Do you want a full marketing homepage, or just enhance the existing app page?**

---

*Plan created: 2026-03-13*
