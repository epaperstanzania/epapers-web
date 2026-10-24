'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './catalogue-results.module.css';

export type CatalogueQuery = Record<string, string | string[] | undefined>;

function queryValue(query: CatalogueQuery, key: string) {
  return typeof query[key] === 'string' ? query[key] : '';
}

function SearchFields({
  query,
  idPrefix,
  context,
  resetHref,
  showReset,
  hasFilters,
  onReset,
}: {
  query: CatalogueQuery;
  idPrefix: string;
  context: [string, string][];
  resetHref: string;
  showReset: boolean;
  hasFilters: boolean;
  onReset?: () => void;
}) {
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <form action="/search" method="get" role="search" aria-label="Search examination papers" className={styles.searchForm}>
      <div className={styles.formIntro}>
        <div>
          <p className={styles.eyebrow}>Explore the archive</p>
          <h2 className={styles.formTitle}>Find a paper</h2>
        </div>
        <p className={styles.formHint}>Search by module code, module name or paper title.</p>
      </div>

      <label className={styles.field} htmlFor={id('query')}>
        <span>Search papers</span>
        <input
          id={id('query')}
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
        <label className={styles.field} htmlFor={id('category')}>
          <span>Exam category</span>
          <select id={id('category')} name="category" defaultValue={queryValue(query, 'category')} className={styles.control}>
            <option value="">All categories</option>
            <option value="TEST">All tests</option>
            <option value="UE">UE</option>
            <option value="SUPP">SUPP</option>
          </select>
        </label>
        <label className={styles.field} htmlFor={id('test-number')}>
          <span>Test number</span>
          <select id={id('test-number')} name="testNumber" defaultValue={queryValue(query, 'testNumber')} className={styles.control}>
            <option value="">Any test</option>
            <option value="1">Test 1</option>
            <option value="2">Test 2</option>
          </select>
        </label>
        <label className={styles.field} htmlFor={id('sort')}>
          <span>Sort by</span>
          <select id={id('sort')} name="sortBy" defaultValue={queryValue(query, 'sortBy') || 'recent'} className={styles.control}>
            <option value="recent">Most recent</option>
            <option value="popular">Most downloaded</option>
            <option value="year_desc">Newest academic year</option>
            <option value="year_asc">Oldest academic year</option>
          </select>
        </label>
        <label className={styles.field} htmlFor={id('year')}>
          <span>Academic year</span>
          <input
            id={id('year')}
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
        <label className={styles.field} htmlFor={id('semester')}>
          <span>Semester</span>
          <select id={id('semester')} name="semester" defaultValue={queryValue(query, 'semester')} className={styles.control}>
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
          {showReset && hasFilters && <Link className={styles.resetLink} href={resetHref} onClick={onReset}>Clear filters</Link>}
          <button type="submit" className={styles.submitButton}>Search archive <span aria-hidden="true">→</span></button>
        </div>
      </div>
      {context.map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
    </form>
  );
}

export function SearchForm({ query = {}, showReset = false }: { query?: CatalogueQuery; showReset?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const context: [string, string][] = [];
  for (const key of ['departmentId', 'programId', 'moduleId']) {
    const value = queryValue(query, key);
    if (value) context.push([key, value]);
  }
  const resetParams = new URLSearchParams(context);
  const resetHref = resetParams.size ? `/search?${resetParams}` : '/search';
  const activeFields = ['q', 'category', 'testNumber', 'academicYear', 'semester', 'hasMarkingScheme'];
  const hasFilters = activeFields.some(key => queryValue(query, key) !== '')
    || (queryValue(query, 'sortBy') !== '' && queryValue(query, 'sortBy') !== 'recent');
  const filterCount = activeFields.filter(key => key !== 'q' && queryValue(query, key) !== '').length
    + (queryValue(query, 'sortBy') && queryValue(query, 'sortBy') !== 'recent' ? 1 : 0);
  const summary = queryValue(query, 'q')
    ? `Searching: ${queryValue(query, 'q')}`
    : filterCount ? `${filterCount} ${filterCount === 1 ? 'filter' : 'filters'} applied` : 'By module code, category, year or semester';
  const queryKey = JSON.stringify(query);

  function closeDrawer() {
    if (dialogRef.current?.open) dialogRef.current.close();
  }

  function openDrawer() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setIsOpen(true);
    requestAnimationFrame(() => dialog.querySelector<HTMLElement>('[data-search-drawer-title]')?.focus());
  }

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia('(min-width: 48rem)');
    const closeOnDesktop = () => { if (media.matches) dialogRef.current?.close(); };
    media.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      media.removeEventListener('change', closeOnDesktop);
    };
  }, [isOpen]);

  const fields = { query, context, resetHref, showReset, hasFilters };
  return <>
    <button
      type="button"
      className={styles.mobileSearchTrigger}
      onClick={openDrawer}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls="catalogue-mobile-search"
    >
      <span className={styles.mobileSearchTriggerText}>
        <strong>Search & filter papers</strong>
        <small>{summary}</small>
      </span>
      <span className={styles.mobileSearchTriggerAction} aria-hidden="true">Open</span>
    </button>

    <div className={styles.desktopSearch}>
      <SearchFields key={queryKey} {...fields} idPrefix="desktop-paper" />
    </div>

    <dialog
      id="catalogue-mobile-search"
      ref={dialogRef}
      className={styles.mobileSearchDialog}
      aria-labelledby="catalogue-mobile-search-title"
      onClose={() => setIsOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) closeDrawer(); }}
    >
      <div className={styles.drawerPanel}>
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.eyebrow}>The examination archive</p>
            <h2 id="catalogue-mobile-search-title" data-search-drawer-title tabIndex={-1}>Search & filters</h2>
          </div>
          <button type="button" className={styles.drawerClose} onClick={closeDrawer}>Close</button>
        </div>
        <div className={styles.drawerBody}>
          <SearchFields key={queryKey} {...fields} idPrefix="mobile-paper" onReset={closeDrawer} />
        </div>
      </div>
    </dialog>
  </>;
}
