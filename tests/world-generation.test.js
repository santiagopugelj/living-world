const test = require("node:test");
const assert = require("node:assert/strict");

const { createEntityAtFreePosition, isColliding } = require("../script.js");

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
