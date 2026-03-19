# test_sheets.py
import os
import pytest
from sheets import init_service, SheetsClient

# ------------------------------
# CONFIGURATION
# ------------------------------
TEST_SPREADSHEET_TITLE = "Test Sheet"
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")


# ------------------------------
# FIXTURES
# ------------------------------
@pytest.fixture(scope="module")
def service():
    """Initialize a single Sheets API service for all tests."""
    return init_service(SERVICE_ACCOUNT_FILE)


@pytest.fixture(scope="module")
def sheets(service):
    """Initialize SheetsClient using the service."""
    return SheetsClient(service)


@pytest.fixture(scope="module")
def spreadsheet_id(sheets):
    """Create a test spreadsheet and clean up after tests."""
    spreadsheet_id = sheets.create_spreadsheet(TEST_SPREADSHEET_TITLE)
    yield spreadsheet_id
    # Cleanup: delete spreadsheet after tests
    try:
        sheets.service.spreadsheets().delete(spreadsheetId=spreadsheet_id).execute()
    except Exception:
        pass


@pytest.fixture
def test_data():
    """Deterministic 5x5 grid for testing."""
    return [[i + j for j in range(5)] for i in range(5)]


# ------------------------------
# TESTS
# ------------------------------
def test_create_spreadsheet(spreadsheet_id):
    assert spreadsheet_id is not None
    assert isinstance(spreadsheet_id, str)


def test_update_and_get_values(sheets, spreadsheet_id, test_data):
    # Write known data
    sheets.update_values(spreadsheet_id, "A1:E5", test_data)

    # Read back data
    result = sheets.get_values(spreadsheet_id, "A1:E5")
    # API returns strings, so convert test_data to strings for comparison
    expected = [[str(cell) for cell in row] for row in test_data]
    assert result == expected


def test_batch_update_and_batch_get(sheets, spreadsheet_id, test_data):
    # Batch update two ranges
    data = [
        {"range": "A1:C3", "values": [row[:3] for row in test_data[:3]]},
        {"range": "D4:E5", "values": [row[3:5] for row in test_data[3:5]]}
    ]
    sheets.batch_update_values(spreadsheet_id, data)

    # Batch get the same ranges
    ranges = ["A1:C3", "D4:E5"]
    value_ranges = sheets.batch_get_values(spreadsheet_id, ranges)

    assert len(value_ranges) == 2
    assert value_ranges[0]["values"] == [row[:3] for row in test_data[:3]]
    assert value_ranges[1]["values"] == [row[3:5] for row in test_data[3:5]]


def test_append_values(sheets, spreadsheet_id):
    # Append a new row
    new_row = [["X", "Y", "Z", "A", "B"]]
    sheets.append_values(spreadsheet_id, "A6:E6", new_row)

    # Verify appended row
    read_result = sheets.get_values(spreadsheet_id, "A6:E6")
    assert read_result == new_row