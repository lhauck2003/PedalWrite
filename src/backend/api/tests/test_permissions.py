from api.tests.base import BaseAPITestCase
from api.models import Rider
from auth.permissions import filter_queryset_for_user


class PermissionTests(BaseAPITestCase):

    def test_admin_sees_all_riders(self):
        Rider.objects.create(firstname="A", lastname="A")
        Rider.objects.create(firstname="B", lastname="B")

        qs = Rider.objects.all()
        filtered = filter_queryset_for_user(qs, self.admin)

        self.assertEqual(filtered.count(), 2)

    def test_leader_only_sees_own_riders(self):
        r1 = Rider.objects.create(
            firstname="R1",
            lastname="L1",
            leader=self.leader_profile,
        )
        r2 = Rider.objects.create(firstname="R2", lastname="L2")

        qs = Rider.objects.all()
        filtered = filter_queryset_for_user(qs, self.leader_user)

        self.assertIn(r1, filtered)
        self.assertNotIn(r2, filtered)

    def test_caregiver_only_sees_assigned_riders(self):
        r1 = Rider.objects.create(firstname="A", lastname="B")
        r1.caregivers.add(self.caregiver_profile)

        r2 = Rider.objects.create(firstname="X", lastname="Y")

        qs = Rider.objects.all()
        filtered = filter_queryset_for_user(qs, self.caregiver_user)

        self.assertIn(r1, filtered)
        self.assertNotIn(r2, filtered)