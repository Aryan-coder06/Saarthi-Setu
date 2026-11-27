import { isLanguage } from '../../../lib/languages.mjs';
import { REQUIRED, FIELDS, present, display, inconsistent } from '../../../lib/profile.mjs';

const api = 'https://api.sarvam.ai/v1/chat/completions';
const fields = ['age', 'gender', 'social_category', 'state', 'activity', 'income_annual', 'project_cost', 'loan_required', 'existing_business', 'purpose'];

async function askSarvam(messages, maxTokens = 500) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error('AI service is not configured');
  const response = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
    body: JSON.stringify({ model: 'sarvam-105b', temperature: 0, max_tokens: maxTokens, response_format: { type: 'json_object' }, messages }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('AI interpretation unavailable');
  const content = (await response.json()).choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('AI returned no interpretation');
  return JSON.parse(content);
}

async function askStructured(messages, maxTokens = 400, model = 'glm5.3-flash') {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error('AI service is not configured');
  const response = await fetch('https://api.sarvam.ai/v2/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
    body: JSON.stringify({ model, temperature: 0, max_tokens: maxTokens, response_format: { type: 'json_object' }, messages }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('Structured interpretation unavailable');
  const content = (await response.json()).choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Structured interpretation missing');
  return JSON.parse(content);
}

async function translateReply(text, language) {
  const response = await fetch('https://api.sarvam.ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': process.env.SARVAM_API_KEY },
    body: JSON.stringify({ input: text, source_language_code: 'en-IN', target_language_code: language, model: 'sarvam-translate:v1' }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Translation unavailable');
  const result = await response.json();
  if (typeof result.translated_text !== 'string' || !result.translated_text.trim()) throw new Error('Empty translation');
  return result.translated_text.trim();
}

async function translateToEnglish(text, language, fallback) {
  if (language === 'en-IN') return fallback || text;
  const shortList = new Set(['bn-IN', 'gu-IN', 'hi-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN']);
  try {
    const response = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': process.env.SARVAM_API_KEY },
      body: JSON.stringify({
        input: text.slice(0, 2000), source_language_code: language, target_language_code: 'en-IN',
        model: shortList.has(language) ? 'mayura:v1' : 'sarvam-translate:v1',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Translation unavailable');
    const result = await response.json();
    return typeof result.translated_text === 'string' && result.translated_text.trim()
      ? result.translated_text.trim() : fallback || text;
  } catch { return fallback || text; }
}

async function identifyLanguage(text) {
  try {
    const response = await fetch('https://api.sarvam.ai/text-lid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': process.env.SARVAM_API_KEY },
      body: JSON.stringify({ input: text.slice(0, 1000) }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const result = await response.json();
    return isLanguage(result.language_code) ? result.language_code : null;
  } catch { return null; }
}

function applyUpdates(profile, updates, missingOnly = false) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return;
  for (const field of fields) {
    if (missingOnly && present(profile[field])) continue;
    let value = updates[field];
    if (value === null || value === undefined || value === '') continue;
    if (field === 'gender') {
      const code = String(value).trim().toLowerCase();
      value = { f: 'F', female: 'F', woman: 'F', m: 'M', male: 'M', man: 'M', o: 'O', other: 'O' }[code];
      if (!value) continue;
    }
    if (field === 'social_category') {
      value = String(value).trim().toUpperCase();
      if (value === 'GENERAL') value = 'GEN';
      if (!['SC', 'ST', 'OBC', 'EWS', 'GEN', 'MINORITY', 'PWD'].includes(value)) continue;
    }
    if (['age', 'income_annual', 'project_cost', 'loan_required'].includes(field)) {
      if (typeof value === 'string' && /^[₹\s\d,]+$/.test(value)) value = Number(value.replace(/[₹,\s]/g, ''));
      if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > (field === 'age' ? 120 : 1e10)) continue;
    }
    if (field === 'existing_business' && typeof value !== 'boolean') continue;
    if (['gender', 'social_category', 'state', 'activity', 'purpose'].includes(field) && (typeof value !== 'string' || value.length > 100)) continue;
    profile[field] = value;
  }
}

async function confirmationReply(profile, history) {
  const facts = FIELDS.filter(([field]) => present(profile[field])).map(([field, label]) => `${label}: ${display(field, profile[field])}`);
  try {
    const answer = await askStructured([
      { role: 'system', content: 'You are Saarthi. Summarize the confirmed profile facts in clear, concise English, including the amounts and business. Ask whether every detail is correct and invite corrections. Do not mention or recommend any schemes yet. Return JSON with a single reply string.' },
      { role: 'user', content: JSON.stringify({ facts, recent_conversation: history.slice(-6) }) },
    ], 350, 'sarvam-105b-conversations');
    if (typeof answer.reply === 'string' && answer.reply.trim()) return answer.reply.trim().slice(0, 1200);
  } catch { /* Keep confirmation available if the language model is briefly unavailable. */ }
  return `I have: ${facts.join('; ')}. Is everything correct? Tell me what to change, or confirm to see your scheme report.`;
}

async function composeReply(result, latestEnglish, history) {
  const profile = result.normalized_profile || {};
  const conflictingAmounts = Number.isFinite(profile.loan_required) && Number.isFinite(profile.project_cost)
    && profile.loan_required > profile.project_cost;
  const context = {
    latest_user_message: latestEnglish,
    conversation: history,
    profile,
    status: result.status,
    next_missing_field: result.missing_fields?.[0] || null,
    rule_engine_questions: result.clarification_questions?.slice(0, 3) || [],
    eligible_scheme_names: (result.eligible_schemes || []).slice(0, 3).map(item => item.scheme?.name || item.name).filter(Boolean),
    summary: result.status === 'OK' ? result.summary_text || '' : '',
    loan_exceeds_project_cost: conflictingAmounts,
  };
  try {
    const answer = await askStructured([
      { role: 'system', content: 'You are Saarthi, a concise, warm government scheme discovery assistant. Use the conversation context and latest English message. Return JSON with a single field reply containing at most two short English sentences. The profile contains facts already learned: do not ask for them again. If loan_exceeds_project_cost is true, first ask the user to reconcile those amounts. Otherwise, if next_missing_field exists, ask ONE relevant question using the Rule Engine question as guidance; briefly acknowledge any request for scheme information or a language change. Do not name schemes unless status is OK. If status is OK, mention only the eligible schemes supplied by the Rule Engine, say matching is preliminary, and invite the user to review the report. If there are no eligible schemes, explain that without inventing one. Never claim loan approval. Do not infer missing profile facts or decide eligibility yourself.' },
      { role: 'user', content: JSON.stringify(context) },
    ], 300, 'sarvam-105b-conversations');
    const reply = answer.reply || answer.response;
    if (typeof reply === 'string' && reply.trim()) return reply.trim().slice(0, 1000);
  } catch { /* Use the Rule Engine's own question below. */ }
  return conflictingAmounts
    ? `Please confirm the loan amount and project cost: the current loan amount is ₹${profile.loan_required} and the project cost is ₹${profile.project_cost}.`
    : result.clarification_questions?.[0] || result.summary_text || 'Please tell me more about your business.';
}

export async function POST(request) {
  try {
    const raw = await request.text();
    if (raw.length > 65536) return Response.json({ error: 'Request too large' }, { status: 413 });
    const body = JSON.parse(raw);
    if (!body.profile || typeof body.profile !== 'object' || Array.isArray(body.profile)) return Response.json({ error: 'Invalid profile' }, { status: 400 });
    const history = Array.isArray(body.conversation_history)
      ? body.conversation_history.slice(-12).filter(item => ['user', 'assistant'].includes(item?.role) && typeof item.text === 'string').map(item => ({ role: item.role, text: item.text.slice(0, 1200) }))
      : [];
    let language = isLanguage(body.conversation_language_code) ? body.conversation_language_code
      : isLanguage(body.language_code) ? body.language_code : null;
    let englishText = '';
    if (typeof body.text === 'string' && body.text.trim()) {
      const [translated, identified] = await Promise.all([askSarvam([
        { role: 'system', content: 'Translate the user message faithfully into English. Detect the language used by the user, including Romanized Indian languages. Preserve negation, uncertainty, numbers, names and corrections. Return JSON with detected_language_code (BCP-47, such as hi-IN or en-IN) and english_text. Do not extract or infer facts.' },
        { role: 'user', content: body.text },
      ], 450).catch(() => ({})), identifyLanguage(body.text)]);
      const fallbackEnglish = typeof translated.english_text === 'string' ? translated.english_text.slice(0, 4000) : '';
      const inputLanguage = isLanguage(body.speech_language_code) ? body.speech_language_code
        : identified && identified !== 'en-IN' ? identified
          : isLanguage(translated.detected_language_code) ? translated.detected_language_code
            : isLanguage(body.language_code) ? body.language_code : identified || 'en-IN';
      englishText = await translateToEnglish(body.text, inputLanguage, fallbackEnglish);
      const extractionPrompt = 'Reconcile beneficiary facts explicitly stated by the user across this conversation with the current profile. Return JSON with recovered_facts (object: facts from previous user messages that are missing from current_profile), latest_updates (object: facts explicitly stated or corrected in latest_message_english), and confirms_profile (boolean). Never copy an older fact into latest_updates. Latest explicit correction wins. Never infer facts from assistant messages, names, place names used only as examples, or scheme descriptions. A tentative amount with maybe, perhaps, or I guess is not confirmed; omit it. A bare number answers current_field. Fields: age integer, gender F/M/O, state Indian state name in English, activity short English business type, existing_business boolean, social_category SC/ST/OBC/EWS/GEN/MINORITY/PWD, income_annual/project_cost/loan_required numeric INR, purpose starting_business/expansion/working_capital/equipment_purchase. Set confirms_profile true only when the latest message clearly confirms the complete profile without correcting it; otherwise false. Do not answer the user or decide eligibility.';
      const [extracted, languageRequest] = await Promise.all([
        askStructured([
          { role: 'system', content: extractionPrompt },
          { role: 'user', content: JSON.stringify({ current_field: body.current_field || null, current_profile: body.profile, previous_user_messages: history.filter(item => item.role === 'user').map(item => item.text), latest_message_english: englishText }) },
        ]).catch(() => ({})),
        askStructured([
          { role: 'system', content: 'The user may request a different reply language in Punjabi, Hindi, Hinglish, or English. Identify the language they want the assistant to use. Return JSON with reply_language_code set to a BCP-47 code or null if there is no language request. Ignore place names like Punjab.' },
          { role: 'user', content: body.text },
        ], 120, 'sarvam-105b-conversations').catch(() => ({})),
      ]);
      applyUpdates(body.profile, extracted.recovered_facts, true);
      applyUpdates(body.profile, extracted.latest_updates);
      body.confirm_profile = body.confirm_profile === true || (body.awaiting_confirmation === true && extracted.confirms_profile === true && (!extracted.latest_updates || Object.keys(extracted.latest_updates).length === 0));
      const requestedReplyLanguage = languageRequest.reply_language_code;
      const normalizedReplyLanguage = isLanguage(requestedReplyLanguage) ? requestedReplyLanguage
        : isLanguage(`${requestedReplyLanguage}-IN`) ? `${requestedReplyLanguage}-IN` : null;
      if (normalizedReplyLanguage) language = normalizedReplyLanguage;
      else if (!language) language = inputLanguage;
      delete body.text;
      delete body.current_field;
    }
    if (!language) language = 'en-IN';
    delete body.speech_language_code;
    delete body.conversation_language_code;
    delete body.conversation_history;
    body.language_code = language;
    const ready = REQUIRED.every(field => present(body.profile[field])) && !inconsistent(body.profile);
    if (ready && body.confirm_profile !== true) {
      const reply = await confirmationReply(body.profile, history);
      let localized = reply;
      if (language !== 'en-IN') {
        try { localized = await translateReply(reply, language); } catch { /* Retain English if translation fails. */ }
      }
      return Response.json({ success: true, status: 'CONFIRM_PROFILE', normalized_profile: body.profile, missing_fields: [], eligible_schemes: [], assistant_reply: localized, conversation_language_code: language, detected_language_code: language, english_text: englishText }, { headers: { 'Cache-Control': 'no-store' } });
    }
    delete body.confirm_profile;
    delete body.awaiting_confirmation;
    const response = await fetch(process.env.RULE_ENGINE_URL || 'http://127.0.0.1:3000/api/v1/match', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000), cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok || result.success === false) return Response.json(result, { status: response.status });
    const reply = await composeReply(result, englishText, history);
    let localized = reply;
    if (language !== 'en-IN') {
      try {
        localized = await translateReply(reply, language);
      } catch { /* Keep the accurate English question when translation is unavailable. */ }
    }
    return Response.json({ ...result, assistant_reply: localized, conversation_language_code: language, detected_language_code: language, english_text: englishText }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error?.message === 'AI service is not configured' ? error.message : 'AI or Rule Engine unavailable' }, { status: 502 });
  }
}
