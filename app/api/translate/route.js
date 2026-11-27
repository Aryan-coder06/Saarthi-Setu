import { isLanguage } from '../../../lib/languages.mjs';

export async function POST(request) {
  try {
    const key = process.env.SARVAM_API_KEY;
    if (!key) return Response.json({ error: 'Translation service is not configured' }, { status: 503 });
    const { text, language_code } = await request.json();
    if (typeof text !== 'string' || !text.trim() || text.length > 2000 || !isLanguage(language_code)) {
      return Response.json({ error: 'Invalid translation request' }, { status: 400 });
    }
    if (language_code === 'en-IN') return Response.json({ text: text.trim() });
    const response = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
      body: JSON.stringify({ input: text.trim(), source_language_code: 'en-IN', target_language_code: language_code, model: 'sarvam-translate:v1' }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return Response.json({ error: 'Translation unavailable' }, { status: 503 });
    const result = await response.json();
    if (typeof result.translated_text !== 'string' || !result.translated_text.trim()) {
      return Response.json({ error: 'Translation returned no text' }, { status: 502 });
    }
    return Response.json({ text: result.translated_text.trim() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Translation unavailable' }, { status: 502 });
  }
}
