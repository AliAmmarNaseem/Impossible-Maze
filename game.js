// Game constants
const PLAYER_SIZE = 15;
const GOAL_SIZE = 30;
const INITIAL_SPEED = 3;
const LEVEL_SPEED_INCREASE = 0.5;
const WALL_COLOR = '#ff5252';
const PLAYER_COLOR = '#4285f4';
const GOAL_COLOR = '#4caf50';
const MAZE_WALL_THICKNESS = 5;

// Game state
let canvas, ctx;
let player = { x: 50, y: 50, size: PLAYER_SIZE, speed: INITIAL_SPEED };
let goal = { x: 0, y: 0, size: GOAL_SIZE };
let walls = [];
let obstacles = [];
let keys = { up: false, down: false, left: false, right: false };
let gameActive = false;
let deaths = 0;
let level = 1;
let startTime = 0;
let currentTime = 0;
let timerId;
let lastFrameTime = 0;
let mouseTrails = [];
let fakeMouse = { x: 0, y: 0 };
let mazeData = null;
let canvasInversion = false;
let lastMoved = Date.now();
let screenShakeIntensity = 0;

// DOM Elements
const startButton = document.getElementById('start-button');
const retryButton = document.getElementById('retry-button');
const deathCounter = document.getElementById('death-counter');
const levelDisplay = document.getElementById('level');
const timerDisplay = document.getElementById('timer');
const gameOverScreen = document.getElementById('game-over');
const finalDeathsDisplay = document.getElementById('final-deaths');

// Initialize game
window.onload = function() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    initEventListeners();
    generateFirstLevel();
    
    // Start animation loop
    requestAnimationFrame(gameLoop);
};

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

function initEventListeners() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                keys.up = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                keys.down = true;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                keys.right = true;
                break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                keys.up = false;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                keys.down = false;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                keys.right = false;
                break;
        }
    });
    
    // Window resize handler
    window.addEventListener('resize', resizeCanvas);
    
    // Button event listeners
    startButton.addEventListener('click', startGame);
    retryButton.addEventListener('click', restartGame);
    
    // Mouse movement to create fake cursor
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Add to trail
        mouseTrails.push({ x: mouseX, y: mouseY, age: 0 });
        
        // Keep only last 20 positions
        if (mouseTrails.length > 20) {
            mouseTrails.shift();
        }
    });
}

function startGame() {
    gameActive = true;
    startTime = Date.now();
    timerId = setInterval(updateTimer, 1000);
    startButton.parentElement.style.display = 'none';
}

function updateTimer() {
    if (gameActive) {
        currentTime = Math.floor((Date.now() - startTime) / 1000);
        timerDisplay.textContent = currentTime;
    }
}

function restartGame() {
    deaths = 0;
    level = 1;
    deathCounter.textContent = deaths;
    levelDisplay.textContent = level;
    currentTime = 0;
    timerDisplay.textContent = currentTime;
    
    player.speed = INITIAL_SPEED;
    
    gameOverScreen.classList.add('hidden');
    generateLevel();
    startGame();
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply frustrating effects
    applyFrustratingEffects();
    
    if (gameActive) {
        updateGame(deltaTime);
    }
    
    drawGame();
    
    requestAnimationFrame(gameLoop);
}

function applyFrustratingEffects() {
    // Screen shake effect
    if (screenShakeIntensity > 0) {
        const shakeX = Math.random() * screenShakeIntensity - screenShakeIntensity / 2;
        const shakeY = Math.random() * screenShakeIntensity - screenShakeIntensity / 2;
        ctx.save();
        ctx.translate(shakeX, shakeY);
        screenShakeIntensity *= 0.9; // Decay shake intensity
    }
    
    // Screen inversion effect (level 3+)
    if (canvasInversion && level >= 3) {
        ctx.filter = 'invert(100%)';
    } else {
        ctx.filter = 'none';
    }
    
    // Fake mouse cursor (level 2+)
    if (level >= 2 && mouseTrails.length > 0) {
        // Update fake mouse position towards a trail position
        const targetTrail = mouseTrails[Math.floor(Math.random() * mouseTrails.length)];
        fakeMouse.x += (targetTrail.x - fakeMouse.x) * 0.1;
        fakeMouse.y += (targetTrail.y - fakeMouse.y) * 0.1;
    }
    
    // Auto move if player hasn't moved in a while (level 4+)
    if (level >= 4 && gameActive && Date.now() - lastMoved > 2000) {
        // Move slightly in a random direction
        const randomDir = Math.floor(Math.random() * 4);
        const nudgeAmount = 0.5;
        
        switch (randomDir) {
            case 0: player.y -= nudgeAmount; break;
            case 1: player.y += nudgeAmount; break;
            case 2: player.x -= nudgeAmount; break;
            case 3: player.x += nudgeAmount; break;
        }
    }
}

