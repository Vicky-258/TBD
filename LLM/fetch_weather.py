from fastapi.responses import JSONResponse
import os
import json
from glob import glob

def get_latest_weather_file(folder="weather_logs"):
    files = glob(os.path.join(folder, "weather_*.json"))
    if not files:
        raise FileNotFoundError("No weather data found.")
    return max(files, key=os.path.getctime)

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

    i = len(time) - 1
    summary = f"🌊 At {time[i]}, waves are {wave_height[i]:.1f}m."
    if wind_wave_height:
        summary += f" Wind waves: {wind_wave_height[i]:.1f}m."
    if sea_temp:
        summary += f" Sea temp: {sea_temp[i]:.1f}°C."
    summary += " Stay safe, captain!"
    return summary

