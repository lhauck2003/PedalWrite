from typing import Optional

def absolute_range_name(sheet_name: str, range_name: Optional[str]):
    sheet_name = "'{}'".format(sheet_name.replace("'", "''"))

    if range_name:
        return "{}!{}".format(sheet_name, range_name)
    else:
        return sheet_name
    
