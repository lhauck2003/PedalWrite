from .sheets import SheetsClient
from .worksheet import Worksheet
from typing import Optional, List, Dict, Union
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
        return self.client.batch_get_values(spreadsheet_id, ranges)

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
        properties = self.client.get_worksheet(self.id, index)
        return Worksheet(self.id, self.client, properties)
    
    def worksheets(self):
        sheet_data = self.get_sheet_metadata()
        worksheets = [
            Worksheet(self.id, self.client, s["properties"])
            for s in sheet_data["sheets"]
        ]
        return worksheets

    def add_worksheet(self, title: str, index: Optional[int]):
        body: Dict[
            str, List[Dict[str, Dict[str, Dict[str, Union[str, int, Dict[str, int]]]]]]
        ] = {
            "requests": [
                {
                    "addSheet": {
                        "properties": {
                            "title": title,
                            "sheetType": "GRID",
                        }
                    }
                }
            ]
        }
        if index is not None:
            body["requests"][0]["addSheet"]["properties"]["index"] = index

        data = self.client.create_worksheet(self.id, body)

        properties = data["replies"][0]["addSheet"]["properties"]

        return Worksheet(self.id, self.client, properties)
    
    def del_worksheet_by_id(self, worksheet_id: Union[str, int]):
        try:
            worksheet_id_int = int(worksheet_id)
        except ValueError as ex:
            raise ValueError("id should be int") from ex

        body = {"requests": [{"deleteSheet": {"sheetId": worksheet_id_int}}]}

        return self.client.delete_worksheet(self.id, body)

    def get_sheet_metadata(self):
        return self.client.get_spreadsheet_metadata(self.id)
