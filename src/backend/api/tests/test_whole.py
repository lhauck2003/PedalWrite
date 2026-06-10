from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from api.models import (
    Rider,
    Caregiver,
    CaregiverRider,
    Bike,
    Skill,
    Session,
    DailyForm,
    FinalForm,
    DailyFormSkill,
    FinalFormSkill,
    BikeSpecs,
    Leader,
)

from api.serializers import (
    SessionSerializer,
    SkillSerializer,
    RiderSerializer,
    CaregiverSerializer,
    CaregiverRiderSerializer,
    DailyFormSerializer,
    DailyFormSkillSerializer,
    FinalFormSerializer,
    FinalFormSkillSerializer,
    LeaderSerializer,
    AccountSerializer
)

User = get_user_model()


class ApiFixtureMixin:
    @classmethod
    def setUpTestData(cls):
        cls.session = Session.objects.create(sessionnumber=1)
        cls.other_session = Session.objects.create(sessionnumber=2)

        cls.leader = Leader.objects.create(
            firstname="Lead",
            lastname="One",
            email="leader1@example.com",
        )
        cls.other_leader = Leader.objects.create(
            firstname="Lead",
            lastname="Two",
            email="leader2@example.com",
        )
        cls.caregiver = Caregiver.objects.create(
            firstname="Care",
            lastname="Giver",
            email="caregiver@example.com",
        )
        cls.other_caregiver = Caregiver.objects.create(
            firstname="Other",
            lastname="Caregiver",
            email="other-caregiver@example.com",
        )

        cls.rider = Rider.objects.create(
            firstname="Rider",
            lastname="One",
            isquickstart=True,
            session=cls.session,
            leader=cls.leader,
        )
        cls.other_rider = Rider.objects.create(
            firstname="Rider",
            lastname="Two",
            isquickstart=False,
            session=cls.other_session,
            leader=cls.other_leader,
        )
        cls.caregiver_link = CaregiverRider.objects.create(
            caregiver=cls.caregiver,
            rider=cls.rider,
            firstname="Care",
            lastname="Giver",
            phone="12345678",
            email="caregiver@example.com",
            isemergencycontact=True,
        )
        CaregiverRider.objects.create(
            caregiver=cls.other_caregiver,
            rider=cls.other_rider,
            firstname="Other",
            lastname="Caregiver",
            phone="87654321",
            email="other-caregiver@example.com",
            isemergencycontact=False,
        )

        cls.skill = Skill.objects.create(skillname="Balance", formlevel=1)
        cls.other_skill = Skill.objects.create(skillname="Braking", formlevel=1)
        cls.daily_form = DailyForm.objects.create(
            rider=cls.rider,
            session=cls.session,
            leader=cls.leader,
            comments="first note",
            level=1,
        )
        cls.other_daily_form = DailyForm.objects.create(
            rider=cls.other_rider,
            session=cls.other_session,
            leader=cls.other_leader,
            comments="private note",
            level=1,
        )
        cls.daily_form_skill = DailyFormSkill.objects.create(
            dailyform=cls.daily_form,
            skill=cls.skill,
            level=1,
            comments="steady",
        )
        cls.final_form = FinalForm.objects.create(
            date="2026-06-07",
            rider=cls.rider,
            session=cls.session,
            leader=cls.leader,
            comments="done",
            level=2,
        )
        cls.final_form_skill = FinalFormSkill.objects.create(
            finalform=cls.final_form,
            skill=cls.skill,
            level=2,
            comments="finished",
        )

        cls.superadmin = User.objects.create_user(
            email="admin@example.com",
            firebase_uid="admin-uid",
            role=User.Roles.SUPERADMIN,
            is_staff=True,
            is_superuser=True,
        )
        cls.leader_user = User.objects.create_user(
            email="leader1@example.com",
            firebase_uid="leader-uid",
            role=User.Roles.LEADER,
            leader=cls.leader,
        )
        cls.other_leader_user = User.objects.create_user(
            email="leader2@example.com",
            firebase_uid="other-leader-uid",
            role=User.Roles.LEADER,
            leader=cls.other_leader,
        )
        cls.caregiver_user = User.objects.create_user(
            email="caregiver@example.com",
            firebase_uid="caregiver-uid",
            role=User.Roles.CAREGIVER,
            caregiver=cls.caregiver,
        )
        cls.anonymous_user = User.objects.create_user(
            email="anonymous@example.com",
            firebase_uid="anonymous-uid",
            role=User.Roles.ANONYMOUS,
        )

    def setUp(self):
        self.client = APIClient()

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def assert_ids(self, response, expected_ids):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {str(item["id"]) for item in response.data},
            {str(item_id) for item_id in expected_ids},
        )


