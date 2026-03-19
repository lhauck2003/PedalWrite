# sheets.py
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2 import service_account
from typing import List, Optional

# ------------------------------
# CONFIGURATION
# ------------------------------
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

def init_service(service_account_file: str):
    """Initialize Google Sheets API service."""
    creds = service_account.Credentials.from_service_account_file(
        service_account_file, scopes=SCOPES
    )
    return build("sheets", "v4", credentials=creds)


# ------------------------------
# SHEETS CLIENT CLASS
# ------------------------------
class SheetsClient:
    def __init__(self, service):
        self.service = service

    # --------------------------
    # Create spreadsheet
    # --------------------------
    def create_spreadsheet(self, title: str) -> str:
        spreadsheet = {"properties": {"title": title}}
        try:
            sheet = (
                self.service.spreadsheets()
                .create(body=spreadsheet, fields="spreadsheetId")
                .execute()
            )
            return sheet.get("spreadsheetId")
        except HttpError as e:
            print(f"Error creating spreadsheet: {e}")
            raise

    # --------------------------
    # Read values
    # --------------------------
    def get_values(self, spreadsheet_id: str, range_name: str):
        try:
            result = (
                self.service.spreadsheets()
                .values()
                .get(spreadsheetId=spreadsheet_id, range=range_name)
                .execute()
            )
            return result.get("values", [])
        except HttpError as e:
            print(f"Error reading values: {e}")
            raise

    def batch_get_values(self, spreadsheet_id: str, ranges: List[str]):
        try:
            result = (
                self.service.spreadsheets()
                .values()
                .batchGet(spreadsheetId=spreadsheet_id, ranges=ranges)
                .execute()
            )
            return result.get("valueRanges", [])
        except HttpError as e:
            print(f"Error batch reading values: {e}")
            raise

    # --------------------------
    # Write values
    # --------------------------
    def update_values(
        self, spreadsheet_id: str, range_name: str, values: List[List], value_input_option="RAW"
    ):
        body = {"values": values}
        try:
            result = (
                self.service.spreadsheets()
                .values()
                .update(
                    spreadsheetId=spreadsheet_id,
                    range=range_name,
                    valueInputOption=value_input_option,
                    body=body,
                )
                .execute()
            )
            return result
        except HttpError as e:
            print(f"Error updating values: {e}")
            raise

    def batch_update_values(
        self, spreadsheet_id: str, data: List[dict], value_input_option="RAW"
    ):
        body = {"valueInputOption": value_input_option, "data": data}
        try:
            result = (
                self.service.spreadsheets()
                .values()
                .batchUpdate(spreadsheetId=spreadsheet_id, body=body)
                .execute()
            )
            return result
        except HttpError as e:
            print(f"Error batch updating values: {e}")
            raise

    def append_values(
        self, spreadsheet_id: str, range_name: str, values: List[List], value_input_option="RAW"
    ):
        body = {"values": values}
        try:
            result = (
                self.service.spreadsheets()
                .values()
                .append(
                    spreadsheetId=spreadsheet_id,
                    range=range_name,
                    valueInputOption=value_input_option,
                    body=body,
                )
                .execute()
            )
            return result
        except HttpError as e:
            print(f"Error appending values: {e}")
            raise