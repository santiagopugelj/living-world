const test = require("node:test");
const assert = require("node:assert/strict");

const { createEntityAtFreePosition, getResourceAtWorldPosition, isColliding } = require("../script.js");

test("creates a tree placement that does not overlap existing objects", () => {
  const world = {
    width: 1000,
    height: 1000,
    entities: [{ type: "tree", x: 100, y: 100, width: 56, height: 56 }]
  };

  const tree = createEntityAtFreePosition("tree", 56, 56, world);

  assert.equal(tree.type, "tree");
  assert.equal(isColliding(tree, world.entities[0]), false);
});

test("treats food plants as valid gatherable resources", () => {
  const world = {
    width: 1000,
    height: 1000,
    entities: [{ type: "foodPlant", x: 10, y: 10, width: 20, height: 20 }]
  };

  const resource = getResourceAtWorldPosition(15, 15, world);

  assert.equal(resource.type, "foodPlant");
});
