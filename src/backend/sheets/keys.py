from google.cloud import api_keys_v2
from google.cloud.api_keys_v2 import Key

# API KEYS

def create_api_key(project_id: str, suffix: str) -> Key:
    """
    Creates and restrict an API key. Add the suffix for uniqueness.

    TODO(Developer):
    1. Before running this sample,
      set up ADC as described in https://cloud.google.com/docs/authentication/external/set-up-adc
    2. Make sure you have the necessary permission to create API keys.

    Args:
        project_id: Google Cloud project id.

    Returns:
        response: Returns the created API Key.
    """
    # Create the API Keys client.
    client = api_keys_v2.ApiKeysClient()

    key = api_keys_v2.Key()
    key.display_name = f"My first API key - {suffix}"

    # Initialize request and set arguments.
    request = api_keys_v2.CreateKeyRequest()
    request.parent = f"projects/{project_id}/locations/global"
    request.key = key

    # Make the request and wait for the operation to complete.
    response = client.create_key(request=request).result()

    print(f"Successfully created an API key: {response.name}")
    # For authenticating with the API key, use the value in "response.key_string".
    # To restrict the usage of this API key, use the value in "response.name".
    return response

def get_key_id_from_string(key_string: str):
    client = api_keys_v2.ApiKeysClient()
    response = client.lookup_key(key_string=key_string)
    return response.name.split("/")[-1]

def write_api_key(project_id: str, key_id: str) -> Key:
    """
    Restricts an API key. Restrictions specify which APIs can be called using the API key.

    TODO(Developer): Replace the variables before running the sample.

    Args:
        project_id: Google Cloud project id.
        key_id: ID of the key to restrict. This ID is auto-created during key creation.
            This is different from the key string. To obtain the key_id,
            you can also use the lookup api: client.lookup_key()

    Returns:
        response: Returns the updated API Key.
    """

    # Create the API Keys client.
    client = api_keys_v2.ApiKeysClient()

    # Restrict the API key usage by specifying the target service and methods.
    # The API key can only be used to authenticate the specified methods in the service.
    # TODO: change the targets
    api_target = api_keys_v2.ApiTarget()
    api_target.service = "sheets.googleapis.com"
    api_target.methods = [
    "google.sheets.v4.SpreadsheetsService.UpdateValues",
    "google.sheets.v4.SpreadsheetsService.AppendValues",
    "google.sheets.v4.SpreadsheetsService.BatchUpdateValues",
]

    # Set the API restriction(s).
    # For more information on API key restriction, see:
    # https://cloud.google.com/docs/authentication/api-keys
    restrictions = api_keys_v2.Restrictions()
    restrictions.api_targets = [api_target]

    key = api_keys_v2.Key()
    key.name = f"projects/{project_id}/locations/global/keys/{key_id}"
    key.restrictions = restrictions

    # Initialize request and set arguments.
    request = api_keys_v2.UpdateKeyRequest()
    request.key = key
    request.update_mask = "restrictions"

    # Make the request and wait for the operation to complete.
    response = client.update_key(request=request).result()

    print(f"Successfully updated the API key: {response.name}")
    # Use response.key_string to authenticate.
    return response

def read_api_key(project_id: str, key_id: str) -> Key:
    """
    Restricts an API key. Restrictions specify which APIs can be called using the API key.

    TODO(Developer): Replace the variables before running the sample.

    Args:
        project_id: Google Cloud project id.
        key_id: ID of the key to restrict. This ID is auto-created during key creation.
            This is different from the key string. To obtain the key_id,
            you can also use the lookup api: client.lookup_key()

    Returns:
        response: Returns the updated API Key.
    """

    # Create the API Keys client.
    client = api_keys_v2.ApiKeysClient()

    # Restrict the API key usage by specifying the target service and methods.
    # The API key can only be used to authenticate the specified methods in the service.
    # TODO: change the targets
    api_target = api_keys_v2.ApiTarget()
    api_target.service = "sheets.googleapis.com"
    api_target.methods = [
    "google.sheets.v4.SpreadsheetsService.GetSpreadsheet",
    "google.sheets.v4.SpreadsheetsService.GetValues",
    "google.sheets.v4.SpreadsheetsService.BatchGetValues",
    ]

    # Set the API restriction(s).
    # For more information on API key restriction, see:
    # https://cloud.google.com/docs/authentication/api-keys
    restrictions = api_keys_v2.Restrictions()
    restrictions.api_targets = [api_target]

    key = api_keys_v2.Key()
    key.name = f"projects/{project_id}/locations/global/keys/{key_id}"
    key.restrictions = restrictions

    # Initialize request and set arguments.
    request = api_keys_v2.UpdateKeyRequest()
    request.key = key
    request.update_mask = "restrictions"

    # Make the request and wait for the operation to complete.
    response = client.update_key(request=request).result()

    print(f"Successfully updated the API key: {response.name}")
    # Use response.key_string to authenticate.
    return response