function updateGame(deltaTime) {
    const moveSpeed = player.speed * (deltaTime / 16); // Normalize for ~60fps
    let moved = false;
    
    // Handle user input with artificial input delay and random resistance (level 5+)
    if (keys.up) {
        player.y -= moveSpeed * (level >= 5 ? (Math.random() * 0.5 + 0.5) : 1);
        moved = true;
    }
    if (keys.down) {
        player.y += moveSpeed * (level >= 5 ? (Math.random() * 0.5 + 0.5) : 1);
        moved = true;
    }
    if (keys.left) {
        player.x -= moveSpeed * (level >= 5 ? (Math.random() * 0.5 + 0.5) : 1);
        moved = true;
    }
    if (keys.right) {
        player.x += moveSpeed * (level >= 5 ? (Math.random() * 0.5 + 0.5) : 1);
        moved = true;
    }
    
    if (moved) {
        lastMoved = Date.now();
    }
    
    // Add inertia to movement (level 3+)
    if (level >= 3 && moved) {
        // Additional inertia-based movement
        const inertiaFactor = 0.1 * (level - 2);
        
        if (keys.up) player.y -= moveSpeed * inertiaFactor;
        if (keys.down) player.y += moveSpeed * inertiaFactor;
        if (keys.left) player.x -= moveSpeed * inertiaFactor;
        if (keys.right) player.x += moveSpeed * inertiaFactor;
    }
    
    // Keep player in bounds
    player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));
    
    // Check for collisions
    if (checkWallCollisions() || checkObstacleCollisions()) {
        handleDeath();
    }
    
    // Check if reached goal
    if (checkGoalCollision()) {
        nextLevel();
    }
    
    // Update obstacles
    updateObstacles(deltaTime);
}

function checkWallCollisions() {
    for (const wall of walls) {
        if (player.x + player.size / 2 > wall.x && 
            player.x - player.size / 2 < wall.x + wall.width &&
            player.y + player.size / 2 > wall.y && 
            player.y - player.size / 2 < wall.y + wall.height) {
            return true;
        }
    }
    return false;
}

function checkObstacleCollisions() {
    for (const obstacle of obstacles) {
        const dx = player.x - obstacle.x;
        const dy = player.y - obstacle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.size / 2 + obstacle.radius) {
            return true;
        }
    }
    return false;
}

function checkGoalCollision() {
    const dx = player.x - goal.x;
    const dy = player.y - goal.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < player.size / 2 + goal.size / 2;
}

function handleDeath() {
    deaths++;
    deathCounter.textContent = deaths;
    
    // Apply screen shake effect
    screenShakeIntensity = 10;
    
    // Reset player position
    player.x = 50;
    player.y = 50;
    
    // Additional frustrating effects on death
    if (level >= 3) {
        // Temporary screen inversion
        canvasInversion = true;
        setTimeout(() => { canvasInversion = false; }, 1000);
    }
    
    // Game over after too many deaths
    if (deaths >= 50) {
        gameOver();
    }
}

function gameOver() {
    gameActive = false;
    clearInterval(timerId);
    finalDeathsDisplay.textContent = deaths;
    gameOverScreen.classList.remove('hidden');
}

function nextLevel() {
    level++;
    levelDisplay.textContent = level;
    
    // Increase difficulty
    player.speed += LEVEL_SPEED_INCREASE;
    
    // Regenerate level
    generateLevel();
}

function generateFirstLevel() {
    generateMaze(10, 10);
    
    // Place player at start
    player.x = MAZE_WALL_THICKNESS * 2;
    player.y = MAZE_WALL_THICKNESS * 2;
    
    // Place goal at end
    const cellSize = Math.min(
        (canvas.width - MAZE_WALL_THICKNESS * 2) / mazeData.width,
        (canvas.height - MAZE_WALL_THICKNESS * 2) / mazeData.height
    );
    
    goal.x = MAZE_WALL_THICKNESS + (mazeData.width - 1) * cellSize + cellSize / 2;
    goal.y = MAZE_WALL_THICKNESS + (mazeData.height - 1) * cellSize + cellSize / 2;
    
    // Create obstacles
    obstacles = [];
}

function generateLevel() {
    // Clear old walls and obstacles
    walls = [];
    obstacles = [];
    
    // Reset player position
    player.x = 50;
    player.y = 50;
    
    // Different maze sizes based on level
    const mazeWidth = 5 + level;
    const mazeHeight = 5 + level;
    
    generateMaze(mazeWidth, mazeHeight);
    
    // Place goal at a random far position
    const maxDist = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    let maxDistFound = 0;
    let bestX = 0, bestY = 0;
    
    // Try 10 random positions and pick the farthest
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * (canvas.width - goal.size) + goal.size / 2;
        const y = Math.random() * (canvas.height - goal.size) + goal.size / 2;
        
        const dx = x - player.x;
        const dy = y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > maxDistFound) {
            maxDistFound = dist;
            bestX = x;
            bestY = y;
        }
    }
    
    goal.x = bestX;
    goal.y = bestY;
    
    // Add random moving obstacles based on level
    const numObstacles = level * 2;
    for (let i = 0; i < numObstacles; i++) {
        obstacles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: 10 + Math.random() * 15,
            velocityX: (Math.random() - 0.5) * (1 + level * 0.5),
            velocityY: (Math.random() - 0.5) * (1 + level * 0.5)
        });
    }
}

