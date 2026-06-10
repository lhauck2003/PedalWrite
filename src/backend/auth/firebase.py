import json
import os
import firebase_admin
from firebase_admin import credentials, auth

def init_firebase():
    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        return

    if firebase_admin._apps:
        return

    raw_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
    path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

    if raw_json:
        cred = credentials.Certificate(raw_json)
    elif path:
        cred = credentials.Certificate(path)
    else:
        return

    firebase_admin.initialize_app(cred)

def verify_firebase_token(id_token: str):
    return auth.verify_id_token(id_token)