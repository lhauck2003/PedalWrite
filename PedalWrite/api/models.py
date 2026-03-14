from __future__ import annotations

from django.db import models
import uuid
from decimal import Decimal
from urllib.parse import urlparse

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import MaxLengthValidator, MinLengthValidator
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.validators import URLValidator
from django.core.validators import validate_email as django_validate_email
from django.utils import timezone
import api.constants as c

def _coerce_str(
    value: object,
    field: str,
    *,
    required: bool = False,
    max_len: int | None = None,
    allow_blank: bool = False,
) -> str | None:
    if value is None:
        if required:
            raise DjangoValidationError(f'{field} is required')
        return None

    normalized = str(value).strip()
    if not normalized:
        if required and not allow_blank:
            raise DjangoValidationError(f'{field} is required')
        return '' if allow_blank else None

    if max_len is not None and len(normalized) > max_len:
        raise DjangoValidationError(f'{field} exceeds max length {max_len}')
    return normalized

def _parse_with_api_validator(parser, value, field_name: str) -> None:
    parser(value, field_name, required=False)

def parse_email(value: object, field: str, *, required: bool = False) -> str | None:
    normalized = _coerce_str(
        value,
        field,
        required=required,
        max_len=c.EMAIL_MAX_LEN,
    )
    if normalized is None:
        return None
    try:
        django_validate_email(normalized)
    except DjangoValidationError as exc:
        raise DjangoValidationError(f'{field} must be a valid email address') from exc
    return normalized.lower()

def parse_phone(value: object, field: str, *, required: bool = False) -> str | None:
    normalized = _coerce_str(
        value,
        field,
        required=required,
        max_len=c.PHONE_MAX_LEN,
    )
    if normalized is None:
        return None

    digits = normalized[1:] if normalized.startswith('+') else normalized
    if not digits.isdigit():
        raise DjangoValidationError(f'{field} must contain digits (optional leading +)')
    if len(digits) < 8 or len(digits) > c.PHONE_MAX_LEN:
        raise DjangoValidationError(f'{field} must contain 8-{c.PHONE_MAX_LEN} digits')
    return normalized

def validate_phone(value: str | None) -> None:
    _parse_with_api_validator(parse_phone, value, 'phone')

def validate_email(value: str | None) -> None:
    _parse_with_api_validator(parse_email, value, 'email')

# Create your models here.

