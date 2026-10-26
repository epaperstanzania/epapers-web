'use client';
import { PageLoader } from '../../components/common/PageLoader';
import { BusyScope } from '../../components/common/BusyScope';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from '@epapers/ui/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Department, Program, Module, ExamCategory } from '../../types';
import { ArrowLeft, ArrowRight, Search, Upload, Paperclip, X, AlertTriangle, PlusCircle } from 'lucide-react';

type SelectedFile = { name: string; size: string; file: File };

const stepTitles = [
  'Department', 'Program', 'Academic year', 'Semester',
  'Module', 'Category', 'PDF files', 'Review',
];

export const UploadPage: React.FC = () => {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const suggestionModuleId = searchParams.get('moduleId');
  const suggestionPrefilled = useRef(false);
  const [step, setStep] = useState(1);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [moduleRefreshAttempt, setModuleRefreshAttempt] = useState(0);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState<1 | 2 | ''>('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [category, setCategory] = useState<ExamCategory | ''>('');
  const [testNumber, setTestNumber] = useState<1 | 2 | ''>('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [showModuleRequest, setShowModuleRequest] = useState(false);
  const [moduleRequestCode, setModuleRequestCode] = useState('');
  const [moduleRequestName, setModuleRequestName] = useState('');
  const [moduleRequestDescription, setModuleRequestDescription] = useState('');
  const [moduleRequestError, setModuleRequestError] = useState<string | null>(null);
  const [moduleRequestSent, setModuleRequestSent] = useState(false);
  const [isSubmittingModuleRequest, setIsSubmittingModuleRequest] = useState(false);
  const moduleRequestInFlight = useRef(false);
  const moduleRequestVersion = useRef(0);
  const [paperFile, setPaperFile] = useState<SelectedFile | null>(null);
  const [markingSchemeFile, setMarkingSchemeFile] = useState<SelectedFile | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const [uploadResult, setUploadResult] = useState<Awaited<ReturnType<typeof api.uploadPaper>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedDepartment = departments.find((item) => item.id === selectedDeptId);
  const selectedProgram = programs.find((item) => item.id === selectedProgramId);
  const selectedModule = modules.find((item) => item.id === selectedModuleId);
  const filteredModules = useMemo(() => {
    const query = moduleSearch.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((module) => `${module.code} ${module.name}`.toLowerCase().includes(query));
  }, [moduleSearch, modules]);

  const academicYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = new Date().getMonth() >= 8 ? currentYear : currentYear - 1;
    const years = Array.from({ length: 7 }, (_, index) => {
      const first = startYear - index;
      return `${first}/${first + 1}`;
    });
    const requested = Number(searchParams.get('academicYear'));
    if (Number.isInteger(requested) && requested >= 2000 && requested <= currentYear) {
      const value = `${requested}/${requested + 1}`;
      if (!years.includes(value)) years.push(value);
    }
    return years;
  }, [searchParams]);

  useEffect(() => {
    if (suggestionPrefilled.current) return;
    if (!suggestionModuleId) return;
    suggestionPrefilled.current = true;
    let active = true;
    api.getModule(suggestionModuleId).then(result => {
      if (!active || !result) return;
      const module = result.module;
      setSelectedDeptId(module.departmentId);
      setSelectedProgramId(module.programId);
      setSemester(module.semester);
      setSelectedModuleId(module.id);
      const requestedYear = Number(searchParams.get('academicYear'));
      if (Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= new Date().getFullYear()) setAcademicYear(`${requestedYear}/${requestedYear + 1}`);
      const requestedCategory = searchParams.get('category');
      if (requestedCategory === 'TEST' || requestedCategory === 'UE' || requestedCategory === 'SUPP') {
        setCategory(requestedCategory);
        if (requestedCategory === 'TEST') setTestNumber(searchParams.get('testNumber') === '2' ? 2 : 1);
      }
      setStep(6);
    }).catch(() => { /* The regular upload flow remains available. */ });
    return () => { active = false; };
  }, [suggestionModuleId]);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    api.getDepartments().then((items) => {
      if (active) setDepartments(items);
    }).catch(() => {
      if (active) setLoadError('Departments could not be loaded. Retry to continue.');
    });
    return () => { active = false; };
  }, [loadAttempt]);

  useEffect(() => {
    let active = true;
    setPrograms([]);
    if (!selectedDeptId) return;
    setLoadError(null);
    api.getPrograms(selectedDeptId).then((items) => {
      if (active) setPrograms(items);
    }).catch(() => {
      if (active) setLoadError('Programs could not be loaded. Retry to continue.');
    });
    return () => { active = false; };
  }, [selectedDeptId, loadAttempt]);

  useEffect(() => {
    let active = true;
    setModules([]);
    setModuleSearch('');
    if (!selectedProgramId || !semester) {
      setIsLoadingModules(false);
      return;
    }
    setIsLoadingModules(true);
    setLoadError(null);
    api.getModules({ programId: selectedProgramId, departmentId: selectedDeptId, semester }).then((items) => {
      if (active) setModules(items);
    }).catch(() => {
      if (active) setLoadError('Modules could not be loaded. Retry to continue.');
    }).finally(() => {
      if (active) setIsLoadingModules(false);
    });
    return () => { active = false; };
  }, [selectedProgramId, selectedDeptId, semester, loadAttempt, moduleRefreshAttempt]);

  useEffect(() => {
    let active = true;
    setIsDuplicate(false);
    if (!selectedModuleId || !category || (category === 'TEST' && !testNumber) || !academicYear || !semester) return;
    api.hasDuplicatePaper({ moduleId: selectedModuleId, category, ...(category === 'TEST' && testNumber ? { testNumber } : {}), academicYear, semester }).then((exists) => {
      if (active) setIsDuplicate(exists);
    }).catch(() => {
      if (active) setLoadError('Duplicate status could not be checked. You can continue; moderation will review the submission.');
    });
    return () => { active = false; };
  }, [selectedModuleId, category, testNumber, academicYear, semester, loadAttempt]);

  const resetFiles = () => {
    setPaperFile(null);
    setMarkingSchemeFile(null);
    setUploadResult(null);
    setSubmitError(null);
  };

  const resetModuleRequest = () => {
    moduleRequestVersion.current += 1;
    setShowModuleRequest(false);
    setModuleRequestCode('');
    setModuleRequestName('');
    setModuleRequestDescription('');
    setModuleRequestError(null);
    setModuleRequestSent(false);
  };

  const selectDepartment = (id: string) => {
    setSelectedDeptId(id);
    setSelectedProgramId('');
    setAcademicYear('');
    setSemester('');
    setSelectedModuleId('');
    setCategory('');
    setTestNumber('');
    setModules([]);
    setModuleSearch('');
    setIsDuplicate(false);
    resetModuleRequest();
    resetFiles();
  };

  const selectProgram = (id: string) => {
    setSelectedProgramId(id);
    setAcademicYear('');
    setSemester('');
    setSelectedModuleId('');
    setCategory('');
    setTestNumber('');
    setModules([]);
    setModuleSearch('');
    setIsDuplicate(false);
    resetModuleRequest();
    resetFiles();
  };

  const selectYear = (year: string) => {
    setAcademicYear(year);
    setSemester('');
    setSelectedModuleId('');
    setCategory('');
    setTestNumber('');
    setModules([]);
    setIsDuplicate(false);
    resetModuleRequest();
    resetFiles();
  };

  const selectSemester = (value: 1 | 2) => {
    setSemester(value);
    setSelectedModuleId('');
    setCategory('');
    setTestNumber('');
    setIsDuplicate(false);
    resetModuleRequest();
    resetFiles();
  };

  const selectModule = (module: Module) => {
    setSelectedModuleId(module.id);
    setModuleRequestSent(false);
    setShowModuleRequest(false);
    setCategory('');
    setTestNumber('');
    setIsDuplicate(false);
    resetFiles();
    setStep(6);
  };

  useEffect(() => {
    if (step === 6) stepHeadingRef.current?.focus();
  }, [step]);

  const submitModuleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (moduleRequestInFlight.current || !selectedDepartment || !selectedProgram || !academicYear || !semester) return;
    moduleRequestInFlight.current = true;
    const requestVersion = moduleRequestVersion.current;
    setIsSubmittingModuleRequest(true);
    setModuleRequestError(null);
    try {
      await api.submitModuleRequest({
        departmentId: selectedDepartment.id,
        departmentName: selectedDepartment.name,
        programId: selectedProgram.id,
        programName: selectedProgram.name,
        academicYear,
        semester,
        moduleCode: moduleRequestCode.trim(),
        moduleName: moduleRequestName.trim(),
        description: moduleRequestDescription.trim(),
        requestedBy: currentUser?.username || 'contributor',
      });
      if (requestVersion === moduleRequestVersion.current) {
        setModuleRequestSent(true);
        setShowModuleRequest(false);
      }
    } catch (error) {
      if (requestVersion === moduleRequestVersion.current) setModuleRequestError(error instanceof Error ? error.message : 'The module request could not be sent. Please try again.');
    } finally {
      moduleRequestInFlight.current = false;
      setIsSubmittingModuleRequest(false);
    }
  };

  const setSelectedFile = (event: React.ChangeEvent<HTMLInputElement>, isScheme: boolean) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size === 0) {
      setSubmitError('This file is empty. Choose a PDF that contains the examination paper.');
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setSubmitError('Choose a PDF file.');
      return;
    }
    const selected = { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, file };
    setSubmitError(null);
    if (isScheme) setMarkingSchemeFile(selected);
    else setPaperFile(selected);
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return Boolean(selectedDeptId);
      case 2: return Boolean(selectedProgramId);
      case 3: return Boolean(academicYear);
      case 4: return Boolean(semester);
      case 5: return Boolean(selectedModuleId);
      case 6: return Boolean(category && (category !== 'TEST' || testNumber));
      case 7: return Boolean(paperFile);
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (submissionInFlight.current) return;
    if (!selectedDepartment || !selectedProgram || !selectedModule || !academicYear || !semester || !category || (category === 'TEST' && !testNumber) || !paperFile) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const examPeriod = category === 'TEST' ? `Test ${testNumber}` : category === 'UE' ? 'University Examination' : 'Supplementary Examination';
      const result = await api.uploadPaper({
        title: `${category === 'TEST' ? `Test ${testNumber}` : category} Exam: ${selectedModule.code}`,
        moduleId: selectedModule.id,
        category,
        ...(category === 'TEST' ? { testNumber: testNumber as 1 | 2 } : {}),
        academicYear,
        semester,
        examPeriod,
        examFile: paperFile.file,
        markingSchemeFile: markingSchemeFile?.file,
      });
      setUploadResult(result);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Your paper could not be submitted. Please try again.');
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const lecturerHomeDept = currentUser?.departmentId;
  const isLecturerOwnDept = Boolean(role === 'lecturer' && currentUser?.isLecturerVerified && lecturerHomeDept === selectedDeptId);

  if (uploadResult) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl bg-cover bg-center p-4 sm:p-8" style={{ backgroundImage: "linear-gradient(120deg,rgba(0,31,78,.58),rgba(0,51,122,.78)),url('/images/Shelf-book.jpg')" }}>
      <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-white/70 bg-[var(--color-surface)]/95 p-6 text-center shadow-sm backdrop-blur-sm">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Submission received</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{uploadResult.autoApproved ? 'The paper was approved and will become available after scanning and publication finish.' : 'The paper is pending moderation. You will receive a notification when it is reviewed.'}</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="min-h-11 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-surface)]">Go to dashboard</button>
          <button onClick={() => { selectDepartment(''); setStep(1); }} className="min-h-11 rounded-lg border border-[var(--color-input-border)] px-4 text-sm font-semibold text-[var(--color-text)]">Upload another</button>
        </div>
      </div>
      </div>
    );
  }

  return (<BusyScope busy={isSubmitting}><div className="mx-auto max-w-5xl rounded-2xl bg-cover bg-center p-4 sm:p-8" style={{ backgroundImage: "linear-gradient(120deg,rgba(0,31,78,.58),rgba(0,51,122,.78)),url('/images/Shelf-book.jpg')" }}><div className="mx-auto max-w-3xl space-y-5">
      {!currentUser?.isEmailVerified && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)] p-4 text-sm text-[var(--color-warning-text)]">
          <span>Verify your Email address to confirm your contributor account.</span>
          <Link to={`/verify?email=${encodeURIComponent(currentUser?.email || '')}`} className="min-h-11 shrink-0 rounded-lg bg-[var(--color-primary)] px-3 py-3 text-xs font-semibold text-[var(--color-surface)]">Verify email</Link>
        </div>
      )}

      <header className="space-y-4 rounded-xl border border-white/70 bg-[var(--color-surface)]/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)] sm:text-2xl">Upload examination paper</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {role === 'lecturer' ? isLecturerOwnDept ? ' Lecturer papers in your department publish automatically.' : 'Papers outside your department enter moderation.' : 'Contributor submissions enter moderation before publication.'}
          </p>
        </div>

        {(selectedDeptId || selectedProgramId || academicYear || semester) && (
          <nav aria-label="Selected academic details" className="flex flex-wrap items-center gap-1 rounded-lg bg-[var(--color-input)] p-2 text-xs">
            {[
              { label: selectedDepartment?.name || 'Department', target: 1, chosen: Boolean(selectedDeptId) },
              { label: selectedProgram?.name || 'Program', target: 2, chosen: Boolean(selectedProgramId) },
              { label: academicYear || 'Academic year', target: 3, chosen: Boolean(academicYear) },
              { label: semester ? `Semester ${semester}` : 'Semester', target: 4, chosen: Boolean(semester) },
            ].map((item, index) => (
              <React.Fragment key={item.target}>
                {index > 0 && <span aria-hidden="true" className="px-1 text-[var(--color-text-muted)]">›</span>}
                <button type="button" disabled={!item.chosen} onClick={() => setStep(item.target)} className="min-h-9 rounded px-1.5 font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline disabled:cursor-default disabled:text-[var(--color-text-muted)] disabled:no-underline">{item.label}</button>
              </React.Fragment>
            ))}
          </nav>
        )}

        <ol aria-label="Upload steps" className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {stepTitles.map((title, index) => {
            const number = index + 1;
            const unlocked = number <= step;
            return (
              <li key={title}>
                <button type="button" disabled={!unlocked} onClick={() => number < step && setStep(number)} aria-current={step === number ? 'step' : undefined} className="w-full text-left disabled:cursor-not-allowed">
                  <span className={`mb-1 block h-1.5 rounded ${step >= number ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
                  <span className={`text-[10px] font-semibold sm:text-[11px] ${step === number ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>{number}. {title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      <section className="space-y-5 rounded-xl border border-white/70 bg-[var(--color-surface)]/95 p-5 shadow-sm backdrop-blur-sm sm:p-7" aria-labelledby="upload-step-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Step {step} of 8</p>
          <h2 ref={stepHeadingRef} tabIndex={-1} id="upload-step-heading" className="mt-1 text-lg font-bold text-[var(--color-text)]">{stepTitles[step - 1]}</h2>
        </div>

        {loadError && <div role="alert" className="rounded-lg bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]"><p>{loadError}</p><button type="button" onClick={() => setLoadAttempt(value => value + 1)} className="mt-2 min-h-11 rounded-lg border border-current px-4 font-semibold">Retry loading</button></div>}

        {step === 1 && (
          <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-text)]">
            Department
            <select value={selectedDeptId} onChange={(event) => selectDepartment(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm font-normal">
              <option value="">Select a department</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name} ({department.code})</option>)}
            </select>
          </label>
        )}

        {step === 2 && (
          <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-text)]">
            Program
            <select disabled={!selectedDeptId || !programs.length} value={selectedProgramId} onChange={(event) => selectProgram(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm font-normal disabled:opacity-60">
              <option value="">Select a program</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.code} — {program.name}</option>)}
            </select>
          </label>
        )}

        {step === 3 && (
          <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-text)]">
            Academic year
            <select value={academicYear} onChange={(event) => selectYear(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm font-normal">
              <option value="">Select the year the exam was sat</option>
              {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        )}

        {step === 4 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[var(--color-text)]">Semester</legend>
            <div className="grid grid-cols-2 gap-3">
              {([1, 2] as const).map((value) => <button key={value} type="button" aria-pressed={semester === value} onClick={() => selectSemester(value)} className={`min-h-11 rounded-lg border px-4 text-sm font-semibold ${semester === value ? 'border-[var(--color-primary)] bg-[var(--color-active)] text-[var(--color-primary)]' : 'border-[var(--color-input-border)] text-[var(--color-text)]'}`}>Semester {value}</button>)}
            </div>
          </fieldset>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--color-text)]">
              Search modules
              <span className="relative block"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" /><input value={moduleSearch} onChange={(event) => setModuleSearch(event.target.value)} type="search" placeholder="Search by module code or name" className="min-h-11 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] pl-9 pr-3 text-sm font-normal" /></span>
            </label>
            {isLoadingModules ? <PageLoader variant="cards" label="Loading modules…" compact /> : modules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] p-5 text-sm text-[var(--color-text-muted)]">
                No modules are offered for this program in Semester {semester}.
              </div>
            ) : filteredModules.length === 0 ? (
              <p className="rounded-lg bg-[var(--color-input)] p-4 text-sm text-[var(--color-text-muted)]">No modules match that search.</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto" aria-label="Available modules">
                {filteredModules.map((module) => <li key={module.id}><button type="button" aria-pressed={selectedModuleId === module.id} onClick={() => selectModule(module)} className={`min-h-12 w-full rounded-lg border px-4 py-2 text-left ${selectedModuleId === module.id ? 'border-[var(--color-primary)] bg-[var(--color-active)]' : 'border-[var(--color-border)] bg-[var(--color-input)] hover:border-[var(--color-primary)]'}`}><span className="block font-mono text-sm font-bold text-[var(--color-primary)]">{module.code}</span><span className="block text-sm text-[var(--color-text)]">{module.name}</span></button></li>)}
              </ul>
            )}
            {moduleRequestSent ? (
              <div role="status" className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-4 text-sm text-[var(--color-text)]">
                <p className="font-semibold">Module request sent for admin review.</p>
                <p className="mt-1 text-[var(--color-text-muted)]">Your upload details are saved here. Once the module is approved, it will appear in the list above.</p>
                <button type="button" onClick={() => setModuleRefreshAttempt(value => value + 1)} disabled={isLoadingModules} className="mt-2 min-h-11 rounded-lg border border-[var(--color-success)]/40 px-3 font-semibold text-[var(--color-text)] disabled:opacity-60">Refresh modules</button>
              </div>
            ) : showModuleRequest ? (
              <form onSubmit={submitModuleRequest} className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] p-4 sm:p-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">Request a missing module</h3>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{selectedDepartment?.name} · {selectedProgram?.name} · {academicYear} · Semester {semester}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-semibold text-[var(--color-text)]">Module code
                    <input required minLength={2} maxLength={30} pattern="[A-Za-z0-9 _-]+" value={moduleRequestCode} onChange={event => setModuleRequestCode(event.target.value)} placeholder="e.g. COE 08204" className="block min-h-11 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-surface)] px-3 text-sm font-normal text-[var(--color-text)]" />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-[var(--color-text)]">Module name
                    <input required minLength={2} maxLength={120} value={moduleRequestName} onChange={event => setModuleRequestName(event.target.value)} placeholder="e.g. Cloud Computing" className="block min-h-11 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-surface)] px-3 text-sm font-normal text-[var(--color-text)]" />
                  </label>
                </div>
                <label className="space-y-1.5 text-xs font-semibold text-[var(--color-text)]">Why is this module missing?
                  <textarea required minLength={8} maxLength={400} rows={3} value={moduleRequestDescription} onChange={event => setModuleRequestDescription(event.target.value)} placeholder="Briefly describe the module or the examination you want to upload." className="block w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-surface)] p-3 text-sm font-normal text-[var(--color-text)]" />
                </label>
                {moduleRequestError && <p role="alert" className="rounded-lg bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{moduleRequestError}</p>}
                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={isSubmittingModuleRequest} className="min-h-11 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-input)] disabled:opacity-60">{isSubmittingModuleRequest ? 'Sending request…' : 'Send module request'}</button>
                  <button type="button" disabled={isSubmittingModuleRequest} onClick={() => { setShowModuleRequest(false); setModuleRequestError(null); }} className="min-h-11 rounded-lg border border-[var(--color-input-border)] px-4 text-sm font-semibold text-[var(--color-text)] disabled:opacity-60">Cancel</button>
                </div>
              </form>
            ) : !isLoadingModules && !loadError && (
              <button type="button" onClick={() => setShowModuleRequest(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-input-border)] px-4 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-input)]">
                <PlusCircle aria-hidden="true" className="h-4 w-4" /> Request a missing module
              </button>
            )}
          </div>
        )}

        {step === 6 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[var(--color-text)]">Assessment category</legend>
            <div className="grid grid-cols-2 gap-3">
              {([{ id: 'TEST', testNumber: 1, label: 'Test 1', detail: 'First continuous assessment' }, { id: 'TEST', testNumber: 2, label: 'Test 2', detail: 'Second continuous assessment' }, { id: 'UE', testNumber: undefined, label: 'UE', detail: 'University examination' }, { id: 'SUPP', testNumber: undefined, label: 'SUPP', detail: 'Supplementary examination' }] as const).map((item) => <button key={item.label} type="button" aria-pressed={category === item.id && (item.id !== 'TEST' || testNumber === item.testNumber)} onClick={() => { setCategory(item.id); setTestNumber(item.testNumber ?? ''); setPaperFile(null); setMarkingSchemeFile(null); }} className={`min-h-16 rounded-lg border p-3 text-left ${category === item.id && (item.id !== 'TEST' || testNumber === item.testNumber) ? 'border-[var(--color-primary)] bg-[var(--color-active)] text-[var(--color-primary)]' : 'border-[var(--color-input-border)] text-[var(--color-text)]'}`}><span className="block text-sm font-bold">{item.label}</span><span className="text-xs">{item.detail}</span></button>)}
            </div>
          </fieldset>
        )}

        {step === 7 && (
          <div className="space-y-5">
            {searchParams.get('scheme') === 'true' && <p role="note" className="rounded-lg border border-[var(--color-primary)] bg-[var(--color-active)] p-3 text-sm text-[var(--color-text)]">This request needs a marking scheme. Include both the exam PDF and its answer key so moderation can fulfill it.</p>}
            <FileChoice label="Exam paper PDF (required)" file={paperFile} onChoose={(event) => setSelectedFile(event, false)} onRemove={() => setPaperFile(null)} />
            <FileChoice label="Marking scheme PDF (optional)" helper="Adding a marking scheme helps students even more." file={markingSchemeFile} onChoose={(event) => setSelectedFile(event, true)} onRemove={() => setMarkingSchemeFile(null)} optional />
            {submitError && <p role="alert" className="rounded-lg bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{submitError}</p>}
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] p-4 text-sm sm:grid-cols-2">
              <Summary label="Department" value={selectedDepartment?.name} />
              <Summary label="Program" value={selectedProgram?.name} />
              <Summary label="Academic year" value={academicYear} />
              <Summary label="Semester" value={semester ? `Semester ${semester}` : ''} />
              <Summary label="Module" value={selectedModule ? `${selectedModule.code} — ${selectedModule.name}` : ''} />
              <Summary label="Category" value={category === 'TEST' ? `Test ${testNumber}` : category} />
              <Summary label="Exam PDF" value={paperFile?.name} />
              <Summary label="Marking scheme" value={markingSchemeFile?.name || 'Not attached'} />
            </dl>
            {isDuplicate && <div role="status" className="flex gap-2 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-warning-text)]"><AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" /><span>A paper with this module, category, year, and semester already exists. Please verify this submission is a different paper.</span></div>}
            {submitError && <p role="alert" className="rounded-lg bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-danger)]">{submitError}</p>}
            <button type="button" disabled={isSubmitting} onClick={handleSubmit} className="min-h-11 w-full rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-surface)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60">{isSubmitting ? 'Submitting…' : 'Submit paper'}</button>
          </div>
        )}

        <div className="flex justify-between border-t border-[var(--color-border)] pt-4">
          <button type="button" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-input-border)] px-4 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back</button>
          {step < 8 && <button type="button" disabled={!canAdvance()} onClick={() => setStep((current) => Math.min(8, current + 1))} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-surface)] disabled:opacity-50">Continue<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>}
        </div>
      </section>
    </div></div></BusyScope>);
};

