function createBox(x, y, width, height, color, text, noResize, noRotate) {
  const box = document.createElement("div");
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;
  box.style.backgroundColor = color;
  box.innerText = text ?? "";

  box.classList.add("box");

  let angle = 0;
  const boxObject = {
    box,
    x,
    y,
    angle,
  };
  boxes.push(boxObject);

  function updateTransform() {
    box.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
    boxObject.x = x;
    boxObject.y = y;
    boxObject.angle = angle;
  }
  updateTransform();

  let isDragging = false;

  box.addEventListener("mousedown", (event) => {
    if (event.target.classList.contains("handle")) {
      return;
    }

    box.style.border = "blue 3px solid";
    isDragging = true;
  });

  document.addEventListener("mousemove", (event) => {
    if (isDragging) {
      const rect = scene.getBoundingClientRect();
      const dx = event.movementX;
      const dy = event.movementY;

      x += dx;
      y += dy;

      updateTransform();
    }
  });

  document.addEventListener("mouseup", (event) => {
    box.style.border = "none";
    isDragging = false;
  });

  document.addEventListener("dblclick", (event) => {
    if (event.target === box) {
      if (event.ctrlKey) {
        createBox(x + width * 2, y, width, height, color, text, noResize, noRotate);
        return;
      }

      box.remove();
      boxes.splice(boxes.indexOf(boxObject), 1);
    }
  });

  scene.appendChild(box);

  // create handle on each side of box
  if (!noResize) {
    const handleTypes = ["top", "right", "bottom", "left"];
    handleTypes.forEach((type) => {
      const handle = document.createElement("div");
      handle.classList.add("handle", `handle-${type}`);
      box.appendChild(handle);

      let isResizing = false;
      handle.addEventListener("mousedown", (event) => {
        isResizing = true;
      });

      document.addEventListener("mousemove", (event) => {
        if (isResizing) {
          const boxRect = box.getBoundingClientRect();
          const dx = event.movementX;
          const dy = event.movementY;
          const minSize = 50;

          switch (type) {
            case "top":
              box.style.height = `${Math.max(boxRect.height - dy, minSize)}px`;
              y += dy / 2;
              break;
            case "right":
              box.style.width = `${Math.max(boxRect.width + dx, minSize)}px`;
              x += dx / 2;
              break;
            case "bottom":
              box.style.height = `${Math.max(boxRect.height + dy, minSize)}px`;
              y += dy / 2;
              break;
            case "left":
              box.style.width = `${Math.max(boxRect.width - dx, minSize)}px`;
              x += dx / 2;
              break;
          }

          updateTransform();
        }
      });

      document.addEventListener("mouseup", (event) => {
        isResizing = false;
      });
    });
  }

  if (!noRotate) {
    const handleTypes = ["tl", "tr", "br", "bl"];
    handleTypes.forEach((type) => {
      const rotateHandle = document.createElement("div");
      rotateHandle.classList.add("handle", "rotate-handle", `rotate-handle-${type}`);
      box.appendChild(rotateHandle);

      let isRotating = false;
      let startAngle = 0;
      const increments = 45;

      rotateHandle.addEventListener("mousedown", (event) => {
        isRotating = true;
        startAngle = angle;
      });

      document.addEventListener("mousemove", (event) => {
        if (isRotating) {
          const rect = scene.getBoundingClientRect();
          const dx = event.clientX - rect.width / 2;
          const dy = event.clientY - rect.height / 2;

          const newAngle = Math.atan2(dy, dx) * (180 / Math.PI);
          angle = startAngle + newAngle;

          if (event.shiftKey) {
            angle = Math.round(angle / increments) * increments;
          }

          updateTransform();
        }
      });

      document.addEventListener("mouseup", (event) => {
        isRotating = false;
      });
    });
  }

  return box;
}

const boxes = [];

const scene = document.getElementById("scene");
const addGroundButton = document.getElementById("add-ground");
const addSpikeButton = document.getElementById("add-spike");
const addSpawnButton = document.getElementById("add-spawn");
const addCoinButton = document.getElementById("add-coin");
const addGoalButton = document.getElementById("add-goal");
const saveButton = document.getElementById("save");
const loadButton = document.getElementById("load");
const clearButton = document.getElementById("clear");

const metre = 50;
const colorMap = {
  black: "ground",
  red: "spike",
  blue: "spawn",
  yellow: "coin",
  green: "goal",
};

addGroundButton.addEventListener("click", () => {
  createBox(0, 0, metre * 4, metre * 1, "black", "ground");
});

addSpikeButton.addEventListener("click", () => {
  createBox(0, 0, metre, metre, "red", "spike", true);
});

addSpawnButton.addEventListener("click", () => {
  createBox(0, 0, metre, metre, "blue", "spawn", true, true);
});

addCoinButton.addEventListener("click", () => {
  createBox(0, 0, metre, metre, "yellow", "coin", true, true);
});

addGoalButton.addEventListener("click", () => {
  createBox(0, 0, metre, metre, "green", "goal", true, true);
});

saveButton.addEventListener("click", () => {
  const level = boxes.map(({ box, x, y, angle }) => {
    return {
      type: colorMap[box.style.backgroundColor],
      x: x / metre,
      y: y / metre,
      angle,
      width: parseInt(box.style.width) / metre,
      height: parseInt(box.style.height) / metre,
    };
  });

  localStorage.setItem("level", JSON.stringify(level));
  console.log(JSON.stringify(level));
  navigator.clipboard.writeText(JSON.stringify(level)).then(() => alert("Level data copied to clipboard"));
});

function load(level) {
  boxes.forEach(({ box }) => {
    box.remove();
  });
  boxes.length = 0;

  level.forEach(({ type, x, y, angle, width, height }) => {
    const color = Object.keys(colorMap).find((key) => colorMap[key] === type);
    const box = createBox(
      x * metre,
      y * metre,
      width * metre,
      height * metre,
      color,
      type,
      type !== "ground",
      type !== "ground" && type !== "spike"
    );
    box.style.transform = `translate(${x * metre}px, ${y * metre}px) rotate(${angle}deg)`;
  });

  localStorage.setItem("level", JSON.stringify(level));
}

loadButton.addEventListener("click", () => {
  const level = JSON.parse(prompt("Paste level data here"));
  load(level);
});

clearButton.addEventListener("click", () => {
  boxes.forEach(({ box }) => {
    box.remove();
  });
  boxes.length = 0;
  localStorage.removeItem("level");
});

const level = JSON.parse(localStorage.getItem("level"));
if (level) {
  load(level);
}

// navigate with middle mouse button
let isPanning = false;
let panX = 0;
let panY = 0;

window.addEventListener("mousedown", (event) => {
  if (event.button === 1) {
    isPanning = true;
  }
});

window.addEventListener("mousemove", (event) => {
  if (isPanning) {
    panX += event.movementX;
    panY += event.movementY;
    scene.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }
});

window.addEventListener("mouseup", (event) => {
  if (event.button === 1) {
    isPanning = false;
  }
});

// zoom with scroll wheel
let scale = 1;
// let minScale = 0.5;
// let maxScale = 2;
// let scaleStep = 0.1;

// window.addEventListener("wheel", (event) => {
//   if (event.deltaY > 0) {
//     scale = Math.max(minScale, scale - scaleStep);
//   } else {
//     scale = Math.min(maxScale, scale + scaleStep);
//   }

//   scene.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
// });