def create_spreadsheet_api_key(project_id: str, key_id: str):
    """
    Restricts an API key. Restrictions specify which APIs can be called using the API key.

    TODO(Developer): Replace the variables before running the sample.

    Args:
        project_id: Google Cloud project id.
        key_id: ID of the key to restrict. This ID is auto-created during key creation.
            This is different from the key string. To obtain the key_id,
            you can also use the lookup api: client.lookup_key()

    Returns:
        response: Returns the updated API Key.
    """

    # Create the API Keys client.
    client = api_keys_v2.ApiKeysClient()

    # Restrict the API key usage by specifying the target service and methods.
    # The API key can only be used to authenticate the specified methods in the service.
    # TODO: change the targets
    api_target = api_keys_v2.ApiTarget()
    api_target.service = "sheets.googleapis.com"
    api_target.methods = [
    "google.sheets.v4.SpreadsheetsService.CreateSpreadsheet",
]

    # Set the API restriction(s).
    # For more information on API key restriction, see:
    # https://cloud.google.com/docs/authentication/api-keys
    restrictions = api_keys_v2.Restrictions()
    restrictions.api_targets = [api_target]

    key = api_keys_v2.Key()
    key.name = f"projects/{project_id}/locations/global/keys/{key_id}"
    key.restrictions = restrictions

    # Initialize request and set arguments.
    request = api_keys_v2.UpdateKeyRequest()
    request.key = key
    request.update_mask = "restrictions"

    # Make the request and wait for the operation to complete.
    response = client.update_key(request=request).result()

    print(f"Successfully updated the API key: {response.name}")
    # Use response.key_string to authenticate.
    return response

# TODO: create different restrictors
def custom_restrict_api_key_api(project_id: str, key_id: str) -> Key:
    """
    Restricts an API key. Restrictions specify which APIs can be called using the API key.

    TODO(Developer): Replace the variables before running the sample.

    Args:
        project_id: Google Cloud project id.
        key_id: ID of the key to restrict. This ID is auto-created during key creation.
            This is different from the key string. To obtain the key_id,
            you can also use the lookup api: client.lookup_key()

    Returns:
        response: Returns the updated API Key.
    """

    # Create the API Keys client.
    client = api_keys_v2.ApiKeysClient()

    # Restrict the API key usage by specifying the target service and methods.
    # The API key can only be used to authenticate the specified methods in the service.
    # TODO: change the targets
    api_target = api_keys_v2.ApiTarget()
    api_target.service = "translate.googleapis.com"
    api_target.methods = ["translate.googleapis.com.TranslateText"]

    # Set the API restriction(s).
    # For more information on API key restriction, see:
    # https://cloud.google.com/docs/authentication/api-keys
    restrictions = api_keys_v2.Restrictions()
    restrictions.api_targets = [api_target]

    key = api_keys_v2.Key()
    key.name = f"projects/{project_id}/locations/global/keys/{key_id}"
    key.restrictions = restrictions

    # Initialize request and set arguments.
    request = api_keys_v2.UpdateKeyRequest()
    request.key = key
    request.update_mask = "restrictions"

    # Make the request and wait for the operation to complete.
    response = client.update_key(request=request).result()

    print(f"Successfully updated the API key: {response.name}")
    # Use response.key_string to authenticate.
    return response

def _create_key_with_restrictor(restrictor, project_id: str, restrictor_type: str) -> Key:
    key: Key = create_api_key(project_id, restrictor_type)
    key_id = get_key_id_from_string(key.key_string)
    return restrictor(project_id, key_id)

def delete_api_key(project_id: str, key_id: str):
    client = api_keys_v2.ApiKeysClient()

    name = f"projects/{project_id}/locations/global/keys/{key_id}"

    operation = client.delete_key(name=name)

    # Wait for deletion to complete
    response = operation.result()

    print("API key deleted.")
    return response

def rotate_api_key(project_id: str, key_id: str, restrictor, restrictor_type: str) -> Key:
    delete_api_key(project_id, key_id)
    return _create_key_with_restrictor(restrictor, project_id, restrictor_type)
