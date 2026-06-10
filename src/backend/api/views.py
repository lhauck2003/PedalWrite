# api/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from auth.permissions import IsSuperadmin
from rest_framework.response import Response
from rest_framework.views import APIView
from firebase_admin import auth
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404


from api.models import (
    Caregiver,
    DailyForm,
    DailyFormSkill,
    FinalForm,
    FinalFormSkill,
    Rider,
    Session,
    Skill,
    Bike,
    BikeSpecs,
    Account,
    Leader,
)
from api.serializers import (
    CaregiverSerializer,
    DailyFormSerializer,
    AnonymousDailyFormSerializer,
    DailyFormSkillSerializer,
    FinalFormSerializer,
    AnonymousFinalFormSerializer,
    FinalFormSkillSerializer,
    RiderSerializer,
    SessionSerializer,
    SkillSerializer,
    BikeSerializer,
    BikeSpecsSerializer,
    LeaderSerializer,
)
from auth.permissions import (
    IsAnonymousStatsAccess,
    TieredDataPermission,
    filter_queryset_for_user,
    get_account,
)


class TieredQuerysetMixin:
    permission_classes = (TieredDataPermission,)

    def get_queryset(self):
        return filter_queryset_for_user(super().get_queryset(), self.request.user)


class RiderViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = Rider.objects.select_related('session', 'leader').prefetch_related('caregivers', 'daily_forms', 'final_forms')
    serializer_class = RiderSerializer


class DailyFormViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = DailyForm.objects.select_related('rider__leader', 'session', 'leader').prefetch_related('skill_links', 'skill_links__skill')
    serializer_class = DailyFormSerializer


class FinalFormViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = FinalForm.objects.select_related('rider__leader', 'session', 'leader').prefetch_related('skill_links', 'skill_links__skill')
    serializer_class = FinalFormSerializer


class DailyFormSkillViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = DailyFormSkill.objects.select_related('dailyform__rider__leader', 'dailyform__leader', 'skill')
    serializer_class = DailyFormSkillSerializer


class FinalFormSkillViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = FinalFormSkill.objects.select_related('finalform__rider__leader', 'finalform__leader', 'skill')
    serializer_class = FinalFormSkillSerializer


class CaregiverViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = Caregiver.objects.prefetch_related('riders')
    serializer_class = CaregiverSerializer

class LeaderViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = Leader.objects.prefetch_related('riders')
    serializer_class = LeaderSerializer


class SessionViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = Session.objects.all()
    serializer_class = SessionSerializer


class SkillViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['formlevel']

class BikeViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = Bike.objects.all()
    serializer_class = BikeSerializer

class BikeSpecsViewSet(TieredQuerysetMixin, viewsets.ModelViewSet):
    queryset = BikeSpecs.objects.select_related('bike', 'rider')
    serializer_class = BikeSpecsSerializer

class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        account = get_account(request.user)
        return Response({
            'id': request.user.pk,
            'email': request.user.email,
            'firebase_uid': request.user.firebase_uid,
            'role': getattr(account, 'role', None),
            'leader': getattr(account, 'leader_id', None),
            'caregiver': getattr(account, 'caregiver_id', None),
        })

# --------------------------------------------------------
# Admin view for all accounts
# --------------------------------------------------------

class UserManagementView(APIView):
    permission_classes = (IsAuthenticated, IsSuperadmin)

    def get(self, request):
        results = []

        page = auth.list_users()

        while page:
            for firebase_user in page.users:

                account = Account.objects.filter(
                    firebase_uid=firebase_user.uid
                ).first()

                results.append({
                    "uid": firebase_user.uid,
                    "email": firebase_user.email,
                    "role": account.role if account else None,
                    "account_id": str(account.id) if account else None,
                })

            page = page.get_next_page()

        return Response(results)
    
class UpdateRoleView(APIView):
    permission_classes = (IsAuthenticated, IsSuperadmin)

    def patch(self, request, id):
        print("REQUEST: ", request, " ID: ", id)
        account = get_object_or_404(Account, id=id)
        role = request.data["role"]
        account.role = request.data["role"]
        # Create the Leader/Caregiver object and connect it to account
        if (role == "leader" or role == "Leader"):
            #account.admin = None
            if account.caregiver:
                account.caregiver.delete
                account.caregiver = None
            account.leader = Leader.objects.create()
        elif (role == "caregiver" or role == "Caregiver"):
            # delete admin and leader accounts
            #Admin.objects.delete(account.admin)
            #account.admin = None
            if account.leader:
                account.leader.delete()
                account.leader = None
            account.caregiver = Caregiver.objects.create()
        else:
            #Admin.objects.delete(account.admin)
            if account.caregiver:
                account.caregiver.delete()
                account.caregiver = None
            if account.leader:
                account.leader.delete()
                account.leader = None
            account.role = "anonymous"

        account.save()
        print(account.role)
        return Response({"success": True})

# --------------------------------------------------------
# Need more statistics views for frontend visualizations
# --------------------------------------------------------

class GeneralStatsView(APIView):
    authentication_classes = ()
    permission_classes = (IsAnonymousStatsAccess,)

    def get(self, request):
        return Response({
            'riders': Rider.objects.count(),
            'sessions': Session.objects.count(),
            'daily_forms': DailyForm.objects.count(),
            'final_forms': FinalForm.objects.count(),
        })
    
"""
Gets a Snapshot of the Database Data sections (Skills and forms) for use for visuals
"""    
class ExportAnonymousData(APIView):
    authentication_classes = ()
    permission_classes = (IsAnonymousStatsAccess,)

    def get(self, request):
        daily_forms = DailyForm.objects.prefetch_related('skill_links').only('id', 'date', 'level')
        final_forms = FinalForm.objects.prefetch_related('skill_links').only('id', 'date', 'level')
        daily_form_skills = DailyFormSkill.objects.only('skill', 'level')
        final_form_skills = FinalFormSkill.objects.only('skill', 'level')
        skills = Skill.objects.all()

        return Response({
            'dailyform': {
                'count': daily_forms.count(),
                'content': AnonymousDailyFormSerializer(
                    daily_forms,
                    many=True
                ).data,
            },
            'finalform': {
                'count': final_forms.count(),
                'content': AnonymousFinalFormSerializer(
                    final_forms,
                    many=True
                ).data,
            },
            'dailyformskill': {
                'count': daily_form_skills.count(),
                'content': DailyFormSkillSerializer(
                    daily_form_skills,
                    many=True
                ).data,
            },
            'finalformskill': {
                'count': final_form_skills.count(),
                'content': FinalFormSkillSerializer(
                    final_form_skills,
                    many=True
                ).data,
            },
            'skill': {
                'count': skills.count(),
                'content': SkillSerializer(
                    skills,
                    many=True
                ).data,
            },
        })