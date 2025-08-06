# tests/test_export.py
import unittest
import os
import sys

# Add the backend directory to the Python path to allow for module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from routing.exporter import export_to_gpx, export_to_kml, export_to_csv

class TestRouteExporter(unittest.TestCase):
    """Unit tests for the route exporting utility functions."""

    def setUp(self):
        """Set up a consistent sample route and filenames for testing."""
        self.sample_route = [
            [9.5, -79.5],   # Panama
            [36.0, -6.0]    # Gibraltar
        ]
        self.csv_filename = "test_route.csv"

    def tearDown(self):
        """Clean up any files created during tests."""
        if os.path.exists(self.csv_filename):
            os.remove(self.csv_filename)

    def test_export_to_gpx(self):
        """Test the GPX export functionality."""
        gpx_content = export_to_gpx(self.sample_route)
        
        # Check that content is a non-empty string
        self.assertIsInstance(gpx_content, str)
        self.assertGreater(len(gpx_content), 0)
        
        # Check for essential GPX tags
        self.assertIn('<gpx', gpx_content)
        self.assertIn('</gpx>', gpx_content)
        self.assertIn('<trk>', gpx_content)
        self.assertIn('<trkseg>', gpx_content)
        
        # Check if the coordinates are correctly included
        lat1, lon1 = self.sample_route[0]
        lat2, lon2 = self.sample_route[1]
        self.assertIn(f'<trkpt lat="{lat1}" lon="{lon1}"></trkpt>', gpx_content)
        self.assertIn(f'<trkpt lat="{lat2}" lon="{lon2}"></trkpt>', gpx_content)

    def test_export_to_kml(self):
        """Test the KML export functionality."""
        kml_content = export_to_kml(self.sample_route)
        
        # Check that content is a non-empty string
        self.assertIsInstance(kml_content, str)
        self.assertGreater(len(kml_content), 0)
        
        # Check for essential KML tags
        self.assertIn('<kml', kml_content)
        self.assertIn('</kml>', kml_content)
        self.assertIn('<Document>', kml_content)
        self.assertIn('<Placemark>', kml_content)
        self.assertIn('<LineString>', kml_content)
        self.assertIn('<coordinates>', kml_content)
        
        # Check if the coordinates are correctly formatted (lng,lat,alt)
        lat1, lon1 = self.sample_route[0]
        lat2, lon2 = self.sample_route[1]
        expected_coords_str = f"{lon1},{lat1},0 {lon2},{lat2},0"
        self.assertIn(expected_coords_str, kml_content)

    def test_export_to_csv(self):
        """Test the CSV export functionality."""
        # Execute the function, which should create a file
        status = export_to_csv(self.sample_route, self.csv_filename)
        self.assertTrue(status.startswith("Successfully saved"))
        
        # Check that the file was actually created
        self.assertTrue(os.path.exists(self.csv_filename))
        
        # Read the file and verify its contents
        with open(self.csv_filename, 'r') as f:
            lines = f.readlines()
            
            # Check header
            self.assertEqual(lines[0].strip(), 'latitude,longitude')
            
            # Check number of data rows
            self.assertEqual(len(lines) - 1, len(self.sample_route))
            
            # Check content of the first data row
            lat1, lon1 = self.sample_route[0]
            self.assertEqual(lines[1].strip(), f"{lat1},{lon1}")

if __name__ == '__main__':
    unittest.main()
