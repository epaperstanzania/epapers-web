'use client';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from '@epapers/ui/navigation';
import { api } from '../../services/api';
import { ApiForm } from '../../components/common/ApiForm';
import { useAuth } from '../../context/AuthContext';
import { Department, Program } from '../../types';
import {
  HelpCircle,
  FileQuestion,
  Info,
  Mail,
  FileText,
  AlertTriangle,
  Send,
  PlusCircle,
  RefreshCw,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-8">
    <section
      className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-cover bg-center shadow-sm"
      style={{ backgroundImage: "linear-gradient(105deg,rgba(0,31,78,.9),rgba(0,51,122,.72)),url('/images/tusome.jpg')" }}
    >
      <div className="p-6 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">EPapers · DIT</p>
        <h1 className="mt-2 font-bold text-2xl sm:text-3xl">
          How EPapers Works
        </h1>
        <p className="mt-1 text-xs text-blue-100 sm:text-sm">
          A past examination paper repository for DIT.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 pt-0 md:grid-cols-3 sm:p-6 sm:pt-0">
        <div className="space-y-2 rounded-lg border border-white/70 bg-white/95 p-5 text-[var(--color-text)] shadow-sm backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]  block">
            Step 1
          </span>
          <h3 className="font-bold text-base text-[var(--color-text)] ">
            Instant Access
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] leading-normal">
            No registration wall for students. Search module codes (e.g. &apos;COE07201&apos;) and download available papers directly.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-white/70 bg-white/95 p-5 text-[var(--color-text)] shadow-sm backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]  block">
            Step 2
          </span>
          <h3 className="font-bold text-base text-[var(--color-text)] ">
            Source Archives
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] leading-normal">
            Registered contributors upload continuous assessments (Test I, Test II), UE papers, and marking keys. Submissions are reviewed before publishing.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-white/70 bg-white/95 p-5 text-[var(--color-text)] shadow-sm backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]  block">
            Step 3
          </span>
          <h3 className="font-bold text-base text-[var(--color-text)] ">
            Special Recognition
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] leading-normal">
            Contributors earn recognized archivist standing and advance tiers from Novice Archivist to Master Archivist on the DIT leaderboard.
          </p>
        </div>
      </div>
    </section>
  </div>
);

