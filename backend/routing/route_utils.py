# backend/routing/route_utils.py
import numpy as np
import json
import os
import sys

def get_base_path():
    """ Get the base path for data files, handling PyInstaller's temporary folder. """
    if getattr(sys, 'frozen', False):
        # If the application is run as a bundle, the base path is the temp folder where PyInstaller extracts everything.
        return sys._MEIPASS
    else:
        # If running as a normal script, the base path is the backend folder.
        return os.path.dirname(os.path.abspath(__file__))

def load_grid_from_file(resolution='medium'):
    """ Loads a land/water grid from a specified JSON file. """
    base_path = get_base_path()
    # The 'data' folder is at the root of the bundle when packaged.
    data_path = os.path.join(base_path, 'data')
    filename = f"land_water_grid_{resolution}.json"
    filepath = os.path.join(data_path, filename)
    
    print(f"Attempting to load grid from: {filepath}")
    
    try:
        with open(filepath, 'r') as f:
            grid_data = json.load(f)
        return np.array(grid_data, dtype=np.uint8)
    except FileNotFoundError:
        print(f"ERROR: Grid file not found at {filepath}.")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while loading the grid: {e}")
        return None

def snap_to_grid(coords, grid_shape):
    """ Snaps latitude/longitude coordinates to the nearest grid cell index. """
    lat, lng = coords
    rows, cols = grid_shape
    row = int(((lat * -1) + 90) / 180 * (rows - 1))
    col = int((lng + 180) / 360 * (cols - 1))
    row = max(0, min(rows - 1, row))
    col = max(0, min(cols - 1, col))
    return (row, col)

def find_nearest_water(start_node, grid, max_radius=10):
    """ If the start_node is land, searches for the nearest water node. """
    rows, cols = grid.shape
    r, c = start_node
    if grid[r, c] == 0:
        return start_node
    for i in range(1, max_radius + 1):
        for dc in range(-i, i + 1):
            for dr_sign in [-1, 1]:
                nr, nc = r + i * dr_sign, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr, nc] == 0:
                    return (nr, nc)
        for dr in range(-i + 1, i):
            for dc_sign in [-1, 1]:
                nr, nc = r + dr, c + i * dc_sign
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr, nc] == 0:
                    return (nr, nc)
    return None

def format_route(path_nodes, grid_shape):
    """ Converts a path of grid nodes back to latitude/longitude coordinates. """
    rows, cols = grid_shape
    route_lat_lng = []
    if not path_nodes:
        return []
    for node in path_nodes:
        row, col = node
        lat = ((row / (rows - 1)) * 180 - 90) * -1
        lng = (col / (cols - 1)) * 360 - 180
        route_lat_lng.append([round(lat, 6), round(lng, 6)])
    return route_lat_lng
