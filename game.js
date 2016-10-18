"use strict;"

/* Global variables */
var canvas = document.getElementById('screen');
var game = new Game(canvas, update, render);
var player = new Player({ x: canvas.width / 2, y: canvas.height / 2 }, canvas);
var levelDiv = document.getElementById('levelDiv');
var scoreDiv = document.getElementById('scoreDiv');
var fpsDiv = document.getElementById('fpsDiv');
var instructionsDiv = document.getElementById('instructionsDiv');
var messageDiv = document.getElementById('messageDiv');
var scoreFeedDiv = document.getElementById('scoreFeedDiv');
var scoreFeedTimer = 0;
var laser = new Image();
laser.src = './assets/laser.png';
var hasInitialized = false;
var score;
var level;
var lives;
var numOfAsteroids;
var asteroidArr;
var numOfLasers;
var laserArr;
var gameOverFlag = false;

// Audio variables
var shipCollision = new Audio('./assets/ShipCollision.mp3');
shipCollision.volume = 0.25;
var asteroidCollision = new Audio('./assets/AsteroidCollision.mp3');
asteroidCollision.volume = 0.25;
var laserHit = new Audio('./assets/LaserHit.mp3');

// Fps variables
var frames;
var frameSnapshot;
var oneSecond;

// Creates a list of size 'numOfAsteroids' of asteroids
function GenerateAsteroidArray() {
    asteroidArr = [];

    for (i = 0; i < numOfAsteroids; i++) {
        var size = Math.floor(Math.random() * 3) + 1;
        var velocity = Math.floor(Math.random() * 3) + 1;
        var angle = 2 * Math.PI * Math.random();
        var spinAngle = 0.01 * (Math.random() * 2 - 1);
        var x = Math.floor(Math.random() * canvas.width) + 1;
        var y = Math.floor(Math.random() * canvas.height) + 1;
        var type = Math.floor(Math.random() * 8) + 1;

        asteroidArr[i] = new Asteroid(type, size, velocity, angle, spinAngle, x, y);
    }
}

// Initialize global variables
function Initialize()
{
    hasInitialized = true;
    gameOverFlag = false;
    lives = 3;
    score = 0;
    level = 1;
    frames = 0;
    frameSnapshot = 0;
    oneSecond = 0;
    numOfAsteroids = 5;
    GenerateAsteroidArray();
    numOfLasers = 0;
    laserArr = [];
    instructionsDiv.innerHTML = "Use w-a-s-d (arrows keys) to move and spacebar to shoot. Eliminate all asteroids to advance to the next level"
}

// Prepare canvas and variables for a new level
function NewLevel()
{
    level += 1;
    numOfAsteroids += 3;
    numOfLasers = 0;
    laserArr = [];
    GenerateAsteroidArray();
    allAsteroidsDestroyed = false;
}

// Stops the master loop and ends the game
function GameOver()
{
    gameOverFlag = true;
    messageDiv.innerHTML = "GameOver";
}

function CheckCollision(pointList, ox, oy, x, y, objectType)
{
    var isCollision = false;

    for(var s = 0, r = pointList.length - 2; s < pointList.length; s+= 2)
    {
        var px1 = pointList[s] + ox;
        var px2 = pointList[r] + ox;
        var py1 = pointList[s + 1] + oy;
        var py2 = pointList[r + 1] + oy;

        switch(objectType)
        {
            case 1: // Player object
                if ((py1 > y != py2 > y) && (x  < (px2 - px1) * (y - py1) / (py2 - py1) + px1))
                {
                    isCollision = !isCollision;
                }
                break;           
            case 2: // Asteroid object
                if ((py1 > (y - 40) != py2 > (y - 40)) && ((x - 40) < (px2 - px1) * (y - py1) / (py2 - py1) + px1))
                {
                    isCollision = !isCollision;
                }
                break;
            case 3: // Laser object
                if ((py1 > (y - 10) != py2 > (y - 10)) && ((x - 10) < (px2 - px1) * (y - py1) / (py2 - py1) + px1))
                {
                    isCollision = !isCollision;
                }
                break;
        }
        r = s;
    }
    return isCollision;
}

function Rotate(object, theta)
{
    var rotationMatrix = [Math.cos(theta), -Math.sin(theta), Math.sin(theta), Math.cos(theta)];
    var asteroidPoints = object.points;

    for(z = 0; z < asteroidPoints.length; z += 2)
    {
        var x = asteroidPoints[z];
        var y = asteroidPoints[z + 1];

        asteroidPoints[z] = x * rotationMatrix[0] + y * rotationMatrix[1];
        asteroidPoints[z+1] = x * rotationMatrix[2] + y * rotationMatrix[3];
    }
    object.points = asteroidPoints;
}

