export type Role = 'guest' | 'contributor' | 'lecturer' | 'admin';

export type ExamCategory = 'TEST' | 'UE' | 'SUPP';

export type PaperStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  programsCount: number;
  modulesCount: number;
  papersCount: number;
}

export interface Program {
  campus?: string;
  awardTitle?: string;
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName: string;
  level: string; // e.g. "Bachelor Degree", "Ordinary Diploma"
  modulesCount: number;
}

export interface Module {
  id: string;
  code: string; // e.g. "COE 07201"
  name: string;
  departmentId: string;
  departmentName: string;
  programId: string;
  programName: string;
  semester: 1 | 2;
  levelYear: number; // 1, 2, 3, 4
  credits: number;
  papersCount: number;
}

export interface Paper {
  moduleId?: string;
  downloadAvailable?: boolean;
  id: string;
  title: string;
  moduleCode: string;
  moduleName: string;
  departmentId: string;
  departmentName: string;
  programId: string;
  programName: string;
  category: ExamCategory;
  testNumber?: 1 | 2 | null;
  academicYear: string; // e.g. "2023/2024"
  semester: 1 | 2;
  examPeriod: string; // "Test I", "Test II", "Main University Examination (UE)", "Special Supplementary"
  hasMarkingScheme: boolean;
  markingSchemePdfUrl?: string;
  pdfUrl: string;
  fileSize: string;
  pageCount: number;
  downloadsCount: number;
  viewsCount: number;
  status: PaperStatus;
  uploadedBy: {
    username: string;
    role: 'contributor' | 'lecturer' | 'admin';
    isLecturerVerified?: boolean;
    accentColor?: string;
    avatarId?: string;
  };
  uploadedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  duplicateWarning?: boolean;
  verifiedLecturerBadge?: boolean;
  examDate?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  isLecturerVerified: boolean;
  departmentId?: string;
  bio: string;
  accentColor: string; // legacy profile field
  avatarId?: string;
  xp: number;
  allTimeXp: number;
  level: number;
  levelTitle: string;
  acceptanceRate: number; // percentage
  submissionsCount: number;
  approvedCount: number;
  markingSchemesCount: number;
  rank: number;
  joinedDate: string;
  status: 'active' | 'suspended' | 'banned';
  twoFactorEnabled?: boolean;
}

export interface XpLedgerEntry {
  id: string;
  userId: string;
  type: 'APPROVED_PAPER' | 'MARKING_SCHEME' | 'SUPPLEMENTARY' | 'MILESTONE' | 'REJECTION_PENALTY' | 'ADMIN_ADJUSTMENTs';
  title: string;
  moduleCode?: string;
  amount: number; // +50, +30, -50
  date: string;
  relativeTime: string;
  note: string;
  status?: 'applied' | 'pending_rescan';
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  category: 'submission' | 'quality' | 'speed' | 'milestone' | 'schemes';
  xpReward: number;
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
  unlockedDate?: string;
  iconName: string;
  badgeStatus: 'Unlocked' | 'In Progress' | 'Locked';
}

export interface FlaggedReport {
  id: string;
  paperId: string;
  paperTitle: string;
  moduleCode: string;
  reason: 'blurry_scan' | 'wrong_module' | 'copyright' | 'duplicate' | 'offensive' | 'incomplete';
  details: string;
  reportedBy: string;
  reportedAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface TakedownRequest {
  id: string;
  paperId: string;
  paperTitle: string;
  moduleCode: string;
  requesterName: string;
  requesterEmail: string;
  affiliation: string; // e.g. "DIT Department Head / Lecturer"
  reason: string;
  evidence: string;
  submittedAt: string;
  status: 'pending' | 'approved_removed' | 'rejected';
}

export interface ModuleRequest {
  id: string;
  moduleCode: string;
  moduleName: string;
  departmentId: string;
  departmentName: string;
  programId: string;
  programName: string;
  academicYear: string;
  semester: 1 | 2;
  description: string;
  notes?: string; // legacy requests
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AuditLogItem {
  id: string;
  adminUsername: string;
  action: string;
  targetType: 'paper' | 'user' | 'structure' | 'security' | 'settings';
  targetId: string;
  targetDescription: string;
  reason: string;
  timestamp: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  active: boolean;
  startDate: string;
  endDate: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'xp' | 'paper_approved' | 'paper_rejected' | 'announcement' | 'broadcast' | 'system';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface PaperFilters {
  query?: string;
  departmentId?: string;
  programId?: string;
  category?: ExamCategory | 'ALL';
  year?: string;
  semester?: number | 'ALL';
  hasMarkingScheme?: boolean;
  sortBy?: 'recent' | 'popular' | 'year_desc' | 'year_asc';
}


export interface AdminStats {
  pendingPapers: number;
  totalPapers: number;
  pendingFlags: number;
  pendingTakedowns: number;
  pendingModuleReqs: number;
  verifiedLecturers: number;
  totalUsers: number;
  totalDownloads: number;
}
