const GATHER_RANGE = 48;
const GATHER_TIME = 2;

const world = {
  width: 2000,
  height: 2000,
  camera: {
    x: 0,
    y: 0
  },
  entities: [],
  wood: 0,
  gathering: null
};

const canvas = typeof document !== "undefined" ? document.getElementById("worldCanvas") : null;
const context = canvas ? canvas.getContext("2d") : null;
const woodCounter = typeof document !== "undefined" ? document.getElementById("woodCounter") : null;
const input = {
  w: false,
  a: false,
  s: false,
  d: false
};

let lastFrameTime = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function getPlayer() {
  return world.entities.find((entity) => entity.type === "player");
}

function getNearestTreeInRange(player, range = 48) {
  let nearestTree = null;
  let nearestDistance = Infinity;

  world.entities.forEach((entity) => {
    if (entity.type !== "tree") {
      return;
    }

    const dx = player.x + player.width / 2 - (entity.x + entity.width / 2);
    const dy = player.y + player.height / 2 - (entity.y + entity.height / 2);
    const distance = Math.hypot(dx, dy);

    if (distance <= range && distance < nearestDistance) {
      nearestDistance = distance;
      nearestTree = entity;
    }
  });

  return nearestTree;
}

function getTreeAtWorldPosition(x, y) {
  return world.entities.find(
    (entity) => entity.type === "tree" && x >= entity.x && x <= entity.x + entity.width && y >= entity.y && y <= entity.y + entity.height
  );
}

function startGathering(tree) {
  if (world.gathering) {
    return;
  }

  world.gathering = {
    tree,
    elapsedTime: 0
  };
}

function cancelGathering() {
  world.gathering = null;
}

function completeGathering() {
  if (!world.gathering) {
    return;
  }

  const tree = world.gathering.tree;
  world.entities = world.entities.filter((entity) => entity !== tree);
  world.wood += 1;
  updateWoodCounter();
  world.gathering = null;
}

function updateGathering(deltaTime) {
  if (!world.gathering) {
    return;
  }

  const player = getPlayer();

  if (!player) {
    cancelGathering();
    return;
  }

  const tree = world.gathering.tree;
  const dx = player.x + player.width / 2 - (tree.x + tree.width / 2);
  const dy = player.y + player.height / 2 - (tree.y + tree.height / 2);
  const distance = Math.hypot(dx, dy);

  if (distance > GATHER_RANGE) {
    cancelGathering();
    return;
  }

  world.gathering.elapsedTime += deltaTime;

  if (world.gathering.elapsedTime >= GATHER_TIME) {
    completeGathering();
  }
}

function updateWoodCounter() {
  if (woodCounter) {
    woodCounter.textContent = `Wood: ${world.wood}`;
  }
}

function isColliding(entityA, entityB) {
  return (
    entityA.x < entityB.x + entityB.width &&
    entityA.x + entityA.width > entityB.x &&
    entityA.y < entityB.y + entityB.height &&
    entityA.y + entityA.height > entityB.y
  );
}

function isBlockedByObstacle(entity, world) {
  return world.entities.some((candidate) => {
    if (candidate === entity || (candidate.type !== "tree" && candidate.type !== "rock")) {
      return false;
    }

    return isColliding(entity, candidate);
  });
}

function moveEntityWithCollision(entity, targetX, targetY, world) {
  const originalX = entity.x;
  const originalY = entity.y;

  entity.x = clamp(targetX, 0, world.width - entity.width);

  if (isBlockedByObstacle(entity, world)) {
    entity.x = originalX;
  }

  entity.y = clamp(targetY, 0, world.height - entity.height);

  if (isBlockedByObstacle(entity, world)) {
    entity.y = originalY;
  }
}

