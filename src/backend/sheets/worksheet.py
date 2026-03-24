from .sheets import SheetsClient
from typing import Optional, Iterable
from .utils import absolute_range_name

class Worksheet():
    def __init__(
            self,
            spreadsheet_id, 
            sheet_client: SheetsClient, 
            properties):
        self.client = sheet_client
        self._properties = properties

        metadata = self.get_sheet_metadata()
        self._properties.update(metadata["properties"])
        self.spreadsheet_id = spreadsheet_id

    @property
    def title(self):
        return self._properties["title"]

    def get_values(self, range_name: Optional[str]):
        return self.get(range_name)
    
    def batch_get_values(self, range_name: Optional[str]):
        return self.batch_get(range_name)

    def get(self, range_name: Optional[str]):
        get_range_name = absolute_range_name(self.title, range_name)

        return self.client.get_values(self.spreadsheet_id, get_range_name)
    
    def batch_get(self, ranges):
        ranges = [absolute_range_name(self.title, r) for r in ranges if r]

        return self.client.batch_get_values(self.spreadsheet_id, ranges)
    
    def get_sheet_metadata(self):
        return self.client.get_sheet_metadata(self.spreadsheet_id)