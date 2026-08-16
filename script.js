const GATHER_RANGE = 48;
const GATHER_TIME = 2;
const AXE_COST = 3;
const AXE_GATHER_TIME_MODIFIER = 0.6;
const RESOURCE_REGENERATION_TIME = 10 * 60 * 1000;
const SAVE_KEY = "living-world-save";
const AXE_TYPES = {
  NONE: "none",
  BASIC: "basic"
};

const world = {
  width: 2000,
  height: 2000,
  camera: {
    x: 0,
    y: 0
  },
  entities: [],
  wood: 0,
  stone: 0,
  food: 0,
  gathering: null,
  dialogueNpc: null,
  regeneratingResources: []
};

const canvas = typeof document !== "undefined" ? document.getElementById("worldCanvas") : null;
const context = canvas ? canvas.getContext("2d") : null;
const woodCounter = typeof document !== "undefined" ? document.getElementById("woodCounter") : null;
const stoneCounter = typeof document !== "undefined" ? document.getElementById("stoneCounter") : null;
const foodCounter = typeof document !== "undefined" ? document.getElementById("foodCounter") : null;
const toolStateLabel = typeof document !== "undefined" ? document.getElementById("toolState") : null;
const craftAxeButton = typeof document !== "undefined" ? document.getElementById("craftAxeButton") : null;
const inventoryButton = typeof document !== "undefined" ? document.getElementById("inventoryButton") : null;
const inventoryPanel = typeof document !== "undefined" ? document.getElementById("inventoryPanel") : null;
const inventoryWood = typeof document !== "undefined" ? document.getElementById("inventoryWood") : null;
const inventoryStone = typeof document !== "undefined" ? document.getElementById("inventoryStone") : null;
const inventoryFood = typeof document !== "undefined" ? document.getElementById("inventoryFood") : null;
const inventoryAxe = typeof document !== "undefined" ? document.getElementById("inventoryAxe") : null;
const dialogueBox = typeof document !== "undefined" ? document.getElementById("dialogueBox") : null;
const dialogueName = typeof document !== "undefined" ? document.getElementById("dialogueName") : null;
const dialogueText = typeof document !== "undefined" ? document.getElementById("dialogueText") : null;
const closeDialogueButton = typeof document !== "undefined" ? document.getElementById("closeDialogueButton") : null;
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

function getResourceAtWorldPosition(x, y, targetWorld = world) {
  return targetWorld.entities.find(
    (entity) =>
      (entity.type === "tree" || entity.type === "rock" || entity.type === "foodPlant") &&
      x >= entity.x &&
      x <= entity.x + entity.width &&
      y >= entity.y &&
      y <= entity.y + entity.height
  );
}

function getNpcAtWorldPosition(x, y) {
  return world.entities.find(
    (entity) =>
      entity.type === "npc" &&
      x >= entity.x &&
      x <= entity.x + entity.width &&
      y >= entity.y &&
      y <= entity.y + entity.height
  );
}

function openDialogue(npc) {
  world.dialogueNpc = npc;

  if (!dialogueBox || !dialogueName || !dialogueText) {
    return;
  }

  dialogueName.textContent = npc.name;
  dialogueText.textContent = npc.dialogue;
  dialogueBox.hidden = false;
}

function closeDialogue() {
  world.dialogueNpc = null;

  if (dialogueBox) {
    dialogueBox.hidden = true;
  }
}

