from django.contrib import admin

from api.models import Session, Skill, Rider, DailyForm, FinalForm, DailyFormSkill, FinalFormSkill

# Register your models here.
admin.site.register(Session)
admin.site.register(Skill)
admin.site.register(Rider)
admin.site.register(DailyForm)
admin.site.register(FinalForm)
admin.site.register(DailyFormSkill)
admin.site.register(FinalFormSkill)