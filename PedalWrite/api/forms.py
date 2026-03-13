from django import forms
import api.constants as c
from api.models import DailyForm, FinalForm

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
    

# Model Forms

class DailyFormForm(forms.ModelForm):
    class Meta:
        model = DailyForm
        fields = ['skills', 'firstname', 'lastname', 'session', 'leader']
        widgets ={
            'skills' : forms.CheckboxSelectMultiple(
                choices=[(skill.id, skill.skillname) for skill in FinalForm.objects.all()]
            ),
            'session' : forms.CheckboxInput(
                choices=[(session.id, session.sessionnumber) for session in FinalForm.objects.all()]
            ),
            'leader' : forms.CheckboxInput(
                choices=[(leader.id, leader.firstname + " " + leader.lastname) for leader in FinalForm.objects.all()]
            ),
        }

class FinalFormForm(forms.ModelForm):
    class Meta:
        model = FinalForm
        fields = ['skills', 'firstname', 'lastname', 'session', 'leader', 'level']
        widgets ={
            'skills' : forms.CheckboxSelectMultiple(
                choices=[(skill.id, skill.skillname) for skill in FinalForm.objects.all()],
            ),
            'session' : forms.CheckboxInput(
                choices=[(session.id, session.sessionnumber) for session in FinalForm.objects.all()],
            ),
            'leader' : forms.CheckboxInput(
                choices=[(leader.id, leader.firstname + " " + leader.lastname) for leader in FinalForm.objects.all()],
            ),
        }