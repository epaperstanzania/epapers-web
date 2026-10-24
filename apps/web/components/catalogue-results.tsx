import Link from 'next/link';
import type { paperDto } from '@epapers/server/modules/catalog/dto';
import styles from './catalogue-results.module.css';

export type CatalogueQuery = Record<string, string | string[] | undefined>;
type Paper = ReturnType<typeof paperDto>;

function queryValue(query: CatalogueQuery, key: string) {
  return typeof query[key] === 'string' ? query[key] : '';
}

function categoryLabel(category: string, testNumber: number | null | undefined) {
  return category === 'TEST' ? (testNumber ? `Test ${testNumber}` : 'Test') : category;
}

export function SearchForm({ query = {}, showReset = false }: { query?: CatalogueQuery; showReset?: boolean }) {
  const context = new URLSearchParams();
  for (const key of ['departmentId', 'programId', 'moduleId']) {
    const value = queryValue(query, key);
    if (value) context.set(key, value);
  }
  const resetHref = context.size ? `/search?${context}` : '/search';
  const hasFilters = ['q', 'category', 'testNumber', 'academicYear', 'semester', 'hasMarkingScheme']
    .some(key => queryValue(query, key) !== '') || (queryValue(query, 'sortBy') !== '' && queryValue(query, 'sortBy') !== 'recent');

  return (
    <form action="/search" method="get" role="search" aria-label="Search examination papers" className={styles.searchForm}>
      <div className={styles.formIntro}>
        <div>
          <p className={styles.eyebrow}>Explore the archive</p>
          <h2 className={styles.formTitle}>Find a paper</h2>
        </div>
        <p className={styles.formHint}>Search by module code, module name or paper title.</p>
      </div>

      <label className={styles.field} htmlFor="paper-query">
        <span>Search papers</span>
        <input
          id="paper-query"
          name="q"
          type="search"
          maxLength={120}
          defaultValue={queryValue(query, 'q')}
          placeholder="e.g. COE07201 or Digital Electronics"
          className={styles.control}
        />
      </label>

      <div className={styles.filtersHeading}>Refine your results</div>
      <div className={styles.filtersGrid}>
        <label className={styles.field} htmlFor="paper-category">
          <span>Exam category</span>
          <select id="paper-category" name="category" defaultValue={queryValue(query, 'category')} className={styles.control}>
            <option value="">All categories</option>
            <option value="TEST">All tests</option>
            <option value="UE">UE</option>
            <option value="SUPP">SUPP</option>
          </select>
        </label>
        <label className={styles.field} htmlFor="paper-test-number">
          <span>Test number</span>
          <select id="paper-test-number" name="testNumber" defaultValue={queryValue(query, 'testNumber')} className={styles.control}>
            <option value="">Any test</option>
            <option value="1">Test 1</option>
            <option value="2">Test 2</option>
          </select>
        </label>
        <label className={styles.field} htmlFor="paper-sort">
          <span>Sort by</span>
          <select id="paper-sort" name="sortBy" defaultValue={queryValue(query, 'sortBy') || 'recent'} className={styles.control}>
            <option value="recent">Most recent</option>
            <option value="popular">Most downloaded</option>
            <option value="year_desc">Newest academic year</option>
            <option value="year_asc">Oldest academic year</option>
          </select>
        </label>
        <label className={styles.field} htmlFor="paper-year">
          <span>Academic year</span>
          <input
            id="paper-year"
            name="academicYear"
            type="number"
            inputMode="numeric"
            min={2000}
            max={2200}
            defaultValue={queryValue(query, 'academicYear')}
            placeholder="e.g. 2025"
            className={styles.control}
          />
        </label>
        <label className={styles.field} htmlFor="paper-semester">
          <span>Semester</span>
          <select id="paper-semester" name="semester" defaultValue={queryValue(query, 'semester')} className={styles.control}>
            <option value="">Both semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
        </label>
      </div>

      <div className={styles.formFooter}>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="hasMarkingScheme" value="true" defaultChecked={queryValue(query, 'hasMarkingScheme') === 'true'} />
          <span>With marking scheme</span>
        </label>
        <div className={styles.actions}>
          {showReset && hasFilters && <Link className={styles.resetLink} href={resetHref}>Clear filters</Link>}
          <button type="submit" className={styles.submitButton}>Search archive <span aria-hidden="true">→</span></button>
        </div>
      </div>
      {[...context].map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
    </form>
  );
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
