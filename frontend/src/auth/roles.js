// Mirrors backend/users/roles.py. The server is the authority; these helpers
// only decide what UI to show. Never rely on them for security.

export const SUPERADMIN = 'superadmin';
export const CITIZEN = 'citizen';
export const VOLUNTEER = 'volunteer';

export const DEPARTMENTS = {
    police: { label: 'Police Department', adminRole: 'police_admin', staffRole: 'police' },
    municipal: { label: 'Municipal Corporation', adminRole: 'municipal_admin', staffRole: 'municipal_officer' },
    fire: { label: 'Fire & Rescue', adminRole: 'fire_admin', staffRole: 'firefighter' },
    medical: { label: 'Medical / EMS', adminRole: 'medical_admin', staffRole: 'paramedic' },
};

export const ROLE_LABELS = {
    superadmin: 'Super Admin',
    police_admin: 'Police Admin',
    police: 'Police Officer',
    municipal_admin: 'Municipal Admin',
    municipal_officer: 'Municipal Officer',
    fire_admin: 'Fire Admin',
    firefighter: 'Firefighter',
    medical_admin: 'Medical Admin',
    paramedic: 'Paramedic',
    volunteer: 'Volunteer',
    citizen: 'Citizen',
};

const ROLE_TO_DEPARTMENT = Object.fromEntries(
    Object.entries(DEPARTMENTS).flatMap(([dept, cfg]) => [[cfg.adminRole, dept], [cfg.staffRole, dept]])
);

export const ADMIN_ROLES = Object.values(DEPARTMENTS).map((d) => d.adminRole);
export const STAFF_ROLES = Object.values(DEPARTMENTS).map((d) => d.staffRole);
export const RESPONDER_ROLES = [...ADMIN_ROLES, ...STAFF_ROLES];

export const roleLabel = (role) => ROLE_LABELS[role] || role || '';
export const departmentOfRole = (role) => ROLE_TO_DEPARTMENT[role] || null;
export const departmentOf = (user) => departmentOfRole(user?.role);
export const departmentLabel = (dept) => DEPARTMENTS[dept]?.label || '';

export const isSuperAdmin = (user) => user?.role === SUPERADMIN;
export const isDepartmentAdmin = (user) => ADMIN_ROLES.includes(user?.role);
export const isResponder = (user) => RESPONDER_ROLES.includes(user?.role);
/** Staff, admins and superadmin: users who get the operations dashboard. */
export const isOperations = (user) => isSuperAdmin(user) || isResponder(user);
/** Citizens and volunteers: the public-facing app. */
export const isCommunityUser = (user) => [CITIZEN, VOLUNTEER].includes(user?.role);
export const isVolunteer = (user) => user?.role === VOLUNTEER;
export const canManageStaff = (user) => isSuperAdmin(user) || isDepartmentAdmin(user);
/** True if user belongs to `dept` or is superadmin. */
export const inDepartment = (user, dept) => isSuperAdmin(user) || departmentOf(user) === dept;
export const hasRole = (user, ...roles) => !!user && roles.flat().includes(user.role);
