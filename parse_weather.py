import json
import os
from glob import glob


def get_latest_weather_file(folder="weather_logs"):
    files = glob(os.path.join(folder, "weather_*.json"))
    if not files:
        raise FileNotFoundError("❌ No weather data found.")
    latest_file = max(files, key=os.path.getctime)
    return latest_file

def summarize_weather(path):
    with open(path, "r") as f:
        data = json.load(f)

    hourly = data.get("hourly", {})
    time = hourly.get("time", [])
    wave_height = hourly.get("wave_height", [])
    wind_wave_height = hourly.get("wind_wave_height", [])
    sea_temp = hourly.get("sea_surface_temperature", [])

    if not (time and wave_height):
        return "⚠️ Weather data is incomplete."

    # Analyze latest data (you can also average or trend-analyze later)
    last_index = len(time) - 1
    latest_time = time[last_index]
    latest_wave = wave_height[last_index]
    latest_wind_wave = wind_wave_height[last_index] if wind_wave_height else None
    latest_temp = sea_temp[last_index] if sea_temp else None

    summary = f"🌊 At {latest_time}, the waves are about {latest_wave:.1f} meters high."
    if latest_wind_wave:
        summary += f" Wind-driven waves are about {latest_wind_wave:.1f} meters."
    if latest_temp:
        summary += f" Sea surface temperature is around {latest_temp:.1f}°C."
    summary += " Stay safe out there, captain."

    return summary

# 🎯 Usage
try:
    latest = get_latest_weather_file()
    summary = summarize_weather(latest)
    print(summary)
except Exception as e:
    print("Error:", e)
