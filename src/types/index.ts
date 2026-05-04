export type Role = 'ADMIN' | 'DIRECTOR' | 'COORDINACION' | 'FACILITADOR';

// Roles que pueden editar campos del formulario
export const CAN_EDIT_FORM_FIELDS: Role[] = ['ADMIN', 'DIRECTOR', 'COORDINACION'];

// Roles que pueden gestionar usuarios
export const CAN_MANAGE_USERS: Role[] = ['ADMIN', 'DIRECTOR'];

// Roles que pueden aprobar informes
export const CAN_APPROVE_REPORTS: Role[] = ['ADMIN', 'DIRECTOR', 'COORDINACION'];

export interface GenerateReportRequest {
  form: unknown;
}

export interface GenerateReportResponse {
  report: any;
  html: string;
  used: 'ia' | 'fallback';
  error?: string;
}

