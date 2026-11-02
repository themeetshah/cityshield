"""
Single source of truth for roles, departments and who may create whom.

Hierarchy
---------
superadmin                      -> can do anything (created only from the CLI
                                   via `manage.py createsuperuser`, or by
                                   another superadmin)
<department>_admin              -> created ONLY by a superadmin
<department> staff role         -> created by that department's admin or a
                                   superadmin
volunteer                       -> a citizen whose volunteer application was
                                   approved by the police department
citizen                         -> self-registration (email/password or Google)
"""

SUPERADMIN = 'superadmin'
CITIZEN = 'citizen'
VOLUNTEER = 'volunteer'

# Departments ---------------------------------------------------------------
POLICE = 'police'
MUNICIPAL = 'municipal'
FIRE = 'fire'
MEDICAL = 'medical'

DEPARTMENTS = {
    POLICE: {
        'label': 'Police Department',
        'admin_role': 'police_admin',
        'staff_role': 'police',
    },
    MUNICIPAL: {
        'label': 'Municipal Corporation',
        'admin_role': 'municipal_admin',
        'staff_role': 'municipal_officer',
    },
    FIRE: {
        'label': 'Fire & Rescue',
        'admin_role': 'fire_admin',
        'staff_role': 'firefighter',
    },
    MEDICAL: {
        'label': 'Medical / EMS',
        'admin_role': 'medical_admin',
        'staff_role': 'paramedic',
    },
}

ADMIN_ROLES = {d['admin_role'] for d in DEPARTMENTS.values()}
STAFF_ROLES = {d['staff_role'] for d in DEPARTMENTS.values()}
RESPONDER_ROLES = ADMIN_ROLES | STAFF_ROLES

ROLE_CHOICES = [
    (SUPERADMIN, 'Super Admin'),
    ('police_admin', 'Police Admin'),
    ('police', 'Police Officer'),
    ('municipal_admin', 'Municipal Admin'),
    ('municipal_officer', 'Municipal Officer'),
    ('fire_admin', 'Fire Admin'),
    ('firefighter', 'Firefighter'),
    ('medical_admin', 'Medical Admin'),
    ('paramedic', 'Paramedic'),
    (VOLUNTEER, 'Volunteer'),
    (CITIZEN, 'Citizen'),
]
ROLE_LABELS = dict(ROLE_CHOICES)

_ROLE_TO_DEPARTMENT = {}
for _dept, _cfg in DEPARTMENTS.items():
    _ROLE_TO_DEPARTMENT[_cfg['admin_role']] = _dept
    _ROLE_TO_DEPARTMENT[_cfg['staff_role']] = _dept

DEPARTMENT_CHOICES = [(k, v['label']) for k, v in DEPARTMENTS.items()]


# Role helpers (accept a user or None) -------------------------------------

def _role(user):
    if user is None or not getattr(user, 'is_authenticated', False):
        return None
    return getattr(user, 'role', None)


def is_superadmin(user):
    return _role(user) == SUPERADMIN


def department_of(user):
    """Department of a responder/admin, or None."""
    return _ROLE_TO_DEPARTMENT.get(_role(user))


def department_of_role(role):
    return _ROLE_TO_DEPARTMENT.get(role)


def is_department_admin(user, department=None):
    role = _role(user)
    if role not in ADMIN_ROLES:
        return False
    return department is None or _ROLE_TO_DEPARTMENT[role] == department


def is_responder(user):
    """Any department staff or admin (not superadmin)."""
    return _role(user) in RESPONDER_ROLES


def in_department(user, department):
    """True if the user belongs to `department` OR is a superadmin."""
    return is_superadmin(user) or department_of(user) == department


def is_volunteer(user):
    return _role(user) == VOLUNTEER


def creatable_roles(actor):
    """Roles `actor` is allowed to create via the staff-management API."""
    if is_superadmin(actor):
        return [r for r, _ in ROLE_CHOICES if r not in (CITIZEN, VOLUNTEER)]
    if is_department_admin(actor):
        return [DEPARTMENTS[department_of(actor)]['staff_role']]
    return []


def can_manage_user(actor, target):
    """May `actor` view/edit/deactivate `target` through staff management?"""
    if actor.pk == target.pk:
        return False  # use the profile endpoints for yourself
    if is_superadmin(actor):
        return True
    if is_department_admin(actor):
        dept = department_of(actor)
        return target.role == DEPARTMENTS[dept]['staff_role']
    return False


# Routing of incidents to departments ---------------------------------------

REPORT_TYPE_DEPARTMENT = {
    'crime': POLICE,
    'harassment': POLICE,
    'safety': POLICE,
    'infrastructure': MUNICIPAL,
    'fire_hazard': FIRE,
    'medical': MEDICAL,
    'other': MUNICIPAL,
}

EMERGENCY_TYPE_DEPARTMENT = {
    'fire': FIRE,
    'medical': MEDICAL,
    'medical_emergency': MEDICAL,
    'fire_emergency': FIRE,
}


def department_for_report_type(report_type):
    return REPORT_TYPE_DEPARTMENT.get(report_type, POLICE)


def department_for_emergency_type(emergency_type):
    """Police are the default first responders for any SOS."""
    return EMERGENCY_TYPE_DEPARTMENT.get(emergency_type, POLICE)


def user_payload(user):
    """Compact user dict returned by auth endpoints and /me/."""
    station = getattr(user, 'police_station', None)
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'role_label': ROLE_LABELS.get(user.role, user.role),
        'department': department_of_role(user.role),
        'is_superadmin': user.role == SUPERADMIN,
        'is_department_admin': user.role in ADMIN_ROLES,
        'is_responder': user.role in RESPONDER_ROLES,
        'police_station': station.id if station else None,
        'police_station_name': station.name if station else None,
        'creatable_roles': creatable_roles(user),
    }
