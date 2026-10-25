import Link from 'next/link';
import { notFound } from 'next/navigation';
import * as catalogue from '@epapers/server/modules/catalog/service';
import { cachedDepartment, cachedDepartments, cachedModules, cachedProgram, cachedPrograms } from '@/lib/catalogue-cache';
import { catalogSchemas, uuid } from '@epapers/server/modules/catalog/schemas';
import { ApiError } from '@epapers/config/errors';
import { PaperActions } from '@epapers/ui/components/common/PaperActions';
import { DepartmentDirectory, DepartmentsDirectory, ProgramDirectory } from './catalogue-directory';
import { HomeHero, ListHeading, PageHeading, PaperList } from './catalogue-results';
import { SearchForm, type CatalogueQuery } from './catalogue-search';
import styles from './catalogue-results.module.css';

function cleanQuery(query: CatalogueQuery) {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '' && value !== undefined));
}

function NextPage({ cursor, path, query = {} }: { cursor: string | null; path: string; query?: CatalogueQuery }) {
  if (!cursor) return null;
  const params = new URLSearchParams(cleanQuery(query) as Record<string, string>);
  params.set('cursor', cursor);
  return <Link className={styles.pagination} href={`${path}?${params}`}>Next page <span aria-hidden="true">→</span></Link>;
}

function categoryLabel(category: string, testNumber: number | null | undefined) {
  return category === 'TEST' ? (testNumber ? `Test ${testNumber}` : 'Test') : category;
}

export async function CataloguePage({
  kind,
  params = {},
  query = {},
}: {
  kind: string;
  params?: Record<string, string>;
  query?: CatalogueQuery;
}) {
  try {
    let content: React.ReactNode;

    if (kind === 'home') {
      const result = await catalogue.papers(catalogSchemas.papers.parse({ limit: 6, sortBy: 'popular' }));
      content = <>
        <HomeHero />
        <SearchForm />
        <ListHeading title="Popular papers" href="/popular" linkLabel="View all" />
        <PaperList items={result.items} />
      </>;
    } else if (kind === 'search' || kind === 'popular') {
      const raw = cleanQuery({ ...query, ...(kind === 'popular' ? { sortBy: 'popular' } : {}) });
      const parsed = catalogSchemas.papers.safeParse(raw);
      if (!parsed.success) return <InvalidQuery />;
      const result = await catalogue.papers(parsed.data);
      content = <>
        <PageHeading kind={kind} />
        <SearchForm query={raw} showReset />
        <ListHeading title={kind === 'popular' ? 'Most downloaded' : 'Search results'} count={result.items.length} />
        <PaperList items={result.items} />
        <NextPage cursor={result.nextCursor} path={`/${kind}`} query={raw} />
      </>;
    } else if (kind === 'departments') {
      const parsed = catalogSchemas.departments.safeParse(cleanQuery(query));
      if (!parsed.success) return <InvalidQuery />;
      const result = await cachedDepartments(parsed.data);
      content = <>
        <DepartmentsDirectory departments={result.items} />
        <NextPage cursor={result.nextCursor} path="/departments" query={query} />
      </>;
    } else if (kind === 'department') {
      if (!uuid.safeParse(params.dept).success) notFound();
      const department = await cachedDepartment(params.dept);
      const parsed = catalogSchemas.programs.safeParse({ ...cleanQuery(query), departmentId: department.id });
      if (!parsed.success) return <InvalidQuery />;
      const result = await cachedPrograms(parsed.data);
      content = <>
        <DepartmentDirectory department={department} programs={result.items} />
        <NextPage cursor={result.nextCursor} path={`/departments/${department.id}`} query={query} />
      </>;
    } else if (kind === 'program') {
      if (!uuid.safeParse(params.id).success) notFound();
      const program = await cachedProgram(params.id);
      const parsed = catalogSchemas.modules.safeParse({ ...cleanQuery(query), programId: program.id });
      if (!parsed.success) return <InvalidQuery />;
      const result = await cachedModules(parsed.data);
      content = <>
        <ProgramDirectory program={program} modules={result.items} />
        <NextPage cursor={result.nextCursor} path={`/programs/${program.id}`} query={query} />
      </>;
    } else if (kind === 'module') {
      if (!params.code || params.code.length > 100) notFound();
      const module = await catalogue.moduleDetail(params.code);
      const parsed = catalogSchemas.papers.safeParse({ ...cleanQuery(query), moduleId: module.id });
      if (!parsed.success) return <InvalidQuery />;
      const result = await catalogue.papers(parsed.data);
      content = <>
        <header className={styles.moduleHeader}>
          <p className={styles.eyebrow}>{module.code}</p>
          <h1>{module.name}</h1>
          <p>Year {module.levelYear ?? 1} ? Semester {((module.levelYear ?? 1) - 1) * 2 + module.semester}{module.credits ? ` · ${module.credits} credits` : ''}</p>
        </header>
        <ListHeading title="Available papers" count={result.items.length} />
        <PaperList items={result.items} />
        <NextPage cursor={result.nextCursor} path={`/modules/${module.id}`} query={query} />
      </>;
    } else if (kind === 'paper') {
      if (!uuid.safeParse(params.id).success) notFound();
      const paper = await catalogue.paper(params.id);
      content = <article className={styles.paperDetail}>
        <Link className={styles.paperBack} href={`/modules/${paper.module.id}`}>
          {paper.module.code} — {paper.module.name}
        </Link>
        <h1>{paper.title}</h1>
        <p>{categoryLabel(paper.category, paper.testNumber)} · {paper.academicYear}/{paper.academicYear + 1} · Semester {paper.semester} · {paper.examPeriod}</p>
        <p>{paper.department.name} · {paper.program.name}</p>
        {paper.uploader && <p>Contributed by <Link className={styles.paperBack} href={`/u/${encodeURIComponent(paper.uploader.username)}`}>@{paper.uploader.username}</Link>{paper.uploader.isLecturerVerified ? ' · Verified lecturer' : ''}</p>}
        <PaperActions id={paper.id} available={paper.downloadAvailable} hasMarkingScheme={paper.hasMarkingScheme} />
      </article>;
    } else {
      notFound();
    }

    return <div className="epapers-catalogue mx-auto grid w-full min-w-0 max-w-7xl gap-6 pb-8 sm:gap-8">{content}</div>;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof Error && error.message.startsWith('NEXT_')) throw error;
    return <section className={styles.statusCard}>
      <h1>The archive is temporarily unavailable</h1>
      <p role="alert">We could not load the archive. Please try again shortly.</p>
      <a href="">Retry</a>
    </section>;
  }
}

function InvalidQuery() {
  return <section className={styles.statusCard}>
    <h1>Check your search filters</h1>
    <p role="alert">One or more filters are invalid. Choose an exam category, a year from 2000 to 2200, and semester 1 or 2.</p>
    <Link href="/search">Reset search</Link>
  </section>;
}
