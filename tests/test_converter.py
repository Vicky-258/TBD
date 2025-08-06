# tests/test_converter.py
import unittest
import numpy as np
import sys
import os

# Add the backend directory to the Python path to allow for module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from routing.route_utils import snap_to_grid, format_route

class TestCoordinateConversion(unittest.TestCase):
    """Unit tests for the coordinate conversion utility functions."""

    def setUp(self):
        """Set up consistent grid dimensions for all tests."""
        self.grid_shape = (180, 360) # A standard 1-degree resolution grid

    def test_snap_to_grid(self):
        """Test the snapping of lat/lng coordinates to grid indices."""
        # Test case 1: A point in the NE quadrant (Tokyo)
        coords1 = [35.68, 139.76]
        expected_node1 = (54, 319) # (row, col)
        self.assertEqual(snap_to_grid(coords1, self.grid_shape), expected_node1)

        # Test case 2: A point in the SW quadrant (Rio de Janeiro)
        coords2 = [-22.90, -43.17]
        expected_node2 = (112, 136)
        self.assertEqual(snap_to_grid(coords2, self.grid_shape), expected_node2)

        # Test case 3: The North Pole (edge case)
        coords3 = [90, 0]
        expected_node3 = (0, 180)
        self.assertEqual(snap_to_grid(coords3, self.grid_shape), expected_node3)

        # Test case 4: The South Pole (edge case)
        coords4 = [-90, 180]
        expected_node4 = (179, 359)
        self.assertEqual(snap_to_grid(coords4, self.grid_shape), expected_node4)
        
        # Test case 5: Greenwich Meridian
        coords5 = [51.5, 0]
        expected_node5 = (38, 180)
        self.assertEqual(snap_to_grid(coords5, self.grid_shape), expected_node5)

    def test_format_route(self):
        """Test the formatting of a grid path back to lat/lng coordinates."""
        # A simple path of grid nodes
        path_nodes = [(54, 319), (112, 136)] # Tokyo and Rio nodes from the test above
        
        # Expected coordinates (may have minor floating point differences)
        expected_coords1 = [35.642458, 139.5]
        expected_coords2 = [-22.849162, -43.5]
        
        formatted_path = format_route(path_nodes, self.grid_shape)
        
        self.assertIsInstance(formatted_path, list)
        self.assertEqual(len(formatted_path), 2)
        
        # Check if the formatted coordinates are close to the expected values
        np.testing.assert_almost_equal(formatted_path[0], expected_coords1, decimal=2)
        np.testing.assert_almost_equal(formatted_path[1], expected_coords2, decimal=2)

    def test_conversion_reversibility(self):
        """
        Test if snapping and then formatting a coordinate returns a value
        close to the original. Note that some precision will be lost.
        """
        original_coords = [40.71, -74.00] # New York City
        
        # Step 1: Snap to grid
        grid_node = snap_to_grid(original_coords, self.grid_shape)
        
        # Step 2: Format back to coordinates
        # The path is just a single node
        reversed_coords_list = format_route([grid_node], self.grid_shape)
        reversed_coords = reversed_coords_list[0]
        
        # The reversed coordinates will not be exact, but they should be very close.
        # The error depends on the grid resolution. For a 180x360 grid, error is ~1 degree.
        self.assertAlmostEqual(original_coords[0], reversed_coords[0], delta=1.0)
        self.assertAlmostEqual(original_coords[1], reversed_coords[1], delta=1.0)
        
    def test_empty_path_formatting(self):
        """Test that formatting an empty path returns an empty list."""
        empty_path = []
        formatted_path = format_route(empty_path, self.grid_shape)
        self.assertEqual(formatted_path, [])

if __name__ == '__main__':
    unittest.main()
