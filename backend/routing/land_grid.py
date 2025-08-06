# backend/routing/land_grid.py

class LandGrid:
    """A simple class to hold the land/water grid and provide helper methods."""
    def __init__(self, grid_data):
        """
        Initializes the LandGrid.
        
        Args:
            grid_data (np.array): The 2D numpy array representing the world.
        """
        self.grid = grid_data
        print(f"LandGrid initialized with shape: {self.grid.shape}")

    def is_land(self, node):
        """
        Checks if a given grid node is land.
        
        Args:
            node (tuple): The (row, col) of the grid cell.
            
        Returns:
            bool: True if the node is land, False otherwise.
        """
        row, col = node
        if 0 <= row < self.grid.shape[0] and 0 <= col < self.grid.shape[1]:
            return self.grid[row, col] == 1
        return True # Treat out-of-bounds as an obstacle
