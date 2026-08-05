const world = {
  width: 2000,
  height: 2000,
  camera: {
    x: 0,
    y: 0
  },
  entities: []
};

const canvas = document.getElementById("worldCanvas");
const context = canvas.getContext("2d");
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

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  lastFrameTime = 0;
  createWorld();
}

function createWorld() {
  world.entities = [];

  for (let i = 0; i < 20; i += 1) {
    world.entities.push({
      type: "tree",
      x: Math.random() * world.width,
      y: Math.random() * world.height,
      width: 20,
      height: 20
    });
  }

  for (let i = 0; i < 10; i += 1) {
    world.entities.push({
      type: "rock",
      x: Math.random() * world.width,
      y: Math.random() * world.height,
      width: 16,
      height: 16
    });
  }

  world.entities.push({
    type: "player",
    x: world.width / 2 - 12,
    y: world.height / 2 - 12,
    width: 24,
    height: 24,
    speed: 220
  });
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

    player.x += moveX * player.speed * deltaTime;
    player.y += moveY * player.speed * deltaTime;
  }

  player.x = clamp(player.x, 0, world.width - player.width);
  player.y = clamp(player.y, 0, world.height - player.height);
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

function drawEntity(entity) {
  const screenX = entity.x - world.camera.x;
  const screenY = entity.y - world.camera.y;

  if (entity.type === "tree") {
    context.fillStyle = "#3f7d20";
    context.fillRect(screenX, screenY, entity.width, entity.height);
    context.fillStyle = "#2d5a16";
    context.fillRect(screenX + 6, screenY + 6, 8, 8);
  } else if (entity.type === "rock") {
    context.fillStyle = "#7a7a7a";
    context.fillRect(screenX, screenY, entity.width, entity.height);
  } else if (entity.type === "player") {
    context.fillStyle = "#2f5cff";
    context.fillRect(screenX, screenY, entity.width, entity.height);
  }
}

function renderWorld() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#7fbf7f";
  context.fillRect(0, 0, canvas.width, canvas.height);

  world.entities.forEach(drawEntity);
}

function gameLoop(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const deltaTime = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  updatePlayer(deltaTime);
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

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("load", () => {
  resizeCanvas();
  gameLoop(0);
});
