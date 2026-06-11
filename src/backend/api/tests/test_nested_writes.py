from api.tests.base import BaseAPITestCase
from api.models import Rider, Skill, DailyForm, FinalForm
from api.serializers import DailyFormSerializer


class NestedWriteTests(BaseAPITestCase):

    def test_create_daily_form_with_skills(self):
        rider = Rider.objects.create(
            firstname="R",
            lastname="L",
            leader=self.leader_profile,
        )

        skill = Skill.objects.create(skillname="Balance")

        self.authenticate(self.leader_user)

        payload = {
            "rider": str(rider.id),
            "comments": "Great session",
            "date": "2026-06-07",
            "skill_links": [
                {
                    "skill": str(skill.id),
                    "level": 1,
                    "comments": "Good"
                }
            ]
        }

        response = self.client.post("/api/daily-forms/", payload, format="json")
        self.assertIn(response.status_code, [200, 201])

    def test_create_final_form_with_skills(self):
        rider = Rider.objects.create(
            firstname="R",
            lastname="L",
            leader=self.leader_profile,
        )

        skill = Skill.objects.create(skillname="Balance")

        self.authenticate(self.leader_user)

        payload = {
            "rider": str(rider.id),
            "comments": "Great session",
            "date": "2026-06-23",
            "skill_links": [
                {
                    "skill": str(skill.id),
                    "level": 1,
                    "comments": "Good"
                }
            ]
        }

        response = self.client.post("/api/final-forms/", payload, format="json")
        self.assertIn(response.status_code, [200, 201])

    def test_update_daily_form_with_skills(self):
        # first create form
        rider = Rider.objects.create(
            firstname="Rider",
            lastname="L",
            leader=self.leader_profile,
        )

        skill = Skill.objects.create(skillname="Balance")
        skill2 = Skill.objects.create(skillname="Braking")

        payload = {
            "rider": str(rider.id),
            "comments": "Great session",
            "date": "2026-06-24",
            "skill_links": [
                {
                    "skill": str(skill.id),
                    "level": 1,
                    "comments": "Good"
                }
            ]
        }
        self.authenticate(self.leader_user)
        response = self.client.post("/api/daily-forms/", payload, format="json")
        self.assertIn(response.status_code, [200, 201])
        # Verify insert into DB and assert fields match

        form = DailyForm.objects.get(rider=rider)

        self.assertEqual(form.comments, "Great session")
        self.assertEqual(str(form.rider.id), str(rider.id))

        skill_links = form.skill_links.all()

        self.assertEqual(skill_links.count(), 1)

        link = skill_links.first()

        self.assertEqual(link.skill.id, skill.id)
        self.assertEqual(link.level, 1)
        self.assertEqual(link.comments, "Good")


        payload = {
            "comments": "Updated session",
            "skill_links": [
                {
                    "skill": str(skill.id),
                    "level": 2,
                    "comments": "Improved"
                },
                {
                    "skill": str(skill2.id),
                    "level": 3,
                    "comments": "Very Good"
                }
            ]
        }

        response = self.client.patch(
            f"/api/daily-forms/{form.id}/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        form.refresh_from_db()

        self.assertEqual(form.comments, "Updated session")

        skill_links = form.skill_links.all()

        self.assertEqual(skill_links.count(), 2)

        balance_link = skill_links.get(skill=skill)
        self.assertEqual(balance_link.level, 2)
        self.assertEqual(balance_link.comments, "Improved")

        braking_link = skill_links.get(skill=skill2)
        self.assertEqual(braking_link.level, 3)
        self.assertEqual(braking_link.comments, "Very Good")