RotateImage = function (image, angle) {
    var offscreenCanvas = document.createElement('canvas');
    var offscreenCtx = offscreenCanvas.getContext('2d');

    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;

    offscreenCtx.translate(size / 2, size / 2);
    offscreenCtx.rotate(angle + Math.PI / 2);
    offscreenCtx.drawImage(image, -(image.width / 2), -(image.height / 2));

    return offscreenCanvas;
}

/**
 * @function update
 * Updates the game state, moving
 * game objects and handling interactions
 * between them.
 * @param {DOMHighResTimeStamp} elapsedTime indicates
 * the number of milliseconds passed since the last frame.
 */
function update(elapsedTime) {

  if(hasInitialized == false)
  {
      Initialize();
  }
    // Update fps counter
  if (oneSecond > 1000)
  {
      oneSecond = 0;
      frameSnapshot = frames;
      frames = 0;     
  }
  else
  {
      oneSecond += elapsedTime;
      frames++;
  }

    // Update score feed
  if (scoreFeedTimer > 1000)
  {
      scoreFeedDiv.innerHTML = "";
      scoreFeedTimer = 0;
  }
  else
  {
      scoreFeedTimer += elapsedTime;
  }

  player.update(elapsedTime);

    // Move lasers
  for (i = 0; i < laserArr.length; i++) {
      if (laserArr[i] != 0) {
          laserArr[i].update(elapsedTime);
      }
      if (laserArr[i].x < -20 || laserArr[i].x > 760 || laserArr[i].y > 480 || laserArr[i].y < -20) {
          laserArr[i] = 0;
      }
  }


    // Move asteroids
  var allAsteroidsDestroyed = true;
  for(i = 0; i < asteroidArr.length; i++)
  {
      // Ignore "destroyed" asteroids (asteroids with size 0)
      if (asteroidArr[i].size == 0)
      {
          continue;
      }

      //If it makes it to this point we know there are still asteroids floating around
      allAsteroidsDestroyed = false;

      asteroidArr[i].update(elapsedTime);

      // Check for collisions with other asteroids
      for (j = 0; j < asteroidArr.length; j++)
      {
          // Not the same asteroid
          if (j != i)
          {
              if (CheckCollision(asteroidArr[j].scaledPoints, asteroidArr[j].x, asteroidArr[j].y, asteroidArr[i].x, asteroidArr[i].y, 2) == true)
              {
                  asteroidCollision.pause();
                  asteroidCollision.currentTime = 0;
                  asteroidCollision.play();

                  asteroidArr[j].angle *= -1;
                  asteroidArr[i].angle *= -1;
                  asteroidArr[j].velocity *= -1;
                  asteroidArr[i].velocity *= -1;
              }
          }
      }

      // Check for collisions with player 
      if (CheckCollision(asteroidArr[i].scaledPoints, asteroidArr[i].x, asteroidArr[i].y, player.position.x, player.position.y, 1) == true)
      {
          shipCollision.pause();
          shipCollision.currentTime = 0;
          shipCollision.play();

          lives--;
          player.position.x = 380;
          player.position.y = 230;

          if(lives == 0)
          {
              GameOver();
          }
      }

      // Check for collisions with lasers
      for(j = 0; j < laserArr.length; j++)
      {
          if(CheckCollision(asteroidArr[i].scaledPoints, asteroidArr[i].x, asteroidArr[i].y, laserArr[j].x, laserArr[j].y, 3) == true)
          {
              laserHit.pause();
              laserHit.currentTime = 0;
              laserHit.play();

              laserArr[j] = 0;

              // Split into smaller asteroids
              switch(asteroidArr[i].size)
              {
                  case 1:
                      asteroidArr[i].size = 0;

                      score += 50;
                      scoreFeedDiv.innerHTML = "+50";
                      scoreFeedTimer = 0;
                      break;
                  case 2:
                      var len = asteroidArr.length;
                      var size = 1;
                      var velocity = asteroidArr[i].velocity * -1;
                      var angle = asteroidArr[i].angle * -1;
                      var spinAngle = asteroidArr[i].spinAngle * -1;
                      var x = asteroidArr[i].x + 15;
                      var y = asteroidArr[i].y + 15;
                      var type = Math.floor(Math.random() * 8) + 1;

                      var velocity2 = asteroidArr[i].velocity;
                      var angle2 = asteroidArr[i].angle;
                      var spinAngle2 = asteroidArr[i].spinAngle;
                      var y2 = asteroidArr[i].y;
                      var x2 = asteroidArr[i].x;
                      var type2 = Math.floor(Math.random() * 8) + 1;

                      asteroidArr[i] = new Asteroid(type, size, velocity, angle, spinAngle, x, y);
                      asteroidArr[len] = new Asteroid(type2, size, velocity2, angle2, spinAngle2, x2, y2);

                      score += 30;
                      scoreFeedDiv.innerHTML = "+30";
                      scoreFeedTimer = 0;

                      break;
                  case 3:
                      var len = asteroidArr.length;
                      var size = 2;
                      var velocity = asteroidArr[i].velocity * -1;
                      var angle = asteroidArr[i].angle * -1;
                      var spinAngle = asteroidArr[i].spinAngle * -1;
                      var x = asteroidArr[i].x + 30;
                      var y = asteroidArr[i].y + 30;
                      var type = Math.floor(Math.random() * 8) + 1;

                      var velocity2 = asteroidArr[i].velocity;
                      var angle2 = asteroidArr[i].angle;
                      var spinAngle2 = asteroidArr[i].spinAngle;
                      var y2 = asteroidArr[i].y;
                      var x2 = asteroidArr[i].x;
                      var type2 = Math.floor(Math.random() * 8) + 1;

                      asteroidArr[i] = new Asteroid(type, size, velocity, angle, spinAngle, x, y);
                      asteroidArr[len] = new Asteroid(type2, size, velocity2, angle2, spinAngle2, x2, y2);

                      score += 10;
                      scoreFeedDiv.innerHTML = "+10";
                      scoreFeedTimer = 0;
                      break;
              }
          }
      }
  }

  if(allAsteroidsDestroyed == true)
  {
      NewLevel();
  }
}

