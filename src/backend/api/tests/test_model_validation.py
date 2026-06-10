from django.core.exceptions import ValidationError
from django.utils import timezone
from api.tests.base import BaseAPITestCase
from api.models import Session


class ModelValidationTests(BaseAPITestCase):

    def test_session_end_before_start_raises(self):
        s = Session(
            sessionnumber=1,
            starttime=timezone.now(),
            endtime=timezone.now() - timezone.timedelta(days=1),
        )

        with self.assertRaises(ValidationError):
            s.clean()