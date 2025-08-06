# tests/test_astar.py
import unittest
import numpy as np
import sys
import os

# Add the backend directory to the Python path to allow for module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from routing.astar import astar_path

class TestAstarPathfinding(unittest.TestCase):
    """Unit tests for the A* pathfinding algorithm."""

    def setUp(self):
        """
        Set up a consistent test grid before each test.
        Grid visualization:
        0 0 0 0 0
        0 1 1 1 0
        0 1 0 0 S
        0 0 0 1 0
        E 1 1 1 0
        (S=Start, E=End, 1=Land, 0=Water)
        """
        self.grid = np.array([
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 1, 0, 0, 0], # Start is at (2, 4) in some tests
            [0, 0, 0, 1, 0],
            [0, 1, 1, 1, 0]  # End is at (4, 0) in some tests
        ])
        
        # A second grid for testing no-path scenarios
        self.disconnected_grid = np.array([
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [1, 1, 1, 1, 1], # A wall separating top and bottom
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0]
        ])

    def test_simple_path(self):
        """Test a simple, direct path with no obstacles."""
        start = (0, 0)
        end = (0, 4)
        path = astar_path(self.grid, start, end)
        self.assertIsNotNone(path)
        self.assertEqual(path[0], start)
        self.assertEqual(path[-1], end)
        self.assertEqual(len(path), 5) # Should be a straight line

    def test_path_around_obstacle(self):
        """Test if the algorithm correctly navigates around a land mass."""
        start = (2, 4)
        end = (4, 0)
        path = astar_path(self.grid, start, end)
        self.assertIsNotNone(path, "A path should be found around the obstacle.")
        self.assertEqual(path[0], start)
        self.assertEqual(path[-1], end)
        # The path must not contain any land cells (value of 1)
        for r, c in path:
            self.assertEqual(self.grid[r, c], 0, f"Path incorrectly goes through land at {(r, c)}")
        # A correct path would be longer than the direct manhattan distance
        self.assertTrue(len(path) > 6)

    def test_no_path_found(self):
        """Test a scenario where the start and end are separated by land."""
        start = (0, 0)
        end = (4, 4)
        path = astar_path(self.disconnected_grid, start, end)
        self.assertIsNone(path, "Should return None when no path exists.")

    def test_start_on_land(self):
        """Test that no path is returned if the start point is on land."""
        start = (1, 1) # This is a land cell
        end = (0, 4)
        path = astar_path(self.grid, start, end)
        # The algorithm should not even start, but robustly, we check for None
        # A* implementations might differ; some might find a path if start is added to closed list.
        # Assuming the standard where you can't start on an obstacle.
        self.assertIsNone(path, "Should return None if the start node is an obstacle.")

    def test_end_on_land(self):
        """Test that no path is returned if the end point is on land."""
        start = (0, 0)
        end = (4, 1) # This is a land cell
        path = astar_path(self.grid, start, end)
        self.assertIsNone(path, "Should return None if the end node is an obstacle.")

    def test_identical_start_and_end(self):
        """Test that a path from a point to itself is just that point."""
        start = (0, 0)
        end = (0, 0)
        path = astar_path(self.grid, start, end)
        self.assertIsNotNone(path)
        self.assertEqual(path, [start])

    def test_out_of_bounds(self):
        """Test that providing out-of-bounds coordinates doesn't break the algorithm."""
        start = (0, 0)
        end = (10, 10) # Out of bounds
        # We expect this to fail gracefully, returning no path
        path = astar_path(self.grid, start, end)
        self.assertIsNone(path, "Should return None for an out-of-bounds destination.")

if __name__ == '__main__':
    unittest.main()
