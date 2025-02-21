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
  backgroundColor: 0xffffff,
});

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
  color,
  physicsOptions = { isStatic: false, frictionAir: 0.01, group: 0, isSensor: false }
) {
  const sprite = new PIXI.Container();
  sprite.position.set(x, y);
  sprite.pivot.set(width / 2, height / 2);

  const graphics = new PIXI.Graphics();
  graphics.rect(0, 0, width, height).fill(color);

  sprite.addChild(graphics);
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
    Matter.World.add(engine.world, body);

    Matter.Events.on(engine, "beforeUpdate", () => {
      sprite.position.set(body.position.x, body.position.y);
      sprite.rotation = body.angle;
    });
  }

  return [sprite, body];
}

// Part 4: Add player sprite (with function)
// Part 9: Add physics body to player
const playerSize = 1;
const playerJumpForce = -0.5;
const playerSpeed = 0.2;
let canDoubleJump = false;
const [playerSprite, playerBody] = createSprite(0, 0, playerSize, playerSize, 0x0000ff);

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
});

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
const colors = {
  ground: 0x000000,
  spike: 0xff0000,
  coin: 0xffff00,
  goal: 0x00ff00,
  spawn: 0x0000ff,
};

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

function loadLevel(level) {
  level.forEach((object) => {
    if (object.type === "spawn") {
      playerSprite.position.set(object.x, object.y);
      Matter.Body.setPosition(playerBody, { x: object.x, y: object.y });
      return;
    }

    createSprite(
      object.x,
      object.y,
      object.width,
      object.height,
      colors[object.type],
      physicsOptions[object.type]
    );
  });
}

const level = await fetch("level.json").then((response) => response.json());
loadLevel(level);

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
      x: playerDirection.x * playerSpeed,
      // REMOVE AT PART 12
      // y: playerDirection.y * playerSpeed,
      y: playerBody.velocity.y,
    });
  }

  // Part 7: Create matter world
  Matter.Engine.update(engine); // default delta is 16.666 ms, it's usually a good idea to keep the physics engine running at a fixed time step

  // Part 14: Camera follows player
  const cameraSpeed = 0.05;
  app.stage.pivot = app.stage.pivot.add(
    playerSprite.position.subtract(app.stage.pivot).multiplyScalar(cameraSpeed)
  );
}

app.ticker.add(update);