/**
  * @function render
  * Renders the current game state into a back buffer.
  * @param {DOMHighResTimeStamp} elapsedTime indicates
  * the number of milliseconds passed since the last frame.
  * @param {CanvasRenderingContext2D} ctx the context to render to
  */
function render(elapsedTime, ctx) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  levelDiv.innerHTML = level;
  scoreDiv.innerHTML = score;
    
    // Draw remaining lives
  var livesXindex = 535;
  ctx.beginPath();
  for(var i = 0; i < lives; i++)
  {
      ctx.fillStyle = "green";
      ctx.arc(livesXindex, 20, 6, 0, Math.PI * 2, true);
      ctx.fill();
      livesXindex += 20;
  }
  ctx.closePath();

    // Draw asteroids
  for(i = 0; i < asteroidArr.length; i++)
  {
      if (asteroidArr[i].size != 0)
      {
          asteroidArr[i].render(ctx);
      }
  }

    // Draw Lasers
  for (i = 0; i < numOfLasers; i++)
  {
      if (laserArr[i] != 0)
      {
          laserArr[i].render(ctx);
      }
  }

  player.render(elapsedTime, ctx);

    // Update fps
      fpsDiv.innerHTML = frameSnapshot;
}

/**
 * @constructor Game
 * Creates a new game object
 * @param {canvasDOMElement} screen canvas object to draw into
 * @param {function} updateFunction function to update the game
 * @param {function} renderFunction function to render the game
 */
function Game(screen, updateFunction, renderFunction) {
  this.update = updateFunction;
  this.render = renderFunction;

  // Set up buffers
  this.frontBuffer = screen;
  this.frontCtx = screen.getContext('2d');
  this.backBuffer = document.createElement('canvas');
  this.backBuffer.width = screen.width;
  this.backBuffer.height = screen.height;
  this.backCtx = this.backBuffer.getContext('2d');

  // Start the game loop
  this.oldTime = performance.now();
  this.paused = false;
}

/**
 * @function pause
 * Pause or unpause the game
 * @param {bool} pause true to pause, false to start
 */
Game.prototype.pause = function(flag) {
  this.paused = (flag == true);
}

/**
 * @function loop
 * The main game loop.
 * @param{time} the current time as a DOMHighResTimeStamp
 */
Game.prototype.loop = function(newTime) {
  var game = this;
  var elapsedTime = newTime - this.oldTime;
  this.oldTime = newTime;
  
  if (gameOverFlag == false)
  {
      if (!this.paused) this.update(elapsedTime);
      this.render(elapsedTime, this.frontCtx);
  }

  // Flip the back buffer
  this.frontCtx.drawImage(this.backBuffer, 0, 0);
}

const MS_PER_FRAME = 1000/8;

