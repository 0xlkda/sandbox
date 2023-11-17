var RENDER_ONLY_ONCE = false
var MIN = Math.min
var MAX = Math.max
var MODEL_COUNT = 10
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
var COLORS = [RED, GREEN, BLUE, BLACK]

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

function makeTriangle() {
  var v0 = { x: randomInt(20, 400), y: randomInt(20, 400) }
  var v1 = { x: randomInt(20, 400), y: randomInt(20, 400) }
  var v2 = { x: randomInt(20, 400), y: randomInt(20, 400) }

  var speed = randomInt(1, 10)
  var triangle =  new Triangle(v0, v1, v2)
  triangle.speed = speed 

  return triangle
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
    if (x < 0 || y < 0) return
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

  isTopLeft(start, end) {
    var edge = { x: end.x - start.x, y: end.y - start.y}
    var is_top_edge = edge.y == 0 && edge.x > 0
    var is_left_edge = edge.y < 0
    return is_left_edge || is_top_edge
  }

  edgeCross(a, b, p) {
    var ab = { x: b.x - a.x, y: b.y - a.y }
    var ap = { x: p.x - a.x, y: p.y - a.y }
    return ab.x * ap.y - ab.y * ap.x
  }

  fillTriangle(v0, v1, v2, color) {
    // Finds the bounding box with all candidate pixels
    var x_min = MIN(MIN(v0.x, v1.x), v2.x)
    var y_min = MIN(MIN(v0.y, v1.y), v2.y)
    var x_max = MAX(MAX(v0.x, v1.x), v2.x)
    var y_max = MAX(MAX(v0.y, v1.y), v2.y)

    // Compute the constant delta_s that will be used for the horizontal and vertical steps
    var delta_w0_col = (v1.y - v2.y)
    var delta_w1_col = (v2.y - v0.y)
    var delta_w2_col = (v0.y - v1.y)
    var delta_w0_row = (v2.x - v1.x)
    var delta_w1_row = (v0.x - v2.x)
    var delta_w2_row = (v1.x - v0.x)

    // Rasterization fill convention (top-left rule)
    var bias0 = this.isTopLeft(v1, v2) ? 0 : -1
    var bias1 = this.isTopLeft(v2, v0) ? 0 : -1
    var bias2 = this.isTopLeft(v0, v1) ? 0 : -1

    // Compute the edge functions for the fist (top-left) point
    var p0 = { x: x_min, y: y_min}
    var w0_row = this.edgeCross(v1, v2, p0) + bias0
    var w1_row = this.edgeCross(v2, v0, p0) + bias1
    var w2_row = this.edgeCross(v0, v1, p0) + bias2

    // Loop all candidate pixels inside the bounding box
    for (var y = y_min; y <= y_max; y++) {
      var w0 = w0_row
      var w1 = w1_row
      var w2 = w2_row

      for (var x = x_min; x <= x_max; x++) {
        var is_inside = w0 >= 0 && w1 >= 0 && w2 >= 0
        if (is_inside) {
          this.setLocation(x, y, color)
        }
        w0 += delta_w0_col
        w1 += delta_w1_col
        w2 += delta_w2_col
      }
      w0_row += delta_w0_row
      w1_row += delta_w1_row
      w2_row += delta_w2_row
    }
  }
}

class Triangle {
  constructor(v0, v1, v2) {
    this.v0 = v0
    this.v1 = v1
    this.v2 = v2
    this.position = { v0, v1, v2 }
    this.speed = 1
    this.color = BLACK
  }

  move() {
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
    this.boxes = Array.from(Array(0)).map(() => makeBox())
    this.triangles = Array.from(Array(MODEL_COUNT)).map(() => makeTriangle())
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
      box.color = COLORS[randomInt(0, COLORS.length - 1)]
      box.move()
    }

    for (const triangle of this.triangles) {
      if (isOut(triangle)) triangle.speed = -triangle.speed
      triangle.color = COLORS[randomInt(0, COLORS.length - 1)]
      triangle.move()
    }
  }

  composeFrame(ms) {
  }

  endFrame() {
    for (const box of this.boxes) {
      this.pixels.fillRectangle(box.x, box.y, box.width, box.height, box.color)
    }

    for (const triangle of this.triangles) {
      this.pixels.fillTriangle(triangle.v0, triangle.v1, triangle.v2, triangle.color)
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
    if (RENDER_ONLY_ONCE) {
      this.render(0)
    } else {
      this.nextFrame((dt) => {
        this.requestFrame()
        this.render(dt * 0.001)
      })
    }

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
