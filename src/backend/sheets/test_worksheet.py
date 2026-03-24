# test_integration_worksheet.py
import os
import pytest

from backend.sheets.service import Service
from backend.sheets.sheets import SheetsClient
from backend.sheets.worksheet import Worksheet
from .spreadsheet import Spreadsheet

TEST_SPREADSHEET_ID = os.getenv("TEST_SPREADSHEET_ID")


@pytest.fixture(scope="module")
def worksheet():
    service = Service(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    client = SheetsClient(service)
    spreadsheet = Spreadsheet(client, properties={"id": TEST_SPREADSHEET_ID,})

    # minimal properties (will be filled by metadata)
    ws = Worksheet(
        spreadsheet_id=TEST_SPREADSHEET_ID,
        sheet_client=client,
        properties={"title": spreadsheet.title}
    )
    return ws


def test_get_values(worksheet):
    values = worksheet.get_values("A1:B2")
    assert isinstance(values, list)


def test_update_and_get_values(worksheet):
    test_data = [["hello", "world"], ["123", "456"]]

    worksheet.update_values("A1:B2", test_data)

    result = worksheet.get_values("A1:B2")
    assert result == test_data


def test_batch_update_and_get(worksheet):
    ranges = ["C1:D2", "E1:F2"]
    values = [
        [["a", "b"], ["c", "d"]],
        [["1", "2"], ["3", "4"]],
    ]

    worksheet.batch_update_values(ranges, values)

    result = worksheet.batch_get_values(ranges)

    assert len(result) == 2


def test_append_values(worksheet):
    data = [["append_test"]]

    worksheet.append_values("A10", data)

    result = worksheet.get_values("A10")
    assert result[0][0] == "append_test"