# PAUSE

PAUSE is a private gambling recovery support app. The first MVP goal is simple:
when a user feels an urge, they open PAUSE, disclose privately to the Support
Coach, delay action, and take one protective step before gambling.

## Current Build

- Expo / React Native scaffold
- Mobile-first PAUSE app shell in `App.js`
- Local Support Coach backend in `backend/coachServer.js`
- Safety layer in `backend/safetyLayer.js`
- Prototype preserved in `index.html`
- Bottom navigation: Home, Coach, Check, Plan, More
- MVP screens: onboarding, home, urge support, daily check-in, protection plan,
  pattern insights, resources, settings, plans

## Run Locally

```bash
npm install
npm start
```

Then open the app in Expo Go or a simulator.

To run the local Support Coach backend:

```bash
npm run coach
```

Set `OPENAI_API_KEY` in `.env` to enable model-backed coach responses. Without
an API key, the backend returns deterministic safety-first fallback responses.
Never expose `OPENAI_API_KEY` through an `EXPO_PUBLIC_` variable.

## Production API

The deployable Support Coach API lives in `backend/coachServer.js`.

- Render blueprint: `render.yaml`
- Docker deployment: `Dockerfile`
- Production env template: `.env.production.example`
- Full deployment path: `DEPLOYMENT.md`

The mobile app reads `EXPO_PUBLIC_API_BASE_URL`. For production builds, set it
to the hosted HTTPS API URL.

## Store-Readiness Notes

- App name: PAUSE
- Bundle ID placeholder: `com.pause.recovery`
- Emergency support and crisis resources should remain free.
- Paid plans should add depth and personalization, not block urgent support.
- Final app-store assets still needed: icon, splash, screenshots, privacy policy,
  support URL, terms of use, and subscription product IDs.
