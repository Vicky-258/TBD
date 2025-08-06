# backend/generate_grid.py
import json
import numpy as np
from shapely.geometry import shape, Point
import os
from tqdm import tqdm # Import tqdm for the progress bar

# --- Configuration ---
# Define the resolutions you want to generate. (rows, cols)
# Added a new "production" resolution for maximum accuracy.
RESOLUTIONS = {
    "low": (20, 40),
    "medium": (90, 180),
    "high": (180, 360),
    "ultra": (360, 720),
    "production": (720, 1440) # NEW: Highest accuracy grid
}

# --- Path Correction ---
# Get the absolute path of the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Define file paths relative to this script's location
GEOJSON_INPUT_PATH = os.path.join(script_dir, "data", "world_map.geojson")
GRID_OUTPUT_DIR = os.path.join(script_dir, "data")

def load_geojson_shapes(filepath):
    """Loads a GeoJSON file and converts its features to Shapely shapes."""
    try:
        with open(filepath, 'r') as f:
            geojson_data = json.load(f)
        
        shapes = []
        for feature in geojson_data["features"]:
            # Create a shape from the feature's geometry
            geom = shape(feature["geometry"])
            
            # UPDATED: Clean the geometry to fix any invalid shapes like self-intersections.
            # The buffer(0) trick is a standard way to repair invalid polygons.
            if not geom.is_valid:
                geom = geom.buffer(0)
            
            shapes.append(geom)

        print(f"Successfully loaded and cleaned {len(shapes)} shapes from {filepath}")
        return shapes
    except FileNotFoundError:
        print(f"ERROR: GeoJSON file not found at {filepath}")
        return []
    except Exception as e:
        print(f"An error occurred loading GeoJSON: {e}")
        return []

def create_grid(land_shapes, grid_shape):
    """
    Creates a land/water grid by checking if the center of each grid cell
    falls within any of the provided land shapes.
    """
    rows, cols = grid_shape
    grid = np.zeros(grid_shape, dtype=np.uint8)
    
    print(f"Generating {rows}x{cols} grid. This may take a very long time...")

    # Use tqdm to create a progress bar for the outer loop
    for r in tqdm(range(rows), desc=f"Processing {rows}x{cols} grid"):
        for c in range(cols):
            # Convert grid cell (r, c) to geographic coordinates (lat, lng)
            lat = ((r / (rows - 1)) * 180 - 90) * -1
            lng = (c / (cols - 1)) * 360 - 180
            
            point = Point(lng, lat) # Shapely uses (x, y) which corresponds to (lng, lat)
            
            # Check if the point is on any landmass
            for land in land_shapes:
                if land.contains(point):
                    grid[r, c] = 1 # Mark as land
                    break # No need to check other shapes
            
    return grid

def save_grid_to_json(grid, resolution_name):
    """Saves the generated numpy grid to a JSON file."""
    output_filename = f"land_water_grid_{resolution_name}.json"
    output_path = os.path.join(GRID_OUTPUT_DIR, output_filename)
    
    try:
        print(f"Saving {resolution_name} grid...")
        with open(output_path, 'w') as f:
            json.dump(grid.tolist(), f)
        print(f"Successfully saved grid to {output_path}")
    except Exception as e:
        print(f"ERROR: Could not save grid to {output_path}: {e}")


if __name__ == "__main__":
    print("--- Starting Grid Generation Process ---")
    
    # Ensure the output directory exists
    if not os.path.exists(GRID_OUTPUT_DIR):
        os.makedirs(GRID_OUTPUT_DIR)
        
    land_polygons = load_geojson_shapes(GEOJSON_INPUT_PATH)
    
    if land_polygons:
        for name, shape in RESOLUTIONS.items():
            generated_grid = create_grid(land_polygons, shape)
            save_grid_to_json(generated_grid, name)
    else:
        print("Could not load land shapes. Aborting grid generation.")
        
    print("--- Grid Generation Complete ---")
