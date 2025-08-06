# backend/routing/fuel_model.py
import numpy as np

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points
    on the earth (specified in decimal degrees).
    
    Returns distance in nautical miles.
    """
    # Radius of the Earth in kilometers
    R = 6371.0
    
    # Convert latitude and longitude from degrees to radians
    lat1_rad = np.radians(lat1)
    lon1_rad = np.radians(lon1)
    lat2_rad = np.radians(lat2)
    lon2_rad = np.radians(lon2)
    
    # Haversine formula
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    
    a = np.sin(dlat / 2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon / 2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    
    distance_km = R * c
    
    # Convert km to nautical miles
    return distance_km * 0.539957

def calculate_total_distance(route_points):
    """
    Calculates the total distance of a route composed of multiple points.
    
    Args:
        route_points (list): A list of [lat, lng] coordinate pairs.
        
    Returns:
        float: The total distance in nautical miles.
    """
    total_distance = 0
    for i in range(len(route_points) - 1):
        start_point = route_points[i]
        end_point = route_points[i+1]
        total_distance += haversine_distance(start_point[0], start_point[1], end_point[0], end_point[1])
    return total_distance

def predict_fuel_and_time(route_points, ship_specs):
    """
    Predicts the fuel consumption and travel time for a given route and ship.
    
    This is a simple physics-based model. It could be replaced by a more
    complex machine learning model loaded from a .pkl file.

    Args:
        route_points (list): A list of [lat, lng] coordinate pairs for the route.
        ship_specs (dict): A dictionary containing ship specifications, e.g.,
                           {'speed_knots': 15, 'fuel_per_nm': 0.15}.
                           
    Returns:
        dict: A dictionary containing the calculated distance (nm),
              time (hours), and fuel (tonnes).
    """
    if not route_points or len(route_points) < 2:
        return {"distance_nm": 0, "time_hours": 0, "fuel_tonnes": 0}
        
    distance_nm = calculate_total_distance(route_points)
    
    speed_knots = ship_specs.get('speed_knots', 15) # Default to 15 knots
    fuel_per_nm = ship_specs.get('fuel_per_nm', 0.15) # Default fuel consumption
    
    if speed_knots == 0:
        time_hours = float('inf')
    else:
        time_hours = distance_nm / speed_knots
        
    # Assuming fuel_per_nm is in kg, convert total fuel to tonnes
    fuel_tonnes = (distance_nm * fuel_per_nm) / 1000
    
    return {
        "distance_nm": distance_nm,
        "time_hours": time_hours,
        "fuel_tonnes": fuel_tonnes
    }

# --- Example Usage (for testing) ---
if __name__ == '__main__':
    # Sample ship specifications
    panamax_carrier_specs = {
        "type": "Bulk Carrier (Panamax)",
        "speed_knots": 14,
        "fuel_per_nm": 0.15 # in kg per nautical mile
    }
    
    # A sample route from near Panama to near Gibraltar
    sample_route = [
        [9.5, -79.5],
        [15.0, -75.0],
        [25.0, -65.0],
        [35.0, -45.0],
        [36.0, -25.0],
        [36.0, -6.0]
    ]
    
    print(f"Calculating metrics for: {panamax_carrier_specs['type']}")
    
    metrics = predict_fuel_and_time(sample_route, panamax_carrier_specs)
    
    print(f"  - Total Distance: {metrics['distance_nm']:.2f} NM")
    print(f"  - Estimated Time: {metrics['time_hours']:.2f} hours (~{(metrics['time_hours']/24):.1f} days)")
    print(f"  - Estimated Fuel: {metrics['fuel_tonnes']:.2f} tonnes")
