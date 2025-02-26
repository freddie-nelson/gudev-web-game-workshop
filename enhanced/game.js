// Part 6: Handling Input
// we need a map (like python dictionary) that tells us if a key is currently pressed or not
// if we want to get if 'W' is pressed we can do key.get('KeyW') which will return true if it is pressed, false otherwise
const key = new Map();
window.addEventListener("keydown", (e) => {
  key.set(e.code, true);
});
window.addEventListener("keyup", (e) => {
  key.set(e.code, false);
});

// Part 1: Create the app
const app = new PIXI.Application();
await app.init({
  width: document.body.clientWidth,
  height: document.body.clientHeight,
  resizeTo: document.body,
  backgroundColor: 0x261426,
  roundPixels: false,
  resolution: 1,
  antialias: false,
});

app.canvas.style.imageRendering = "pixelated";

// Part 7: Create matter world
const engine = Matter.Engine.create({
  gravity: {
    x: 0,
    y: 0.1,
  },
});

// We scale the stage so that we can use 'world' coordinates to position/size objects instead of pixels
// This will make it much easier when dealing with physics too
// This essentially says 1 metre in the world is 60 pixels on the screen
app.stage.scale.set(60);

document.body.appendChild(app.canvas);

// Part 2: Create the world
const world = new PIXI.Container();

// Center the world at the center of the screen
world.position.set(app.screen.width / 2 / app.stage.scale.x, app.screen.height / 2 / app.stage.scale.y);

// Add the world to the stage
app.stage.addChild(world);

// Part 3: Add function to create a sprite
function createSprite(
  x,
  y,
  width,
  height,
  image,
  type,
  physicsOptions = { isStatic: false, frictionAir: 0.01, group: 0, isSensor: false },
  angle = 0
) {
  const sprite = new PIXI.Container();
  sprite.position.set(x, y);
  sprite.pivot.set(width / 2, height / 2);

  if (type === "ground") {
    const s = new PIXI.TilingSprite(image, width, height);
    s.width = width;
    s.height = height;
    s.tileScale.set(1 / 32);
    sprite.addChild(s);

    sprite.zIndex = 10;
  } else {
    const s = PIXI.Sprite.from(image);
    s.width = width;
    s.height = height;
    s.scale;
    sprite.addChild(s);
  }

  // const graphics = new PIXI.Graphics();
  // graphics.rect(0, 0, width, height).fill(color);
  // sprite.addChild(graphics);

  world.addChild(sprite);

  // Part 8: Add physics body creation code
  let body = null;
  if (physicsOptions) {
    body = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: physicsOptions.isStatic,
      frictionAir: physicsOptions.frictionAir,
      collisionFilter: {
        group: physicsOptions.group,
      },
      isSensor: physicsOptions.isSensor,
    });
    Matter.Body.setAngle(body, angle);

    Matter.World.add(engine.world, body);

    Matter.Events.on(engine, "beforeUpdate", () => {
      sprite.position.set(body.position.x, body.position.y);
      sprite.rotation = body.angle;
    });
  }

  if (type === "goal") {
    Matter.Events.on(engine, "beforeUpdate", () => {
      sprite.scale.set(1.3 + Math.sin(performance.now() / 300) * 0.2);
      body.angle = Math.sin(performance.now() / 300) * 0.2;
    });
  } else if (type === "coin") {
    Matter.Events.on(engine, "beforeUpdate", () => {
      body.angle = Math.sin(performance.now() / 300) * Math.PI * 2;
    });
  }

  return [sprite, body];
}

// Part 4: Add player sprite (with function)
// Part 9: Add physics body to player
const playerSize = 1;
const playerJumpForce = -0.5;
const playerSpeed = 0.2;
const playerTexture = await PIXI.Assets.load("images/player.png");
const playerFaceTexture = await PIXI.Assets.load("images/player-face.png");
playerTexture.source.scaleMode = "nearest";
playerFaceTexture.source.scaleMode = "nearest";
let canDoubleJump = false;
const [playerSprite, playerBody] = createSprite(0, 0, playerSize, playerSize, playerTexture);

const playerFaceSprite = PIXI.Sprite.from(playerFaceTexture);
playerFaceSprite.width = playerSize;
playerFaceSprite.height = playerSize;
playerFaceSprite.anchor.set(0.5);
playerFaceSprite.position.set(playerSize / 2, playerSize / 2);
playerFaceSprite.zIndex = 1;
playerFaceSprite.scale.set(0.08);
playerSprite.addChild(playerFaceSprite);