function startGathering(resource) {
  if (world.gathering) {
    return;
  }

  world.gathering = {
    resource,
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

  const resource = world.gathering.resource;
  world.entities = world.entities.filter((entity) => entity !== resource);
  world.regeneratingResources.push({
    type: resource.type,
    x: resource.x,
    y: resource.y,
    width: resource.width,
    height: resource.height,
    gatheredAt: Date.now()
  });

  if (resource.type === "tree") {
    world.wood += 1;
  } else if (resource.type === "rock") {
    world.stone += 1;
  } else if (resource.type === "foodPlant") {
    world.food += 1;
  }

  updateResourceCounters();
  world.gathering = null;
  saveGame();
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

  const resource = world.gathering.resource;
  const dx = player.x + player.width / 2 - (resource.x + resource.width / 2);
  const dy = player.y + player.height / 2 - (resource.y + resource.height / 2);
  const distance = Math.hypot(dx, dy);

  if (distance > GATHER_RANGE) {
    cancelGathering();
    return;
  }

  world.gathering.elapsedTime += deltaTime;
  const currentGatherTime = resource.type === "tree" ? getCurrentGatherTime(player) : GATHER_TIME;

  if (world.gathering.elapsedTime >= currentGatherTime) {
    completeGathering();
  }
}

function playerHasBasicAxe(player) {
  return player?.axe === AXE_TYPES.BASIC;
}

function getCurrentGatherTime(player) {
  return playerHasBasicAxe(player) ? GATHER_TIME * AXE_GATHER_TIME_MODIFIER : GATHER_TIME;
}

function updateToolState() {
  if (!toolStateLabel) {
    return;
  }

  const player = getPlayer();
  const toolLabel = playerHasBasicAxe(player) ? "Basic Axe" : "None";

  toolStateLabel.textContent = `Tool: ${toolLabel}`;
}

function updateCraftAxeButton() {
  if (!craftAxeButton) {
    return;
  }

  const player = getPlayer();
  const hasAxe = playerHasBasicAxe(player);

  craftAxeButton.disabled = hasAxe || world.wood < AXE_COST;
  craftAxeButton.textContent = hasAxe ? "Axe Crafted" : `Craft Axe (${AXE_COST} wood)`;
}

function craftAxe() {
  const player = getPlayer();
  if (!player || playerHasBasicAxe(player) || world.wood < AXE_COST) {
    return;
  }

  world.wood -= AXE_COST;
  player.axe = AXE_TYPES.BASIC;
  updateResourceCounters();
  saveGame();
}

function updateInventory() {
  if (inventoryWood) {
    inventoryWood.textContent = `Wood: ${world.wood}`;
  }

  if (inventoryStone) {
    inventoryStone.textContent = `Stone: ${world.stone}`;
  }

  if (inventoryFood) {
    inventoryFood.textContent = `Food: ${world.food}`;
  }

  if (inventoryAxe) {
    inventoryAxe.hidden = !playerHasBasicAxe(getPlayer());
  }
}

function toggleInventory() {
  if (!inventoryPanel) {
    return;
  }

  inventoryPanel.hidden = !inventoryPanel.hidden;

  if (inventoryButton) {
    inventoryButton.setAttribute("aria-expanded", String(!inventoryPanel.hidden));
  }
}

function saveGame() {
  if (typeof localStorage === "undefined") {
    return;
  }

  const player = getPlayer();
  if (!player) {
    return;
  }

  const resources = world.entities
    .filter((entity) => entity.type === "tree" || entity.type === "rock" || entity.type === "foodPlant")
    .map(({ type, x, y, width, height }) => ({ type, x, y, width, height }));

  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        player: { x: player.x, y: player.y, axe: player.axe },
        wood: world.wood,
        stone: world.stone,
        food: world.food,
        resources,
        regeneratingResources: world.regeneratingResources
      })
    );
  } catch (error) {
    // Saving is optional when browser storage is unavailable.
  }
}

function updateResourceRegeneration() {
  const now = Date.now();
  const readyResources = world.regeneratingResources.filter(
    (resource) => now - resource.gatheredAt >= RESOURCE_REGENERATION_TIME
  );

  if (readyResources.length === 0) {
    return;
  }

  world.entities.push(...readyResources.map(({ type, x, y, width, height }) => ({ type, x, y, width, height })));
  world.regeneratingResources = world.regeneratingResources.filter(
    (resource) => now - resource.gatheredAt < RESOURCE_REGENERATION_TIME
  );
  saveGame();
}

