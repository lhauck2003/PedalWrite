from django.contrib.auth.models import AnonymousUser
from ..auth.firebase import verify_firebase_token
from .models import Account

class FirebaseAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.headers.get("Authorization")

        request.user = AnonymousUser()

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

            try:
                decoded = verify_firebase_token(token)
                uid = decoded["uid"]
                email = decoded.get("email")

                user, _ = Account.objects.get_or_create(
                    firebase_uid=uid,   # <-- IMPORTANT CHANGE
                    defaults={"email": email},
                )

                request.user = user

            except Exception:
                pass

        return self.get_response(request)