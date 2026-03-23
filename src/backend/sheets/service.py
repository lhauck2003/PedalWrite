# service.py
from googleapiclient.discovery import build
from google.oauth2 import service_account

# ------------------------------
# CONFIGURATION
# ------------------------------
SCOPES = ["https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive",
        ]

class Service:
    def __init__(
            self,
            service_account_file
    ):
        self.scopes = SCOPES
        self.creds = service_account.Credentials.from_service_account_file(
        service_account_file,
        scopes=SCOPES
    )
        self.service = build("sheets", "v4", credentials=self.creds)