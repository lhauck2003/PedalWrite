from api.tests.base import BaseAPITestCase
from api.models import Rider
from auth.permissions import filter_queryset_for_user


class QuerysetFilteringTests(BaseAPITestCase):

    def test_leader_filter_blocks_unrelated_objects(self):
        r1 = Rider.objects.create(
            firstname="A",
            lastname="A",
            leader=self.leader_profile,
        )
        r2 = Rider.objects.create(firstname="B", lastname="B")

        qs = Rider.objects.all()
        filtered = filter_queryset_for_user(qs, self.leader_user)

        self.assertIn(r1, filtered)
        self.assertNotIn(r2, filtered)