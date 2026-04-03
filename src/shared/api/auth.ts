import { apiRequest } from './http';

export interface ServerOption {
  basename: string;
  companyKey: string;
  serverip: string;
  serverport: number;
  title: string;
}

export interface EmployeeOption {
  departmentId: string;
  employeeId: number;
  employeeName: string;
  loginAccount: string;
  py: string;
}

export interface LoginPayload {
  basename: string;
  employeeId: number;
  password: string;
  serverip: string;
  serverport: number;
}

export interface AuthSession {
  accessToken: string;
  companyKey: string;
  companyTitle: string;
  datasourceCode: string;
  departmentId: string;
  employeeId: number;
  employeeName: string;
  expiresAt: string;
  tokenType: string;
  tokenVersion: number;
  username: string;
}

export async function fetchServerOptions() {
  return apiRequest<ServerOption[]>('/api/system/all-servers', {
    method: 'GET',
  });
}

export async function fetchEmployeeOptions(server: Pick<ServerOption, 'basename' | 'serverip' | 'serverport'>) {
  return apiRequest<EmployeeOption[]>('/api/auth/employees', {
    method: 'GET',
    query: {
      basename: server.basename,
      serverip: server.serverip,
      serverport: server.serverport,
    },
  });
}

export async function loginWithPassword(payload: LoginPayload) {
  return apiRequest<AuthSession>('/api/auth/login', {
    body: payload,
    method: 'POST',
  });
}