function resizeCanvas() {
  if (!canvas) {
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  lastFrameTime = 0;
  createWorld();
}

function createEntityAtFreePosition(type, width, height, targetWorld) {
  let x = 0;
  let y = 0;
  let placed = false;

  while (!placed) {
    x = Math.random() * targetWorld.width;
    y = Math.random() * targetWorld.height;

    const candidate = {
      type,
      x,
      y,
      width,
      height
    };

    const overlap = targetWorld.entities.some((entity) => isColliding(candidate, entity));

    if (!overlap) {
      placed = true;
      return candidate;
    }
  }
}

function createWorld() {
  world.entities = [];
  world.wood = 0;
  world.gathering = null;

  for (let i = 0; i < 20; i += 1) {
    const treeSize = randomBetween(56 - 2, 56 + 2);
    const tree = createEntityAtFreePosition("tree", treeSize, treeSize, world);
    world.entities.push(tree);
  }

  for (let i = 0; i < 10; i += 1) {
    const rockSize = randomBetween(24 - 2, 24 + 2);
    const rock = createEntityAtFreePosition("rock", rockSize, rockSize, world);
    world.entities.push(rock);
  }

  world.entities.push({
    type: "player",
    x: world.width / 2 - 12,
    y: world.height / 2 - 12,
    width: 24,
    height: 24,
    speed: 220
  });

  const npc = {
    type: "npc",
    x: Math.random() * world.width,
    y: Math.random() * world.height,
    width: 20,
    height: 20,
    speed: 120,
    targetX: 0,
    targetY: 0,
    waitTime: 0,
    stuckTime: 0
  };

  chooseTreeDestination(npc);
  world.entities.push(npc);
  updateWoodCounter();
}

function updatePlayer(deltaTime) {
  const player = world.entities.find((entity) => entity.type === "player");

  if (!player) {
    return;
  }

  let moveX = 0;
  let moveY = 0;

  if (input.w) {
    moveY -= 1;
  }
  if (input.s) {
    moveY += 1;
  }
  if (input.a) {
    moveX -= 1;
  }
  if (input.d) {
    moveX += 1;
  }

  if (moveX !== 0 || moveY !== 0) {
    const length = Math.hypot(moveX, moveY) || 1;
    moveX /= length;
    moveY /= length;

    moveEntityWithCollision(
      player,
      player.x + moveX * player.speed * deltaTime,
      player.y + moveY * player.speed * deltaTime,
      world
    );
  }
}

function updateCamera() {
  const player = world.entities.find((entity) => entity.type === "player");

  if (!player) {
    return;
  }

  const maxCameraX = Math.max(0, world.width - canvas.width);
  const maxCameraY = Math.max(0, world.height - canvas.height);

  world.camera.x = clamp(player.x + player.width / 2 - canvas.width / 2, 0, maxCameraX);
  world.camera.y = clamp(player.y + player.height / 2 - canvas.height / 2, 0, maxCameraY);
}

function chooseTreeDestination(npc) {
  const trees = world.entities.filter((entity) => entity.type === "tree");

  if (trees.length === 0) {
    npc.targetX = Math.random() * (world.width - npc.width);
    npc.targetY = Math.random() * (world.height - npc.height);
    return;
  }

  const treesWithDistance = trees.map((tree) => ({
    tree,
    distance: Math.hypot(tree.x - npc.x, tree.y - npc.y)
  }));

  treesWithDistance.sort((a, b) => a.distance - b.distance);
  const nearest = treesWithDistance.slice(0, Math.min(3, treesWithDistance.length));
  const choice = nearest[Math.floor(Math.random() * nearest.length)].tree;

  npc.targetX = choice.x;
  npc.targetY = choice.y;
}

function updateNpc(deltaTime) {
  const npc = world.entities.find((entity) => entity.type === "npc");

  if (!npc) {
    return;
  }

  if (npc.waitTime > 0) {
    npc.waitTime -= deltaTime;

    if (npc.waitTime <= 0) {
      npc.waitTime = 0;
      chooseTreeDestination(npc);
      npc.stuckTime = 0;
    }

    return;
  }

  const dx = npc.targetX - npc.x;
  const dy = npc.targetY - npc.y;
  const distanceToTarget = Math.hypot(dx, dy);

  if (distanceToTarget <= 1) {
    npc.x = npc.targetX;
    npc.y = npc.targetY;
    npc.waitTime = 2 + Math.random() * 4;
    npc.stuckTime = 0;
    return;
  }

  const moveDistance = Math.min(distanceToTarget, npc.speed * deltaTime);
  const nextX = npc.x + (dx / distanceToTarget) * moveDistance;
  const nextY = npc.y + (dy / distanceToTarget) * moveDistance;
  const previousX = npc.x;
  const previousY = npc.y;

  moveEntityWithCollision(npc, nextX, nextY, world);

  const actualMovement = Math.hypot(npc.x - previousX, npc.y - previousY);

  if (actualMovement < 0.5) {
    npc.stuckTime += deltaTime;
  } else {
    npc.stuckTime = 0;
  }

  if (npc.stuckTime >= 2) {
    npc.stuckTime = 0;
    npc.waitTime = 0.5 + Math.random();
    chooseTreeDestination(npc);
  }
}

function drawEntity(entity) {
  const screenX = entity.x - world.camera.x;
  const screenY = entity.y - world.camera.y;

  if (entity.type === "tree") {
    context.fillStyle = "#3f7d20";
    context.fillRect(screenX, screenY, entity.width, entity.height);
    context.fillStyle = "#2d5a16";
    context.fillRect(screenX + 6, screenY + 6, 8, 8);
  } else if (entity.type === "rock") {
    context.fillStyle = "#8C8888";
    context.fillRect(screenX, screenY, entity.width, entity.height);
  } else if (entity.type === "player") {
    context.fillStyle = "#2f5cff";
    context.fillRect(screenX, screenY, entity.width, entity.height);
  } else if (entity.type === "npc") {
    context.fillStyle = "#f2d53c";
    context.fillRect(screenX, screenY, entity.width, entity.height);
  }
}

function drawGatheringProgress() {
  if (!context || !canvas || !world.gathering) {
    return;
  }

  const tree = world.gathering.tree;
  const screenX = tree.x - world.camera.x;
  const screenY = tree.y - world.camera.y;
  const progress = Math.min(world.gathering.elapsedTime / GATHER_TIME, 1);
  const barWidth = tree.width;
  const barHeight = 8;
  const barX = screenX;
  const barY = screenY - barHeight - 8;

  context.fillStyle = "rgba(0, 0, 0, 0.5)";
  context.fillRect(barX, barY, barWidth, barHeight);

  context.fillStyle = "#74d14c";
  context.fillRect(barX + 1, barY + 1, Math.max(0, barWidth - 2) * progress, barHeight - 2);

  context.strokeStyle = "#ffffff";
  context.lineWidth = 1;
  context.strokeRect(barX, barY, barWidth, barHeight);
}

function renderWorld() {
  if (!context || !canvas) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#7fbf7f";
  context.fillRect(0, 0, canvas.width, canvas.height);

  world.entities.forEach(drawEntity);
  drawGatheringProgress();
}

function gameLoop(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const deltaTime = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  updatePlayer(deltaTime);
  updateGathering(deltaTime);
  updateNpc(deltaTime);
  updateCamera();
  renderWorld();
  requestAnimationFrame(gameLoop);
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === "w") {
    input.w = true;
    event.preventDefault();
  } else if (key === "a") {
    input.a = true;
    event.preventDefault();
  } else if (key === "s") {
    input.s = true;
    event.preventDefault();
  } else if (key === "d") {
    input.d = true;
    event.preventDefault();
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();

  if (key === "w") {
    input.w = false;
  } else if (key === "a") {
    input.a = false;
  } else if (key === "s") {
    input.s = false;
  } else if (key === "d") {
    input.d = false;
  }
}

function handleCanvasMouseDown(event) {
  if (event.button !== 0 || !canvas || !getPlayer() || world.gathering) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const clickX = ((event.clientX - rect.left) * canvas.width) / rect.width + world.camera.x;
  const clickY = ((event.clientY - rect.top) * canvas.height) / rect.height + world.camera.y;
  const tree = getTreeAtWorldPosition(clickX, clickY);

  if (!tree) {
    return;
  }

  const player = getPlayer();
  const dx = player.x + player.width / 2 - (tree.x + tree.width / 2);
  const dy = player.y + player.height / 2 - (tree.y + tree.height / 2);
  const distance = Math.hypot(dx, dy);

  if (distance <= GATHER_RANGE) {
    startGathering(tree);
  }
}

function handleCanvasMouseUp(event) {
  if (event.button !== 0 || !world.gathering) {
    return;
  }

  cancelGathering();
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("mouseup", handleCanvasMouseUp);
  window.addEventListener("load", () => {
    resizeCanvas();
    if (canvas) {
      canvas.addEventListener("mousedown", handleCanvasMouseDown);
    }
    gameLoop(0);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createEntityAtFreePosition,
    isColliding,
    moveEntityWithCollision,
    gatherWoodFromTree,
    world
  };
}
