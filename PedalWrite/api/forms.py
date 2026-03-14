from django import forms
import api.constants as c
from api.models import DailyForm, FinalForm, DailyFormSkill, FinalFormSkill

class RiderSearchForm(forms.Form):
    search = forms.CharField(max_length=c.SEARCH_MAX_LEN, required=False)
    firstname = forms.CharField(max_length=c.NAME_MAX_LEN, required=False)
    lastname = forms.CharField(max_length=c.NAME_MAX_LEN, required=False)
    session = forms.IntegerField(min_value=c.SESSION_MIN_NUMBER, max_value=c.SESSION_MAX_NUMBER, required=False)
    leader = forms.CharField(max_length=c.NAME_MAX_LEN, required=False)

class SkillSearchForm(forms.Form):
    search = forms.CharField(max_length=c.SEARCH_MAX_LEN, required=False)
    name = forms.CharField(max_length=c.SKILL_NAME_MAX_LEN, required=False)
    level = forms.IntegerField(min_value=c.SKILL_LEVEL_MIN, max_value=c.SKILL_LEVEL_MAX, required=False)
    

# Formsets

DailyFormSkillSet = forms.inlineformset_factory(
    DailyForm,
    DailyFormSkill,
    fk_name="dailyform_id",
    fields=("__all__"),
    extra=3,
    can_delete=True,
)

FinalFormSkillSet = forms.inlineformset_factory(
    FinalForm,
    FinalFormSkill,
    fk_name="finalform_id",
    fields=("__all__"),
    extra=3,
    can_delete=True,
)

