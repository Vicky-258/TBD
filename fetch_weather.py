import requests
import json
from datetime import datetime
import os

# Let's define constants for things that don't change.
# It makes the code cleaner and easier to modify later!
API_BASE_URL = "https://marine-api.open-meteo.com/v1/marine"
LOG_DIRECTORY = "weather_logs"

def fetch_and_store_marine_weather(lat: float, lon: float):
    """
    Fetches marine weather data and stores it in a timestamped JSON file.

    Now with awesome error handling and type hints!
    """
    url = (
        f"{API_BASE_URL}?latitude={lat}&longitude={lon}"
        "&hourly=wave_height,wind_wave_height,sea_surface_temperature"
    )

    try:
        # Step 1: Make the request with a timeout. Always a good idea!
        response = requests.get(url, timeout=10) # 10-second timeout

        # Step 2: This little line is magic. It will automatically raise an error
        # for bad responses (like 404 Not Found or 500 Server Error).
        response.raise_for_status()

        # Step 3: Try to parse the JSON.
        data = response.json()

    # This except block is our safety net for a whole class of problems:
    # network issues, timeouts, DNS errors, etc.
    except requests.exceptions.RequestException as e:
        print(f"🚨 A network-level error occurred: {e}")
        return # Stop execution if we can't get the data

    # This handles the case where the API gives us back something
    # that isn't valid JSON.
    except json.JSONDecodeError:
        print("🚨 Failed to decode JSON from the response. The API might be down.")
        return

    # Your original error check is still useful for API-specific errors!
    if "error" in data:
        print(f"🚨 API Error: {data.get('reason', 'Unknown error')}")
        return

    # --- If we get here, everything is golden! ---

    os.makedirs(LOG_DIRECTORY, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(LOG_DIRECTORY, f"weather_{timestamp}.json")

    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"✅ Weather data saved to: {file_path}")

# Let's try it with the new and improved function!
# The coordinates are for Chennai, by the way. Good choice!
fetch_and_store_marine_weather(13.08, 80.27)