from django.db.models import Q
from rest_framework.permissions import SAFE_METHODS, BasePermission


def user_role(user):
    if not getattr(user, 'is_authenticated', False):
        return None
    account = get_account(user)
    return getattr(account, 'role', None)


def get_account(user):
    if not getattr(user, 'is_authenticated', False):
        return None
    if hasattr(user, 'firebase_account'):
        return user.firebase_account
    return getattr(user, 'access_profile', None)


def is_superadmin(user):
    account = get_account(user)
    return bool(getattr(user, 'is_superuser', False) or getattr(account, 'is_superadmin', False))


def leader_rider_filter(user):
    account = get_account(user)
    if getattr(account, 'is_leader', False):
        return Q(leader=account.leader)
    return Q(pk__in=[])


def caregiver_rider_filter(user):
    account = get_account(user)
    if getattr(account, 'is_caregiver', False):
        return Q(caregivers=account.caregiver)
    return Q(pk__in=[])


def filter_queryset_for_user(queryset, user):
    if is_superadmin(user):
        return queryset

    model_name = queryset.model.__name__

    account = get_account(user)

    """
    Leader:
         CAN: 
        - view THEIR riders and all information associated with those riders, including
                + Caregiver (email, name)
                + Bike (all information) and BikeSpecs (all information)
                + All Forms (Daily, Final) and all Skills (Skill, DailyFormSkill, FinalFormSkill)
        - Edit (add/update) Forms associated with their riders (DailyForm, FinalForm)
                + this means they should be able to create new DailyFormSkill, FinalFormSkill that are associated to Skill
        - Edit (add/update) the BikeSpecs information associated with their Riders
        - Edit (add/update) their own information

        CANNOT:
        - view other riders (not associated with them)
        - edit any information not associated to them (aside from the permissions defined above)
    """
    if getattr(account, 'is_leader', False):
        leader = account.leader
        if model_name == 'Rider':
            return queryset.filter(leader=leader).distinct()
        if model_name == "Bike":
            return queryset.filter(riders__leader=leader).distinct()
        if model_name in {'DailyForm', 'FinalForm'}:
            return queryset.filter(Q(leader=leader) | Q(rider__leader=leader)).distinct()
        if model_name in {'DailyFormSkill', 'FinalFormSkill'}:
            form_field = 'dailyform' if model_name == 'DailyFormSkill' else 'finalform'
            return queryset.filter(
                Q(**{f'{form_field}__leader': leader})
                | Q(**{f'{form_field}__rider__leader': leader})
            ).distinct()
        if model_name in {'Caregiver', 'CaregiverRider'}:
            prefix = 'riders' if model_name == 'Caregiver' else 'rider'
            return queryset.filter(**{f'{prefix}__leader': leader}).distinct()
        return queryset

    """
    Caregiver:
        CAN:
        - view THEIR riders and all information associated with those riders, including
                + Leader (email, name)
                + Bike (all information) and BikeSpecs (all information)
                + All Forms (Daily, Final) and all Skills (Skill, DailyFormSkill, FinalFormSkill)
        - edit (Add/Update) THEIR riders information, but not any information related to their rider
                + only edit things in the Rider model, not any of its relations
        - edit their own information
    """
    if getattr(account, 'is_caregiver', False):
        caregiver = account.caregiver
        if model_name == 'Rider':
            return queryset.filter(caregivers=caregiver).distinct()
        if model_name in {'DailyForm', 'FinalForm'}:
            return queryset.filter(rider__caregivers=caregiver).distinct()
        if model_name in {'DailyFormSkill', 'FinalFormSkill'}:
            form_field = 'dailyform' if model_name == 'DailyFormSkill' else 'finalform'
            return queryset.filter(**{f'{form_field}__rider__caregivers': caregiver}).distinct()
        if model_name == 'Caregiver':
            return queryset.filter(id=caregiver.id)
        return queryset.none()

    return queryset.none()


class IsSuperadmin(BasePermission):
    def has_permission(self, request, view):
        return is_superadmin(request.user)


class IsLeader(BasePermission):
    def has_permission(self, request, view):
        return is_superadmin(request.user) or bool(getattr(get_account(request.user), 'is_leader', False))


class IsCaregiverReadOnly(BasePermission):
    def has_permission(self, request, view):
        return (
            is_superadmin(request.user)
            or bool(getattr(get_account(request.user), 'is_leader', False))
            or (
                request.method in SAFE_METHODS
                and bool(getattr(get_account(request.user), 'is_caregiver', False))
            )
        )


class TieredDataPermission(BasePermission):
    def has_permission(self, request, view):
        account = get_account(request.user)
        if is_superadmin(request.user) or getattr(account, 'is_leader', False):
            return True
        
        if getattr(account, "is_caregiver", False):
            if request.method in SAFE_METHODS:
                return True

            # allow caregiver updates on CaregiverViewSet
            if view.queryset.model.__name__ == "Caregiver":
                return True

        return False

    def has_object_permission(self, request, view, obj):
        if is_superadmin(request.user):
            return True

        account = get_account(request.user)

        if getattr(account, "is_caregiver", False):
            if request.method not in SAFE_METHODS:
                return (
                    obj.__class__.__name__ == "Caregiver"
                    and obj.id == account.caregiver.id
                )

        queryset = obj.__class__.objects.filter(pk=obj.pk)
        return filter_queryset_for_user(queryset, request.user).exists()


class IsAnonymousStatsAccess(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
