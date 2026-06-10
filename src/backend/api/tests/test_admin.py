from api.tests.base import BaseAPITestCase
from api.models import Rider, Skill, DailyForm, FinalForm, Bike, BikeSpecs, Session, Caregiver
from api.serializers import DailyFormSerializer
from django.urls import reverse
from rest_framework import status


class AdminTests(BaseAPITestCase):

    def test_create_new_skill(self):
        self.authenticate(self.admin)

        payload = {
            "skillname": "Cornering",
            "formlevel": 1,
            "category": "basic"
        }

        response = self.client.post(
            reverse("skill-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(Skill.objects.count(), 1)

        skill = Skill.objects.get()

        self.assertEqual(skill.skillname, "Cornering")
        self.assertEqual(skill.formlevel, 1)
        self.assertEqual(skill.category, "basic")

    def test_delete_skill(self):
        self.authenticate(self.admin)

        skill = Skill.objects.create(
            skillname="Cornering",
            formlevel=1,
        )

        response = self.client.delete(
            reverse("skill-detail", args=[skill.id])
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(
            Skill.objects.filter(id=skill.id).exists()
        )

    def test_update_skill_fields(self):
        self.authenticate(self.admin)

        skill = Skill.objects.create(
            skillname="Cornering",
            formlevel=2,
        )

        response = self.client.patch(
            reverse("skill-detail", args=[skill.id]),
            {
                "skillname": "Advanced Cornering",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        skill.refresh_from_db()

        self.assertEqual(
            skill.skillname,
            "Advanced Cornering",
        )

    def test_add_new_rider_with_session(self):
        self.authenticate(self.admin)

        session = Session.objects.create(
            sessionnumber=1,
        )

        payload = {
            "firstname": "John",
            "lastname": "Doe",
            "session": str(session.id),
            "leader": str(self.leader_profile.id),
        }

        response = self.client.post(
            reverse("rider-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        rider = Rider.objects.get(firstname="John")

        self.assertEqual(rider.lastname, "Doe")
        self.assertEqual(rider.session_id, session.id)
        self.assertEqual(rider.leader_id, self.leader_profile.id)

    def test_change_riders_leader(self):
        self.authenticate(self.admin)

        rider = Rider.objects.create(
            firstname="John",
            lastname="Doe",
            leader=self.leader_profile,
        )

        new_leader = self.leader_profile

        response = self.client.patch(
            reverse("rider-detail", args=[rider.id]),
            {
                "leader": str(new_leader.id),
            },
            format="json",
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        rider.refresh_from_db()

        self.assertEqual(
            rider.leader_id,
            new_leader.id,
        )

    def test_add_rider_with_multiple_caregivers_and_leader_and_session(self):
        self.authenticate(self.admin)

        session = Session.objects.create(
            sessionnumber=1,
        )

        caregiver1 = Caregiver.objects.create(
            firstname="Mom",
            lastname="One",
        )

        caregiver2 = Caregiver.objects.create(
            firstname="Dad",
            lastname="Two",
        )

        rider = Rider.objects.create(
            firstname="John",
            lastname="Doe",
            session=session,
            leader=self.leader_profile,
        )

        self.assertEqual(
            rider.leader_id,
            self.leader_profile.id,
        )

        self.assertEqual(
            rider.session_id,
            session.id,
        )


    def test_create_new_bike(self):
        self.authenticate(self.admin)

        payload = {
            "name": "Red Bike",
            "size": Bike.BikeSizes.MEDIUM,
        }

        response = self.client.post(
            reverse("bike-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        bike = Bike.objects.get(name="Red Bike")

        self.assertEqual(bike.name, "Red Bike")
        self.assertEqual(bike.size, Bike.BikeSizes.MEDIUM)


    def test_create_multiple_new_bikes(self):
        self.authenticate(self.admin)

        bikes = [
            {
                "name": "Bike A",
                "size": Bike.BikeSizes.SMALL,
            },
            {
                "name": "Bike B",
                "size": Bike.BikeSizes.LARGE,
            },
            {
                "name": "Bike C",
                "size": Bike.BikeSizes.MEDIUM,
            },
        ]

        for payload in bikes:
            response = self.client.post(
                reverse("bike-list"),
                payload,
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(Bike.objects.count(), 3)

        self.assertTrue(Bike.objects.filter(name="Bike A").exists())
        self.assertTrue(Bike.objects.filter(name="Bike B").exists())
        self.assertTrue(Bike.objects.filter(name="Bike C").exists())


    def test_assign_bike_to_rider(self):
        self.authenticate(self.admin)

        rider = Rider.objects.create(
            firstname="Test",
            lastname="Rider",
            leader=self.leader_profile,
        )

        bike = Bike.objects.create(
            name="Assignment Bike",
            size=Bike.BikeSizes.MEDIUM,
        )

        payload = {
            "bike": str(bike.id),
            "rider": str(rider.id),
            "day": BikeSpecs.Days.DAY_ONE,
            "seat_height": 24.5,
            "left_piston": 2.0,
            "right_piston": 2.5,
        }

        response = self.client.post(
            reverse("bikespecs-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        spec = BikeSpecs.objects.get(
            bike=bike,
            rider=rider,
            day=BikeSpecs.Days.DAY_ONE,
        )

        self.assertEqual(spec.seat_height, 24.5)
        self.assertEqual(spec.left_piston, 2.0)
        self.assertEqual(spec.right_piston, 2.5)

        self.assertIn(rider, bike.riders.all())
        self.assertIn(bike, rider.bike_set.all())