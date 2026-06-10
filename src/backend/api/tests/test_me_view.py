from api.tests.base import BaseAPITestCase


class MeViewTests(BaseAPITestCase):

    def test_me_endpoint(self):
        self.authenticate(self.leader_user)

        response = self.client.get("/api/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], self.leader_user.email)