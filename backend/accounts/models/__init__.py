"""Accounts models package.

Re-exports every model so existing imports such as
``from accounts.models import User`` keep working after the split from a single
``models.py`` into this package (see docs/rbac/11-IMPLEMENTATION-PHASES.md, Phase 1).
"""

from .user import User
from .role import Role, RolePermission
from .permission import Permission
from .user_permission import UserPermission
from .region import Region, UserRegion
from .device import DeviceRegistration, RefreshTokenBlacklist

__all__ = [
    'User',
    'Role',
    'RolePermission',
    'Permission',
    'UserPermission',
    'Region',
    'UserRegion',
    'DeviceRegistration',
    'RefreshTokenBlacklist',
]
