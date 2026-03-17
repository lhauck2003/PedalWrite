from django.contrib import admin

from api.models import Session, Skill, Rider, DailyForm, FinalForm, DailyFormSkill, FinalFormSkill

# Register your models here.
admin.site.register(Session)
admin.site.register(Skill)
admin.site.register(Rider)

class DailyFormSkillInline(admin.TabularInline):
    model = DailyFormSkill
    extra = 0

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "skill":
            dailyform_id = request.resolver_match.kwargs.get("object_id")

            if dailyform_id:
                try:
                    form = DailyForm.objects.get(id=dailyform_id)
                    kwargs["queryset"] = Skill.objects.filter(formlevel=form.level)
                except DailyForm.DoesNotExist:
                    pass

        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(DailyForm)
class DailyFormAdmin(admin.ModelAdmin):
    inlines = [DailyFormSkillInline]

class FinalFormSkillInline(admin.TabularInline):
    model = FinalFormSkill
    extra = 0

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "skill":
            finalform_id = request.resolver_match.kwargs.get("object_id")

            if finalform_id:
                try:
                    form = FinalForm.objects.get(id=finalform_id)
                    kwargs["queryset"] = Skill.objects.filter(formlevel=form.level)
                except FinalForm.DoesNotExist:
                    pass

        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(FinalForm)
class FinalFormAdmin(admin.ModelAdmin):
    inlines = [FinalFormSkillInline]