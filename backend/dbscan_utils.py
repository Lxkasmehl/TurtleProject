import numpy as np
from scipy.spatial.distance import cdist
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors
from typing import Tuple, List, Optional

def run_initial_dbscan(vlad_vectors: np.ndarray, eps: float, min_samples: int) -> np.ndarray:
    """
        Performs DBSCAN clustering on all VLAD vectors to determine initial Site IDs.

        Args:
            vlad_vectors: The (N, D) array of all VLAD vectors.
            eps: The maximum distance between two samples for one to be considered as
                 in the neighborhood of the other (the clustering radius).
            min_samples: The number of samples (or total weight) in a neighborhood
                         for a point to be considered as a core point.

        Returns:
            A 1D numpy array of cluster labels. Noise points are labeled as -1.
    """
    print(f"Running initial DBSCAN: eps={eps}, min_samples={min_samples}")
    dbscan = DBSCAN(eps=eps, min_samples=min_samples)

    labels = dbscan.fit_predict(vlad_vectors)

    n_sites = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = np.sum(labels == -1)

    print(f"DBSCAN complete.  Found {n_sites} sites with {n_noise} noise.")
    return labels

def initialize_neighbor_search(database_vectors: np.ndarray) -> NearestNeighbors:
    # Use brute-force for simplicity or 'auto' for efficiency on large datasets.
    # We fit it to the entire database of VLAD vectors once.
    nn_model = NearestNeighbors(algorithm='auto', metric='euclidean')
    nn_model.fit(database_vectors)
    return nn_model

def find_neighbors_in_radius(nn_model: NearestNeighbors, query_vector: np.ndarray, eps: float, n_results: int = 5) -> Tuple[List[int], np.ndarray]:
    distances_in_radius, indices_in_radius = nn_model.radius_neighbors(
        query_vector.reshape(1, -1), # Ensure the query is 2D (1, D)
        radius=eps,
        return_distance=True,
        sort_results=True # Sort by distance
    )

    #extract and limit results to the top N
    # We only care about the first query point ([0])

    # Exclude the query image itself if it's in the database (distance of 0)
    # The sort_results=True ensures the closest matches are first

    # Filter out the indices that correspond to the query itself (distance near 0)
    valid_indices = indices_in_radius[0][distances_in_radius[0] > 1e-6]
    valid_distances = distances_in_radius[0][distances_in_radius[0] > 1e-6]

    # Limit to the top N results (e.g., 3 to 5 matches)
    top_indices = valid_indices[:n_results]
    top_distances = valid_distances[:n_results]

    return top_indices.tolist(), top_distances

def brute_force_filtered_search(query_vector: np.ndarray, subset_vectors: np.ndarray,
                                subset_indices: np.ndarray, n_results: int = 5) -> Tuple[List[int], np.ndarray]:
    if subset_vectors.shape[0] == 0:
        return [], np.array([])

        # 1. Calculate the Euclidean distance from the query to every vector in the subset.
        # cdist is highly optimized and much faster than manual Python loops.
    distances = cdist(query_vector.reshape(1, -1), subset_vectors, metric='euclidean').flatten()

    # 2. Find the indices that sort the distances (closest match first).
    sorted_indices_in_subset = np.argsort(distances)

    # 3. Take the top N results.
    # We slice to ensure we only get up to the maximum number of available results.
    top_n_subset_indices = sorted_indices_in_subset[:n_results]

    # 4. Map the subset indices back to the original global database indices.
    global_indices = subset_indices[top_n_subset_indices]

    # 5. Get the actual distances for the top results.
    top_distances = distances[top_n_subset_indices]

    return global_indices.tolist(), top_distances