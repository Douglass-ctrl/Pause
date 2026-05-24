# PAUSE Deployment Path

This is the path from local prototype to a live Support Coach API connected to
the mobile app.

## 1. Deploy The Support Coach API

Recommended first host: Render.

1. Push this project to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. If using Blueprint, Render will read `render.yaml`.
4. If creating manually, use:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm run start:api`
   - Health check path: `/health`
5. Add environment variables:
   - `NODE_ENV=production`
   - `OPENAI_API_KEY=<server-only OpenAI key>`
   - `OPENAI_MODEL=gpt-4.1-mini`
   - `ALLOWED_ORIGINS=*`

After deploy, the API should answer:

```text
https://your-pause-coach-api.onrender.com/health
```

Expected response:

```json
{
  "ok": true,
  "service": "pause-coach",
  "modelConfigured": true,
  "environment": "production"
}
```

## 2. Connect The App To The Real API URL

Set the public API URL for Expo builds:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-pause-coach-api.onrender.com
```

For local web testing, add this to `.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-pause-coach-api.onrender.com
```

For EAS production builds:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://your-pause-coach-api.onrender.com
```

The OpenAI key must stay on the backend only:

```bash
OPENAI_API_KEY=sk-...
```

Do not create `EXPO_PUBLIC_OPENAI_API_KEY`.

## 3. Smoke Test The Live API

Health:

```bash
curl https://your-pause-coach-api.onrender.com/health
```

Coach message:

```bash
curl -X POST https://your-pause-coach-api.onrender.com/v1/coach/message \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"My urge is 8/10 and I am about to deposit $200 while alone\",\"conversation\":[]}"
```

The response should reflect the user's concrete details and return structured
fields such as `riskLevel`, `intervention`, `timerSeconds`, and `quickReplies`.

## 4. Build App Previews

Once the live API URL is configured:

```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

Then test:

- Home opens quickly.
- Coach tab reaches the live API.
- Betting-advice requests are blocked.
- Crisis language shows emergency resources.
- Delay timer starts from coach responses.
- App still works if the API is temporarily unavailable.

## 5. Production Notes

- Replace `ALLOWED_ORIGINS=*` with specific web origins before public web launch.
- Keep urgent support free.
- Keep `OPENAI_API_KEY` out of the app bundle.
- Add account auth, encryption, retention controls, export/delete, and subscription
  entitlement checks before app-store release.
