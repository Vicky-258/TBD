# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
from PIL import Image
from io import BytesIO
from datetime import datetime

# Import routing and weather modules
from routing.astar import astar_path
from routing.land_grid import LandGrid
from routing.route_utils import snap_to_grid, format_route, find_nearest_water, load_grid_from_file
from weather.fetcher import fetch_and_store_marine_weather

# --- App Initialization ---
app = Flask(__name__)
CORS(app) 

# --- Load Data from file ---
print("Loading land/water grid...")
grid_data = load_grid_from_file(resolution='high') 

if grid_data is not None:
    land_grid = LandGrid(grid_data)
    print("Grid loaded successfully.")
else:
    print("FATAL: Could not load grid data. The server cannot perform routing.")
    land_grid = None

# --- API Endpoints ---
@app.route('/api/route', methods=['POST'])
def get_route():
    if not land_grid:
        return jsonify({"error": "Land grid data not loaded."}), 500
    data = request.get_json()
    start_coords = data['start']
    end_coords = data['end']
    
    start_node = find_nearest_water(snap_to_grid(start_coords, land_grid.grid.shape), land_grid.grid)
    end_node = find_nearest_water(snap_to_grid(end_coords, land_grid.grid.shape), land_grid.grid)
    
    if not start_node or not end_node:
        return jsonify({"error": "Could not find a water entry point."}), 400
        
    path_nodes = astar_path(land_grid.grid, start_node, end_node)
    if not path_nodes:
        return jsonify({"error": "No valid sea route could be found."}), 404
        
    route_lat_lng = format_route(path_nodes, land_grid.grid.shape)
    return jsonify({"path": route_lat_lng})

@app.route('/api/weather', methods=['GET'])
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    weather_data = fetch_and_store_marine_weather(float(lat), float(lon))
    if weather_data:
        return jsonify(weather_data)
    return jsonify({"error": "Failed to fetch weather."}), 502

@app.route('/api/save_image', methods=['POST'])
def save_image():
    data = request.get_json()
    try:
        map_img = Image.open(BytesIO(base64.b64decode(data['map_image'].split(',')[1])))
        ui_img = Image.open(BytesIO(base64.b64decode(data['ui_image'].split(',')[1])))
        
        combined_img = Image.new('RGB', map_img.size, color='white')
        combined_img.paste(map_img, (0, 0))
        combined_img.paste(ui_img, (20, 20), mask=ui_img)

        # Save to user's home directory for better reliability in a packaged app
        exports_dir = os.path.join(os.path.expanduser("~"), "ShipRouterExports")
        os.makedirs(exports_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"ship_route_{timestamp}.jpg"
        save_path = os.path.join(exports_dir, filename)
        
        combined_img.save(save_path, "JPEG", quality=90)
        return jsonify({"message": f"Image saved to {exports_dir}"})
    except Exception as e:
        return jsonify({"error": f"Error saving image: {e}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
