# test_sheets.py
import os
import pytest
from googleapiclient.errors import HttpError
from sheets import create_spreadsheet, get_values, batch_get_values, update_values, batch_update_values
from google.oauth2 import service_account
from googleapiclient.discovery import build

# ------------------------------
# CONFIGURATION
# ------------------------------
TEST_SPREADSHEET_TITLE = "Test Sheet"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")


# ------------------------------
# FIXTURES
# ------------------------------
@pytest.fixture(scope="module")
def service():
    """Initialize a Sheets API service for all tests."""
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return build("sheets", "v4", credentials=creds)


@pytest.fixture(scope="module")
def spreadsheet_id(service):
    """Create a test spreadsheet and clean up after tests."""
    spreadsheet_id = create_spreadsheet(TEST_SPREADSHEET_TITLE)
    yield spreadsheet_id
    # Cleanup: delete the spreadsheet after tests
    try:
        service.spreadsheets().delete(spreadsheetId=spreadsheet_id).execute()
    except HttpError:
        # deletion may fail if sheet already deleted, ignore
        pass


@pytest.fixture
def test_data():
    """Provide a deterministic 5x5 grid of test data."""
    return [[i + j for j in range(5)] for i in range(5)]


# ------------------------------
# TESTS
# ------------------------------
def test_create_spreadsheet(spreadsheet_id):
    assert spreadsheet_id is not None
    assert isinstance(spreadsheet_id, str)


def test_update_and_get_values(spreadsheet_id, test_data):
    # Write known data
    update_values(spreadsheet_id, "A1:E5", "RAW", test_data)

    # Read back data
    result = get_values(spreadsheet_id, "A1:E5")
    values = result.get("values")
    assert values == [[str(cell) for cell in row] for row in test_data] or values == test_data


def test_batch_update_and_batch_get(spreadsheet_id, test_data):
    # Batch update two ranges
    data = [
        {"range": "A1:C3", "values": [row[:3] for row in test_data[:3]]},
        {"range": "D4:E5", "values": [row[3:5] for row in test_data[3:5]]}
    ]
    batch_update_values(spreadsheet_id, None, "RAW", data)

    # Batch get the same ranges
    ranges = ["A1:C3", "D4:E5"]
    result = batch_get_values(spreadsheet_id, ranges)
    value_ranges = result.get("valueRanges")
    assert len(value_ranges) == 2
    # Check first range
    assert value_ranges[0]["values"] == [row[:3] for row in test_data[:3]]
    # Check second range
    assert value_ranges[1]["values"] == [row[3:5] for row in test_data[3:5]]


def test_append_values(spreadsheet_id):
    # Append a new row
    new_row = [["X", "Y", "Z", "A", "B"]]
    from sheets import append_values
    result = append_values(spreadsheet_id, "A6:E6", "RAW", new_row)
    assert result.get("updates")["updatedRows"] >= 1

    # Verify appended row
    read_result = get_values(spreadsheet_id, "A6:E6")
    assert read_result["values"] == new_row