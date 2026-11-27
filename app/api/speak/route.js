const spokenLanguages = new Set(['en-IN', 'hi-IN', 'bn-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN']);

export async function POST(request) {
  try {
    const key = process.env.SARVAM_API_KEY;
    if (!key) return Response.json({ error: 'Speech service is not configured' }, { status: 503 });
    const { text, language_code } = await request.json();
    if (typeof text !== 'string' || !text.trim() || text.length > 2500 || !spokenLanguages.has(language_code)) {
      return Response.json({ error: 'Invalid speech request' }, { status: 400 });
    }
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
      body: JSON.stringify({
        text: text.trim(), language_code, model: 'bulbul:v4-flash',
        speaker: process.env.SARVAM_TTS_SPEAKER || 'shubh_enhi_ads',
        output_audio_codec: 'wav', enable_preprocessing: true,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return Response.json({ error: 'Speech synthesis unavailable' }, { status: 503 });
    const result = await response.json();
    if (!Array.isArray(result.audios) || typeof result.audios[0] !== 'string') {
      return Response.json({ error: 'Speech synthesis returned no audio' }, { status: 502 });
    }
    return new Response(Buffer.from(result.audios[0], 'base64'), {
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Speech synthesis unavailable' }, { status: 502 });
  }
}
