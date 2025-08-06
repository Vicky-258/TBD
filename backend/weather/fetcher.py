# backend/weather/fetcher.py
import requests
import json
from datetime import datetime
import os

# Constants for the API and log directory
API_BASE_URL = "https://marine-api.open-meteo.com/v1/marine"
LOG_DIRECTORY = "weather_logs"

def fetch_and_store_marine_weather(lat: float, lon: float):
    """
    Fetches marine weather data for a given coordinate and stores it in a 
    timestamped JSON file. Includes error handling and type hints.
    """
    url = (
        f"{API_BASE_URL}?latitude={lat}&longitude={lon}"
        "&hourly=wave_height,wind_wave_height,sea_surface_temperature"
    )

    try:
        # Step 1: Make the request with a 10-second timeout.
        response = requests.get(url, timeout=10)
        
        # Step 2: Raise an error for bad responses (e.g., 404, 500).
        response.raise_for_status()

        # Step 3: Parse the JSON data from the response.
        data = response.json()

    except requests.exceptions.RequestException as e:
        print(f"A network-level error occurred: {e}")
        return None # Return None on failure

    except json.JSONDecodeError:
        print("Failed to decode JSON from the response. The API might be down.")
        return None

    # Check for API-specific errors returned in the JSON payload.
    if "error" in data:
        print(f"API Error: {data.get('reason', 'Unknown error')}")
        return None

    # --- If successful, save the data to a file ---
    
    # Create the log directory if it doesn't exist.
    os.makedirs(LOG_DIRECTORY, exist_ok=True)
    
    # Create a timestamped filename.
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(LOG_DIRECTORY, f"weather_{timestamp}.json")

    # Write the data to the file.
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Weather data saved to: {file_path}")
    return data # Return the data on success

# Example of how to run this function directly for testing.
if __name__ == '__main__':
    # Coordinates for Chennai, India
    fetch_and_store_marine_weather(13.08, 80.27)
