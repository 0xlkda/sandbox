var RED = { red:255, green:0, blue:0, alpha:255 }
var GREEN = { red:0, green:255, blue:0, alpha:255 }
var BLUE = { red:0, green:0, blue:255, alpha:255 }
var WHITE = { red:255, green:255, blue:255, alpha:255 }

class PixelManager {
  BYTES_PER_PIXEL = 4

  constructor(imageData) {
    this.imageData = imageData
    this.framebuffer = this.imageData.data
    this.stdout = ''
  }

  setIndex(i, color) {
    if (i < 0 || i >= this.framebuffer.length) return
    var { red, green, blue, alpha } = color
    this.framebuffer[i+0] = red
    this.framebuffer[i+1] = green
    this.framebuffer[i+2] = blue
    this.framebuffer[i+3] = alpha
  }

  setLocation(x, y, color) {
    if (x >= this.imageData.width || y >= this.imageData.height) return
    var { red, green, blue, alpha } = color
    var i = this.locationToIndex(x, y)
    this.framebuffer[i+0] = red
    this.framebuffer[i+1] = green
    this.framebuffer[i+2] = blue
    this.framebuffer[i+3] = alpha
  }

  setAll(color) {
    for (let index = 0; index < this.framebuffer.length; index++) {
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

class Rect {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.position = { x, y }
    this.speed = 1
    this.stdout = ''
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
    this.box1 = new Rect(0, 0, 10, 10)
    this.box2 = new Rect(this.box1.x + 10, this.box1.y + 10, 10, 10)
    this.box3 = new Rect(this.box1.x + 20, this.box1.y + 20, 10, 10)

    this.box1.speed = 5
    this.box2.speed = 8
    this.box3.speed = 4
  }

  clear() {
    this.pixels.setAll(BLUE)
  }

  beginFrame() {
    this.clear()
  }

  updateModel(ms) {
    const isOut = p => (p.x) < 0 || (p.x + p.width) > this.width
    if (isOut(this.box1)) this.box1.speed = -this.box1.speed
    if (isOut(this.box2)) this.box2.speed = -this.box2.speed
    if (isOut(this.box3)) this.box3.speed = -this.box3.speed

    this.box1.move()
    this.box2.move()
    this.box3.move()
  }

  composeFrame(ms) {
  }

  endFrame() {
    this.pixels.fillRectangle(this.box1.x, this.box1.y, this.box1.width, this.box1.height, RED)
    this.pixels.fillRectangle(this.box2.x, this.box2.y, this.box2.width, this.box2.height, GREEN)
    this.pixels.fillRectangle(this.box3.x, this.box3.y, this.box3.width, this.box3.height, BLUE)
    this.ctx.putImageData(this.pixels.imageData, 0, 0)
  }

  overlay() {
    this.ctx.fillText(this.box1.stdout, 10, 10)
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
    fps: 30,
    width: canvas.width,
    height: canvas.height,
    canvas,
    raf: requestAnimationFrame.bind(window),
  })

  sandbox.requestFrame()
  // sandbox.logFPS()
})
