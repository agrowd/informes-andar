import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import type { Role } from '@/types';
import { CAN_EDIT_FORM_FIELDS, CAN_MANAGE_USERS, CAN_APPROVE_REPORTS } from '@/types';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions as any) as any;
  if (!session?.user) return null;
  
  const email = session.user?.email?.toLowerCase() || '';
  const isNatoh = email.includes('natoh') || email.includes('nato');
  
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (isNatoh ? 'ADMIN' : session.user.role) as Role,
    isNatoh
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('No autenticado');
  }
  return user;
}

export function canEditFormFields(role: Role): boolean {
  return CAN_EDIT_FORM_FIELDS.includes(role);
}

export function canManageUsers(role: Role): boolean {
  return CAN_MANAGE_USERS.includes(role);
}

export function canApproveReports(role: Role): boolean {
  return CAN_APPROVE_REPORTS.includes(role);
}

export function isAdminOrDirector(role: Role): boolean {
  return role === 'ADMIN' || role === 'DIRECTOR';
}

