from .sheets import SheetsClient
from .worksheet import Worksheet
from typing import Optional, List
from .urls import SPREADSHEETS_URL

class Spreadsheet:

    def __init__(self, sheet_client: SheetsClient, properties):
        self.client = sheet_client
        self._properties = properties

        metadata = self.get_sheet_metadata()
        self._properties.update(metadata["properties"])

    @property
    def id(self):
        return self._properties["id"]
    
    @property
    def title(self):
        return self._properties["title"]
    
    @property
    def url(self):
        return SPREADSHEETS_URL % str(self.id)
    
    @property
    def sheet1(self):
        """Shortcut property for getting the first worksheet."""
        return self.get_worksheet(0)
    
    @property
    def __iter__(self):
        yield from self.worksheets()

    def get_values(self, spreadsheet_id: str, range_name: str):
        return self.client.get_values(spreadsheet_id, range_name)

    def batch_get_values(self, spreadsheet_id: str, ranges):
        return self.client.get_values(spreadsheet_id, ranges)

    def update_values(
        self, spreadsheet_id: str, range_name: str, values: List[List], raw: bool=True
    ):
        if raw:
            input_option = "RAW"
        else:
            input_option = "USER_ENTERED"

        self.client.update_values(spreadsheet_id, range_name, values, value_input_option=input_option)

    def batch_update_values(
        self, spreadsheet_id: str, ranges, data: List[dict], raw: bool=True
    ):
        if raw:
            input_option = "RAW"
        else:
            input_option = "USER_ENTERED"

        self.client.batch_update_values(spreadsheet_id, ranges, data, value_input_option=input_option)

    def append_values(
        self, spreadsheet_id: str, range_name: str, values: List[List], raw: bool = True
    ):
        if raw:
            input_option = "RAW"
        else:
            input_option = "USER_ENTERED"
        
        self.client.append_values(spreadsheet_id, range_name, values, value_input_option=input_option)
        

    def get_worksheet(self, index: int):
        """
        index starts at 0
        """
        return self.client.get_worksheet(index)
    
    # TODO: write Worksheet class
    def worksheets(self):
        sheet_data = self.get_sheet_metadata()
        worksheets = [
            Worksheet(self, s["properties"], self.id, self.client)
            for s in sheet_data["sheets"]
        ]
        return worksheets

    def get_sheet_metadata(self):
        return self.client.get_sheet_metadata(self.id)
