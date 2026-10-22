'use client';
import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { request } from '../../services/client';
import { LoaderCircle } from 'lucide-react';

export function ApiForm({ endpoint, payload, onSubmit, children, className, requireAuth = false }: {
  endpoint: string;
  payload: (form: FormData) => Record<string, unknown>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  requireAuth?: boolean;
}) {
  const { accessToken } = useAuth();
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (requireAuth && !accessToken) { setError('Please sign in before submitting.'); return; }
    const form = new FormData(event.currentTarget);
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      await request(endpoint, { method: 'POST', body: payload(form), auth: requireAuth });
      await onSubmit(event);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your request could not be submitted.');
    } finally { inFlight.current = false; setPending(false); }
  };
  return <form onSubmit={submit} className={className} aria-busy={pending}>
    {pending && <p role="status" className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Submitting… Please wait.</p>}
    {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
    <fieldset disabled={pending} className="contents">{children}</fieldset>
  </form>;
}
