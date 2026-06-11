from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .firebase import init_firebase
from .models import Account


class FirebaseAuthentication(BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        header = request.META.get('HTTP_AUTHORIZATION', '')
        prefix = f'{self.keyword} '
        if not header.startswith(prefix):
            return None

        token = header[len(prefix):].strip()
        if not token:
            return None

        try:
            init_firebase()
            import firebase_admin.auth as firebase_auth

            decoded = firebase_auth.verify_id_token(token)
        except ImportError as exc:
            raise AuthenticationFailed('firebase-admin is not installed') from exc
        except Exception as exc:
            raise AuthenticationFailed('Invalid or expired Firebase token') from exc

        uid = decoded.get('uid')
        if not uid:
            raise AuthenticationFailed('Firebase token is missing a uid')

        email = decoded.get('email') or ''
        if not email:
            raise AuthenticationFailed('Firebase token is missing an email')

        account, _ = Account.objects.get_or_create(
            firebase_uid=uid,
            defaults={'email': email},
        )

        updates = []
        if account.email != email:
            account.email = email
            updates.append('email')
        if updates:
            account.save(update_fields=updates)

        account.firebase_claims = decoded
        account.firebase_account = account
        return account, None
