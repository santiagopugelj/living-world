const test = require("node:test");
const assert = require("node:assert/strict");

const { isColliding, moveEntityWithCollision } = require("../script.js");

test("detects overlapping rectangles", () => {
  const entity = { x: 0, y: 0, width: 10, height: 10 };
  const obstacle = { x: 5, y: 5, width: 10, height: 10 };

  assert.equal(isColliding(entity, obstacle), true);
});

test("prevents movement through solid obstacles", () => {
  const world = {
    width: 100,
    height: 100,
    entities: [{ type: "tree", x: 40, y: 20, width: 20, height: 20 }]
  };

  const player = { type: "player", x: 0, y: 20, width: 10, height: 10 };

  moveEntityWithCollision(player, 50, 20, world);

  assert.equal(player.x, 0);
  assert.equal(player.y, 20);
});
