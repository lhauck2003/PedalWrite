from django.db import models
from __future__ import annotations

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
        defaul=uuid.uuid4,
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
    endttime = models.DateTimeField(
        default=timezone.now,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = 'sessions'
    
    def clean(self) -> None:
        super().clean()
        if self.endttime and self.starttime and self.endttime < self.starttime:
            raise DjangoValidationError('endttime must be after starttime')

class Rider(models.Model):
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False,
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
    session_id = models.ForeignKey(
        Session,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='session_id',
    )

    class Meta:
        db_table = 'riders'

class Caregiver(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    firstname = models.TextField(
        validators=[MaxLengthValidator(c.NAME_MAX_LEN)],
    )
    lastname = models.TextField(
        validators=[MaxLengthValidator(c.NAME_MAX_LEN)],
    )
    phone = models.TextField(
        validators=[MaxLengthValidator(c.PHONE_MAX_LEN)],
        null=True,
        blank=True,
    )
    email = models.TextField(
        validators=[MaxLengthValidator(c.EMAIL_MAX_LEN)],
        null=True,
        blank=True,
    )
    isemergencycontact = models.BooleanField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = 'caregivers'

class RiderCaregiver(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    rider_id = models.ForeignKey(
        Rider,
        on_delete=models.DO_NOTHING,
        db_column='rider_id',
    )
    caregiver_id = models.ForeignKey(
        Caregiver,
        on_delete=models.DO_NOTHING,
        db_column='caregiver_id',
    )

    class Meta:
        db_table = 'rider_caregivers'

class Skills(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    skillname = models.TextField(
        validators=[MaxLengthValidator(c.SKILL_NAME_MAX_LEN)],
    )

    level = models.IntegerField(
        validators=[
            MinValueValidator(c.SKILL_LEVEL_MIN),
            MaxValueValidator(c.SKILL_LEVEL_MAX),
        ]
    )

    comments = models.TextField(
        validators=[MaxLengthValidator(c.LONG_TEXT_MAX_LEN)],
        null=True,
        blank=True,
    )

    class Meta:
        db_table = 'skills'

class DailyForm(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    date = models.DateField()
    rider_id = models.ForeignKey(
        Rider,
        on_delete=models.DO_NOTHING,
        db_column='rider_id',
    )
    session_id = models.ForeignKey(
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

    class Meta:
        db_table = 'daily_forms'

class DailyFormSkill(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    dailyform_id = models.ForeignKey(
        DailyForm,
        on_delete=models.DO_NOTHING,
        db_column='dailyform_id',
    )
    skill_id = models.ForeignKey(
        Skills,
        on_delete=models.DO_NOTHING,
        db_column='skill_id',
    )

    class Meta:
        db_table = 'dailyform_skills'

class FinalForm(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    date = models.DateField()
    rider_id = models.ForeignKey(
        Rider,
        on_delete=models.DO_NOTHING,
        db_column='rider_id',
    )
    session_id = models.ForeignKey(
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

    class Meta:
        db_table = 'final_forms'

class FinalFormSkill(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    finalform_id = models.ForeignKey(
        FinalForm,
        on_delete=models.DO_NOTHING,
        db_column='finalform_id',
    )
    skill_id = models.ForeignKey(
        Skills,
        on_delete=models.DO_NOTHING,
        db_column='skill_id',
    )

    class Meta:
        db_table = 'finalform_skills'