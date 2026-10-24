import Link from 'next/link';
import type { paperDto } from '@epapers/server/modules/catalog/dto';
import styles from './catalogue-results.module.css';

type Paper = ReturnType<typeof paperDto>;

function categoryLabel(category: string, testNumber: number | null | undefined) {
  return category === 'TEST' ? (testNumber ? `Test ${testNumber}` : 'Test') : category;
}

export function PaperList({ items }: { items: Paper[] }) {
  if (!items.length) {
    return (
      <div className={styles.emptyState}>
        <h2>No papers found</h2>
        <p>Try a different module code or fewer filters, or explore the departments.</p>
        <Link href="/departments">Browse departments <span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  return (
    <ul className={styles.paperGrid}>
      {items.map(paper => (
        <li key={paper.id} className={styles.paperCard}>
          <div className={styles.paperTopline}>
            <span className={styles.moduleCode}>{paper.module.code}</span>
            <span className={styles.paperCategory}>{categoryLabel(paper.category, paper.testNumber)} · {paper.academicYear}</span>
          </div>
          <h2 className={styles.paperTitle}>
            <Link href={`/papers/${paper.id}`}>{paper.title}</Link>
          </h2>
          <p className={styles.moduleName}>{paper.module.name}</p>
          <div className={styles.paperFooter}>
            <span>Semester {paper.semester}</span>
            <span>{paper.downloadsCount.toLocaleString()} downloads</span>
            {paper.hasMarkingScheme && <span>Marking scheme</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HomeHero() {
  return (
    <section className={styles.homeHero}>
      <div className={styles.heroContent}>
        <p className={styles.heroEyebrow}>EPapers · Tusome Pamoja</p>
        <h1>Prepare with confidence. <span>Learn from past papers.</span></h1>
        <p>Explore examination papers by department, program and module. A shared academic archive, built by the DIT community.</p>
        <Link href="/departments">Browse departments <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}

export function PageHeading({ kind }: { kind: 'search' | 'popular' }) {
  return (
    <header className={styles.pageHeading}>
      <p className={styles.eyebrow}>{kind === 'popular' ? 'Community favourites' : 'The examination archive'}</p>
      <h1>{kind === 'popular' ? 'Popular papers' : 'Search examination papers'}</h1>
      <p>{kind === 'popular' ? 'Discover papers the DIT community uses most.' : 'Find past papers by module, category, year and semester.'}</p>
    </header>
  );
}

export function ListHeading({ title, count, href, linkLabel }: { title: string; count?: number; href?: string; linkLabel?: string }) {
  return (
    <div className={styles.listHeading}>
      <div>
        <h2>{title}</h2>
        {count !== undefined && <p>{count} {count === 1 ? 'paper' : 'papers'} on this page</p>}
      </div>
      {href && linkLabel && <Link href={href}>{linkLabel} <span aria-hidden="true">→</span></Link>}
    </div>
  );
}