export const FaqPage: React.FC = () => {
  const faqs = [
    {
      q: 'Do I need an account to download past papers?',
      a: 'No. Students can search, preview, and download all past examination papers and available marking schemes with zero authentication or login walls.',
    },
    {
      q: 'What examination types are supported?',
      a: 'EPapers covers Continuous Assessment Tests (Test I, Test II), University Examinations (UE), and Special Supplementary (SUPP) papers across all active DIT academic sessions.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-10">
        <h1 className="font-bold text-2xl sm:text-3xl text-[var(--color-text)] ">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  mt-1">
          Answers to common student questions about accessing examination papers.
        </p>

        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          This section covers student questions only. Please discuss other matters in the official group.
        </p>

        <div className="mt-6 space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 rounded-lg bg-[var(--color-canvas)]  border border-[var(--color-border)]  space-y-1"
            >
              <h3 className="font-bold text-sm text-[var(--color-text)] ">
                {faq.q}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]  leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AboutPage: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-10 space-y-4">
      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--color-blue-tint)] text-[var(--color-primary)]   text-xs font-semibold">
        EPapers · DIT
      </div>

      <h1 className="font-bold text-2xl sm:text-3xl text-[var(--color-text)] ">
        About EPapers
      </h1>

      <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  leading-relaxed">
        EPapers is a past-examination paper repository for DIT. Papers are organized by department, program, module, and academic session for student revision.
      </p>

      <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  leading-relaxed">
        Rather than scattered paper photocopies or disorganized chat group attachments, EPapers structures academic memory into a clean, searchable hierarchy: Department → Program → Module → Exam Papers.
      </p>

      <div className="pt-4 border-t border-[var(--color-border)]  flex items-center gap-4 text-xs font-semibold text-[var(--color-primary)] ">
        <Link to="/departments" className="hover:underline">Explore Departments</Link>
        <span>·</span>
        <Link to="/how-it-works" className="hover:underline">User guide</Link>
        <span>·</span>
        <Link to="/upload" className="hover:underline">Become a Contributor</Link>
      </div>
    </div>
  </div>
);

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
        <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-[var(--color-text)] ">
          Contact EPapers DIT
        </h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          Have questions regarding an examination paper, moderation decision, or technical glitch?
        </p>

        {submitted ? (
          <div className="p-4 bg-[var(--color-success-soft)]  text-[var(--color-success)]  rounded-xl text-xs font-semibold text-center">
            ✓ Message received by the DIT Archive moderation desk. We will respond shortly.
          </div>
        ) : (
          <ApiForm requireAuth endpoint="/contact-messages" payload={(form) => ({ senderName: form.get('senderName'), senderEmail: form.get('senderEmail'), subject: form.get('subject'), message: form.get('message') })}
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                placeholder="Full Name"
                name="senderName"
                minLength={2}
                maxLength={160}
                className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. name@gmail.com"
                name="senderEmail"
                maxLength={254}
                className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
              />
            </div>
            <label className="block text-xs font-semibold text-[var(--color-text)]">
              Subject
              <input name="subject" required minLength={2} maxLength={240} className="w-full rounded-lg border border-[var(--color-border)] p-2.5" />
            </label>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
                Message / Ingestion Query
              </label>
              <textarea
                rows={4}
                required
                placeholder="Explain your inquiry..."
                name="message"
                minLength={10}
                maxLength={4000}
                className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[var(--color-primary)] text-[var(--color-surface)] font-bold rounded-lg text-xs hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
            >
              Send Message
            </button>
          </ApiForm>
        )}
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => (
  <div className="max-w-3xl mx-auto bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-10 shadow-xs space-y-4">
    <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
      Privacy Policy
    </h1>
    <p className="text-xs text-[var(--color-text-muted)]">Last updated: Academic Session 2023/2024</p>
    <div className="text-xs sm:text-sm text-[var(--color-text-muted)]  space-y-3 leading-relaxed">
      <p>
        EPapers is committed to student and contributor privacy. Guest access requires zero tracking cookies or personal data capture. Examination downloads are served directly.
      </p>
      <p>
        For registered contributors, only public usernames, verified Epapers emails, and gamification audit ledgers are retained. Usernames cannot be changed after registration.
      </p>
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="max-w-3xl mx-auto bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-10 shadow-xs space-y-4">
    <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
      Terms of Service
    </h1>
    <p className="text-xs text-[var(--color-text-muted)]">Applicable to DIT community members</p>
    <div className="text-xs sm:text-sm text-[var(--color-text-muted)]  space-y-3 leading-relaxed">
      <p>
        1. <strong>Archival Purpose:</strong> All materials hosted on EPapers are intended strictly for retrospective academic revision and educational benchmarking.
      </p>
      <p>
        2. <strong>Integrity & Review:</strong> Uploading corrupted files, copyrighted unreleased tests, or duplicate spam results in rejection and prospective account suspension.
      </p>
    </div>
  </div>
);

export const TakedownPage: React.FC = () => {
  const { busy, run } = useApiAction();
  const [paperCode, setPaperCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = run(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  });

  return (<BusyScope busy={busy}><div className="max-w-2xl mx-auto">
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-[var(--color-danger)]">
          <AlertTriangle className="w-5 h-5" />
          <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-[var(--color-text)] ">
            Formal Takedown Notice
          </h1>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Faculty instructors and department heads may request removal of active assessment papers or unreleased continuous evaluation materials.
        </p>

        {submitted ? (
          <div className="p-5 bg-[var(--color-success-soft)]  text-[var(--color-success)]  rounded-xl text-xs font-semibold text-center space-y-2">
            <CheckCircle className="w-6 h-6 mx-auto text-[var(--color-success)]" />
            <p>Takedown inquiry logged. Moderation Directorate ticket generated.</p>
            <p className="text-[11px] text-[var(--color-success)]">Affected files are flagged for priority audit.</p>
          </div>
        ) : (
          <ApiForm requireAuth endpoint="/takedowns" payload={() => ({ paperId: paperCode, requesterFullName: name, requesterEmail: email, affiliation, reason, evidence: 'Submitted via public Epapers takedown form' })} onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
                Paper ID (from the paper URL)
              </label>
              <input
                type="text"
                required
                value={paperCode}
                onChange={(e) => setPaperCode(e.target.value)}
                placeholder="Paper UUID"
                className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
                  Requester Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. / Eng. / Prof."
                  className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
                  Emaill
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@gmail.com"
                  className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
                DIT Department & Affiliation
              </label>
              <input
                type="text"
                required
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="e.g. Department of Computer Studies Course Coordinator"
                className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text)]  mb-1">
                Detailed Grounds for Takedown
              </label>
              <textarea
                rows={4}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State why this specific paper requires withdrawal from public archive..."
                className="w-full bg-[var(--color-canvas)]  border border-[var(--color-border)]  rounded-lg p-2.5 text-xs text-[var(--color-text)]  focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[var(--color-primary)] text-[var(--color-surface)] font-bold rounded-lg text-xs hover:bg-[var(--color-danger-soft-hover)] transition-colors cursor-pointer"
            >
              Submit Takedown Request
            </button>
          </ApiForm>
        )}
      </div>
    </div></BusyScope>);
};

