# backend/routing/astar.py
import heapq
import numpy as np

def heuristic(a, b):
    """
    Calculate the Manhattan distance heuristic for A*.
    It's a fast and simple heuristic for grid-based pathfinding.
    """
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def astar_path(grid, start, end):
    """
    Finds the shortest path from start to end on a grid using the A* algorithm.
    
    Args:
        grid (np.array): A 2D numpy array where 0 represents water and 1 represents land.
        start (tuple): The starting coordinates (row, col).
        end (tuple): The ending coordinates (row, col).
        
    Returns:
        list: A list of tuples representing the path from start to end, or None if no path is found.
    """
    neighbors = [(0, 1), (0, -1), (1, 0), (-1, 0), # Cardinal
                 (1, 1), (1, -1), (-1, 1), (-1, -1)] # Diagonal

    close_set = set()
    came_from = {}
    gscore = {start: 0}
    fscore = {start: heuristic(start, end)}
    
    # Priority queue (min-heap)
    oheap = []
    heapq.heappush(oheap, (fscore[start], start))
    
    while oheap:
        current = heapq.heappop(oheap)[1]

        if current == end:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            return path[::-1] # Return reversed path

        close_set.add(current)
        
        for i, j in neighbors:
            neighbor = current[0] + i, current[1] + j
            
            # Check grid boundaries
            if not (0 <= neighbor[0] < grid.shape[0] and 0 <= neighbor[1] < grid.shape[1]):
                continue

            # Check if the neighbor is land (obstacle)
            if grid[neighbor[0]][neighbor[1]] == 1:
                continue

            # Calculate movement cost (diagonal moves cost more)
            move_cost = 1.414 if i != 0 and j != 0 else 1.0
            tentative_g_score = gscore[current] + move_cost
            
            if neighbor in close_set and tentative_g_score >= gscore.get(neighbor, 0):
                continue
                
            if tentative_g_score < gscore.get(neighbor, 0) or neighbor not in [i[1] for i in oheap]:
                came_from[neighbor] = current
                gscore[neighbor] = tentative_g_score
                fscore[neighbor] = tentative_g_score + heuristic(neighbor, end)
                heapq.heappush(oheap, (fscore[neighbor], neighbor))
                
    return None # No path found
