import {demoMatch,inconsistent} from './profile.mjs';
export const config={matchUrl:process.env.NEXT_PUBLIC_MATCH_URL||'',transcribeUrl:process.env.NEXT_PUBLIC_TRANSCRIBE_URL||'',videoUrl:process.env.NEXT_PUBLIC_IVR_VIDEO_URL||''};
export async function match({text,profile,patch,current,language,conversationLanguage,history,speechLanguage,sessionId,confirmProfile=false,awaitingConfirmation=false,signal,endpoint=config.matchUrl}){
  if(!endpoint)return demoMatch(profile,text,current,patch);
  const body={profile:{...profile,...patch},channel:'web',language_code:language,conversation_language_code:conversationLanguage,conversation_history:history,session_id:sessionId,topN:3,confirm_profile:confirmProfile,awaiting_confirmation:awaitingConfirmation};
  if(text&&!patch&&!confirmProfile)body.text=text;if(current&&!patch&&!confirmProfile)body.current_field=current;if(speechLanguage&&!patch&&!confirmProfile)body.speech_language_code=speechLanguage;
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal,cache:'no-store'});
  if(!r.ok){const error=await r.json().catch(()=>({}));throw Error(error.error||'Matching service returned HTTP '+r.status)}
  const d=await r.json();if(d.success===false||!d.normalized_profile||typeof d.normalized_profile!=='object'||Array.isArray(d.normalized_profile))throw Error('Invalid Rule Engine response.');
  if(!['OK','NO_MATCH','NEEDS_MORE_INFO','CLARIFICATION_REQUIRED','CONFIRM_PROFILE'].includes(d.status))throw Error('Unknown Rule Engine status.');
  if(inconsistent(d.normalized_profile))return {...d,status:'CLARIFICATION_REQUIRED',missing_fields:['project_cost'],eligible_schemes:[]};
  return d;
}
export async function transcribe(blob,language,signal){if(!config.transcribeUrl)throw Error('No transcription endpoint configured.');const mime=blob.type.split(';')[0];const extension=mime.includes('webm')?'webm':mime.includes('mp4')||mime.includes('m4a')?'m4a':mime.includes('ogg')?'ogg':mime.includes('wav')?'wav':mime.includes('aac')?'aac':'webm';const form=new FormData();form.append('audio',blob,'answer.'+extension);form.append('language_code',language);const r=await fetch(config.transcribeUrl,{method:'POST',body:form,signal,cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Transcription service returned HTTP '+r.status);if(typeof d.text!=='string'||!d.text.trim())throw Error('No speech was recognized.');return {text:d.text.trim(),language_code:d.language_code};}
export function safeLink(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
export function eligibleItems(result){return (Array.isArray(result?.eligible_schemes)?result.eligible_schemes:[]).filter(x=>x?.eligibility?.status==='ELIGIBLE').slice(0,3)}
