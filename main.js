var randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)

class Color {
  constructor(r = 255, g = 255, b = 255, a = 255) {
    this.r = r
    this.g = g
    this.b = b
    this.a = a
  }
}

var WHITE = new Color()
var BLACK = new Color(0, 0, 0)
var RED = new Color(255, 0, 0)
var GREEN = new Color(0, 255, 0)
var BLUE = new Color(0, 0, 255)
var RGB = [RED, GREEN, BLUE]

function lerpRGB(color1, color2, t) {
  var r = color1.r + ((color2.r - color1.r) * t)
  var g = color1.g + ((color2.g - color1.g) * t)
  var b = color1.b + ((color2.b - color1.b) * t)
  return new Color(r, g, b)
}

function makeBox() {
  var x = randomInt(0, 300)
  var y = randomInt(0, 300)
  var size = randomInt(10, 50)
  var speed = randomInt(1, 10)

  var box =  new Box(x, y, size, size)
  box.speed = speed 

  return box
}

class PixelManager {
  BYTES_PER_PIXEL = 4

  constructor(imageData) {
    this.imageData = imageData
    this.framebuffer = this.imageData.data
  }

  setIndex(i, color) {
    var { r, g, b, a } = color
    this.framebuffer[i+0] = r
    this.framebuffer[i+1] = g
    this.framebuffer[i+2] = b
    this.framebuffer[i+3] = a
  }

  setLocation(x, y, color) {
    if (x >= this.imageData.width || y >= this.imageData.height) return
    var i = this.locationToIndex(x, y)
    var { r, g, b, a } = color
    this.framebuffer[i+0] = r
    this.framebuffer[i+1] = g
    this.framebuffer[i+2] = b
    this.framebuffer[i+3] = a
  }

  setAll(color) {
    for (let index = 0; index < this.framebuffer.length; index += this.BYTES_PER_PIXEL) {
      this.setIndex(index, color)
    }
  }

  locationToIndex(x, y) {
    return (y * this.imageData.width + x) * this.BYTES_PER_PIXEL   
  }

  indexToLocation(index) {
    var pixelIndex = Math.floor(index / this.BYTES_PER_PIXEL)
    var y = Math.floor(pixelIndex / this.imageData.width)
    var x = pixelIndex % this.imageData.width
    return { x, y }
  }

  fillRectangle(x0, y0, width, height, color) {
    for (var y = y0; y < y0 + height; y++) {
      for (var x = x0; x < x0 + width; x++) {
        this.setLocation(x, y, color)
      }
    }
  }
}

class Box {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.position = { x, y }
    this.speed = 1
  }

  move() {
    this.x += this.speed
  }
}

class Scene {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d') 
    this.width = canvas.width
    this.height = canvas.height
    this.pixels = new PixelManager(this.ctx.getImageData(0, 0, this.width, this.height))

    // models
    this.boxes = Array.from(Array(5)).map(() => makeBox())
  }

  clear() {
    this.pixels.setAll(WHITE)
  }

  beginFrame() {
    this.clear()
  }

  updateModel(ms) {
    const isOut = p => (p.x + p.speed) <= 0 || (p.x + p.width) > this.width

    for (const box of this.boxes) {
      if (isOut(box)) box.speed = -box.speed
      box.color = RGB[randomInt(0, RGB.length - 1)]
      box.move()
    }
  }

  composeFrame(ms) {
  }

  endFrame() {
    for (const box of this.boxes) {
      this.pixels.fillRectangle(box.x, box.y, box.width, box.height, box.color)
    }
    this.ctx.putImageData(this.pixels.imageData, 0, 0)
  }

  overlay() {
    if (this.stdout) this.ctx.fillText(this.stdout, 10, 10)
  }
}

class Sandbox {
  constructor (props) {
    this.width = props.width
    this.height = props.height
    this.aspect = this.width / this.height
    this.msPerFrame = 1000 / props.fps
    this.nextFrame = props.raf
    this.canvas = props.canvas
    this.initialize()
  }

  initialize() {
    this.lastRun = performance.now()
    this.lastFrame = 0
    this.scene = new Scene(this.canvas)
  }

  requestFrame() {
    this.nextFrame((dt) => {
      this.requestFrame()
      this.render(dt * 0.001)
    })

    var msNow = performance.now()
    var msElapsed = msNow - this.lastRun
    if (msElapsed > this.msPerFrame) {
      var msExceeded = msElapsed % this.msPerFrame
      this.lastRun = msNow - msExceeded
      this.lastFrame += 1
    }
  }

  render(time) {
    this.scene.beginFrame()
    this.scene.updateModel(time)
    this.scene.composeFrame(time)
    this.scene.endFrame()
    this.scene.overlay()
  }

  currentFrame() {
    return this.lastFrame
  }

  // helper function to debug fixed frame rate.
  logFPS() {
    setInterval(() => console.log(this.currentFrame()), 1000)
  }
}

window.addEventListener('load', function() {
  var canvas = document.getElementById('canvas')
  canvas.style.imageRendering = 'pixelated'
  canvas.width = 400
  canvas.height = 400

  var sandbox = new Sandbox({
    fps: 60,
    width: canvas.width,
    height: canvas.height,
    canvas,
    raf: requestAnimationFrame.bind(window),
  })

  sandbox.requestFrame()
  // sandbox.logFPS()
})