// rectangular shots fired from the players' ship
function Laser()
{
    this.angledLaser = RotateImage(laser, -(player.angle + 1.58));
    this.angle = player.angle;
    var spawnAngle = (player.angle % 6);


    if ((Math.abs(spawnAngle / 6) * 8) > 6)
    {
        this.x = (player.position.x - 45);
        this.y = (player.position.y - 20);
    }

    else if ((Math.abs(spawnAngle / 6) * 8) > 4)
    {
        this.x = (player.position.x - 18);
        this.y = (player.position.y + 12);
    }

    else if ((Math.abs(spawnAngle / 6) * 8) > 2)
    {
        this.x = (player.position.x + 15);
        this.y = (player.position.y - 20);
    }
    else {
        this.x = (player.position.x - 18);
        this.y = (player.position.y - 46);
    }
}

Laser.prototype.update = function()
{
    // Apply acceleration
    var acceleration = {
        x: Math.sin(this.angle),
        y: Math.cos(this.angle)
    };

    this.x -= (acceleration.x * 2);
    this.y -= (acceleration.y * 2);
}

Laser.prototype.render = function(ctx)
{
    ctx.drawImage(this.angledLaser, this.x, this.y);
}
/**
 * @constructor Player
 * Creates a new player object
 * @param {Postition} position object specifying an x and y
 */
function Player(position, canvas) {
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.state = "idle";
  this.position = {
    x: position.x,
    y: position.y
  };
  this.velocity = {
      x: 0,
      y: 0
  };
  this.maxVelocity = 2;
  this.angle = 0;
  this.radius  = 64;
  this.thrusting = false;
  this.reverseThusting = false;
  this.steerLeft = false;
  this.steerRight = false;

  var self = this;
  window.onkeydown = function(event) {
      switch (event.key) {
          case 'Space':
          case ' ':
              laserArr[numOfLasers] = new Laser();
              numOfLasers++;
              break;
          case 'ArrowUp': // up
          case 'w':
              self.thrusting = true;
              break;
          case 'ArrowDown': // down
          case 's':
              self.reverseThrusting = true;
              break;
          case 'ArrowLeft': // left
          case 'a':
              self.steerLeft = true;
              break;
          case 'ArrowRight': // right
          case 'd':
              self.steerRight = true;
              break;
      }
  }

  window.onkeyup = function(event) {
      switch (event.key) {
          case 'ArrowUp': // up
          case 'w':
              self.thrusting = false;
              break;
          case 'ArrowDown': // down
          case 's':
              self.reverseThrusting = false;
              break;
          case 'ArrowLeft': // left
          case 'a':
              self.steerLeft = false;
              break;
          case 'ArrowRight': // right
          case 'd':
              self.steerRight = false;
              break;
      }
  }
}

