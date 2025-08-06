# backend/routing/exporter.py
import csv

def export_to_gpx(route_points, filename="route.gpx"):
    """
    Exports a list of route points to a GPX (GPS Exchange Format) file.
    GPX is a common XML format for GPS track data.

    Args:
        route_points (list): A list of [lat, lng] coordinate pairs.
        filename (str): The name of the file to save.
    
    Returns:
        str: The GPX content as a string.
    """
    gpx_header = """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ShipRouter" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Ship Route</name>
  </metadata>
  <trk>
    <name>Calculated Ship Route</name>
    <trkseg>
"""
    
    gpx_footer = """    </trkseg>
  </trk>
</gpx>
"""
    
    track_points = ""
    for lat, lng in route_points:
        track_points += f'      <trkpt lat="{lat}" lon="{lng}"></trkpt>\n'
        
    gpx_content = gpx_header + track_points + gpx_footer
    
    # In a real application, you might save this to a file:
    # with open(filename, 'w') as f:
    #     f.write(gpx_content)
        
    return gpx_content

def export_to_kml(route_points, filename="route.kml"):
    """
    Exports a list of route points to a KML (Keyhole Markup Language) file.
    KML is used for displaying geographic data in Google Earth and Google Maps.

    Args:
        route_points (list): A list of [lat, lng] coordinate pairs.
        filename (str): The name of the file to save.
    
    Returns:
        str: The KML content as a string.
    """
    kml_header = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Ship Route</name>
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0078f0</color> <!-- AABBGGRR format: blue -->
        <width>4</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>Calculated Route</name>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
"""
    
    kml_footer = """        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>
"""
    
    # KML coordinates are in the format: lng,lat,altitude (altitude is optional)
    coordinates = " ".join([f"{lng},{lat},0" for lat, lng in route_points])
    
    kml_content = kml_header + coordinates + kml_footer
    
    # In a real application, you might save this to a file:
    # with open(filename, 'w') as f:
    #     f.write(kml_content)
        
    return kml_content

def export_to_csv(route_points, filename="route.csv"):
    """
    Exports a list of route points to a simple CSV file.

    Args:
        route_points (list): A list of [lat, lng] coordinate pairs.
        filename (str): The name of the file to save.
        
    Returns:
        str: The path to the created file (for demonstration).
             In a web app, you'd return the content or a download link.
    """
    # This function demonstrates saving directly to a file.
    try:
        with open(filename, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['latitude', 'longitude']) # Header
            writer.writerows(route_points)
        return f"Successfully saved route to {filename}"
    except IOError as e:
        return f"Error saving file: {e}"

# --- Example Usage (for testing) ---
if __name__ == '__main__':
    # A sample route from near Panama to near Gibraltar
    sample_route = [
        [9.5, -79.5],
        [15.0, -75.0],
        [25.0, -65.0],
        [35.0, -45.0],
        [36.0, -25.0],
        [36.0, -6.0]
    ]
    
    print("--- Generating GPX ---")
    gpx_data = export_to_gpx(sample_route)
    print(gpx_data)
    
    print("\n--- Generating KML ---")
    kml_data = export_to_kml(sample_route)
    print(kml_data)
    
    print("\n--- Generating CSV ---")
    # This will create a file named 'route.csv' in the same directory
    csv_status = export_to_csv(sample_route) 
    print(csv_status)