// Part 12: Add jumping
function isPlayerOnFloor() {
  const collisions = Matter.Query.ray(
    engine.world.bodies,
    playerBody.position,
    Matter.Vector.add(playerBody.position, { x: 0, y: playerSize + 0.1 })
  );

  // check if any of the collisions are with a ground body
  return collisions.some((collision) => collision.bodyA.collisionFilter.group === groups["ground"]); // change from groundGroup to groups["ground"] for part 13
}

function isPlayerOnWallRight() {
  const collisions = Matter.Query.ray(
    engine.world.bodies,
    playerBody.position,
    Matter.Vector.add(playerBody.position, { x: playerSize + 0.01, y: 0 })
  );

  // check if any of the collisions are with a ground body
  return collisions.some((collision) => collision.bodyA.collisionFilter.group === groups["ground"]);
}

function isPlayerOnWallLeft() {
  const collisions = Matter.Query.ray(
    engine.world.bodies,
    playerBody.position,
    Matter.Vector.add(playerBody.position, { x: -(playerSize + 0.01), y: 0 })
  );

  // check if any of the collisions are with a ground body
  return collisions.some((collision) => collision.bodyA.collisionFilter.group === groups["ground"]);
}

let jumpingOffWall = false;

window.addEventListener("keydown", (e) => {
  if (e.code !== "Space") {
    return;
  }

  const isOnFloor = isPlayerOnFloor();
  if (isOnFloor) {
    canDoubleJump = true;
    Matter.Body.setVelocity(playerBody, { x: playerBody.velocity.x, y: playerJumpForce });
  } else if (canDoubleJump) {
    canDoubleJump = false;
    Matter.Body.setVelocity(playerBody, { x: playerBody.velocity.x, y: playerJumpForce });
  }

  // Part 12: Add wall jumping
  if (isPlayerOnWallLeft()) {
    Matter.Body.setVelocity(playerBody, { x: playerJumpForce * 0.5, y: playerJumpForce });

    jumpingOffWall = true;
    setTimeout(() => (jumpingOffWall = false), 150);
  }
  if (isPlayerOnWallRight()) {
    Matter.Body.setVelocity(playerBody, { x: playerJumpForce * -0.5, y: playerJumpForce });

    jumpingOffWall = true;
    setTimeout(() => (jumpingOffWall = false), 150);
  }
});

function particleExplosion(x, y, image, count, gravity = 0.007) {
  for (let i = 0; i < count; i++) {
    const particle = PIXI.Sprite.from(image);
    particle.width = 0.2;
    particle.height = 0.2;
    particle.position.set(x, y);
    particle.anchor.set(0.5);
    particle.zIndex = 100;
    world.addChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.1 + 0.1;
    const velocity = new PIXI.Point(Math.cos(angle) * speed, Math.sin(angle) * speed);
    let lifetime = Math.random() * 50 + 50;

    app.ticker.add(({ deltaTime }) => {
      particle.position = particle.position.add(velocity);
      particle.alpha = lifetime / 100;
      velocity.y += 0.001 * deltaTime;
      velocity.y += gravity * deltaTime;

      if (--lifetime === 0) {
        world.removeChild(particle);
      }
    });
  }
}

// Part 11: Add ground
// REMOVE ON PART 13
// const groundWidth = 50;
// const groundHeight = 5;
// const groundGroup = 1;

// const [groundSprite, groundBody] = createSprite(0, 10, groundWidth, groundHeight, 0x000000, {
//   isStatic: true,
//   group: 1,
// });

// Part 13: Load Levels
// const colors = {
//   ground: 0x000000,
//   spike: 0xff0000,
//   coin: 0xffff00,
//   goal: 0x00ff00,
//   spawn: 0x0000ff,
// };

const sprites = {
  ground: await PIXI.Assets.load("images/floor.png"),
  spike: await PIXI.Assets.load("images/spike.png"),
  coin: await PIXI.Assets.load("images/coin.png"),
  goal: await PIXI.Assets.load("images/goal.png"),
};

for (const key in sprites) {
  sprites[key].source.scaleMode = "nearest";
}

const groups = {
  ground: 1,
  spike: 2,
  coin: 3,
  goal: 4,
};

const physicsOptions = {
  ground: { isStatic: true, group: groups["ground"] },
  spike: { isStatic: true, group: groups["spike"] },
  coin: { isStatic: true, group: groups["coin"], isSensor: true },
  goal: { isStatic: true, group: groups["goal"], isSensor: true },
};

// Part 18: Load levels from JSON
let currentLevel = 0;
const levelCount = 3;
const levels = [];

for (let i = 0; i < levelCount; i++) {
  const level = await fetch(`level${i}.json`);
  levels.push(await level.json());
}

loadLevel(levels[currentLevel]);

