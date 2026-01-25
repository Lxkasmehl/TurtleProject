"""
Google Sheets API Service
Handles all interactions with Google Sheets for turtle data management.
"""

import os
import ssl
from typing import Dict, List, Optional, Any
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import json


class GoogleSheetsService:
    """
    Service for interacting with Google Sheets API.
    Handles authentication, reading, writing, and updating turtle data.
    """

    # Column mapping: Google Sheets column headers to internal field names
    COLUMN_MAPPING = {
        'Primary ID': 'primary_id',  # New unique primary key column
        'Transmitter ID': 'transmitter_id',
        'ID': 'id',
        'ID2 (random sequence)': 'id2',
        'Pit?': 'pit',
        'Pic in 2024 Archive?': 'pic_in_2024_archive',
        'Adopted?': 'adopted',
        'iButton?': 'ibutton',
        'DNA Extracted?': 'dna_extracted',
        'Date 1st found': 'date_1st_found',
        'Species': 'species',
        'Name': 'name',
        'Sex': 'sex',
        'iButton Last set': 'ibutton_last_set',
        'Dates refound': 'dates_refound',
        'General Location': 'general_location',
        'Location': 'location',
        'Notes': 'notes',
        'Transmitter put on by': 'transmitter_put_on_by',
        'Transmitter On Date': 'transmitter_on_date',
        'Transmitter type': 'transmitter_type',
        'Transmitter lifespan': 'transmitter_lifespan',
        'Radio Replace Date': 'radio_replace_date',
        'OLD Frequencies': 'old_frequencies',
    }

    # Reverse mapping: internal field names to Google Sheets column headers
    FIELD_TO_COLUMN = {v: k for k, v in COLUMN_MAPPING.items()}

    def __init__(self, spreadsheet_id: Optional[str] = None, credentials_path: Optional[str] = None):
        """
        Initialize Google Sheets Service.
        
        Args:
            spreadsheet_id: Google Sheets spreadsheet ID (from URL)
            credentials_path: Path to service account credentials JSON file
        """
        self.spreadsheet_id = spreadsheet_id or os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID')
        if not self.spreadsheet_id:
            raise ValueError("Google Sheets Spreadsheet ID must be provided via environment variable or parameter")
        
        # Load credentials
        credentials_file = credentials_path or os.environ.get('GOOGLE_SHEETS_CREDENTIALS_PATH')
        if not credentials_file:
            raise ValueError("Google Sheets credentials path must be provided via environment variable or parameter")
        
        if not os.path.exists(credentials_file):
            raise FileNotFoundError(f"Credentials file not found: {credentials_file}")
        
        # Authenticate
        try:
            credentials = service_account.Credentials.from_service_account_file(
                credentials_file,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            self.service = build('sheets', 'v4', credentials=credentials)
        except Exception as e:
            raise Exception(f"Failed to authenticate with Google Sheets: {str(e)}")

    def _escape_sheet_name(self, sheet_name: str) -> str:
        """
        Escape sheet name for use in A1 notation.
        Sheet names with special characters or spaces need to be wrapped in single quotes.
        
        Args:
            sheet_name: Raw sheet name
            
        Returns:
            Escaped sheet name for use in range notation
        """
        # If sheet name contains special characters, spaces, or starts with a number, wrap in quotes
        if any(char in sheet_name for char in [' ', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '+', '=']):
            return f"'{sheet_name}'"
        return sheet_name
    
    def _get_sheet_name_for_region(self, sheet_name: Optional[str] = None, state: Optional[str] = None, location: Optional[str] = None) -> str:
        """
        Determine which sheet (tab) to use.
        If sheet_name is provided, use it directly. Otherwise, try to determine from state/location.
        Rejects backup sheets.
        
        Args:
            sheet_name: Direct sheet name (e.g., "Location A", "Location B")
            state: State name (e.g., "Kansas") - not used for sheet selection
            location: Optional specific location - not used for sheet selection
            
        Returns:
            Sheet name (tab name) in the spreadsheet
            
        Raises:
            ValueError: If sheet_name is empty or is a backup sheet
        """
        # If sheet_name is provided and not empty, use it directly
        if sheet_name and sheet_name.strip():
            sheet_name = sheet_name.strip()
            
            # Reject backup sheets (note: "Inital" is a typo in the actual sheet name)
            backup_sheet_names = ['Backup (Initial State)', 'Backup (Inital State)', 'Backup']
            if sheet_name in backup_sheet_names:
                raise ValueError(f"Sheet '{sheet_name}' is a backup sheet and cannot be modified or accessed")
            
            return sheet_name
        
        # Fallback should NOT use state, as state might be general_location (e.g., "CPBS")
        # This is a critical error - sheet_name must always be provided
        print(f"ERROR: sheet_name is empty or None! state='{state}', location='{location}'")
        raise ValueError("Sheet name must be provided and cannot be empty")

    def _find_column_index(self, sheet_name: str, column_header: str) -> Optional[int]:
        """
        Find the column index for a given header in a sheet.
        Searches row 1 (header row) for the column header.
        
        Args:
            sheet_name: Name of the sheet (tab)
            column_header: Header text to find
            
        Returns:
            Column index (0-based) or None if not found
        """
        try:
            # Get the first row (headers)
            escaped_sheet = self._escape_sheet_name(sheet_name)
            range_name = f"{escaped_sheet}!1:1"
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                return None
            
            headers = values[0]
            try:
                return headers.index(column_header)
            except ValueError:
                return None
        except HttpError as e:
            print(f"Error finding column index: {e}")
            return None

    def _ensure_primary_id_column(self, sheet_name: str) -> bool:
        """
        Ensure the "Primary ID" column exists in the sheet.
        If it doesn't exist, adds it as the first column.
        Skips backup sheets.
        
        Args:
            sheet_name: Name of the sheet (tab)
            
        Returns:
            True if column exists or was created, False otherwise
        """
        # Skip backup sheets - they should not be modified
        backup_sheet_names = ['Backup (Initial State)', 'Backup (Inital State)', 'Backup']
        if sheet_name in backup_sheet_names:
            return False  # Don't try to modify backup sheets
        
        try:
            column_indices = self._get_all_column_indices(sheet_name)
            
            # Check if Primary ID column already exists
            if 'Primary ID' in column_indices:
                return True
            
            # Primary ID column doesn't exist - we need to add it
            # For now, we'll just log a warning and let the user add it manually
            # Adding columns programmatically requires the Sheets API batchUpdate method
            print(f"WARNING: 'Primary ID' column not found in sheet '{sheet_name}'. "
                  f"Please add a 'Primary ID' column to the sheet. Available columns: {list(column_indices.keys())}")
            
            # Try to add it using batchUpdate
            try:
                # Get sheet ID
                spreadsheet = self.service.spreadsheets().get(
                    spreadsheetId=self.spreadsheet_id
                ).execute()
                
                sheet_id = None
                for sheet in spreadsheet.get('sheets', []):
                    if sheet['properties']['title'] == sheet_name:
                        sheet_id = sheet['properties']['sheetId']
                        break
                
                if sheet_id is None:
                    print(f"ERROR: Could not find sheet '{sheet_name}'")
                    return False
                
                # Insert a new column at position 0 (before column A)
                requests = [{
                    'insertDimension': {
                        'range': {
                            'sheetId': sheet_id,
                            'dimension': 'COLUMNS',
                            'startIndex': 0,
                            'endIndex': 1
                        }
                    }
                }]
                
                body = {'requests': requests}
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=self.spreadsheet_id,
                    body=body
                ).execute()
                
                # Now add the header "Primary ID" to cell A1
                escaped_sheet = self._escape_sheet_name(sheet_name)
                range_name = f"{escaped_sheet}!A1"
                body = {
                    'values': [['Primary ID']]
                }
                self.service.spreadsheets().values().update(
                    spreadsheetId=self.spreadsheet_id,
                    range=range_name,
                    valueInputOption='RAW',
                    body=body
                ).execute()
                
                print(f"✅ Created 'Primary ID' column in sheet '{sheet_name}'")
                return True
                
            except Exception as e:
                print(f"ERROR: Could not automatically create 'Primary ID' column: {e}")
                print(f"Please manually add a 'Primary ID' column to sheet '{sheet_name}'")
                return False
                
        except Exception as e:
            print(f"Error ensuring Primary ID column: {e}")
            return False

    def _get_all_column_indices(self, sheet_name: str) -> Dict[str, int]:
        """
        Get all column indices for a sheet by reading the header row.
        Skips backup sheets.
        
        Args:
            sheet_name: Name of the sheet (tab)
            
        Returns:
            Dictionary mapping column headers to indices (0-based)
        """
        # Skip backup sheets - they should not be accessed
        backup_sheet_names = ['Backup (Initial State)', 'Backup (Inital State)', 'Backup']
        if sheet_name in backup_sheet_names:
            print(f"Info: Skipping backup sheet '{sheet_name}'")
            return {}
        
        try:
            # First, verify the sheet exists
            available_sheets = self.list_sheets()
            if sheet_name not in available_sheets:
                print(f"Warning: Sheet '{sheet_name}' not found. Available sheets: {available_sheets}")
                return {}
            
            # Get the first row (headers)
            escaped_sheet = self._escape_sheet_name(sheet_name)
            range_name = f"{escaped_sheet}!1:1"
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                return {}
            
            headers = values[0]
            column_indices = {}
            for idx, header in enumerate(headers):
                if header and header.strip():
                    column_indices[header.strip()] = idx
            
            return column_indices
        except HttpError as e:
            print(f"Error getting column indices for sheet '{sheet_name}': {e}")
            # Try to list available sheets for debugging
            try:
                available_sheets = self.list_sheets()
                print(f"Available sheets: {available_sheets}")
            except:
                pass
            return {}

    def _find_row_by_primary_id(self, sheet_name: str, primary_id: str, id_column: str = 'Primary ID') -> Optional[int]:
        """
        Find the row index (1-based) for a turtle with a given primary ID.
        Searches in the "Primary ID" column (not the "ID" column).
        Skips backup sheets.
        
        Args:
            sheet_name: Name of the sheet (tab)
            primary_id: Primary ID to search for
            id_column: Column header for the Primary ID column (default: 'Primary ID')
            
        Returns:
            Row index (1-based) or None if not found
        """
        # Skip backup sheets - they should not be accessed
        backup_sheet_names = ['Backup (Initial State)', 'Backup (Inital State)', 'Backup']
        if sheet_name in backup_sheet_names:
            return None
        
        try:
            # First, verify the sheet exists
            available_sheets = self.list_sheets()
            if sheet_name not in available_sheets:
                print(f"Warning: Sheet '{sheet_name}' not found. Available sheets: {available_sheets}")
                return None
            
            # Get all values in the sheet
            escaped_sheet = self._escape_sheet_name(sheet_name)
            range_name = f"{escaped_sheet}!A:Z"  # Adjust range as needed
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values or len(values) < 2:
                return None
            
            # Find Primary ID column index
            headers = values[0]
            try:
                id_col_idx = headers.index(id_column)
            except ValueError:
                # Primary ID column doesn't exist - try to find in "ID" column as fallback
                print(f"Warning: Column '{id_column}' not found in sheet '{sheet_name}'. Trying 'ID' column as fallback. Available columns: {headers}")
                try:
                    id_col_idx = headers.index('ID')
                    # Found ID column - search there as fallback
                    print(f"Found 'ID' column at index {id_col_idx}, searching there (migration recommended)")
                except ValueError:
                    print(f"Error: Neither 'Primary ID' nor 'ID' column found in sheet '{sheet_name}'")
                    return None
            
            # Search for the primary ID (starting from row 2, index 1)
            for row_idx, row in enumerate(values[1:], start=2):
                if len(row) > id_col_idx and row[id_col_idx] == primary_id:
                    return row_idx
            
            return None
        except HttpError as e:
            print(f"Error finding row by primary ID in sheet '{sheet_name}': {e}")
            # Try to list available sheets for debugging
            try:
                available_sheets = self.list_sheets()
                print(f"Available sheets: {available_sheets}")
            except:
                pass
            return None

    def get_turtle_data(self, primary_id: str, sheet_name: str, state: Optional[str] = None, location: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get turtle data from Google Sheets by primary ID.
        
        Args:
            primary_id: Primary ID of the turtle
            sheet_name: Name of the sheet (tab) to search in (e.g., "Location A", "Location B")
            state: Optional state name (for backwards compatibility)
            location: Optional specific location (for backwards compatibility)
            
        Returns:
            Dictionary with turtle data or None if not found
        """
        # Validate sheet_name before processing
        if not sheet_name or not sheet_name.strip():
            print(f"ERROR in get_turtle_data: sheet_name is empty! primary_id={primary_id}, state={state}, location={location}")
            raise ValueError("sheet_name must be provided and cannot be empty")
        
        sheet_name = self._get_sheet_name_for_region(sheet_name=sheet_name, state=state, location=location)
        
        try:
            # Ensure Primary ID column exists
            self._ensure_primary_id_column(sheet_name)
            
            # Find the row using Primary ID column
            row_idx = self._find_row_by_primary_id(sheet_name, primary_id, 'Primary ID')
            if not row_idx:
                return None
            
            # Get column indices
            column_indices = self._get_all_column_indices(sheet_name)
            
            # Get the row data
            escaped_sheet = self._escape_sheet_name(sheet_name)
            range_name = f"{escaped_sheet}!{row_idx}:{row_idx}"
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                return None
            
            row_data = values[0]
            
            # Map row data to field names
            turtle_data = {}
            for header, col_idx in column_indices.items():
                if header in self.COLUMN_MAPPING:
                    field_name = self.COLUMN_MAPPING[header]
                    value = row_data[col_idx] if col_idx < len(row_data) else ''
                    turtle_data[field_name] = value.strip() if value else ''
            
            turtle_data['primary_id'] = primary_id
            turtle_data['sheet_name'] = sheet_name
            turtle_data['row_index'] = row_idx
            
            return turtle_data
        except HttpError as e:
            print(f"Error getting turtle data: {e}")
            return None

    def create_turtle_data(self, turtle_data: Dict[str, Any], sheet_name: str, state: Optional[str] = None, location: Optional[str] = None) -> Optional[str]:
        """
        Create a new turtle entry in Google Sheets.
        
        Args:
            turtle_data: Dictionary with turtle data (using internal field names)
            sheet_name: Name of the sheet (tab) to create in (e.g., "Location A", "Location B")
            state: Optional state name (for backwards compatibility)
            location: Optional specific location (for backwards compatibility)
            
        Returns:
            Primary ID of the created turtle or None if failed
        """
        # Validate sheet_name before processing
        if not sheet_name or not sheet_name.strip():
            print(f"ERROR in create_turtle_data: sheet_name is empty! state={state}, location={location}, turtle_data keys={list(turtle_data.keys())}")
            raise ValueError("sheet_name must be provided and cannot be empty")
        
        sheet_name = self._get_sheet_name_for_region(sheet_name=sheet_name, state=state, location=location)
        
        try:
            # Ensure Primary ID column exists
            self._ensure_primary_id_column(sheet_name)
            
            # Get column indices
            column_indices = self._get_all_column_indices(sheet_name)
            
            # Get the next available row (find last row with data)
            escaped_sheet = self._escape_sheet_name(sheet_name)
            range_name = f"{escaped_sheet}!A:A"
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            next_row = len(values) + 1 if values else 2  # Start at row 2 (row 1 is headers)
            
            # Build the row data
            # First, get the maximum column index we need
            max_col_idx = max(column_indices.values()) if column_indices else 0
            
            # Create a list with empty strings for all columns
            row_data = [''] * (max_col_idx + 1)
            
            # Fill in the data
            for header, col_idx in column_indices.items():
                if header in self.COLUMN_MAPPING:
                    field_name = self.COLUMN_MAPPING[header]
                    if field_name in turtle_data:
                        row_data[col_idx] = str(turtle_data[field_name])
            
            # Ensure Primary ID is written (it's required)
            primary_id = turtle_data.get('primary_id') or turtle_data.get('id')
            if primary_id and 'Primary ID' in column_indices:
                primary_id_col_idx = column_indices['Primary ID']
                # Extend row_data if necessary
                while len(row_data) <= primary_id_col_idx:
                    row_data.append('')
                row_data[primary_id_col_idx] = str(primary_id)
            
            # Write the row
            range_name = f"{escaped_sheet}!{next_row}:{next_row}"
            body = {
                'values': [row_data]
            }
            
            self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                body=body
            ).execute()
            
            # Return the primary ID
            return primary_id
        except HttpError as e:
            print(f"Error creating turtle data: {e}")
            return None

    def find_turtle_sheet(self, primary_id: str) -> Optional[str]:
        """
        Find which sheet contains a turtle with the given primary ID.
        Searches all sheets (except backup sheets).
        
        Args:
            primary_id: Primary ID to search for
            
        Returns:
            Sheet name if found, None otherwise
        """
        try:
            all_sheets = self.list_sheets()  # Already excludes backup sheets
            for sheet_name in all_sheets:
                row_idx = self._find_row_by_primary_id(sheet_name, primary_id, 'Primary ID')
                if row_idx:
                    return sheet_name
            return None
        except Exception as e:
            print(f"Error finding turtle sheet: {e}")
            return None
    
    def delete_turtle_data(self, primary_id: str, sheet_name: str) -> bool:
        """
        Delete turtle data from Google Sheets by removing the entire row.
        
        Args:
            primary_id: Primary ID of the turtle to delete
            sheet_name: Name of the sheet (tab) to delete from
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Find the row
            row_idx = self._find_row_by_primary_id(sheet_name, primary_id, 'Primary ID')
            if not row_idx:
                print(f"Warning: Turtle with Primary ID '{primary_id}' not found in sheet '{sheet_name}'")
                return False
            
            # Get sheet ID for batchUpdate
            spreadsheet = self.service.spreadsheets().get(
                spreadsheetId=self.spreadsheet_id
            ).execute()
            
            sheet_id = None
            for sheet in spreadsheet.get('sheets', []):
                if sheet['properties']['title'] == sheet_name:
                    sheet_id = sheet['properties']['sheetId']
                    break
            
            if sheet_id is None:
                print(f"ERROR: Could not find sheet '{sheet_name}'")
                return False
            
            # Delete the row using batchUpdate
            requests = [{
                'deleteDimension': {
                    'range': {
                        'sheetId': sheet_id,
                        'dimension': 'ROWS',
                        'startIndex': row_idx - 1,  # Convert to 0-based
                        'endIndex': row_idx  # End index is exclusive
                    }
                }
            }]
            
            body = {'requests': requests}
            self.service.spreadsheets().batchUpdate(
                spreadsheetId=self.spreadsheet_id,
                body=body
            ).execute()
            
            print(f"✅ Deleted turtle with Primary ID '{primary_id}' from sheet '{sheet_name}' (row {row_idx})")
            return True
            
        except HttpError as e:
            print(f"Error deleting turtle data: {e}")
            return False
        except Exception as e:
            print(f"Error deleting turtle data: {e}")
            return False

    def update_turtle_data(self, primary_id: str, turtle_data: Dict[str, Any], sheet_name: str, state: Optional[str] = None, location: Optional[str] = None) -> bool:
        """
        Update existing turtle data in Google Sheets.
        
        Args:
            primary_id: Primary ID of the turtle to update
            turtle_data: Dictionary with updated turtle data (using internal field names)
            sheet_name: Name of the sheet (tab) to update in (e.g., "Location A", "Location B")
            state: Optional state name (for backwards compatibility)
            location: Optional specific location (for backwards compatibility)
            
        Returns:
            True if successful, False otherwise
        """
        # Validate sheet_name before processing
        if not sheet_name or not sheet_name.strip():
            print(f"ERROR in update_turtle_data: sheet_name is empty! primary_id={primary_id}, state={state}, location={location}, turtle_data keys={list(turtle_data.keys())}")
            raise ValueError("sheet_name must be provided and cannot be empty")
        
        sheet_name = self._get_sheet_name_for_region(sheet_name=sheet_name, state=state, location=location)
        
        try:
            # Ensure Primary ID column exists
            self._ensure_primary_id_column(sheet_name)
            
            # Find the row
            row_idx = self._find_row_by_primary_id(sheet_name, primary_id)
            if not row_idx:
                return False
            
            # Get column indices
            column_indices = self._get_all_column_indices(sheet_name)
            
            # Get current row data
            escaped_sheet = self._escape_sheet_name(sheet_name)
            range_name = f"{escaped_sheet}!{row_idx}:{row_idx}"
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                return False
            
            row_data = list(values[0])
            
            # Update the row data
            for header, col_idx in column_indices.items():
                if header in self.COLUMN_MAPPING:
                    field_name = self.COLUMN_MAPPING[header]
                    if field_name in turtle_data:
                        # Extend row_data if necessary
                        while len(row_data) <= col_idx:
                            row_data.append('')
                        row_data[col_idx] = str(turtle_data[field_name])
            
            # Ensure Primary ID is updated (it's required and must match)
            if 'Primary ID' in column_indices:
                primary_id_col_idx = column_indices['Primary ID']
                while len(row_data) <= primary_id_col_idx:
                    row_data.append('')
                row_data[primary_id_col_idx] = str(primary_id)
            
            # Write the updated row
            range_name = f"{escaped_sheet}!{row_idx}:{row_idx}"
            body = {
                'values': [row_data]
            }
            
            self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                body=body
            ).execute()
            
            return True
        except HttpError as e:
            print(f"Error updating turtle data: {e}")
            return False

    def generate_primary_id(self, state: Optional[str] = None, location: Optional[str] = None) -> str:
        """
        Generate a new unique primary ID for a turtle.
        Checks all sheets to ensure uniqueness across the entire spreadsheet.
        
        Args:
            state: State name (optional, not used for ID generation)
            location: Optional specific location (optional, not used for ID generation)
            
        Returns:
            New unique primary ID
        """
        import time
        import random
        
        # Get all available sheets to check for uniqueness
        # Use a timeout to avoid blocking for too long (IDs are unique by timestamp anyway)
        # If list_sheets fails or times out, use empty list (we'll still generate unique IDs)
        all_sheets = []
        try:
            # Use threading to add a timeout to list_sheets()
            import threading
            sheets_result = [None]
            exception_result = [None]
            
            def call_list_sheets():
                try:
                    sheets_result[0] = self.list_sheets()
                except Exception as e:
                    exception_result[0] = e
            
            thread = threading.Thread(target=call_list_sheets)
            thread.daemon = True
            thread.start()
            thread.join(timeout=5.0)  # 5 second timeout
            
            if thread.is_alive():
                # Timeout occurred - list_sheets is taking too long
                print(f"Warning: list_sheets() timed out after 5 seconds for ID uniqueness check - continuing without check")
                all_sheets = []  # Continue with empty list - IDs are still unique based on timestamp
            elif exception_result[0]:
                # Exception occurred
                print(f"Warning: Could not list sheets for ID uniqueness check: {exception_result[0]}")
                all_sheets = []  # Continue with empty list
            else:
                # Success
                all_sheets = sheets_result[0] if isinstance(sheets_result[0], list) else []
        except Exception as e:
            print(f"Warning: Could not list sheets for ID uniqueness check: {e}")
            all_sheets = []  # Continue with empty list - IDs are still unique based on timestamp
        
        max_attempts = 100
        
        for attempt in range(max_attempts):
            # Generate a unique ID based on timestamp and random number
            timestamp = int(time.time() * 1000)  # Use milliseconds for better uniqueness
            random_part = random.randint(10000, 99999)  # Larger random range
            candidate_id = f"T{timestamp}{random_part}"
            
            # Check if this ID already exists in any sheet
            id_exists = False
            for sheet in all_sheets:
                try:
                    row_idx = self._find_row_by_primary_id(sheet, candidate_id, 'Primary ID')
                    if row_idx:
                        id_exists = True
                        break
                except:
                    # If sheet doesn't have Primary ID column yet, that's okay
                    pass
            
            if not id_exists:
                return candidate_id
        
        # Fallback: if we couldn't generate a unique ID after max_attempts, use a more complex one
        timestamp = int(time.time() * 1000000)  # Microseconds
        random_part = random.randint(100000, 999999)
        return f"T{timestamp}{random_part}"
    
    def needs_migration(self) -> bool:
        """
        Check if migration is needed (i.e., there are turtles with ID but no Primary ID).
        
        Returns:
            True if migration is needed, False otherwise
        """
        try:
            all_sheets = self.list_sheets()
            if not all_sheets:
                return False  # No sheets available, nothing to migrate
            
            # Note: "Inital" is a typo in the actual sheet name
            backup_sheet_names = ['Backup (Initial State)', 'Backup (Inital State)', 'Backup']
            sheets_to_check = [s for s in all_sheets if s not in backup_sheet_names]
            
            for sheet_name in sheets_to_check:
                try:
                    # Ensure Primary ID column exists
                    self._ensure_primary_id_column(sheet_name)
                    
                    # Get all rows from the sheet
                    escaped_sheet = self._escape_sheet_name(sheet_name)
                    range_name = f"{escaped_sheet}!A:Z"
                    result = self.service.spreadsheets().values().get(
                        spreadsheetId=self.spreadsheet_id,
                        range=range_name
                    ).execute()
                    
                    values = result.get('values', [])
                    if len(values) < 2:
                        continue  # No data rows
                    
                    # Get headers
                    headers = values[0]
                    column_indices = {}
                    for idx, header in enumerate(headers):
                        if header and header.strip():
                            column_indices[header.strip()] = idx
                    
                    # Find Primary ID and ID column indices
                    primary_id_col_idx = column_indices.get('Primary ID')
                    id_col_idx = column_indices.get('ID')
                    
                    if primary_id_col_idx is None or id_col_idx is None:
                        continue
                    
                    # Check if any row has ID but no Primary ID
                    for row_data in values[1:]:
                        if not row_data or len(row_data) == 0:
                            continue
                        
                        has_id = id_col_idx < len(row_data) and row_data[id_col_idx] and str(row_data[id_col_idx]).strip()
                        has_primary_id = primary_id_col_idx < len(row_data) and row_data[primary_id_col_idx] and str(row_data[primary_id_col_idx]).strip()
                        
                        if has_id and not has_primary_id:
                            return True  # Migration needed
                            
                except Exception as e:
                    print(f"Warning: Error checking migration status for sheet '{sheet_name}': {e}")
                    continue
            
            return False  # No migration needed
            
        except Exception as e:
            print(f"Error checking if migration is needed: {e}")
            import traceback
            traceback.print_exc()
            return False  # Assume no migration needed on error
    
    def migrate_ids_to_primary_ids(self) -> Dict[str, int]:
        """
        Migrate all turtles from using "ID" column to "Primary ID" column.
        Generates new unique Primary IDs for all turtles that don't have one.
        Uses batch updates to avoid rate limiting.
        
        Returns:
            Dictionary with sheet names as keys and number of migrated turtles as values
        """
        import time
        
        migration_stats = {}
        
        try:
            all_sheets = self.list_sheets()
            
            # Exclude backup sheets explicitly (note: "Inital" is a typo in the actual sheet name)
            backup_sheet_names = ['Backup (Initial State)', 'Backup (Inital State)', 'Backup']
            sheets_to_migrate = [s for s in all_sheets if s not in backup_sheet_names]
            
            print(f"🔄 Starting migration for {len(sheets_to_migrate)} sheets (excluding backup sheets)")
            
            for sheet_name in sheets_to_migrate:
                try:
                    # Ensure Primary ID column exists
                    self._ensure_primary_id_column(sheet_name)
                    
                    # Get all rows from the sheet
                    escaped_sheet = self._escape_sheet_name(sheet_name)
                    range_name = f"{escaped_sheet}!A:Z"
                    result = self.service.spreadsheets().values().get(
                        spreadsheetId=self.spreadsheet_id,
                        range=range_name
                    ).execute()
                    
                    values = result.get('values', [])
                    if len(values) < 2:
                        continue  # No data rows
                    
                    # Get headers
                    headers = values[0]
                    column_indices = {}
                    for idx, header in enumerate(headers):
                        if header and header.strip():
                            column_indices[header.strip()] = idx
                    
                    # Find Primary ID and ID column indices
                    primary_id_col_idx = column_indices.get('Primary ID')
                    id_col_idx = column_indices.get('ID')
                    
                    if primary_id_col_idx is None:
                        print(f"Warning: 'Primary ID' column not found in sheet '{sheet_name}'")
                        continue
                    
                    if id_col_idx is None:
                        print(f"Info: 'ID' column not found in sheet '{sheet_name}', skipping migration")
                        continue
                    
                    # Collect rows that need migration (have ID but no Primary ID, OR have Primary ID but it's empty)
                    rows_to_update = []
                    for row_idx, row_data in enumerate(values[1:], start=2):
                        if not row_data or len(row_data) == 0:
                            continue
                        
                        # Check if row has ID but no Primary ID (or Primary ID is empty)
                        has_id = id_col_idx < len(row_data) and row_data[id_col_idx] and str(row_data[id_col_idx]).strip()
                        has_primary_id = primary_id_col_idx < len(row_data) and row_data[primary_id_col_idx] and str(row_data[primary_id_col_idx]).strip()
                        
                        # Migrate if: has ID but no Primary ID, OR Primary ID exists but is empty
                        if has_id and not has_primary_id:
                            # Generate new unique Primary ID
                            new_primary_id = self.generate_primary_id()
                            
                            # Store the row index and new Primary ID for batch update
                            rows_to_update.append((row_idx, new_primary_id))
                            print(f"  Row {row_idx}: Will migrate ID '{row_data[id_col_idx]}' -> Primary ID '{new_primary_id}'")
                    
                    if not rows_to_update:
                        migration_stats[sheet_name] = 0
                        continue
                    
                    # Batch update using batchUpdate (more efficient than individual updates)
                    # Use batchUpdate with valueInputOption for multiple ranges
                    data = []
                    for row_idx, new_primary_id in rows_to_update:
                        # Update only the Primary ID cell for this row
                        range_name = f"{escaped_sheet}!{self._column_index_to_letter(primary_id_col_idx)}{row_idx}"
                        data.append({
                            'range': range_name,
                            'values': [[str(new_primary_id)]]
                        })
                    
                    # Split into batches of 50 to avoid too large requests
                    batch_size = 50
                    migrated_count = 0
                    
                    for i in range(0, len(data), batch_size):
                        batch = data[i:i+batch_size]
                        body = {
                            'valueInputOption': 'RAW',
                            'data': batch
                        }
                        
                        try:
                            self.service.spreadsheets().values().batchUpdate(
                                spreadsheetId=self.spreadsheet_id,
                                body=body
                            ).execute()
                            migrated_count += len(batch)
                            
                            # Small delay to avoid rate limiting
                            if i + batch_size < len(data):
                                time.sleep(1)  # Wait 1 second between batches
                                
                        except HttpError as e:
                            if e.resp.status == 429:
                                print(f"Rate limit hit for sheet '{sheet_name}', waiting 60 seconds...")
                                time.sleep(60)  # Wait 60 seconds if rate limited
                                # Retry this batch
                                try:
                                    self.service.spreadsheets().values().batchUpdate(
                                        spreadsheetId=self.spreadsheet_id,
                                        body=body
                                    ).execute()
                                    migrated_count += len(batch)
                                except Exception as retry_error:
                                    print(f"Error retrying batch update for sheet '{sheet_name}': {retry_error}")
                            else:
                                print(f"Error updating batch for sheet '{sheet_name}': {e}")
                    
                    migration_stats[sheet_name] = migrated_count
                    print(f"✅ Migrated {migrated_count} turtles in sheet '{sheet_name}' with new unique Primary IDs")
                    
                except Exception as e:
                    print(f"Error migrating IDs in sheet '{sheet_name}': {e}")
                    migration_stats[sheet_name] = 0
                    continue
            
            return migration_stats
            
        except Exception as e:
            print(f"Error in migrate_ids_to_primary_ids: {e}")
            return migration_stats
    
    def _column_index_to_letter(self, col_idx: int) -> str:
        """
        Convert a 0-based column index to Google Sheets column letter (A, B, C, ..., Z, AA, AB, ...)
        
        Args:
            col_idx: 0-based column index
            
        Returns:
            Column letter(s) (e.g., 'A', 'B', 'AA')
        """
        result = ''
        col_idx += 1  # Convert to 1-based
        while col_idx > 0:
            col_idx -= 1
            result = chr(65 + (col_idx % 26)) + result
            col_idx //= 26
        return result

    def _reinitialize_service(self):
        """
        Reinitialize the Google Sheets service (useful for SSL connection issues).
        """
        try:
            credentials_file = os.environ.get('GOOGLE_SHEETS_CREDENTIALS_PATH')
            if not credentials_file:
                raise ValueError("Google Sheets credentials path not found")
            
            credentials = service_account.Credentials.from_service_account_file(
                credentials_file,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            self.service = build('sheets', 'v4', credentials=credentials)
            print("✅ Google Sheets service reinitialized")
        except Exception as e:
            print(f"⚠️ Failed to reinitialize Google Sheets service: {e}")
            raise

    def list_sheets(self) -> List[str]:
        """
        List all available sheets (tabs) in the spreadsheet.
        Excludes "Backup (Initial State)" sheet as it's read-only backup.
        Includes retry logic for SSL connection issues.
        
        Returns:
            List of sheet names (excluding backup sheets)
        """
        max_retries = 2
        for attempt in range(max_retries):
            try:
                if not hasattr(self, 'service') or self.service is None:
                    print("Error: Google Sheets service not initialized")
                    return []
                
                spreadsheet = self.service.spreadsheets().get(
                    spreadsheetId=self.spreadsheet_id
                ).execute()
                
                sheets = spreadsheet.get('sheets', [])
                all_sheets = [sheet['properties']['title'] for sheet in sheets]
                
                # Exclude backup sheets (note: "Inital" is a typo in the actual sheet name)
                backup_sheet_names = ['Backup (Initial State)', 'Backup (Inital State)', 'Backup']
                filtered_sheets = [s for s in all_sheets if s not in backup_sheet_names]
                
                return filtered_sheets
            except HttpError as e:
                print(f"Error listing sheets (HttpError): {e}")
                if attempt < max_retries - 1:
                    print(f"Retrying... (attempt {attempt + 1}/{max_retries})")
                    try:
                        self._reinitialize_service()
                        import time
                        time.sleep(0.5)  # Brief delay before retry
                        continue
                    except:
                        pass
                import traceback
                traceback.print_exc()
                return []
            except (ssl.SSLError, AttributeError) as e:
                # SSL errors or connection issues - try reinitializing
                error_msg = str(e)
                if 'SSL' in error_msg or 'BIO' in error_msg or 'NoneType' in error_msg:
                    print(f"SSL/Connection error listing sheets: {e}")
                    if attempt < max_retries - 1:
                        print(f"Reinitializing service and retrying... (attempt {attempt + 1}/{max_retries})")
                        try:
                            self._reinitialize_service()
                            import time
                            time.sleep(0.5)  # Brief delay before retry
                            continue
                        except Exception as reinit_error:
                            print(f"Failed to reinitialize: {reinit_error}")
                    else:
                        # Only print traceback on final failure
                        print(f"⚠️ Failed to list sheets after {max_retries} attempts")
                        return []
                else:
                    raise
            except Exception as e:
                error_msg = str(e)
                if 'SSL' in error_msg or 'BIO' in error_msg or 'NoneType' in error_msg or 'read' in error_msg:
                    # Treat as SSL/connection error
                    print(f"Connection error listing sheets: {e}")
                    if attempt < max_retries - 1:
                        print(f"Reinitializing service and retrying... (attempt {attempt + 1}/{max_retries})")
                        try:
                            self._reinitialize_service()
                            import time
                            time.sleep(0.5)  # Brief delay before retry
                            continue
                        except Exception as reinit_error:
                            print(f"Failed to reinitialize: {reinit_error}")
                    else:
                        # Only print traceback on final failure
                        print(f"⚠️ Failed to list sheets after {max_retries} attempts")
                        return []
                else:
                    print(f"Error listing sheets (Exception): {e}")
                    # Only print traceback for unexpected errors
                    if attempt >= max_retries - 1:
                        import traceback
                        traceback.print_exc()
                    return []
        
        # If we get here, all retries failed
        return []

    def create_sheet_with_headers(self, sheet_name: str) -> bool:
        """
        Create a new sheet (tab) with all required headers.
        
        Args:
            sheet_name: Name of the new sheet to create
            
        Returns:
            True if successful, False otherwise
        """
        # Skip backup sheets - they should not be created
        backup_sheet_names = ['Backup (Initial State)', 'Backup (Inital State)', 'Backup']
        if sheet_name in backup_sheet_names:
            print(f"ERROR: Cannot create backup sheet '{sheet_name}'")
            return False
        
        try:
            # Check if sheet already exists
            existing_sheets = self.list_sheets()
            if sheet_name in existing_sheets:
                print(f"Sheet '{sheet_name}' already exists")
                return True  # Sheet exists, that's fine
            
            # Get all column headers from COLUMN_MAPPING
            headers = list(self.COLUMN_MAPPING.keys())
            
            # Create the new sheet
            requests = [{
                'addSheet': {
                    'properties': {
                        'title': sheet_name
                    }
                }
            }]
            
            body = {'requests': requests}
            response = self.service.spreadsheets().batchUpdate(
                spreadsheetId=self.spreadsheet_id,
                body=body
            ).execute()
            
            # Get the new sheet ID
            sheet_id = None
            for reply in response.get('replies', []):
                if 'addSheet' in reply:
                    sheet_id = reply['addSheet']['properties']['sheetId']
                    break
            
            if sheet_id is None:
                print(f"ERROR: Could not get sheet ID for new sheet '{sheet_name}'")
                return False
            
            # Write headers to row 1
            escaped_sheet = self._escape_sheet_name(sheet_name)
            range_name = f"{escaped_sheet}!1:1"
            body = {
                'values': [headers]
            }
            self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                body=body
            ).execute()
            
            print(f"✅ Created new sheet '{sheet_name}' with {len(headers)} headers")
            return True
            
        except HttpError as e:
            print(f"Error creating sheet '{sheet_name}': {e}")
            return False
        except Exception as e:
            print(f"Error creating sheet '{sheet_name}': {e}")
            import traceback
            traceback.print_exc()
            return False
