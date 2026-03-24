# test_integration_spreadsheet.py
import os
import pytest

from backend.sheets.service import Service
from backend.sheets.sheets import SheetsClient
from backend.sheets.spreadsheet import Spreadsheet

TEST_SPREADSHEET_ID = os.getenv("TEST_SPREADSHEET_ID")


@pytest.fixture(scope="module")
def spreadsheet():
    service = Service(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    client = SheetsClient(service)

    # minimal properties
    props = {
        "id": TEST_SPREADSHEET_ID,
    }

    return Spreadsheet(client, props)


def test_metadata(spreadsheet):
    metadata = spreadsheet.get_sheet_metadata()
    assert "sheets" in metadata


def test_get_values(spreadsheet):
    values = spreadsheet.get_values(TEST_SPREADSHEET_ID, "A1:B2")
    assert isinstance(values, list)


def test_update_values(spreadsheet):
    data = [["x", "y"]]
    spreadsheet.update_values(TEST_SPREADSHEET_ID, "A1:B1", data)

    result = spreadsheet.get_values(TEST_SPREADSHEET_ID, "A1:B1")
    assert result == data


def test_append_values(spreadsheet):
    spreadsheet.append_values(TEST_SPREADSHEET_ID, "A20", [["integration"]])

    result = spreadsheet.get_values(TEST_SPREADSHEET_ID, "A20")
    assert result[0][0] == "integration"

def test_add_worksheet(spreadsheet):
    worksheet = spreadsheet.add_worksheet("TEST WORKSHEET", index=1)

    data = [["add_worksheet_test"]]
    worksheet.append_values("A10", data)

    result = worksheet.get_values("A10")
    assert result[0][0] == "add_worksheet_test"
    assert worksheet._properties["title"] == "TEST WORKSHEET"

# TODO: come up with better test, though it seems to be working
def test_delete_worksheet(spreadsheet):
    r = spreadsheet.del_worksheet_by_id(spreadsheet.get_worksheet(1).id)
    assert r is not None