function Summary({ label, value }: { label: string; value?: string | null }) {
  return <div className="min-w-0"><dt className="text-xs text-[var(--color-text-muted)]">{label}</dt><dd className="break-words font-semibold text-[var(--color-text)]">{value || '—'}</dd></div>;
}

function FileChoice({ label, helper, file, onChoose, onRemove, optional = false }: {
  label: string;
  helper?: string;
  file: SelectedFile | null;
  onChoose: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  optional?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[var(--color-text)]">{label}</p>
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] p-3">
          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[var(--color-text)]">{file.name}</span><span className="text-xs text-[var(--color-text-muted)]">{file.size}</span></span>
          <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]"><X aria-hidden="true" className="h-4 w-4" /></button>
        </div>
      ) : (
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-input-border)] bg-[var(--color-input)] p-5 text-center hover:border-[var(--color-primary)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary)]">
          {optional ? <Paperclip aria-hidden="true" className="mb-2 h-5 w-5 text-[var(--color-primary)]" /> : <Upload aria-hidden="true" className="mb-2 h-5 w-5 text-[var(--color-primary)]" />}
          <span className="text-sm font-semibold text-[var(--color-text)]">Choose PDF</span>
          {helper && <span className="mt-1 text-xs text-[var(--color-text-muted)]">{helper}</span>}
          <input type="file" aria-label={label} accept="application/pdf,.pdf" required={!optional} className="sr-only" onChange={onChoose} />
        </label>
      )}
    </div>
  );
}
