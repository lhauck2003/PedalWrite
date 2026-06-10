from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Account, Leader, Caregiver


class BaseAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Leader
        self.leader_profile = Leader.objects.create(
            firstname="Leader",
            lastname="One",
            email="leader@test.com",
        )
        self.leader_user = Account.objects.create_user(
            email="leader@test.com",
            firebase_uid="leader123",
            role=Account.Roles.LEADER,
        )
        self.leader_user.leader = self.leader_profile
        self.leader_user.save()

        # Caregiver
        self.caregiver_profile = Caregiver.objects.create(
            firstname="Care",
            lastname="Giver",
            email="care@test.com",
        )
        self.caregiver_user = Account.objects.create_user(
            email="care@test.com",
            firebase_uid="care123",
            role=Account.Roles.CAREGIVER,
        )
        self.caregiver_user.caregiver = self.caregiver_profile
        self.caregiver_user.save()

        # Superadmin
        self.superadmin = Account.objects.create_user(
            email="admin@test.com",
            firebase_uid="admin123",
            role=Account.Roles.SUPERADMIN,
            is_superuser=True,
            is_staff=True,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)