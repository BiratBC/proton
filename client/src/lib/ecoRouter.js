// Calculate straight-line distance between two coordinates in kilometers
function getDistanceKM(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Builds an on-the-fly mesh grid network out of the 50 scattered nodes
export function findEcoRoute(nodes, startId, endId, safetyPriority = 3) {
  const graph = {};

  // 1. Build adjacency list: connect nodes that are within 1.2km of each other
  nodes.forEach((node) => {
    graph[node.id] = [];
    nodes.forEach((neighbor) => {
      if (node.id === neighbor.id) return;
      const distance = getDistanceKM(node.lat, node.lng, neighbor.lat, neighbor.lng);
      
      if (distance < 1.2) { 
        // Read safety index (Default to 1 if not calculated yet)
        const risk = node.exposureRiskScore || 1;
        
        // Dynamic Cost Matrix Calculation
        const environmentalWeight = 1 + (risk / 10) * safetyPriority;
        const totalWeightedCost = distance * environmentalWeight;

        graph[node.id].push({ 
          id: neighbor.id, 
          cost: totalWeightedCost, 
          actualDistance: distance 
        });
      }
    });
  });

  // 2. Standard Dijkstra / A* Graph traversal implementation
  const distances = {};
  const previous = {};
  const queue = new Set();

  nodes.forEach((node) => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    queue.add(node.id);
  });
  distances[startId] = 0;

  while (queue.size > 0) {
    // Find the node in the queue with the lowest calculated weight cost
    let minNodeId = null;
    queue.forEach((id) => {
      if (minNodeId === null || distances[id] < distances[minNodeId]) {
        minNodeId = id;
      }
    });

    if (minNodeId === endId || distances[minNodeId] === Infinity) break;
    queue.delete(minNodeId);

    const neighbors = graph[minNodeId] || [];
    for (let neighbor of neighbors) {
      if (!queue.has(neighbor.id)) continue;
      const alternativePathCost = distances[minNodeId] + neighbor.cost;

      if (alternativePathCost < distances[neighbor.id]) {
        distances[neighbor.id] = alternativePathCost;
        previous[neighbor.id] = minNodeId;
      }
    }
  }

  // 3. Reconstruct path array back from destination target coordinates
  const pathCoordinates = [];
  let currentId = endId;
  
  if (previous[currentId] || currentId === startId) {
    while (currentId !== null) {
      const nodeData = nodes.find((n) => n.id === currentId);
      if (nodeData) {
        pathCoordinates.unshift([nodeData.lat, nodeData.lng]);
      }
      currentId = previous[currentId];
    }
  }

  return pathCoordinates; // Returns clean array array points format: [[lat, lng], [lat, lng]]
}