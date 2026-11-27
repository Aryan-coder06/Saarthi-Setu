'use client';

import React, { useState } from 'react';
import Icon from './Icon';
import { present, rupee } from '../lib/profile.mjs';
import { safeLink } from '../lib/api.mjs';

function documentGroups(item, scheme) {
  const checklist = item.documents;
  if (checklist && Array.isArray(checklist.available)) {
    return [
      { title: 'Likely already available', note: 'Check that you have current, legible copies.', items: checklist.available },
      { title: 'Obtain or confirm', note: 'These may need a certificate, quotation, or other preparation.', items: checklist.obtain || [] },
      { title: 'Other required documents', note: 'Confirm these with the application channel.', items: checklist.required || [] },
    ].filter(group => group.items.length);
  }
  const base = Array.isArray(scheme.documents) ? scheme.documents : [];
  return base.length ? [{ title: 'Documents listed for this scheme', note: 'Confirm the current list with the official channel.', items: base }] : [];
}

function applicationStages(item, scheme, groups) {
  const metadata = scheme.metadata || {};
  const portal = typeof metadata.application_portal === 'string' ? metadata.application_portal.trim() : '';
  const partners = Array.isArray(item.partner_types) && item.partner_types.length
    ? item.partner_types : Array.isArray(scheme.channel_partners?.types) ? scheme.channel_partners.types : [];
  const requiredCount = groups.flatMap(group => group.items).filter(doc => doc.required).length;
  const channel = portal || partners.slice(0, 2).join(' or ');
  return [
    {
      title: 'Confirm the match',
      detail: 'Review the profile and the reasons above. Check the latest eligibility rules and application status on the official scheme source.',
    },
    {
      title: 'Prepare your documents',
      detail: groups.length
        ? `Gather the ${requiredCount} listed required document${requiredCount === 1 ? '' : 's'} and check the notes in the checklist below. “Likely available” is an estimate, not a verification.`
        : 'Ask the official application channel for its current document checklist before applying.',
    },
    {
      title: 'Go to the application channel',
      detail: channel
        ? `Use ${channel} to ask how to apply for this scheme. Confirm whether the application is online or handled by a local partner.`
        : 'Use the official scheme source to find the current application channel or nearest authorized partner.',
    },
    {
      title: 'Submit and track',
      detail: `Submit the completed application through the confirmed channel, keep its acknowledgement, and follow up with ${metadata.nodal_agency || partners[0] || 'the receiving institution'}. The institution decides approval.`,
    },
  ];
}

function SchemeCard({ item, index, demo, completed, onProgress }) {
  const scheme = item.scheme || item;
  const id = scheme.scheme_id || scheme.name || String(index);
  const score = typeof item.score === 'number' ? item.score : item.score?.total_score;
  const url = safeLink(scheme.metadata?.official_url || scheme.url);
  const reasons = (Array.isArray(item.eligibility?.passed) ? item.eligibility.passed : [])
    .map(reason => reason.message).filter(Boolean);
  const groups = documentGroups(item, scheme);
  const stages = applicationStages(item, scheme, groups);
  const financial = item.financial_simulation || item.financial || item.simulation || {};
  const emi = financial.emi ?? financial.monthly_emi ?? financial.emi_monthly;
  const mandatory = groups.flatMap(group => group.items).filter(doc => doc.required).length;
  const current = Math.min(completed + 1, stages.length);

  return <article className="scheme-card" key={id}>
    <div className="scheme-top">
      <span className="scheme-rank">{String(index + 1).padStart(2, '0')}</span>
      <div><small>{scheme.ministry || 'Government finance / discovery'}</small><h3>{scheme.name || scheme.short_name || 'Scheme'}</h3></div>
      <span className="scheme-status"><Icon name={demo ? 'file' : 'check'} size={15}/>{demo ? 'Sample candidate' : 'Rule-checked'}</span>
    </div>
    {scheme.description && <p>{scheme.description}</p>}
    {!demo && Number.isFinite(score) && <div className="score-line">Match score: <strong>{score}/100</strong> <small>Not an approval probability</small></div>}
    {!demo && Number.isFinite(emi) && <div className="score-line">Indicative EMI: <strong>{rupee(emi)}/month</strong></div>}
    {reasons.length > 0 && <div className="report-reasons"><strong>Why it matches</strong>{reasons.slice(0, 5).map((reason, i) => <p key={i}><Icon name="check" size={15}/>{reason}</p>)}</div>}

    <div className="scheme-path">
      <div className="scheme-subhead"><div><span className="section-index">APPLICATION PATH</span><h4>What to do next</h4></div><span>{completed === stages.length ? 'All stages marked done' : `Stage ${current} of ${stages.length}`}</span></div>
      <p className="scheme-path-note">Use these stages as your personal guide. Marking a stage done is saved only while this page is open.</p>
      <ol className="stage-list">{stages.map((stage, i) => {
        const done = i < completed;
        const active = i === completed;
        return <li className={done ? 'done' : active ? 'active' : ''} key={stage.title}>
          <button type="button" className="stage-circle" aria-label={`${stage.title}: ${done ? 'mark not done' : 'mark done'}`} aria-pressed={done} onClick={() => onProgress(id, done ? i : i + 1)}>{done ? <Icon name="check" size={21}/> : String(i + 1).padStart(2, '0')}</button>
          <div><h5>{stage.title}</h5><p>{stage.detail}</p></div>
        </li>;
      })}</ol>
    </div>

    <div className="scheme-documents">
      <div className="scheme-subhead"><div><span className="section-index">DOCUMENT CHECKLIST</span><h4>What to carry or prepare</h4></div><span>{mandatory} required</span></div>
      {groups.length ? groups.map(group => <div className="document-group" key={group.title}>
        <h5>{group.title}</h5><p>{group.note}</p>
        <ul>{group.items.map((doc, i) => <li key={doc.id || i}><span className="doc-mark"><Icon name="file" size={15}/></span><div><strong>{doc.name}</strong>{doc.note && <small>{doc.note}</small>}</div><span className={'doc-requirement ' + (doc.required ? 'required' : '')}>{doc.required ? 'Required' : 'If applicable'}</span></li>)}</ul>
      </div>) : <p className="report-empty">The Rule Engine has no document list for this candidate. Ask the official application channel for the current checklist.</p>}
    </div>
    <div className="scheme-apply-footer">
      {scheme.metadata?.application_portal && <p><strong>Application channel:</strong> {scheme.metadata.application_portal}</p>}
      {Array.isArray(item.partner_types) && item.partner_types.length > 0 && <p><strong>Partner institutions:</strong> {item.partner_types.join(', ')}</p>}
      {scheme.metadata?.helpline && <p><strong>Scheme helpline:</strong> {scheme.metadata.helpline}</p>}
      {url && <a href={url} target="_blank" rel="noreferrer" className="text-link">Check official scheme information <Icon name="diagonal" size={15}/></a>}
    </div>
  </article>;
}

