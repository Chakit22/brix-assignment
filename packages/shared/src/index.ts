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
