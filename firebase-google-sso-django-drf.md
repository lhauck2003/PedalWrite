# Firebase Google SSO with a Django REST Framework backend

This guide walks through a common pattern: users sign in with **Google** through **Firebase Authentication** on the client, then your **Django REST Framework (DRF)** API trusts them by **verifying the Firebase ID token** on each request (or once to issue your own session/JWT).


- Firebase handles the OAuth dance with Google and returns a **Firebase ID token** (a JWT).
- The backend’s job is to **verify** that JWT using Firebase’s public keys (the `firebase-admin` SDK does this for you).

---

## 2. Firebase Console setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (or use an existing one).
2. Enable **Authentication** → **Sign-in method** → **Google** → turn it on and complete the consent screen prompts.
3. Register your app:
   - **Web**: Project overview → add app → Web. Note the **Firebase config** (`apiKey`, `authDomain`, `projectId`, etc.).
4. Open **Project settings** (gear) → **Service accounts** → **Generate new private key**. You get a JSON file. **Treat it like a password**—never commit it to git.

You will use:

- **Client-side**: Firebase config (public-ish; still restrict with Firebase App Check in production if you can).
- **Server-side**: Service account JSON path or its contents in an environment variable.

---

## 3. Client: obtain the Firebase ID token

After the user signs in with Google via the Firebase SDK, read the **ID token** string.

### Recommended: redirect-based sign-in (instead of popup)

For student projects (and especially Safari / mobile / strict privacy settings), **redirect** is usually more reliable than popups. The flow is:

- Call `signInWithRedirect(auth, provider)` on button click.
- On page load, call `getRedirectResult(auth)` to finish sign-in.
- Once you have a Firebase `user`, call `user.getIdToken()` and send it to Django.

**Web (JavaScript)** — illustrative only; match your framework’s Firebase init:

```javascript
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

const auth = getAuth();
const provider = new GoogleAuthProvider();

// 1) User clicks “Sign in with Google”
export async function beginGoogleLogin() {
  await signInWithRedirect(auth, provider);
}

// 2) On the redirect landing page / app startup
export async function completeGoogleLoginIfPresent() {
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;

  const idToken = await result.user.getIdToken(); // string to send to Django
  return { user: result.user, idToken };
}
```

### Using the token with Django

Send it to your API on each protected request:

```http
Authorization: Bearer <paste_id_token_here>
```

(or `Authorization: Token <...>` if you standardize on DRF’s token schemes—just be consistent in Django.)

---

## 3.1 Why Firebase shows up in both frontend and backend

In a split app (SPA/mobile client + Django API), Firebase appears in two places for two different reasons:

- **Frontend (client SDK)**: handles Google sign-in UI and returns a **Firebase ID token** (`getIdToken()`).
- **Backend (Firebase Admin)**: **verifies** the ID token (`verify_id_token`) so the API can trust the user identity.

The backend verification is what prevents a malicious client from pretending to be logged in.

---

## 4. Django project dependencies

In your virtual environment:

```bash
pip install django djangorestframework firebase-admin django-cors-headers
```

- **`firebase-admin`**: verifies ID tokens against Google’s/Firebase’s keys.
- **`django-cors-headers`**: needed if the browser talks to an API on a **different origin** (typical during local dev).

---

## 5. Initialize Firebase Admin (once at startup)

**Option A — service account JSON file** (simple for local dev):

```python
# e.g. loom/firebase_init.py or your_app/firebase_init.py
import os
import firebase_admin
from firebase_admin import credentials

def init_firebase():
    if firebase_admin._apps:
        return
    path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not path:
        raise RuntimeError("Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path")
    cred = credentials.Certificate(path)
    firebase_admin.initialize_app(cred)
```

