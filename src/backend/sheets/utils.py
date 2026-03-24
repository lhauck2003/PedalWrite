from typing import Optional
from .worksheet import Worksheet

def absolute_range_name(sheet_name: str, range_name: Optional[str]):
    sheet_name = "'{}'".format(sheet_name.replace("'", "''"))

    if range_name:
        return "{}!{}".format(sheet_name, range_name)
    else:
        return sheet_name
    

class SheetProperties:
    def __init__(self, id, title, url, worksheets: Optional[list[Worksheet]]):
        self.id=id
        self.title=title
        self.url=url
        self.worksheets=worksheets

    def update_title(self, title):
        self.title = title

    def add_worksheets(self, worksheet: list[Worksheet]):
        for s in worksheet:
            self.worksheets.append(s)