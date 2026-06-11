# api/models
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
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
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

class SkillLevel(models.IntegerChoices):
    # Might Want to expand to allow other levels?
    INTRO = 0, _('Introductory')
    NOVICE = 1, _('Model')
    INTERMIDIATE = 2, _('Support')
    ADVANCED = 3, _('Encourage')
    MASTERED = 4, _('Release')

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
    leader = models.ForeignKey(
        'Leader',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='leader_id',
        related_name='riders',
    )

    caregivers = models.ManyToManyField(
        "Caregiver",
        related_name="riders",
    )

    class Meta:
        db_table = 'riders'

    def __str__(self) -> str:
        return f"Rider: {self.firstname} {self.lastname}"

# Caregiver is an account type
class Caregiver(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column='caregiver_id',
    )
    firstname = models.CharField(max_length=120)
    lastname = models.CharField(max_length=120)
    email = models.EmailField(validators=[validate_email])
    phone = models.TextField(
        validators=[validate_phone],
        null=True,
        blank=True,
    )
    isemergencycontact = models.BooleanField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = 'caregivers'

    @property
    def name(self):
        return f'{self.firstname} {self.lastname}'.strip()

    def __str__(self):
        return self.name or f"Caregiver {self.id}"

class Skill(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    skillname = models.TextField(
        validators=[MaxLengthValidator(c.SKILL_NAME_MAX_LEN)],
    )
    class Level(models.IntegerChoices):
        LEVEL_1 = 1, _("Level One")
        LEVEL_2 = 2, _("Level Two")
        LEVEL_3 = 3, _("Level Three")
        LEVEL_4 = 4, _("Level Four")

    formlevel = models.IntegerField(
        choices=Level.choices,
        null=False,
        blank=False,
        default=Level.LEVEL_1,
    )

    category = models.TextField(
        validators=[MaxLengthValidator(c.SKILL_NAME_MAX_LEN)]
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
        related_name='daily_forms'
    )
    session = models.ForeignKey(
        Session,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='session_id',
    )
    leader = models.ForeignKey(
        'Leader',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_forms',
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
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
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
        choices=SkillLevel.choices,
        null=True,
        blank=True,
        editable=True,
        default=SkillLevel.INTRO
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
        related_name="final_forms",
    )
    session = models.ForeignKey(
        Session,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='session_id',
        related_name="final_forms"
    )
    leader = models.ForeignKey(
        'Leader',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='final_forms',
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
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    finalform = models.ForeignKey(
        FinalForm,
        on_delete=models.CASCADE,
        db_column='finalform_id',
        related_name='skill_links'
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        db_column='skill_id',
    )

    # unique to each skill-form relationship
    level = models.IntegerField(
        choices=SkillLevel.choices,
        null=True,
        blank=True,
        editable=True,
        default=SkillLevel.INTRO
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
    
class Bike(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column='bike_id',
    )
    class BikeSizes(models.IntegerChoices):
        SMALL = 1, _('Small')
        MEDIUM = 2, _('Medium')
        LARGE = 3, _('Large')
    
    name = models.TextField(
        validators=[MaxLengthValidator(c.SHORT_TEXT_MAX_LEN)],
        null=True,
        blank=True,
        editable=True,
    )
    size = models.IntegerField(choices=BikeSizes.choices, default=BikeSizes.SMALL)
    riders = models.ManyToManyField(Rider, through='BikeSpecs')

    class Meta:
        db_table = 'bikes'

class BikeSpecs(models.Model):
    bike = models.ForeignKey(Bike, on_delete=models.CASCADE, db_column='bike_id')
    rider = models.ForeignKey(Rider, on_delete=models.CASCADE, db_column='rider_id')

    class Days(models.IntegerChoices):
        DAY_ONE = 1, _('Day One')
        DAY_TWO = 2, _('Day Two')
        DAY_THREE = 3, _('Day Three')
        DAY_FOUR = 4, _('Day Four')
        DAY_FIVE = 5, _('Day Five')

    day = models.IntegerField(choices=Days.choices, default=Days.DAY_ONE)
    seat_height = models.FloatField()
    left_piston = models.FloatField()
    right_piston = models.FloatField()

    class Meta:
        db_table = 'bike_specs'
        unique_together = [['bike', 'rider', 'day']]


# ------------------------------------------
# Users
# ------------------------------------------

class Admin(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    firstname = models.CharField(max_length=120)
    lastname = models.CharField(max_length=120)
    email = models.EmailField(validators=[validate_email])

class Leader(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column='leader_id',
    )
    firstname = models.CharField(max_length=120)
    lastname = models.CharField(max_length=120)
    email = models.EmailField(validators=[validate_email])

    class Meta:
        db_table = 'leaders'

    @property
    def name(self):
        return f'{self.firstname} {self.lastname}'.strip()

    def __str__(self):
        return self.name or f'Leader {self.pk}'


class AccountManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, **extra_fields):
        email = self.normalize_email(email)
        if not email:
            raise ValueError('The email field must be set')
        user = self.model(email=email, **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, email, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, **extra_fields)

    def create_superuser(self, email, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', Account.Roles.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')

        return self._create_user(email, **extra_fields)


class Account(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    class Roles(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        LEADER = 'leader', 'Leader'
        CAREGIVER = 'caregiver', 'Caregiver'
        ANONYMOUS = 'anonymous', 'Anonymous/Sub User'

    email = models.EmailField(unique=True, validators=[validate_email])
    firebase_uid = models.CharField(max_length=128, unique=True)
    role = models.CharField(
        max_length=32,
        choices=Roles.choices,
        default=Roles.ANONYMOUS,
    )
    leader = models.OneToOneField(
        Leader,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user',
    )
    caregiver = models.OneToOneField(
        'api.Caregiver',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user',
    )
    #admin = models.OneToOneField(
    #    'api.Admin',
    #    on_delete=models.SET_NULL,
    #    null=True,
    #    blank=True,
    #    related_name='user',
    #)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = AccountManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ()

    class Meta:
        db_table = 'accounts'

    @property
    def username(self):
        return self.email

    @property
    def access_profile(self):
        return self

    @property
    def is_superadmin(self):
        return self.role == self.Roles.ADMIN or self.is_superuser

    @property
    def is_leader(self):
        return self.role == self.Roles.LEADER and self.leader_id is not None

    @property
    def is_caregiver(self):
        return self.role == self.Roles.CAREGIVER and self.caregiver_id is not None

    def __str__(self):
        return f'{self.email} ({self.role})'
