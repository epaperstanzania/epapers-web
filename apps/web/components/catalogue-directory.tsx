import Link from 'next/link';
import type { departmentDto, moduleDto, programDto } from '@epapers/server/modules/catalog/dto';
import { CatalogueMotionCard } from './catalogue-motion-card';
import styles from './catalogue-directory.module.css';

type Department = ReturnType<typeof departmentDto>;
type Program = ReturnType<typeof programDto>;
type Module = ReturnType<typeof moduleDto>;

function DirectoryHeader({ backHref, backLabel, eyebrow, title, description, details = [] }: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  details?: string[];
}) {
  return (
    <div className={styles.intro}>
      <Link className={styles.backLink} href={backHref}>
        <span aria-hidden="true">←</span> {backLabel}
      </Link>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.heroTitle}>{title}</h1>
          {description && <p className={styles.heroDescription}>{description}</p>}
          {details.length > 0 && (
            <ul className={styles.details} aria-label="Program details">
              {details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          )}
        </div>
      </header>
    </div>
  );
}

function DirectorySection({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section} aria-label={title}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionEyebrow}>{eyebrow}</p>
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
        <p className={styles.sectionDescription}>{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className={styles.emptyState}>{children}</p>;
}

export function DepartmentsDirectory({ departments }: { departments: Department[] }) {
  return (
    <div className={styles.directory}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>DIT academic community</p>
          <h1 className={styles.heroTitle}>Explore departments</h1>
          <p className={styles.heroDescription}>Find a field of study, then explore its programs, modules, and examination papers.</p>
        </div>
      </header>
      <DirectorySection eyebrow="The archive" title="Academic departments" description="Choose a department to see its programs.">
        {departments.length ? (
          <ul className={styles.cardGrid}>
            {departments.map((department) => (
              <CatalogueMotionCard key={department.id} className={styles.card}>
                <Link className={styles.cardLink} href={`/departments/${department.id}`}>
                  <span className={styles.code}>{department.code}</span>
                  <span className={styles.cardTitle}>{department.name}</span>
                  {department.description && <span className={styles.cardDescription}>{department.description}</span>}
                  <span className={styles.cardFooter}>View programs <span className={styles.arrow} aria-hidden="true">↗</span></span>
                </Link>
              </CatalogueMotionCard>
            ))}
          </ul>
        ) : <EmptyState>No active departments are available.</EmptyState>}
      </DirectorySection>
    </div>
  );
}

export function DepartmentDirectory({ department, programs }: { department: Department; programs: Program[] }) {
  return (
    <div className={styles.directory}>
      <DirectoryHeader
        backHref="/departments"
        backLabel="All departments"
        eyebrow={`Department · ${department.code}`}
        title={department.name}
        description={department.description || 'Explore programs and modules in this department.'}
      />
      <DirectorySection eyebrow="Your pathway" title="Programs" description="Select a program to explore its modules and papers.">
        {programs.length ? (
          <ul className={styles.cardGrid}>
            {programs.map((program) => (
              <CatalogueMotionCard key={program.id} className={styles.card}>
                <Link className={styles.cardLink} href={`/programs/${program.id}`}>
                  <span className={styles.code}>{program.code}</span>
                  <span className={styles.cardTitle}>{program.name}</span>
                  <span className={styles.cardFooter}>
                    <span className={styles.cardMeta}>{program.awardTitle} <span aria-hidden="true">·</span> {program.campus}</span>
                    <span className={styles.arrow} aria-hidden="true">↗</span>
                  </span>
                </Link>
              </CatalogueMotionCard>
            ))}
          </ul>
        ) : <EmptyState>No active programs are available.</EmptyState>}
      </DirectorySection>
    </div>
  );
}

export function ProgramDirectory({ program, modules }: { program: Program; modules: Module[] }) {
  const years = [...new Set(modules.map(module => module.levelYear ?? 1))].sort((a, b) => a - b);
  return (
    <div className={styles.directory}>
      <DirectoryHeader
        backHref={`/departments/${program.departmentId}`}
        backLabel="Back to department"
        eyebrow={`Program · ${program.code}`}
        title={program.name}
        details={[program.awardTitle, program.campus]}
      />
      <DirectorySection eyebrow="The curriculum" title="Modules" description="Open a module to find its available examination papers.">
        {modules.length ? <div className={styles.curriculumYears}>
          {years.map(year => <section key={year} className={styles.curriculumYear} aria-label={`Year ${year}`}>
            <h3 className={styles.curriculumYearTitle}>Year {year}</h3>
            {[1, 2].map(semester => {
              const entries = modules.filter(module => (module.levelYear ?? 1) === year && module.semester === semester);
              return entries.length ? <div key={semester} className={styles.curriculumTerm}>
                <h4 className={styles.curriculumTermTitle}>Semester {(year - 1) * 2 + semester}</h4>
                <ul className={styles.cardGrid}>
                  {entries.map(module => <CatalogueMotionCard key={module.id} className={styles.card}>
                    <Link className={styles.cardLink} href={`/modules/${module.id}`}>
                      <span className={styles.code}>{module.code}</span>
                      <span className={styles.cardTitle}>{module.name}</span>
                      <span className={styles.cardFooter}>
                        <span className={styles.semester}>{module.credits ? `${module.credits} credits` : 'View papers'}</span>
                        <span className={styles.arrow} aria-hidden="true">↗</span>
                      </span>
                    </Link>
                  </CatalogueMotionCard>)}
                </ul>
              </div> : null;
            })}
          </section>)}
        </div> : <EmptyState>No active modules are available.</EmptyState>}
      </DirectorySection>
    </div>
  );
}
