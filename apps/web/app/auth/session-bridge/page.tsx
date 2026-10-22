'use client';
import { useEffect } from 'react';
import { restoreSession } from '@epapers/auth/client';
import { portalOrigins } from '@epapers/config/portals';
export default function SessionBridge() {
  useEffect(() => {
    const receive = async (event: MessageEvent) => {
      if (event.source !== window.parent || !Object.values(portalOrigins).includes(event.origin) || event.data?.type !== 'epapers:refresh' || typeof event.data.id !== 'string') return;
      const session = await restoreSession();
      window.parent.postMessage({ type: 'epapers:session', id: event.data.id, session }, event.origin);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return null;
}
