## TESTS FOR sheets.py
import google.auth
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import time
import random

from .sheets import create_spreadsheet, get_values, batch_get_values, update_values, batch_update_values

def log(msg: str):
    print(f"[{time.localtime}]     {msg}")

"""
input:
    title: of spreadsheet
    v: verbose (if greater than 0)
Tests spreadsheet creation
"""
def create_spreadsheet_test(title: str, v: int):
    try:
        spreadsheet_id = create_spreadsheet(title)
        if (v>0):
            response = f"Spreadsheet ID: {spreadsheet_id}"
        else:
            response = ""
        response += f"TEST: create_spreadsheet_test: ok"
    except Exception as E:
        response = f"TEST: create_spreadsheet_test: FAILED"
    
    log(response)


# HELPER FUNCTION FOR get_values_test
def col_to_letter(col):
    result = ""
    while col > 0:
        col, remainder = divmod(col - 1, 26)
        result = chr(65 + remainder) + result
    return result

def random_range(max_rows, max_cols):
    # Random start
    start_row = random.randint(1, max_rows)
    start_col = random.randint(1, max_cols)

    # Random size (keep it small so it doesn't overflow)
    height = random.randint(1, 5)
    width = random.randint(1, 5)

    end_row = min(max_rows, start_row + height)
    end_col = min(max_cols, start_col + width)

    start_cell = f"{col_to_letter(start_col)}{start_row}"
    end_cell = f"{col_to_letter(end_col)}{end_row}"

    return f"{start_cell}:{end_cell}"
"""
input:
    spreadsheet_id: of spreadsheet
    v: verbose mode
        - 0 : no verbose
        - 1 : limited verbose
        - 2 : heavy verbose
Tests spreadsheet creation
"""
def get_values_test(spreadsheet_id, v: int):
    response = ""
    failed = False
    for _ in range(100):
        range_name = random_range(5, 15)
        try:
            result = get_values(spreadsheet_id, range_name)
            if (v>0):
                response += f"range {range_name} retrieved\n"
            if (v>1):
                response += f"{result}"
        except Exception as E:
            failed = True
            response += f"range {range_name} NOT RETRIEVED, Exception {E} caught"

    if(failed):
        response = f"TEST: get_values_test: FAILED"
    else:
        response += f"TEST: get_values_test: ok"
    log(response)