function loadGame() {
  if (typeof localStorage === "undefined") {
    return false;
  }

  try {
    const savedGame = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!savedGame || !savedGame.player || !Array.isArray(savedGame.resources)) {
      return false;
    }

    createWorld();

    const player = getPlayer();
    player.x = savedGame.player.x;
    player.y = savedGame.player.y;
    player.axe = savedGame.player.axe === AXE_TYPES.BASIC ? AXE_TYPES.BASIC : AXE_TYPES.NONE;
    world.wood = savedGame.wood || 0;
    world.stone = savedGame.stone || 0;
    world.food = savedGame.food || 0;
    world.regeneratingResources = Array.isArray(savedGame.regeneratingResources)
      ? savedGame.regeneratingResources
      : [];
    world.entities = world.entities
      .filter((entity) => entity.type === "player" || entity.type === "npc")
      .concat(savedGame.resources);
    updateResourceRegeneration();
    getNpcEntities().forEach(chooseTreeDestination);
    updateResourceCounters();
    return true;
  } catch (error) {
    return false;
  }
}

function updateResourceCounters() {
  if (woodCounter) {
    woodCounter.textContent = `Wood: ${world.wood}`;
  }

  if (stoneCounter) {
    stoneCounter.textContent = `Stone: ${world.stone}`;
  }

  if (foodCounter) {
    foodCounter.textContent = `Food: ${world.food}`;
  }

  updateToolState();
  updateCraftAxeButton();
  updateInventory();
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
    if (
      candidate === entity ||
      (candidate.type !== "tree" && candidate.type !== "rock" && candidate.type !== "foodPlant")
    ) {
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

  const width = Math.max(800, window.innerWidth, document.documentElement.clientWidth, document.body.clientWidth);
  const height = Math.max(600, window.innerHeight, document.documentElement.clientHeight, document.body.clientHeight);

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  lastFrameTime = 0;
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
  world.stone = 0;
  world.food = 0;
  world.gathering = null;
  world.dialogueNpc = null;
  world.regeneratingResources = [];

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

  for (let i = 0; i < 12; i += 1) {
    const foodPlantSize = randomBetween(18 - 2, 18 + 2);
    const foodPlant = createEntityAtFreePosition("foodPlant", foodPlantSize, foodPlantSize, world);
    world.entities.push(foodPlant);
  }

  world.entities.push({
    type: "player",
    x: world.width / 2 - 12,
    y: world.height / 2 - 12,
    width: 24,
    height: 24,
    speed: 220,
    axe: AXE_TYPES.NONE
  });

  const firstNpc = {
    type: "npc",
    x: Math.random() * world.width,
    y: Math.random() * world.height,
    width: 20,
    height: 20,
    speed: 120,
    targetX: 0,
    targetY: 0,
    waitTime: Math.random() * 2,
    stuckTime: 0,
    color: "#f2d53c",
    name: "Luna",
    dialogue: "Hola, ¿cómo estás?"
  };

  chooseTreeDestination(firstNpc);
  world.entities.push(firstNpc);

  const secondNpc = {
    type: "npc",
    x: Math.random() * world.width,
    y: Math.random() * world.height,
    width: 20,
    height: 20,
    speed: 120,
    targetX: 0,
    targetY: 0,
    waitTime: Math.random() * 2,
    stuckTime: 0,
    color: "#d14cf2",
    name: "Mateo",
    dialogue: "Qué lindo día en el bosque."
  };

  chooseTreeDestination(secondNpc);
  world.entities.push(secondNpc);
  updateResourceCounters();
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
    saveGame();
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

function getNpcEntities() {
  return world.entities.filter((entity) => entity.type === "npc");
}

function chooseTreeDestination(npc) {
  const trees = world.entities.filter((entity) => entity.type === "tree");
  const otherNpcTargets = getNpcEntities()
    .filter((other) => other !== npc)
    .map((other) => ({ x: other.targetX, y: other.targetY }));

  if (trees.length === 0) {
    npc.targetX = Math.random() * (world.width - npc.width);
    npc.targetY = Math.random() * (world.height - npc.height);
    return;
  }

  const candidateTrees = trees.filter((tree) =>
    !otherNpcTargets.some((target) => target.x === tree.x && target.y === tree.y)
  );
  const distanceTrees = (treeList) =>
    treeList
      .map((tree) => ({ tree, distance: Math.hypot(tree.x - npc.x, tree.y - npc.y) }))
      .sort((a, b) => a.distance - b.distance);

  const availableTrees = candidateTrees.length > 0 ? candidateTrees : trees;
  const nearest = distanceTrees(availableTrees).slice(0, Math.min(3, availableTrees.length));
  const choice = nearest[Math.floor(Math.random() * nearest.length)].tree;

  npc.targetX = choice.x;
  npc.targetY = choice.y;
}

function updateNpc(deltaTime) {
  const npcs = world.entities.filter((entity) => entity.type === "npc");

  npcs.forEach((npc) => {
    if (npc === world.dialogueNpc) {
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
  });
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
  } else if (entity.type === "foodPlant") {
    context.fillStyle = "#5fae4d";
    context.fillRect(screenX, screenY, entity.width, entity.height);
    context.fillStyle = "#5a1d1d";
    context.fillRect(
      screenX + Math.max(2, entity.width * 0.2),
      screenY + Math.max(2, entity.height * 0.2),
      Math.max(3, entity.width * 0.18),
      Math.max(3, entity.height * 0.18)
    );
    context.fillRect(
      screenX + Math.max(2, entity.width * 0.62),
      screenY + Math.max(2, entity.height * 0.62),
      Math.max(3, entity.width * 0.18),
      Math.max(3, entity.height * 0.18)
    );
  } else if (entity.type === "player") {
    context.fillStyle = "#2f5cff";
    context.fillRect(screenX, screenY, entity.width, entity.height);
  } else if (entity.type === "npc") {
    context.fillStyle = entity.color || "#f2d53c";
    context.fillRect(screenX, screenY, entity.width, entity.height);
  }
}

function drawGatheringProgress() {
  if (!context || !canvas || !world.gathering) {
    return;
  }

  const resource = world.gathering.resource;
  const screenX = resource.x - world.camera.x;
  const screenY = resource.y - world.camera.y;
  const player = getPlayer();
  const currentGatherTime = resource.type === "tree" ? getCurrentGatherTime(player) : GATHER_TIME;
  const progress = Math.min(world.gathering.elapsedTime / currentGatherTime, 1);
  const barWidth = resource.width;
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
  updateResourceRegeneration();
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
  } else if (key === "i" && !event.repeat) {
    toggleInventory();
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
  const npc = getNpcAtWorldPosition(clickX, clickY);

  if (npc) {
    openDialogue(npc);
    return;
  }

  const resource = getResourceAtWorldPosition(clickX, clickY);

  if (!resource) {
    return;
  }

  const player = getPlayer();
  const dx = player.x + player.width / 2 - (resource.x + resource.width / 2);
  const dy = player.y + player.height / 2 - (resource.y + resource.height / 2);
  const distance = Math.hypot(dx, dy);

  if (distance <= GATHER_RANGE) {
    startGathering(resource);
  }
}

function handleCanvasMouseUp(event) {
  if (event.button !== 0 || !world.gathering) {
    return;
  }

  cancelGathering();
}

if (typeof window !== "undefined") {
  const initializeGame = () => {
    resizeCanvas();
    if (!loadGame()) {
      createWorld();
      saveGame();
    }

    if (canvas) {
      canvas.addEventListener("mousedown", handleCanvasMouseDown);
    }

    if (craftAxeButton) {
      craftAxeButton.addEventListener("click", craftAxe);
    }

    if (inventoryButton) {
      inventoryButton.addEventListener("click", toggleInventory);
    }

    if (closeDialogueButton) {
      closeDialogueButton.addEventListener("click", closeDialogue);
    }

    gameLoop(0);
  };

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("mouseup", handleCanvasMouseUp);

  if (document.readyState === "complete") {
    initializeGame();
  } else {
    window.addEventListener("load", initializeGame);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createEntityAtFreePosition,
    getNpcAtWorldPosition,
    getResourceAtWorldPosition,
    isColliding,
    moveEntityWithCollision,
    world,
    openDialogue,
    closeDialogue,
    saveGame,
    loadGame,
    updateResourceRegeneration,
    updateInventory,
    toggleInventory
  };
}
