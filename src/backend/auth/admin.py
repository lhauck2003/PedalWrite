from django.contrib import admin

from api.models import Account, Leader, Admin, Caregiver


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'leader', 'caregiver', 'firebase_uid', 'is_staff', 'is_superuser')
    list_editable = ('role', 'is_staff', 'is_superuser')
    list_filter = ('role',)
    search_fields = ('firebase_uid', 'email')


admin.site.register(Leader)
admin.site.register(Admin)
admin.site.register(Caregiver)