Set before `runserver`:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/serviceAccount.json"
```

**Option B — JSON in an env var** (common on PaaS): parse the JSON string and use `credentials.Certificate(dict)`.

Call `init_firebase()` from `AppConfig.ready()` in one of your installed apps, or from `manage.py` / `wsgi.py` after Django setup—**only ensure it runs once** per process.

---

## 6. Verify the token in DRF

Install a small authentication class that:

1. Reads `Authorization: Bearer …`.
2. Calls `auth.verify_id_token(token)`.
3. Attaches a user identity to `request.user` (see next section).

```python
# authentication.py
import firebase_admin.auth as firebase_auth
from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class FirebaseAuthentication(BaseAuthentication):
    keyword = b"Bearer"

    def authenticate(self, request):
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header.startswith("Bearer "):
            return None
        token = header.split(" ", 1)[1].strip()
        if not token:
            return None

        try:
            decoded = firebase_auth.verify_id_token(token)
        except Exception:
            raise AuthenticationFailed("Invalid or expired Firebase token")

        uid = decoded.get("uid")
        email = decoded.get("email")
        # You can also read decoded["email_verified"], decoded["picture"], etc.

        firebase_user = type("FirebaseUser", (), {})()
        firebase_user.pk = uid
        firebase_user.is_authenticated = True
        firebase_user.firebase_claims = decoded
        firebase_user.email = email

        return firebase_user, None
```

In `settings.py`:

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "your_project.authentication.FirebaseAuthentication",
        # optional fallbacks:
        # "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}
```

**View example:**

```python
from rest_framework.views import APIView
from rest_framework.response import Response

class MeView(APIView):
    def get(self, request):
        return Response(
            {
                "uid": request.user.pk,
                "email": getattr(request.user, "email", None),
            }
        )
```

---

## 7. Mapping Firebase users to `django.contrib.auth.models.User` (recommended)

Anonymous `FirebaseUser` objects are fine for demos. For real apps, **get or create** a Django `User` (or a custom user model) keyed by Firebase `uid` or verified email.

Pattern:

1. After `verify_id_token`, read `uid` and `email`.
2. `User.objects.get_or_create(username=uid, defaults={"email": email})` or use a `Profile` model with `firebase_uid = models.CharField(unique=True)`.
3. Return that `User` from `authenticate()` so DRF permissions and the admin work as usual.

Sketch:

```python
from django.contrib.auth import get_user_model

User = get_user_model()

# inside authenticate(), after successful verify_id_token:
user, _ = User.objects.get_or_create(
    username=uid,
    defaults={"email": email or ""},
)
return user, None
```

Adjust to your course’s user model rules (usernames, email as unique, etc.).

---

## 8. CORS (browser + separate API host)

If your React/Vue app runs on `http://localhost:5173` and Django on `http://127.0.0.1:8000`, configure `django-cors-headers`:

```python
INSTALLED_APPS = [
    # ...
    "corsheaders",
    # ...
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]
```

Tighten this in production to your real frontend origins.

---

## 9. Security checklist (share with students)

- **HTTPS in production** for every request that carries tokens.
- **Do not** log full ID tokens.
- **Restrict API keys** in Google Cloud Console where possible (HTTP referrers for web, bundle IDs for mobile).
- Consider **Firebase App Check** to reduce abuse of your Firebase endpoints.
- Rotate compromised service account keys immediately.

---

## 10. Quick manual test with `curl`

After signing in on the client, copy the ID token and run:

```bash
curl -sS -H "Authorization: Bearer YOUR_ID_TOKEN_HERE" http://127.0.0.1:8000/api/me/
```

You should get JSON, not `401`.

---

## 11. Common errors

| Symptom | Likely cause |
|--------|----------------|
| `401` immediately | Wrong `Authorization` header format; token expired (Firebase tokens expire—refresh on the client with `getIdToken(true)`). |
| Firebase init errors on server | `GOOGLE_APPLICATION_CREDENTIALS` unset or wrong path; `initialize_app` called multiple times. |
| CORS errors in browser | Missing `corsheaders` or origin not in `CORS_ALLOWED_ORIGINS`. |
| `Invalid token` after deploy | Token from project A verified against service account for project B—**project IDs must match**. |

---

## 12. Minimal “assignment” structure

1. Firebase project + Google provider enabled.
2. Web client: sign-in button → print or send ID token.
3. Django: one protected DRF endpoint returning `{ "uid": ..., "email": ... }`.
4. Write-up: sequence diagram (paper or Mermaid), where secrets live, and one paragraph on why the backend verifies the token instead of trusting the client.

---

## References

- [Firebase Admin Python setup](https://firebase.google.com/docs/admin/setup)
- [Verify ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Django REST framework authentication](https://www.django-rest-framework.org/api-guide/authentication/)
