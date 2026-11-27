# Saarthi Setu

A multilingual, voice enabled prototype that helps people describe a business need and explore preliminary government scheme matches. It includes a Next.js web app, Sarvam speech and language integrations, and the deterministic Rule Engine in this repository.

## What the live flow does

1. The visitor chooses a language or lets Saarthi detect one, then speaks or types a message.
2. The browser records audio; Sarvam Saaras transcribes it. The visitor can review and correct the text before sending.
3. Sarvam translates and reconciles explicit facts from the conversation with the current profile. The left panel updates as fields are learned or corrected.
4. When the nine core profile fields are complete, Saarthi reads the details back and asks for confirmation. A correction returns to this step.
5. After confirmation, the Rule Engine checks schemes and returns eligible matches. The English report includes documents and application stages. Sarvam Bulbul speaks the chat reply in supported languages.

This is a turn based prototype. Matches are preliminary guidance, not approval or a guarantee of eligibility. Conversation and profile state stay in the browser session; connected services process submitted text and audio.

## Requirements

- Node.js 20.9 or later and npm
- A Sarvam API key with speech, translation and chat access
- Chrome or another browser with microphone recording support; localhost or HTTPS for microphone permission

## Run locally

```bash
npm run setup:all
cp .env.example .env.local
# Fill SARVAM_API_KEY in .env.local
npm run dev:all
```

Open `http://127.0.0.1:8080/assistant`. The runner starts the Rule Engine on port 3000 and the web app on port 8080. If the ports are occupied, set `RULE_ENGINE_PORT` and `WEB_PORT` in the shell and update `RULE_ENGINE_URL` in `.env.local`.

For a production build:

```bash
npm run build
npm run start:all
```

The public ngrok demo points to port 8080. For a new ngrok tunnel, run `ngrok http 8080` in another terminal. The Sarvam key remains on the server and must never be put in a public environment variable. No key or local `.env` file is committed.

## Repository layout

- `app/` and `components/`: Next.js pages, voice workspace, language picker and report
- `app/api/`: server routes for Sarvam STT, TTS, translation, conversation extraction and the Rule Engine proxy
- `lib/`: profile display, browser audio conversion and API adapter
- `services/rule-engine/`: bundled Node Rule Engine, scheme data and tests
- `tests/`: web app logic tests

The web app calls the bundled Rule Engine through `RULE_ENGINE_URL`; it does not need the IVR prototype to run. The Rule Engine retains its original README and license information in its directory.

## Verify

```bash
npm test
npm test --prefix services/rule-engine
npm run build
```

For a full check, complete a voice conversation, confirm the profile, inspect the eligible schemes and edit a field. The scheme dataset and rules should be independently checked against current official sources before a public service launch.