/**
 * @function updates the player object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Player.prototype.update = function(time) {
  // Apply angular velocity
  if(this.steerLeft) {
    this.angle += time * 0.005;
  }
  if(this.steerRight) {
    this.angle -= time * 0.005;
  }
  // Apply acceleration
  if(this.thrusting) {
    var acceleration = {
      x: Math.sin(this.angle),
      y: Math.cos(this.angle)
    }
    this.velocity.x -= (acceleration.x / 2);
    this.velocity.y -= (acceleration.y / 2);

      // If velocity now exceeds the maximum veloicity allowed, undo changes to the velocity
    if (Math.abs(this.velocity.x) > this.maxVelocity)
    {
        this.velocity.x += (acceleration.x/2);
    }
    if (Math.abs(this.velocity.y) > this.maxVelocity)
    {
        this.velocity.y += (acceleration.y / 2);
    }
  }
  if (this.reverseThrusting)
  {
      var acceleration = {
          x: Math.sin(this.angle),
          y: Math.cos(this.angle)
      }

      this.velocity.x += (acceleration.x / 2);
      this.velocity.y += (acceleration.y / 2);

      if (Math.abs(this.velocity.x) > this.maxVelocity) {
          this.velocity.x -= (acceleration.x / 2);
      }
      if (Math.abs(this.velocity.y) > this.maxVelocity) {
          this.velocity.y -= (acceleration.y / 2);
      }
  }
    // Movement decay
  if (!this.thrusting && !this.reverseThusting)
  {
      var acceleration = {
          x: Math.sin(this.angle),
          y: Math.cos(this.angle)
      }

      if (this.velocity.x > -0.25 && this.velocity.x < 0.25) {}
      else if (this.velocity.x > 0)
      {
          this.velocity.x += Math.abs(acceleration.x / 30) * -1;
      }
      else if (this.velocity.x < 0)
      {
          this.velocity.x += Math.abs(acceleration.x / 30);
      }

      if (this.velocity.y > -0.25 && this.velocity.y < 0.25) {}
      else if (this.velocity.y > 0)
      {
          this.velocity.y += Math.abs(acceleration.y / 30) * -1;
      }
      else if (this.velocity.y < 0)
      {
          this.velocity.y += Math.abs(acceleration.y / 30);
      }

  }


  // Apply velocity
  this.position.x += (this.velocity.x / 2);
  this.position.y += (this.velocity.y / 2);
  // Wrap around the screen
  if(this.position.x < 0) this.position.x += this.worldWidth;
  if(this.position.x > this.worldWidth) this.position.x -= this.worldWidth;
  if(this.position.y < 0) this.position.y += this.worldHeight;
  if (this.position.y > this.worldHeight) this.position.y -= this.worldHeight;
}

/**
 * @function renders the player into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Player.prototype.render = function(time, ctx) {
  ctx.save();

  // Draw player's ship
  ctx.translate(this.position.x, this.position.y);
  ctx.rotate(-this.angle);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-10, 10);
  ctx.lineTo(0, 0);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.strokeStyle = 'white';
  ctx.stroke();

  // Draw engine thrust
  if(this.thrusting) {
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(5, 10);
    ctx.arc(0, 10, 5, 0, Math.PI, true);
    ctx.closePath();
    ctx.strokeStyle = 'orange';
    ctx.stroke();
  }
  ctx.restore();
}

// Constructs an asteroid
function Asteroid(randType, randSize, randVelocity, randAngle, randSpingAngle, randX, randY)
{
    this.worldWidth = canvas.width;
    this.worldHeight = canvas.height;

    this.size = randSize;
    this.velocity = randVelocity;
    this.angle = randAngle;
    this.points;
    this.scaledPoints;
    this.x = randX;
    this.y = randY;
    this.spinAngle = randSpingAngle;

    // Possible asteroid type presets
    switch(randType)
    {
        case 1:
            this.points = [-8, -11, -20, -11, -20, 1, -11, 4, -7, -2, -13, -5, -8, -11];
            break;
        case 2:
            this.points = [-13, -10, -3, -10, 1, -6, -4, -1, -7, -5, -11, -1, -17, -3, -19, -8, -13, -10];
            break;
        case 3:
            this.points = [-9, -10, 1, -4, -6, 4, -14, 6, -14, -2, -15, -7, -9, -10];
            break;
        case 4:
            this.points = [-8,-10,-4,-6,1,-10,2,-4,-2,-1,-1,2,-8,4,-6,-2,-13,-5,-8,-10];
            break;
        case 5:
            this.points = [-8,-9,3,-5,-3,0,0,5,-6,8,-15,6,-10,-1,-11,-5,-7,-5,-8,-9];
            break;
        case 6:
            this.points = [-8,-11,-2,-11,4,-4,-2,-4,-7,-6,-10,-9,-8,-11];
            break;
        case 7:
            this.points = [-5,-10,-5,-6,1,-5,3,-13,0,-12,-2,-12,-5,-10];
            break;
        case 8:
            this.points = [-4, -11, -7, -8, -3, -3, 3, -3, 14, -7, 7, -11, 2, -9, -2, -11, -4, -11];
            break;
    }
    this.scaledPoints = this.points;
    this.x *= this.size;
    this.y *= this.size;

    for (t = 0; t < this.points.length; t++)
    {
        this.scaledPoints[t] = this.points[t] * (2.5 * this.size);
    }
}

Asteroid.prototype.update = function ()
{
    // Wrap screen
    if (this.x < (-30 * (this.size))) this.x = 760 + (30 * this.size);
    if (this.x > (760 + (30 * this.size))) this.x = -(30 * this.size);
    if (this.y < (-30 * this.size)) this.y = 480 + (30 * this.size);
    if (this.y > (480 + (30 * this.size))) this.y = -(30 * this.size);

    this.x += (this.velocity * Math.cos(this.angle)) / 10;
    this.y += (this.velocity * Math.sin(this.angle)) / 10;
    Rotate(this, this.spinAngle);


}
Asteroid.prototype.render = function (ctx)
{
    ctx.save();

    ctx.translate(this.x, this.y);
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(this.scaledPoints[0], this.scaledPoints[1]);
    for(i = 2; i < this.scaledPoints.length; i+= 2)
    {
        ctx.lineTo(this.scaledPoints[i],this.scaledPoints[i+1]);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}

/**
 * @function masterLoop
 * Advances the game in sync with the refresh rate of the screen
 * @param {DOMHighResTimeStamp} timestamp the current time
 */
var masterLoop = function (timestamp) {
    game.loop(timestamp);
    window.requestAnimationFrame(masterLoop);
}
masterLoop(performance.now());