function loadLevel(level) {
  // PART 16: Add collision detection for goal
  const winScreen = document.getElementById("win-screen");

  // Part 17: Add collision detection for coin
  let score = 0;
  const scoreElement = document.getElementById("score");
  scoreElement.textContent = `Score: ${score}`;

  level.forEach((object) => {
    if (object.type === "spawn") {
      playerSprite.position.set(object.x, object.y);
      Matter.Body.setPosition(playerBody, { x: object.x, y: object.y });
      return;
    }

    const [sprite, body] = createSprite(
      object.x,
      object.y,
      object.width,
      object.height,
      sprites[object.type],
      object.type,
      physicsOptions[object.type],
      object.angle
    );

    // Part 15: Add collision detection for spikes
    if (object.type === "spike") {
      Matter.Events.on(engine, "collisionStart", (event) => {
        const pairs = event.pairs;

        pairs.forEach((pair) => {
          if (pair.bodyA === body || pair.bodyB === body) {
            clearLevel();
            loadLevel(level);
            particleExplosion(sprite.position.x, sprite.position.y, playerTexture, 100);
          }
        });
      });
    }

    // Part 16: Add collision detection for goal
    if (object.type === "goal") {
      Matter.Events.on(engine, "collisionStart", (event) => {
        const pairs = event.pairs;

        pairs.forEach((pair) => {
          if (pair.bodyA === body || pair.bodyB === body) {
            currentLevel++;

            if (currentLevel >= levelCount) {
              winScreen.style.display = "flex";

              // Part 20: Timer
              document.getElementById("win-screen-time").textContent = `Time: ${Math.floor(
                performance.now() / 1000
              )}s`;
            } else {
              clearLevel();
              loadLevel(levels[currentLevel]);
              particleExplosion(sprite.position.x, sprite.position.y, sprites.goal, 100);
            }
          }
        });
      });
    }

    // Part 17: Add collision detection for coin
    if (object.type === "coin") {
      Matter.Events.on(engine, "collisionStart", (event) => {
        const pairs = event.pairs;

        pairs.forEach((pair) => {
          if (pair.bodyA === body || pair.bodyB === body) {
            score++;
            scoreElement.textContent = `Score: ${score}`;

            world.removeChild(sprite);
            Matter.World.remove(engine.world, body);

            particleExplosion(sprite.position.x, sprite.position.y, sprites.coin, 100);
          }
        });
      });
    }
  });
}

// Part 19: Clear Level
function clearLevel() {
  [...world.children].forEach((child) => {
    if (child === playerSprite) {
      return;
    }

    world.removeChild(child);
  });

  Matter.Composite.allBodies(engine.world).forEach((body) => {
    if (body === playerBody) {
      return;
    }

    Matter.World.remove(engine.world, body);
  });

  orangePortal = null;
  orangePortalBody = null;
  bluePortal = null;
  bluePortalBody = null;
}

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyR") {
    clearLevel();
    loadLevel(levels[currentLevel]);
  }
});

const mouse = new PIXI.Point();
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

function shootPortal(color = "blue") {
  const dir = mouse.subtract(new PIXI.Point(app.screen.width / 2, app.screen.height / 2)).normalize();

  // const line = new PIXI.Graphics();
  // line.moveTo(playerBody.position.x, playerBody.position.y);
  // line.lineTo(playerBody.position.x + dir.x * 20, playerBody.position.y + dir.y * 20);
  // line.stroke({ color: 0x00ff00, width: 0.1 });
  // world.addChild(line);

  const ray = raycast(
    engine.world.bodies,
    playerBody.position,
    Matter.Vector.add(playerBody.position, Matter.Vector.mult(dir, 20))
  );
  const hit = ray.find((collision) => collision.body.collisionFilter.group === groups["ground"]);
  if (!hit) {
    return;
  }

  const normal = hit.normal;
  const point = hit.point;
  createPortal(point.x, point.y, hit.body.angle, normal, color);
}

let bluePortal = null;
let bluePortalBody = null;
let blueEvent = null;
let orangePortal = null;
let orangePortalBody = null;
let orangeEvent = null;
let teleported = false;

