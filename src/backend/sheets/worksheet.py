from .sheets import SheetsClient
from typing import Optional, Iterable, List
from .utils import absolute_range_name
from .urls import WORKSHEET_URL

class Worksheet():
    def __init__(
            self,
            spreadsheet_id, 
            sheet_client: SheetsClient, 
            properties: Optional[dict]):
        self.client = sheet_client
        self._properties = properties
        self.spreadsheet_id = spreadsheet_id

        metadata = self.get_sheet_metadata()
        self._properties.update(metadata["properties"])

    @property
    def title(self):
        return self._properties["title"]
    
    @property
    def id(self):
        return self._properties["sheetId"]
    
    @property
    def url(self):
        return WORKSHEET_URL % (self.spreadsheet_id, self.id)

    def get_values(self, range_name: Optional[str]):
        return self.get(range_name)
    
    def batch_get_values(self, ranges):
        return self.batch_get(ranges)
    
    def update_values(self, range_name: Optional[str], values, raw: bool = True):
        if raw:
            input_option = "RAW"
        else:
            input_option = "USER_ENTERED"
        self.update(range_name, values, input_option)

    def batch_update_values(self, ranges: Optional[str], values, raw: bool = True):
        if raw:
            input_option = "RAW"
        else:
            input_option = "USER_ENTERED"   

        self.batch_update(ranges, values, input_option)  

    def append_values(
        self, range_name: str, values: List[List], raw: bool = True
    ):       
        if raw:
            input_option = "RAW"
        else:
            input_option = "USER_ENTERED"

        self.append(range_name, values, input_option)

    def append(
        self, range_name: str, values: List[List], input_option
    ):
        get_range_name = absolute_range_name(self.title, range_name)
        self.client.append_values(self.spreadsheet_id, get_range_name, values, value_input_option=input_option)

    def update(self, range_name: Optional[str], values, input_option):
        get_range_name = absolute_range_name(self.title, range_name)
        self.client.update_values(self.spreadsheet_id, get_range_name, values, value_input_option=input_option)

    def batch_update(self, ranges, values, input_option):
        ranges = [absolute_range_name(self.title, r) for r in ranges if r]

        self.client.batch_update_values(self.spreadsheet_id, ranges, values, input_option)

    def get(self, range_name: Optional[str]):
        get_range_name = absolute_range_name(self.title, range_name)

        return self.client.get_values(self.spreadsheet_id, get_range_name)
    
    def batch_get(self, ranges):
        ranges = [absolute_range_name(self.title, r) for r in ranges if r]

        return self.client.batch_get_values(self.spreadsheet_id, ranges)
    
    def get_sheet_metadata(self):
        return self.client.get_spreadsheet_metadata(self.spreadsheet_id)