class TestViews(ApiFixtureMixin, TestCase):
    def test_superadmin_can_list_create_update_and_delete_skills(self):
        self.authenticate(self.superadmin)

        response = self.client.get(reverse("skill-list"))
        self.assert_ids(response, [self.skill.id, self.other_skill.id])

        response = self.client.post(
            reverse("skill-list"),
            {"skillname": "Starting", "formlevel": 2},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        skill_id = response.data["id"]

        response = self.client.patch(
            reverse("skill-detail", args=[skill_id]),
            {"skillname": "Starting and stopping"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["skillname"], "Starting and stopping")

        response = self.client.delete(reverse("skill-detail", args=[skill_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Skill.objects.filter(pk=skill_id).exists())

    def test_leader_sees_only_their_data_and_can_update_associated_forms(self):
        self.authenticate(self.leader_user)

        self.assert_ids(
            self.client.get(reverse("rider-list")),
            [self.rider.id],
        )
        self.assert_ids(
            self.client.get(reverse("dailyform-list")),
            [self.daily_form.id],
        )

        response = self.client.patch(
            reverse("dailyform-detail", args=[self.daily_form.id]),
            {"comments": "leader update"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.daily_form.refresh_from_db()
        self.assertEqual(self.daily_form.comments, "leader update")

        response = self.client.patch(
            reverse("dailyform-detail", args=[self.other_daily_form.id]),
            {"comments": "not allowed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.other_daily_form.refresh_from_db()
        self.assertEqual(self.other_daily_form.comments, "private note")

def test_leader_can_manage_daily_form_skill_links_for_their_forms(self):
    self.authenticate(self.leader_user)

    # ----------------------------------------
    # 1. ADD skill via DAILY FORM update
    # ----------------------------------------
    response = self.client.patch(
        reverse("dailyform-detail", args=[self.daily_form.id]),
        {
            "skill_links": [
                {
                    "skill": str(self.other_skill.id),
                    "level": 2,
                    "comments": "new link"
                }
            ]
        },
        format="json",
    )

    self.assertIn(response.status_code, [200, 201])

    self.daily_form.refresh_from_db()

    self.assertTrue(
        self.daily_form.skill_links.exists() or
        self.daily_form.skill_links.count() > 0
    )

    # get created skill link
    skill_link = self.daily_form.skill_links.first()
    self.assertEqual(skill_link.comments, "new link")

    # ----------------------------------------
    # 2. UPDATE skill via FORM PATCH
    # ----------------------------------------
    skill_link_id = skill_link.id

    response = self.client.patch(
        reverse("dailyform-detail", args=[self.daily_form.id]),
        {
            "skill_links": [
                {
                    "id": str(skill_link_id),
                    "skill": str(self.other_skill.id),
                    "level": 3,
                    "comments": "updated link"
                }
            ]
        },
        format="json",
    )

    self.assertEqual(response.status_code, 200)

    skill_link.refresh_from_db()
    self.assertEqual(skill_link.comments, "updated link")
    self.assertEqual(skill_link.level, 3)

    # ----------------------------------------
    # 3. DELETE skill via FORM PATCH (empty omission strategy)
    # ----------------------------------------
    response = self.client.patch(
        reverse("dailyform-detail", args=[self.daily_form.id]),
        {
            "skill_links": []
        },
        format="json",
    )

    self.assertEqual(response.status_code, 200)

    self.assertEqual(
        self.daily_form.skill_links.count(),
        0
    )


class TestAuth(ApiFixtureMixin, TestCase):
    def test_unauthenticated_users_are_blocked_from_data_endpoints(self):
        response = self.client.get(reverse("rider-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.get(reverse("general-stats"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["riders"], 2)
        self.assertEqual(response.data["sessions"], 2)
        self.assertEqual(response.data["daily_forms"], 2)
        self.assertEqual(response.data["final_forms"], 1)

    def test_me_returns_authenticated_account_context(self):
        self.authenticate(self.leader_user)

        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "leader1@example.com")
        self.assertEqual(response.data["username"], "leader1@example.com")
        self.assertEqual(response.data["role"], User.Roles.LEADER)
        self.assertEqual(str(response.data["leader"]), str(self.leader.id))
        self.assertIsNone(response.data["caregiver"])

    def test_superadmin_can_see_all_scoped_data(self):
        self.authenticate(self.superadmin)

        self.assert_ids(
            self.client.get(reverse("rider-list")),
            [self.rider.id, self.other_rider.id],
        )
        self.assert_ids(
            self.client.get(reverse("caregiver-list")),
            [self.caregiver.id, self.other_caregiver.id],
        )

    def test_caregiver_has_read_only_access_to_their_related_data(self):
        self.authenticate(self.caregiver_user)

        self.assert_ids(
            self.client.get(reverse("rider-list")),
            [self.rider.id],
        )
        self.assert_ids(
            self.client.get(reverse("caregiver-list")),
            [self.caregiver.id],
        )

        response = self.client.patch(
            reverse("dailyform-detail", args=[self.daily_form.id]),
            {"comments": "caregiver edit"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.daily_form.refresh_from_db()
        self.assertNotEqual(self.daily_form.comments, "caregiver edit")

    def test_unscoped_authenticated_users_are_blocked(self):
        self.authenticate(self.anonymous_user)

        response = self.client.get(reverse("rider-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(
            reverse("skill-list"),
            {"skillname": "Should fail", "formlevel": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
