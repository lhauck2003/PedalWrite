from django.apps import AppConfig


class AuthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'auth'
    label = 'accounts'

    def ready(self):
        from .firebase import init_firebase

        init_firebase()
