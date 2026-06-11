from api.tests.base import BaseAPITestCase
from api.models import Rider, Session, DailyForm, FinalForm, DailyFormSkill, Skill
import json


class StatsTests(BaseAPITestCase):

    def test_general_stats(self):
        # create known dataset
        Rider.objects.create(firstname="A", lastname="B", leader=self.leader_profile)
        Rider.objects.create(firstname="C", lastname="D", leader=self.leader_profile)

        Session.objects.create(sessionnumber=1)
        Session.objects.create(sessionnumber=2)
        Session.objects.create(sessionnumber=3)

        DailyForm.objects.create(
            rider=Rider.objects.first(),
            session=Session.objects.first(),
            date="2026-06-01",
        )

        FinalForm.objects.create(
            rider=Rider.objects.first(),
            session=Session.objects.first(),
            date="2026-06-01",
        )

        response = self.client.get("/api/stats/general/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["riders"], 2)
        self.assertEqual(response.data["sessions"], 3)
        self.assertEqual(response.data["daily_forms"], 1)
        self.assertEqual(response.data["final_forms"], 1)


    def test_export_stats(self):
        rider = Rider.objects.create(
            firstname="R",
            lastname="L",
            leader=self.leader_profile,
        )

        skill = Skill.objects.create(skillname="Balance")

        form = DailyForm.objects.create(
            rider=rider,
            session=None,
            date="2026-06-01",
        )

        DailyFormSkill.objects.create(
            dailyform=form,
            skill=skill,
            level=2,
            comments="good",
        )

        response = self.client.get("/api/data/view/")
        self.assertEqual(response.status_code, 200)

        data = response.data
        #print(json.dumps(dict(data), indent=2, default=str))

        # structure checks
        self.assertIn("dailyform", data)
        self.assertIn("finalform", data)
        self.assertIn("skill", data)

        # content checks
        self.assertEqual(data["dailyform"]["count"], 1)
        self.assertEqual(len(data["dailyform"]["content"]), 1)

        self.assertEqual(data["skill"]["count"], 1)
        self.assertEqual(len(data["skill"]["content"]), 1)