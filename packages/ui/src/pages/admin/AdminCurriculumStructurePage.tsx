'use client';
import { BusyScope, useApiAction } from '../../components/common/BusyScope';
import { PageLoader } from '../../components/common/PageLoader';
import { apiTask } from '../../services/client';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Department, Program, Module } from '../../types';
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Layers,
  CheckCircle,
  X,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

export const AdminCurriculumStructurePage: React.FC = () => {
  const { busy, run } = useApiAction();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedProgId, setSelectedProgId] = useState<string>('');

  // Modals
  const [addDeptModal, setAddDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const [addProgModal, setAddProgModal] = useState(false);
  const [progName, setProgName] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progLevel, setProgLevel] = useState('Bachelor Degree');

  const [addModModal, setAddModModal] = useState(false);
  const [modCode, setModCode] = useState('');
  const [modName, setModName] = useState('');
  const [modSemester, setModSemester] = useState<1 | 2>(1);
  const [modCredits, setModCredits] = useState(12);

  const [deleteModModal, setDeleteModModal] = useState<Module | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const loadAll = apiTask(async () => {
    const [d, p, m] = await Promise.all([
      api.getDepartments(),
      api.getPrograms(),
      api.getModules(),
    ]);
    setDepartments(d);
    setPrograms(p);
    setModules(m);
    setSelectedDeptId(previous => d.some(item => item.id === previous) ? previous : d[0]?.id || '');
    setSelectedProgId(previous => p.some(item => item.id === previous) ? previous : p.find(item => item.departmentId === d[0]?.id)?.id || '');
  }, () => setLoading(false));

  useEffect(() => {
    loadAll();
  }, []);

  const currentPrograms = programs.filter((p) => p.departmentId === selectedDeptId);
  const currentModules = modules.filter((m) => m.programId === selectedProgId);

  const handleCreateDept = run(async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createDepartment(
      {
        name: deptName,
        code: deptCode.toUpperCase(),
        description: deptDesc,
        icon: 'BookOpen',
      }
    );
    setAddDeptModal(false);
    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    loadAll();
  });

  const handleCreateProg = run(async (e: React.FormEvent) => {
    e.preventDefault();
    const dept = departments.find((d) => d.id === selectedDeptId);
    await api.createProgram(
      {
        name: progName,
        code: progCode.toUpperCase(),
        departmentId: selectedDeptId,
        departmentName: dept?.name || '',
        level: progLevel,
      }
    );
    setAddProgModal(false);
    setProgName('');
    setProgCode('');
    loadAll();
  });

  const handleCreateMod = run(async (e: React.FormEvent) => {
    e.preventDefault();
    const dept = departments.find((d) => d.id === selectedDeptId);
    const prog = programs.find((p) => p.id === selectedProgId);
    await api.createModule(
      {
        code: modCode.toUpperCase(),
        name: modName,
        departmentId: selectedDeptId,
        departmentName: dept?.name || '',
        programId: selectedProgId,
        programName: prog?.name || '',
        semester: modSemester,
        levelYear: 1,
        credits: Number(modCredits),
      }
    );
    setAddModModal(false);
    setModCode('');
    setModName('');
    loadAll();
  });

  const handleDeleteMod = run(async () => {
    if (!deleteModModal) return;
    await api.deleteModule(deleteModModal.id, deleteReason);
    setDeleteModModal(null);
    setDeleteReason('');
    loadAll();
  });

  if (loading) return <PageLoader variant="rows" />;
  return (<BusyScope busy={busy}><div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-[var(--color-accent)]" />
            <h1 className="font-heading font-extrabold text-2xl text-[var(--color-text)] ">
              Curriculum Structure CRUD
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
            Manage the Epapers hierarchy: Department → Academic Program → Accredited Course Module.
          </p>
        </div>

        <button
          onClick={() => setAddDeptModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-bold hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4 text-[var(--color-accent)]" />
          <span>Add Department</span>
        </button>
      </div>

      {/* 3-Column Hierarchy Explorer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Column 1: Departments */}
        <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)] ">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-[var(--color-neutral)]">
              1. Departments ({departments.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDeptId(d.id);
                  const firstProg = programs.find((p) => p.departmentId === d.id);
                  if (firstProg) setSelectedProgId(firstProg.id);
                }}
                className={`w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
                  selectedDeptId === d.id
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface)] font-bold shadow-xs'
                    : 'hover:bg-[var(--color-input)]  text-[var(--color-text)] '
                }`}
              >
                <div>
                  <div className="text-xs">{d.name}</div>
                  <span className="font-mono text-[10px] opacity-75">{d.code}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Programs */}
        <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)] ">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-[var(--color-neutral)]">
              2. Degree Programs ({currentPrograms.length})
            </span>
            <button
              onClick={() => setAddProgModal(true)}
              className="text-[11px] font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {currentPrograms.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProgId(p.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
                  selectedProgId === p.id
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface)] font-bold shadow-xs'
                    : 'hover:bg-[var(--color-input)]  text-[var(--color-text)] '
                }`}
              >
                <div>
                  <div className="text-xs">{p.name}</div>
                  <span className="font-mono text-[10px] opacity-75">{p.code} · {p.level}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Column 3: Modules */}
        <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)] ">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-[var(--color-neutral)]">
              3. Course Modules ({currentModules.length})
            </span>
            <button
              onClick={() => setAddModModal(true)}
              className="text-[11px] font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Module</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {currentModules.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl border border-[var(--color-border)]  bg-[var(--color-canvas)]/50  flex items-center justify-between gap-2"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-[var(--color-primary)]  block">
                    {m.code}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-text)]  line-clamp-1">
                    {m.name}
                  </span>
                  <span className="text-[10px] text-[var(--color-neutral)]">
                    Sem {m.semester} · {m.credits} credits
                  </span>
                </div>

                <button
                  onClick={() => setDeleteModModal(m)}
                  className="p-1.5 text-[var(--color-neutral)] hover:text-[var(--color-danger)] rounded-lg cursor-pointer"
                  title="Delete Module"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Department Modal */}
      {addDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-heading font-bold text-base text-[var(--color-text)] ">
              Add New Academic Department
            </h3>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--color-neutral)] block mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Electrical Engineering"
                  className="w-full bg-[var(--color-canvas)]  border border-[var(--color-input-border)]  rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-neutral)] block mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="e.g. EE"
                  className="w-full bg-[var(--color-canvas)]  border border-[var(--color-input-border)]  rounded-lg p-2 text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-neutral)] block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Faculty focus..."
                  className="w-full bg-[var(--color-canvas)]  border border-[var(--color-input-border)]  rounded-lg p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddDeptModal(false)}
                  className="px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-bold rounded-lg">
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {addModModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-heading font-bold text-base text-[var(--color-text)] ">
              Add Module to Program
            </h3>
            <form onSubmit={handleCreateMod} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--color-neutral)] block mb-1">Module Code</label>
                <input
                  type="text"
                  required
                  value={modCode}
                  onChange={(e) => setModCode(e.target.value)}
                  placeholder="e.g. COE 08204"
                  className="w-full bg-[var(--color-canvas)]  border border-[var(--color-input-border)]  rounded-lg p-2 text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-neutral)] block mb-1">Module Title</label>
                <input
                  type="text"
                  required
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  placeholder="e.g. Distributed Computing"
                  className="w-full bg-[var(--color-canvas)]  border border-[var(--color-input-border)]  rounded-lg p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModModal(false)}
                  className="px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-bold rounded-lg">
                  Register Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Module Modal with Reason */}
      {deleteModModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-[var(--color-danger)]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-heading font-bold text-base text-[var(--color-text)] ">
                Delete Course Module
              </h3>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Are you sure you want to remove <strong>{deleteModModal.code}: {deleteModModal.name}</strong>? Sensitive changes require an audit justification.
            </p>
            <div>
              <label className="text-xs font-semibold text-[var(--color-neutral)] block mb-1">Reason for Deletion</label>
              <textarea
                rows={2}
                required
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Curriculum retirement memo..."
                className="w-full bg-[var(--color-canvas)]  border border-[var(--color-input-border)]  rounded-lg p-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModModal(null)}
                className="px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteReason.trim()}
                onClick={handleDeleteMod}
                className="px-4 py-1.5 bg-[var(--color-primary)] text-[var(--color-surface)] text-xs font-bold rounded-lg hover:bg-[var(--color-danger-soft-hover)] disabled:opacity-50"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div></BusyScope>);
};
