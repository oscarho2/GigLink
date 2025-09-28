
function buildLocationTree(locations) {
  const locationTree = { value: 'All', label: 'All', children: [] };

  for (const location of locations) {
    const parts = location.label.split(', ').map(p => p.trim());
    let currentNode = locationTree;
    let currentPath = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath.push(part);
      let childNode = currentNode.children.find(c => c.label === part);

      if (!childNode) {
        childNode = { value: currentPath.join(', '), label: part, children: [] };
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    }

    currentNode.count = location.count;
  }

  return locationTree;
}

module.exports = { buildLocationTree };
