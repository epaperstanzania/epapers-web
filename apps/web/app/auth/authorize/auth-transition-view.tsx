import Image from 'next/image';
import styles from './auth-transition.module.css';

export type AuthTransitionPhase = 'checking' | 'redirecting' | 'connecting' | 'opening';

const messages: Record<AuthTransitionPhase, string> = {
  checking: 'Checking your session…',
  redirecting: 'Taking you to sign in…',
  connecting: 'Completing your secure sign-in…',
  opening: 'Opening your workspace…',
};

export function AuthTransitionView({ phase, error }: { phase: AuthTransitionPhase; error?: string }) {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.card} aria-labelledby="auth-transition-title">
        <div className={styles.brand}>
          <Image src="/E-Papers-logo.png" alt="" width={32} height={32} priority />
          <span>EPapers</span>
        </div>

        {error ? (
          <div className={styles.errorIcon} aria-hidden="true">!</div>
        ) : (
          <div className={styles.loader} aria-hidden="true">
            <span className={styles.loaderRing} />
            <span className={styles.loaderCenter}>
              <Image src="/E-Papers-logo.png" alt="" width={42} height={42} priority />
            </span>
          </div>
        )}

        <p className={styles.eyebrow}>{error ? 'Connection interrupted' : 'Secure connection'}</p>
        <h1 id="auth-transition-title" className={styles.title}>
          {error ? 'Could not connect your workspace' : 'Connecting your workspace'}
        </h1>
        {error ? (
          <p className={styles.message} role="alert">{error}</p>
        ) : (
          <p className={styles.message} role="status" aria-live="polite" aria-atomic="true">{messages[phase]}</p>
        )}

        <div className={styles.footer}>
          <p>{error ? 'You can start the sign-in again from your portal.' : 'Please keep this tab open for a moment.'}</p>
          <a href="/" className={styles.returnLink}>Return to EPapers <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </main>
  );
}
