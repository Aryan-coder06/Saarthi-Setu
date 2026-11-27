import { isLanguage } from '../../../lib/languages.mjs';

const temporaryStatuses = new Set([429, 500, 502, 503, 504]);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function publicError(status, details) {
  if (status === 429) return 'Sarvam speech service is busy. Please retry the recording or send the browser transcript.';
  if (status === 400 || status === 415 || status === 422) {
    const code = String(details?.error?.code || details?.code || '');
    return code.includes('duration') ? 'The recording is too long. Please keep it under 30 seconds.'
      : 'Sarvam could not read this recording. Please retry or send the browser transcript.';
  }
  if (status === 401 || status === 403) return 'Sarvam speech access is unavailable. Please use the browser transcript for now.';
  return 'Sarvam transcription is temporarily unavailable. Please retry or send the browser transcript.';
}

export async function POST(request) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return Response.json({ error: 'Sarvam speech service is not configured.' }, { status: 503 });
  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    return Response.json({ error: 'Audio form required.' }, { status: 400 });
  }

  let audio, requested;
  try {
    const data = await request.formData();
    audio = data.get('audio');
    requested = data.get('language_code');
  } catch {
    return Response.json({ error: 'Could not read the uploaded recording.' }, { status: 400 });
  }
  if (!(audio instanceof File) || !audio.size || audio.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'Invalid or empty recording.' }, { status: 400 });
  }
  const language = isLanguage(requested) ? requested : 'unknown';

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const form = new FormData();
      form.append('file', audio, audio.name || 'answer.webm');
      form.append('model', 'saaras:v4');
      form.append('mode', 'transcribe');
      form.append('language_code', language);
      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: { 'api-subscription-key': key },
        body: form,
        // A near-30-second recording can take longer than 20 seconds to process.
        signal: AbortSignal.timeout(45000),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        const text = String(result.transcript || '').trim();
        if (!text) return Response.json({ error: 'No speech was recognized. Try speaking closer to the microphone.' }, { status: 422 });
        return Response.json({
          text,
          language_code: isLanguage(result.language_code) ? result.language_code : language,
        }, { headers: { 'Cache-Control': 'no-store' } });
      }
      console.error('[Saarthi STT] Sarvam returned', { status: response.status, code: result?.error?.code || null, message: String(result?.error?.message || result?.message || '').slice(0, 240), requestId: result?.request_id || result?.error?.request_id || null, attempt: attempt + 1 });
      if (!temporaryStatuses.has(response.status) || attempt === 1) {
        return Response.json({ error: publicError(response.status, result) }, { status: temporaryStatuses.has(response.status) ? 503 : response.status });
      }
    } catch (error) {
      console.error('[Saarthi STT] Request failed', { name: error?.name || 'Error', attempt: attempt + 1 });
      if (attempt === 1) return Response.json({ error: 'Sarvam transcription timed out. Please retry or send the browser transcript.' }, { status: 503 });
    }
    await delay(500);
  }
}