export const RequestModulePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const initialSemester = searchParams.get('semester');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') || '');
  const [programId, setProgramId] = useState(searchParams.get('programId') || '');
  const [academicYear, setAcademicYear] = useState(searchParams.get('academicYear') || '');
  const [semester, setSemester] = useState<1 | 2 | ''>(initialSemester === '1' || initialSemester === '2' ? Number(initialSemester) as 1 | 2 : '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedDepartment = departments.find((item) => item.id === departmentId);
  const selectedProgram = programs.find((item) => item.id === programId);
  const academicYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = new Date().getMonth() >= 8 ? currentYear : currentYear - 1;
    return Array.from({ length: 7 }, (_, index) => {
      const year = startYear - index;
      return `${year}/${year + 1}`;
    });
  }, []);

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => setError('Departments could not be loaded. Please refresh and try again.'));
  }, []);

  useEffect(() => {
    let active = true;
    setPrograms([]);
    if (!departmentId) {
      setIsLoadingPrograms(false);
      return;
    }
    setIsLoadingPrograms(true);
    api.getPrograms(departmentId)
      .then((items) => { if (active) setPrograms(items); })
      .catch(() => { if (active) setError('Programs could not be loaded. Please try again.'); })
      .finally(() => { if (active) setIsLoadingPrograms(false); });
    return () => { active = false; };
  }, [departmentId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDepartment || !selectedProgram || !academicYear || !semester) return;
    setIsSubmitting(true);
    setError('');
    try {
      await api.submitModuleRequest({
        moduleCode: code.trim().toUpperCase(),
        moduleName: name.trim(),
        departmentId: selectedDepartment.id,
        departmentName: selectedDepartment.name,
        programId: selectedProgram.id,
        programName: selectedProgram.name,
        academicYear,
        semester,
        description: description.trim(),
        requestedBy: currentUser?.username || 'student',
      });
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your request could not be submitted. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = 'min-h-11 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="mx-auto max-w-2xl">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-sidebar)] text-[var(--color-primary)]">
            <PlusCircle aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)]">Request a missing module</h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">Choose where it belongs, then add its details.</p>
          </div>
        </div>

        {submitted ? (
          <div role="status" className="rounded-lg bg-[var(--color-success-soft)] p-5 text-center">
            <CheckCircle aria-hidden="true" className="mx-auto h-7 w-7 text-[var(--color-success)]" />
            <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">Request sent for curriculum review.</p>
            <Link to="/departments" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-surface)]">
              Browse modules
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium text-[var(--color-text)]">
                <span>1. Department</span>
                <select required value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setProgramId(''); setAcademicYear(''); setSemester(''); }} className={fieldClass}>
                  <option value="">Select department</option>
                  {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-[var(--color-text)]">
                <span>2. Program</span>
                <select required disabled={!departmentId || isLoadingPrograms} value={programId} onChange={(event) => { setProgramId(event.target.value); setAcademicYear(''); setSemester(''); }} className={fieldClass}>
                  <option value="">{isLoadingPrograms ? 'Loading programs…' : 'Select program'}</option>
                  {programs.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-[var(--color-text)]">
                <span>3. Academic year</span>
                <select required disabled={!programId} value={academicYear} onChange={(event) => { setAcademicYear(event.target.value); setSemester(''); }} className={fieldClass}>
                  <option value="">Select academic year</option>
                  {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <fieldset disabled={!academicYear} className="space-y-1.5 disabled:opacity-50">
                <legend className="text-sm font-medium text-[var(--color-text)]">4. Semester</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([1, 2] as const).map((value) => (
                    <button key={value} type="button" aria-pressed={semester === value} onClick={() => setSemester(value)} className={`min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${semester === value ? 'border-[var(--color-primary)] bg-[var(--color-active)] text-[var(--color-primary)]' : 'border-[var(--color-input-border)] text-[var(--color-text)] hover:bg-[var(--color-sidebar)]'}`}>
                      Semester {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            {semester && (
              <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
                <label className="block space-y-1.5 text-sm font-medium text-[var(--color-text)]">
                  <span>Module code</span>
                  <input required maxLength={30} value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. COE 08204" className={fieldClass} />
                </label>
                <label className="block space-y-1.5 text-sm font-medium text-[var(--color-text)]">
                  <span>Module name</span>
                  <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Cloud Computing" className={fieldClass} />
                </label>
                <label className="block space-y-1.5 text-sm font-medium text-[var(--color-text)]">
                  <span>Description</span>
                  <textarea required minLength={8} maxLength={400} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Briefly describe the module or why it is missing." className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] p-3 text-sm text-[var(--color-text)]" />
                </label>
              </div>
            )}

            {error && <p role="alert" className="rounded-lg bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}
            <button type="submit" disabled={!semester || !selectedDepartment || !selectedProgram || isSubmitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-surface)] transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50">
              <PlusCircle aria-hidden="true" className="h-4 w-4" />
              {isSubmitting ? 'Sending request…' : 'Submit module request'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
};

export const NotFoundPage: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
    <div className="font-heading font-extrabold text-7xl text-[var(--color-primary)] ">
      404
    </div>
    <h2 className="font-heading font-bold text-xl text-[var(--color-text)] ">
      Archived Resource Not Found
    </h2>
    <p className="text-xs text-[var(--color-text-muted)] max-w-md">
      The examination paper, module catalog, or route you requested does not exist in the DIT system.
    </p>
    <Link
      to="/"
      className="px-5 py-2.5 bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-semibold rounded-lg shadow-xs hover:bg-[var(--color-primary-dark)]"
    >
      Return to Home
    </Link>
  </div>
);

export const ServerErrorPage: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
    <div className="font-heading font-extrabold text-7xl text-[var(--color-danger)]">500</div>
    <h2 className="font-heading font-bold text-xl text-[var(--color-text)] ">
      Repository System Error
    </h2>
    <p className="text-xs text-[var(--color-text-muted)] max-w-md">
      The archive index encountered an unexpected condition. Please retry your query.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-5 py-2.5 bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-semibold rounded-lg shadow-xs"
    >
      Retry Request
    </button>
  </div>
);

export const OfflinePage: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
    <div className="w-14 h-14 rounded-xl bg-[var(--color-warning-soft)] text-[var(--color-warning-text)] flex items-center justify-center mx-auto">
      <RefreshCw className="w-7 h-7" />
    </div>
    <h2 className="font-heading font-bold text-xl text-[var(--color-text)] ">
      Offline Cellular Mode
    </h2>
    <p className="text-xs text-[var(--color-text-muted)] max-w-md">
      You are currently disconnected from campus networks. Previously cached examination papers remain readable in low-data mode.
    </p>
  </div>
);

export const RateLimitPage: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
    <div className="w-14 h-14 rounded-xl bg-[var(--color-sidebar)]  text-[var(--color-text)] flex items-center justify-center mx-auto">
      <FileText className="w-7 h-7" />
    </div>
    <h2 className="font-heading font-bold text-xl text-[var(--color-text)] ">
      High-Velocity Rate Limit Throttled
    </h2>
    <p className="text-xs text-[var(--color-text-muted)] max-w-md">
      Too many automated PDF download requests detected from this IP address. Please wait 60 seconds to resume paper retrieval.
    </p>
  </div>
);