function generateMaze(width, height) {
    // Create empty maze
    mazeData = {
        width: width,
        height: height,
        cells: Array(width * height).fill(false)
    };
    
    // Generate maze using randomized DFS
    const stack = [];
    const startX = 0;
    const startY = 0;
    
    // Mark start cell as visited
    mazeData.cells[startY * width + startX] = true;
    stack.push({x: startX, y: startY});
    
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const x = current.x;
        const y = current.y;
        
        // Get unvisited neighbors
        const neighbors = [];
        
        if (x > 0 && !mazeData.cells[y * width + (x - 1)]) neighbors.push({x: x - 1, y: y, dir: 'left'});
        if (x < width - 1 && !mazeData.cells[y * width + (x + 1)]) neighbors.push({x: x + 1, y: y, dir: 'right'});
        if (y > 0 && !mazeData.cells[(y - 1) * width + x]) neighbors.push({x: x, y: y - 1, dir: 'up'});
        if (y < height - 1 && !mazeData.cells[(y + 1) * width + x]) neighbors.push({x: x, y: y + 1, dir: 'down'});
        
        if (neighbors.length > 0) {
            // Choose random neighbor
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            // Mark as visited
            mazeData.cells[next.y * width + next.x] = true;
            
            // Move to the chosen neighbor
            stack.push({x: next.x, y: next.y});
        } else {
            // Backtrack
            stack.pop();
        }
    }
    
    // Convert maze data to walls
    const cellSize = Math.min(
        (canvas.width - MAZE_WALL_THICKNESS * 2) / width,
        (canvas.height - MAZE_WALL_THICKNESS * 2) / height
    );
    
    // Add outer walls
    walls = [
        // Top wall
        { x: 0, y: 0, width: canvas.width, height: MAZE_WALL_THICKNESS },
        // Bottom wall
        { x: 0, y: canvas.height - MAZE_WALL_THICKNESS, width: canvas.width, height: MAZE_WALL_THICKNESS },
        // Left wall
        { x: 0, y: 0, width: MAZE_WALL_THICKNESS, height: canvas.height },
        // Right wall
        { x: canvas.width - MAZE_WALL_THICKNESS, y: 0, width: MAZE_WALL_THICKNESS, height: canvas.height }
    ];
    
    // Add inner walls (only a few - we want it to look like a maze but be more open for frustration)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Add vertical wall with 25% chance
            if (Math.random() < 0.25) {
                walls.push({
                    x: MAZE_WALL_THICKNESS + x * cellSize,
                    y: MAZE_WALL_THICKNESS + y * cellSize,
                    width: MAZE_WALL_THICKNESS,
                    height: cellSize
                });
            }
            
            // Add horizontal wall with 25% chance
            if (Math.random() < 0.25) {
                walls.push({
                    x: MAZE_WALL_THICKNESS + x * cellSize,
                    y: MAZE_WALL_THICKNESS + y * cellSize,
                    width: cellSize,
                    height: MAZE_WALL_THICKNESS
                });
            }
        }
    }
}

function updateObstacles(deltaTime) {
    const speedMultiplier = deltaTime / 16; // Normalize for ~60fps
    
    for (const obstacle of obstacles) {
        // Update position
        obstacle.x += obstacle.velocityX * speedMultiplier;
        obstacle.y += obstacle.velocityY * speedMultiplier;
        
        // Bounce off walls
        if (obstacle.x - obstacle.radius < 0 || obstacle.x + obstacle.radius > canvas.width) {
            obstacle.velocityX *= -1;
        }
        if (obstacle.y - obstacle.radius < 0 || obstacle.y + obstacle.radius > canvas.height) {
            obstacle.velocityY *= -1;
        }
        
        // Level 4+ obstacles can subtly home in on player
        if (level >= 4 && Math.random() < 0.02) {
            const dx = player.x - obstacle.x;
            const dy = player.y - obstacle.y;
            const homingFactor = 0.05;
            
            obstacle.velocityX += dx * homingFactor;
            obstacle.velocityY += dy * homingFactor;
            
            // Normalize velocity
            const speed = Math.sqrt(obstacle.velocityX * obstacle.velocityX + obstacle.velocityY * obstacle.velocityY);
            if (speed > 0) {
                const maxSpeed = 2 + level * 0.5;
                if (speed > maxSpeed) {
                    obstacle.velocityX = (obstacle.velocityX / speed) * maxSpeed;
                    obstacle.velocityY = (obstacle.velocityY / speed) * maxSpeed;
                }
            }
        }
    }
}

function drawGame() {
    // Draw goal
    ctx.fillStyle = GOAL_COLOR;
    ctx.beginPath();
    ctx.arc(goal.x, goal.y, goal.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw walls
    ctx.fillStyle = WALL_COLOR;
    for (const wall of walls) {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    }
    
    // Draw obstacles
    ctx.fillStyle = WALL_COLOR;
    for (const obstacle of obstacles) {
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw fake cursor (level 2+)
    if (level >= 2 && gameActive) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(fakeMouse.x, fakeMouse.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw player
    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Restore context if we applied transformations
    if (screenShakeIntensity > 0) {
        ctx.restore();
    }
} 