const world = {
  entities: []
};

const canvas = document.getElementById("worldCanvas");
const context = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  createWorld();
}

function createWorld() {
  world.entities = [];

  for (let i = 0; i < 20; i += 1) {
    world.entities.push({
      type: "tree",
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      width: 20,
      height: 20
    });
  }

  for (let i = 0; i < 10; i += 1) {
    world.entities.push({
      type: "rock",
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      width: 16,
      height: 16
    });
  }
}

function drawEntity(entity) {
  if (entity.type === "tree") {
    context.fillStyle = "#3f7d20";
    context.fillRect(entity.x, entity.y, entity.width, entity.height);
    context.fillStyle = "#2d5a16";
    context.fillRect(entity.x + 6, entity.y + 6, 8, 8);
  } else if (entity.type === "rock") {
    context.fillStyle = "#7a7a7a";
    context.fillRect(entity.x, entity.y, entity.width, entity.height);
  }
}

function renderWorld() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#7fbf7f";
  context.fillRect(0, 0, canvas.width, canvas.height);

  world.entities.forEach(drawEntity);
}

function gameLoop() {
  renderWorld();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("load", () => {
  resizeCanvas();
  gameLoop();
});
