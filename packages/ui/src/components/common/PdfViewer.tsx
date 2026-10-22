'use client';
import { PageLoader } from './PageLoader';
import React, { useEffect, useState } from 'react';
import type { Paper } from '../../types';
import { api } from '../../services/api';

export const PdfViewer: React.FC<{ paper: Paper; isMarkingSchemeActive?: boolean }> = ({ paper, isMarkingSchemeActive = false }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [opened, setOpened] = useState(false);
  useEffect(() => { setOpened(false); setUrl(''); setError(''); }, [paper.id, isMarkingSchemeActive]);
  useEffect(() => {
    if (!opened) return;
    let active = true;
    setLoading(true); setError(''); setUrl('');
    api.getDownloadUrl(paper.id, isMarkingSchemeActive ? 'marking_scheme' : 'exam')
      .then(file => { if (active) setUrl(file.url); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'The PDF could not be opened.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [paper.id, isMarkingSchemeActive, attempt, opened]);
  return <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
    <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{isMarkingSchemeActive ? 'Marking scheme' : 'Exam paper'}</h2>
      <button onClick={() => { setOpened(true); setAttempt(n => n + 1); }} className="rounded border px-3 py-2 text-sm">{opened ? 'Refresh PDF link' : 'Open PDF'}</button></div>
    {loading && <PageLoader variant="detail" label="Opening PDF…" compact />}
    {error && <p role="alert" className="text-[var(--color-danger)]">{error}</p>}
    {url && <><iframe title={`${paper.title} PDF`} src={url} className="h-[70vh] w-full rounded border" referrerPolicy="no-referrer" />
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Open PDF in a new tab</a></>}
    {!opened && <p className="text-sm text-[var(--color-text-muted)]">Open the original PDF when you’re ready. Files awaiting scanning or publication will become available later.</p>}
  </section>;
};
