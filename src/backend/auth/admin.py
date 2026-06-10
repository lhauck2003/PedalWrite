from django.contrib import admin

from .models import Account, Leader


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'leader', 'caregiver', 'firebase_uid')
    list_filter = ('role',)
    search_fields = ('firebase_uid', 'email')


admin.site.register(Leader)