function createPortal(x, y, angle, normal, color = "blue") {
  const width = 0.2;
  const height = 2;

  const portal = new PIXI.Container();
  portal.position.set(x, y);
  portal.pivot.set(width / 2, height / 2);
  portal.zIndex = 100;
  portal.rotation = Math.atan2(normal.y, normal.x);

  const s = new PIXI.Graphics();
  s.rect(0, 0, width, height).fill(color === "blue" ? 0x0000ff : 0xffa500);
  portal.addChild(s);

  world.addChild(portal);

  const body = Matter.Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    angle: angle,
    collisionFilter: {
      group: 0,
    },
    isSensor: true,
  });
  Matter.World.add(engine.world, body);

  if (color === "blue") {
    if (bluePortal) {
      world.removeChild(bluePortal);
      Matter.World.remove(engine.world, bluePortalBody);
      Matter.Events.off(engine, "collisionStart", blueEvent);
    }

    bluePortal = portal;
    bluePortalBody = body;

    blueEvent = (event) => {
      const pairs = event.pairs;

      if (teleported || !orangePortal || !bluePortal) {
        return;
      }

      pairs.forEach((pair) => {
        if (pair.bodyA === body || pair.bodyB === body) {
          const otherBody = pair.bodyA === body ? pair.bodyB : pair.bodyA;
          if (otherBody !== playerBody) {
            return;
          }

          Matter.Body.setPosition(otherBody, {
            x: orangePortalBody.position.x + normal.x,
            y: orangePortalBody.position.y + normal.y,
          });

          const velMag = Matter.Vector.magnitude(otherBody.velocity);
          const newVel = Matter.Vector.mult(normal, Math.abs(velMag) + 0.2);

          Matter.Body.setVelocity(otherBody, newVel);

          teleported = true;
          setTimeout(() => (teleported = false), 300);
        }
      });
    };

    Matter.Events.on(engine, "collisionStart", blueEvent);
  } else {
    if (orangePortal) {
      world.removeChild(orangePortal);
      Matter.World.remove(engine.world, orangePortalBody);
      Matter.Events.off(engine, "collisionStart", orangeEvent);
    }

    orangePortal = portal;
    orangePortalBody = body;
    orangeEvent = (event) => {
      const pairs = event.pairs;

      if (teleported || !bluePortal || !orangePortal) {
        return;
      }

      pairs.forEach((pair) => {
        if (pair.bodyA === body || pair.bodyB === body) {
          const otherBody = pair.bodyA === body ? pair.bodyB : pair.bodyA;
          if (otherBody !== playerBody) {
            return;
          }

          Matter.Body.setPosition(otherBody, {
            x: bluePortalBody.position.x + normal.x,
            y: bluePortalBody.position.y + normal.y,
          });

          const velMag = Matter.Vector.magnitude(otherBody.velocity);
          const newVel = Matter.Vector.mult(normal, Math.abs(velMag) + 0.2);

          Matter.Body.setVelocity(otherBody, newVel);

          teleported = true;
          setTimeout(() => (teleported = false), 300);
        }
      });
    };

    Matter.Events.on(engine, "collisionStart", orangeEvent);
  }
}

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    shootPortal("blue");
  } else if (e.button === 2) {
    shootPortal("orange");
  }
});

// Part 5: Creating our update loop
function update({ deltaTime }) {
  // deltaTime is the time between each frame in seconds
  // We can use this to make sure our game runs at the same speed regardless of the frame rate
  //
  // Rotate the player
  // add this line for demo then remove it
  //   player.rotation += 0.01 * deltaTime;
  //

  // Part 6: Moving the player
  let playerDirection = new PIXI.Point(0, 0);

  // REMOVE AT PART 12
  // if (key.get("KeyW")) {
  //   playerDirection.y -= 1;
  // }
  // if (key.get("KeyS")) {
  //   playerDirection.y += 1;
  // }

  if (key.get("KeyA")) {
    playerDirection.x -= 1;
  }
  if (key.get("KeyD")) {
    playerDirection.x += 1;
  }

  // only perform when player is actually moving
  if (playerDirection.magnitude() > 0) {
    // Important: We need to normalize the direction vector so that moving diagonally is not faster than moving horizontally/vertically
    playerDirection = playerDirection.normalize();

    // player.position = player.position.add(playerDirection.multiplyScalar(playerSpeed * deltaTime));

    // Part 10: Move the player using physics
    Matter.Body.setVelocity(playerBody, {
      x: jumpingOffWall || teleported ? playerBody.velocity.x : playerDirection.x * playerSpeed,
      // REMOVE AT PART 12
      // y: playerDirection.y * playerSpeed,
      y: playerBody.velocity.y,
    });
  }

  playerFaceSprite.angle = -playerSprite.angle;

  // Part 7: Create matter world
  Matter.Engine.update(engine); // default delta is 16.666 ms, it's usually a good idea to keep the physics engine running at a fixed time step

  // Part 14: Camera follows player
  const cameraSpeed = 0.05;
  app.stage.pivot = app.stage.pivot.add(
    playerSprite.position.subtract(app.stage.pivot).multiplyScalar(cameraSpeed)
  );
}

app.ticker.add(update);