export default function Report({ result, profile, onEdit }) {
  const { items, demo } = result;
  const [progress, setProgress] = useState({});
  const cost = Number(profile.project_cost), loan = Number(profile.loan_required);
  const valid = present(profile.project_cost) && present(profile.loan_required) && cost > 0 && loan >= 0 && loan <= cost;
  const pct = valid ? Math.round(loan / cost * 100) : 0;
  const updateProgress = (id, value) => setProgress(current => ({ ...current, [id]: value }));

  return <section id="report" className="report-section" lang="en">
    <div className="report-header"><div><span className="section-index">03 / PERSONALIZED GUIDANCE</span><h2>Your next step,<br/><em>made clearer.</em></h2><p>{demo ? 'Illustrative discovery report — not a live eligibility evaluation.' : 'Preliminary scheme guidance based on your submitted profile.'} This report is in English.</p></div><div className="report-actions"><button className="btn outline" onClick={onEdit}>Review profile <Icon name="edit" size={16}/></button><button className="btn dark" onClick={() => window.print()}>Save report <Icon name="download" size={16}/></button></div></div>
    <div className="report-stats">{[['Total project cost', profile.project_cost], ['Requested loan', profile.loan_required], ['Annual family income', profile.income_annual]].map(([title, value]) => <div key={title}><small>{title}</small><strong>{rupee(value)}</strong></div>)}</div>
    {valid && <div className="funding"><div><span className="section-index">FUNDING SNAPSHOT</span><h3>{pct}% requested as credit</h3><p>Based on your stated amounts, not an approved financing structure.</p></div><div className="funding-visual"><div className="funding-bar"><i style={{ width: pct + '%' }}/></div><div><span>Loan {rupee(loan)}</span><span>Remaining {rupee(cost - loan)}</span></div></div></div>}
    <div className="report-list-title"><h3>{demo ? 'Illustrative candidates' : 'Preliminary eligible matches'}</h3><span>{items.length} result{items.length === 1 ? '' : 's'}</span></div>
    {items.length === 0 && <div className="report-empty">No verified eligible scheme was returned. Review your profile or seek authorized assistance.</div>}
    {items.map((item, index) => <SchemeCard key={item.scheme?.scheme_id || item.name || index} item={item} index={index} demo={demo} completed={progress[item.scheme?.scheme_id || item.name || String(index)] || 0} onProgress={updateProgress}/>)}
    <p className="report-disclaimer"><Icon name="shield" size={18}/> The document grouping is an estimate, and the stages are guidance. Verify current rules, documents, application channels and lending conditions with the official institution. This report does not guarantee approval.</p>
  </section>;
}
