export type HealthStatus = {
  status: 'ok';
};

export type Role = 'manager' | 'technician';

export type UserRole = Role;

export type QuoteStatus = 'unscheduled' | 'scheduled' | 'completed' | 'cancelled';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type Quote = {
  id: string;
  title: string;
  description?: string | null;
  customerName: string;
  address: string;
  status: QuoteStatus;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type ErrorResponse = {
  error: string;
};

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type NotificationType =
  | 'job_assigned'
  | 'job_rescheduled'
  | 'job_cancelled'
  | 'job_completed';

export type QuoteSummary = {
  id: string;
  title: string;
  customerName: string;
  address: string;
  status: QuoteStatus;
};

export type Job = {
  id: string;
  quoteId: string;
  technicianId: string;
  managerId: string;
  startTime: string;
  endTime: string;
  status: JobStatus;
  quote: QuoteSummary;
};

export type CreateJobRequest = {
  quoteId: string;
  technicianId: string;
  startTime: string;
};

export type PatchJobRequest = {
  startTime?: string;
  technicianId?: string;
  status?: JobStatus;
};

export type JobsListResponse = {
  jobs: Job[];
};

export type JobResponse = {
  job: Job;
};