class Session(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    sessionnumber = models.IntegerField(
        validators=[
            MinValueValidator(c.SESSION_MIN_NUMBER),
            MaxValueValidator(c.SESSION_MAX_NUMBER),
        ],
    )
    starttime = models.DateTimeField(
        default=timezone.now,
        null=True,
        blank=True,
    )
    endtime = models.DateTimeField(
        default=timezone.now,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = 'sessions'
    
    def __str__(self) -> str:
        return f"Session {self.sessionnumber}"
    
    def clean(self) -> None:
        super().clean()
        if self.endtime and self.starttime and self.endtime < self.starttime:
            raise DjangoValidationError('endttime must be after starttime')

class Rider(models.Model):
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False,
        db_column='rider_id',
    )
    firstname = models.TextField(
        validators=[MaxLengthValidator(c.NAME_MAX_LEN)],
    )
    lastname = models.TextField(
        validators=[MaxLengthValidator(c.NAME_MAX_LEN)],
    )
    isquickstart = models.BooleanField(
        null=True,
        blank=True,
        )

    # foreign keys
    session = models.ForeignKey(
        Session,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='session_id',
    )

    caregivers = models.ManyToManyField(
        "Caregiver",
        through="CaregiverRider",
        related_name="riders"
    )

    class Meta:
        db_table = 'riders'

    def __str__(self) -> str:
        return f"Rider: {self.firstname} {self.lastname}"

class Caregiver(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column='caregiver_id',
    )

    class Meta:
        db_table = 'caregivers'

    def __str__(self):
        return f"Caregiver {self.id}"

class CaregiverRider(models.Model):
    caregiver = models.ForeignKey(
        Caregiver,
        on_delete=models.CASCADE,
        db_column='caregiver_id',
    )
    rider = models.ForeignKey(
        Rider,
        on_delete=models.CASCADE,
        db_column='rider_id',
    )
    firstname = models.TextField(
        validators=[MaxLengthValidator(c.NAME_MAX_LEN)],
    )
    lastname = models.TextField(
        validators=[MaxLengthValidator(c.NAME_MAX_LEN)],
    )
    phone = models.TextField(
        validators=[validate_phone],
        null=True,
        blank=True,
    )
    email = models.TextField(
        validators=[validate_email],
        null=True,
        blank=True,
    )
    isemergencycontact = models.BooleanField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = 'caregiver_riders'
        unique_together=('caregiver', 'rider')

    def __str__(self):
        return f"Caregiver: {self.firstname} {self.lastname}"

class Skill(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    skillname = models.TextField(
        validators=[MaxLengthValidator(c.SKILL_NAME_MAX_LEN)],
    )

    formlevel = models.IntegerField(
        validators=[
            MinValueValidator(c.SKILL_LEVEL_MIN),
            MaxValueValidator(c.SKILL_LEVEL_MAX),
        ],
        null=False,
        blank=False,
        default=0,
    )

    def __str__(self) -> str:
        return f"{self.skillname} (Level {self.formlevel})" if self.formlevel else f"{self.skillname}"

    class Meta:
        db_table = 'skills'

class DailyForm(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    date = models.DateField(
        default=timezone.now
    )
    rider = models.ForeignKey(
        Rider,
        on_delete=models.DO_NOTHING,
        db_column='rider_id',
    )
    session = models.ForeignKey(
        Session,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='session_id',
    )
    comments = models.TextField(
        validators=[MaxLengthValidator(c.LONG_TEXT_MAX_LEN)],
        null=True,
        blank=True,
    )
    level = models.IntegerField(
        validators=[
            MinValueValidator(c.FORM_LEVEL_MIN),
            MaxValueValidator(c.FORM_LEVEL_MAX),
        ],
        null=True,
        blank=True,
    )
    skills = models.ManyToManyField(
        Skill,
        through="DailyFormSkill",
        related_name="daily_forms"
    )

    class Meta:
        db_table = 'daily_forms'

    def __str__(self):
        return f"Daily Form for Rider: {self.rider.firstname} in Session: {self.session.sessionnumber}" if self.session and self.rider else "Blank Daily Form"

class DailyFormSkill(models.Model):
    dailyform = models.ForeignKey(
        DailyForm,
        on_delete=models.CASCADE,
        db_column="dailyform_id",
        related_name="skill_links",
    )

    skill = models.ForeignKey(
        Skill,
        related_name="dailyform_links",
        on_delete=models.CASCADE,
        db_column='skill_id',
    )

    # unique to each skill-form relationship
    level = models.IntegerField(
        validators=[
            MinValueValidator(c.SKILL_LEVEL_MIN),
            MaxValueValidator(c.SKILL_LEVEL_MAX),

        ],
        null=True,
        blank=True,
        editable=True,
    )

    comments = models.TextField(
        validators=[MaxLengthValidator(c.LONG_TEXT_MAX_LEN)],
        null=True,
        blank=True,
        editable=True,
    )

    class Meta:
        db_table = 'dailyform_skills'
        unique_together = ('dailyform', 'skill')
    
    def __str__(self):
        return f"{self.skill} Level {self.level}"


class FinalForm(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    date = models.DateField()
    rider = models.ForeignKey(
        Rider,
        on_delete=models.DO_NOTHING,
        db_column='rider_id',
        related_name="daily_forms",
    )
    session = models.ForeignKey(
        Session,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='session_id',
        related_name="daily_forms"
    )
    comments = models.TextField(
        validators=[MaxLengthValidator(c.LONG_TEXT_MAX_LEN)],
        null=True,
        blank=True,
    )
    level = models.IntegerField(
        validators=[
            MinValueValidator(c.FORM_LEVEL_MIN),
            MaxValueValidator(c.FORM_LEVEL_MAX),
        ],
        null=True,
        blank=True,
    )

    skills = models.ManyToManyField(
        Skill,
        through="FinalFormSkill",
        related_name="final_forms"
    )

    class Meta:
        db_table = 'final_forms'

    def __str__(self):
        return f"Final Form for Rider: {self.rider.firstname} in Session: {self.session.sessionnumber}" if self.session and self.rider else "Blank Daily Form"


class FinalFormSkill(models.Model):
    finalform = models.ForeignKey(
        FinalForm,
        on_delete=models.CASCADE,
        db_column='finalform_id',
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        db_column='skill_id',
    )

    # unique to each skill-form relationship
    level = models.IntegerField(
        validators=[
            MinValueValidator(c.SKILL_LEVEL_MIN),
            MaxValueValidator(c.SKILL_LEVEL_MAX),

        ],
        null=True,
        blank=True,
        editable=True,
    )

    comments = models.TextField(
        validators=[MaxLengthValidator(c.LONG_TEXT_MAX_LEN)],
        null=True,
        blank=True,
        editable=True,
    )

    class Meta:
        db_table = 'finalform_skills'
        unique_together = ('finalform', 'skill')

    def __str__(self):
        return f"{self.skill} Level {self.level}"