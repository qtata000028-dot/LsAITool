type TreeNode = Record<string, any>;

export const defaultProps = {
  children: 'children',
  label: 'name',
  value: 'id',
  isLeaf: 'leaf',
};

export function handleTree<T extends TreeNode>(nodes: T[], idKey = 'id', parentKey = 'parentId', childrenKey = 'children') {
  const nodeMap = new Map<any, T & { [key: string]: any }>();
  const roots: Array<T & { [key: string]: any }> = [];

  nodes.forEach((item) => {
    nodeMap.set(item[idKey], { ...item, [childrenKey]: [] });
  });

  nodeMap.forEach((item) => {
    const parentId = item[parentKey];
    if (parentId && nodeMap.has(parentId)) {
      const parent = nodeMap.get(parentId);
      parent?.[childrenKey].push(item);
    } else {
      roots.push(item);
    }
  });

  return roots;
}
