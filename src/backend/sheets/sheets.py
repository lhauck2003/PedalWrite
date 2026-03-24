# sheets.py
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from typing import List, Optional
import requests

from .urls import SPREADSHEETS_URL

# ------------------------------
# SHEETS CLIENT CLASS
# ------------------------------
"""
Note, creating new spreadsheets is not possible with this class, since it uses 
service accounts, which do not have an associated google drive. In order for this
class to communicate (update) a spreadsheet, the spreadsheet must be shared with
the service account email, which is in the service account json downloaded from
the Google Project website.
"""
class SheetsClient:
    def __init__(self, service):
        self.service = service.service

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

    def refresh(self):
        creds = self.service._http.credentials
        if not creds.valid:
            creds.refresh(requests.Request())

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
        self, spreadsheet_id: str, ranges, data: List[dict], value_input_option="RAW"
    ):
        body = {"valueInputOption": value_input_option, "data": data}
        try:
            result = (
                self.service.spreadsheets()
                .values()
                .batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    range=ranges,
                    valueInputOption=value_input_option, 
                    body=body
                    )
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

    def get_spreadsheet_metadata(self, spreadsheet_id: str):
        return (
            self.service.spreadsheets()
            .get(
                spreadsheetId=spreadsheet_id,
                includeGridData=False
            )
            .execute()
        )
