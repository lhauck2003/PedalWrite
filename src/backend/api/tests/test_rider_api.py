from api.tests.base import BaseAPITestCase
from api.models import Rider, Leader


class RiderAPITests(BaseAPITestCase):

    def test_leader_can_list_own_riders(self):
        Rider.objects.create(
            firstname="R1",
            lastname="L1",
            leader=self.leader_profile,
        )

        Rider.objects.create(firstname="R2", lastname="L2")

        self.authenticate(self.leader_user)
        response = self.client.get("/api/riders/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_create_rider(self):
        self.authenticate(self.admin)

        payload = {
            "firstname": "Test",
            "lastname": "Rider",
            "leader": self.leader_profile.id,
        }

        response = self.client.post("/api/riders/", payload)

        self.assertIn(response.status_code, [200, 201])