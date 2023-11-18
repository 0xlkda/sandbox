var RENDER_ONLY_ONCE = false
var MIN = Math.min
var MAX = Math.max
var ABS = Math.abs
var ROUND = Math.round
var MODEL_COUNT = 10
var randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)

class Vector2 {
  constructor (x, y) {
    this.x = x
    this.y = y
    this.elements = [x, y]
  }
}

class Vector3 {
  constructor (x, y, z) {
    this.x = x
    this.y = y
    this.z = z
    this.elements = [x, y, z]
  }
}

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
var COLORS = [RED, GREEN, BLUE]

function lerpRGB(color1, color2, t) {
  var r = color1.r + ((color2.r - color1.r) * t)
  var g = color1.g + ((color2.g - color1.g) * t)
  var b = color1.b + ((color2.b - color1.b) * t)
  return new Color(r, g, b)
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

  // LINE
  fillLine(v1, v2, color) {
    var v1x = v1.x, v1y = v1.y
    var v2x = v2.x, v2y = v2.y
    var dx = v2x - v1x
    var dy = v2y - v1y

    if (dx === 0 && dy === 0) {
      this.setLocation(v1x, v1y, color)
    } else if (ABS(dy) > ABS(dx)) {
      if (dy < 0) {
        var _v1 = v1
        var v1 = v2
        var v2 = _v1
        var v1x = v1.x, v1y = v1.y
        var v2x = v2.x, v2y = v2.y
      }

      var slope = dx / dy
      var y = v1y
      var lastY
      for(var x = v1x; y < v2y; y += 1, x += slope) {
        lastY = y
        this.setLocation(ROUND(x), ROUND(lastY), color)
      }

      if(v2y > lastY ) {
        this.setLocation(ROUND(v2x), ROUND(v2y), color)
      }
    } else {
      if (dx < 0) {
        var _v1 = v1
        var v1 = v2
        var v2 = _v1
        var v1x = v1.x, v1y = v1.y
        var v2x = v2.x, v2y = v2.y
      }

      var slope = dy / dx
      var x = v1x
      var lastX
      for(var y = v1y; x < v2x; x += 1, y += slope) {
        lastX = x
        this.setLocation(ROUND(lastX), ROUND(y), color)
      }

      if( v2x > lastX ) {
        this.setLocation(ROUND(v2x), ROUND(v2y), color)
      }
    }
  }

  // BOX
  fillRectangle(x0, y0, width, height, color) {
    for (var y = y0; y < y0 + height; y++) {
      for (var x = x0; x < x0 + width; x++) {
        this.setLocation(x, y, color)
      }
    }
  }

  strokeRectangle(x0, y0, width, height, color) {
    var vertex1 = new Vector2(x0, y0) 
    var vertex2 = new Vector2(x0 + width, y0) 
    var vertex3 = new Vector2(x0 + width, y0 + height) 
    var vertex4 = new Vector2(x0, y0 + height) 

    this.fillLine(vertex1, vertex2, color)
    this.fillLine(vertex2, vertex3, color)
    this.fillLine(vertex3, vertex4, color)
    this.fillLine(vertex4, vertex1, color)
  }

  // TRIANGLE
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

  fillTriangle(v1, v2, v3, color) {
    // Finds the bounding box with all candidate pixels
    var x_min = MIN(MIN(v1.x, v2.x), v3.x)
    var y_min = MIN(MIN(v1.y, v2.y), v3.y)
    var x_max = MAX(MAX(v1.x, v2.x), v3.x)
    var y_max = MAX(MAX(v1.y, v2.y), v3.y)

    // Compute the constant delta_s that will be used for the horizontal and vertical steps
    var delta_w1_col = (v2.y - v3.y)
    var delta_w2_col = (v3.y - v1.y)
    var delta_w3_col = (v1.y - v2.y)
    var delta_w1_row = (v3.x - v2.x)
    var delta_w2_row = (v1.x - v3.x)
    var delta_w3_row = (v2.x - v1.x)

    // Rasterization fill convention (top-left rule)
    var bias1 = this.isTopLeft(v2, v3) ? 0 : -1
    var bias2 = this.isTopLeft(v3, v1) ? 0 : -1
    var bias3 = this.isTopLeft(v1, v2) ? 0 : -1

    // Compute the edge functions for the fist (top-left) point
    var p0 = { x: x_min, y: y_min}
    var w1_row = this.edgeCross(v2, v3, p0) + bias1
    var w2_row = this.edgeCross(v3, v1, p0) + bias2
    var w3_row = this.edgeCross(v1, v2, p0) + bias3

    // Loop all candidate pixels inside the bounding box
    for (var y = y_min; y <= y_max; y++) {
      var w1 = w1_row
      var w2 = w2_row
      var w3 = w3_row

      for (var x = x_min; x <= x_max; x++) {
        var is_inside = w1 >= 0 && w2 >= 0 && w3 >= 0
        if (is_inside) {
          this.setLocation(x, y, color)
        }
        w1 += delta_w1_col
        w2 += delta_w2_col
        w3 += delta_w3_col
      }

      w1_row += delta_w1_row
      w2_row += delta_w2_row
      w3_row += delta_w3_row
    }
  }

  strokeTriangle(v1, v2, v3, color) {
    this.fillLine(v1, v2, color)
    this.fillLine(v2, v3, color)
    this.fillLine(v3, v1, color)
  }
}

class Triangle {
  constructor(v1, v2, v3) {
    this.v1 = v1
    this.v2 = v2
    this.v3 = v3
    this.position = { v1, v2, v3 }
    this.speed = 1
    this.color = BLACK
  }

  move() {
  }

  static make() {
    var v1 = new Vector2(randomInt(20, 400), randomInt(20, 400))
    var v2 = new Vector2(randomInt(20, 400), randomInt(20, 400))
    var v3 = new Vector2(randomInt(20, 400), randomInt(20, 400))

    var speed = randomInt(1, 10)
    var triangle =  new Triangle(v1, v2, v3)
    triangle.fill = true
    triangle.speed = speed 

    return triangle
  }

  static makeStroke() {
    var v1 = new Vector2(randomInt(20, 400), randomInt(20, 400))
    var v2 = new Vector2(randomInt(20, 400), randomInt(20, 400))
    var v3 = new Vector2(randomInt(20, 400), randomInt(20, 400))

    var speed = randomInt(1, 10)
    var triangle =  new Triangle(v1, v2, v3)
    triangle.fill = false
    triangle.speed = speed 

    return triangle
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

  static make() {
    var [x, y] = new Vector2(randomInt(0, 300), randomInt(0, 300)).elements
    var size = randomInt(10, 50)
    var speed = randomInt(1, 10)

    var box =  new Box(x, y, size, size)
    box.fill = true
    box.speed = speed 

    return box
  }
  static makeStroke() {
    var [x, y] = new Vector2(randomInt(0, 300), randomInt(0, 300)).elements
    var size = randomInt(10, 50)
    var speed = randomInt(1, 10)

    var box =  new Box(x, y, size, size)
    box.fill = false
    box.speed = speed 

    return box
  }
}

class Line {
  constructor(v1, v2) {
    this.v1 = v1
    this.v2 = v2
  }

  move() {}
  static make() {
    var v1 = new Vector2(randomInt(20, 400), randomInt(20, 400))
    var v2 = new Vector2(randomInt(20, 400), randomInt(20, 400))
    return new Line(v1, v2)
  }
} 

class Scene {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d') 
    this.width = canvas.width
    this.height = canvas.height
    this.pixels = new PixelManager(this.ctx.getImageData(0, 0, this.width, this.height))

    // models
    this.lines       = Array.from(Array(0)).map(() => Line.make())
    this.boxes       = Array.from(Array(MODEL_COUNT)).map(() => Box.makeStroke())
    this.triangles   = Array.from(Array(MODEL_COUNT)).map(() => Triangle.makeStroke())
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

    for (const line of this.lines) {
      if (isOut(line)) line.speed = -line.speed
      line.color = COLORS[randomInt(0, COLORS.length - 1)]
      line.move()
    }
  }

  composeFrame(ms) {
  }

  putFrame() {
    for (const box of this.boxes) {
      if (box.fill) {
        this.pixels.fillRectangle(box.x, box.y, box.width, box.height, box.color)
      } else {
        this.pixels.strokeRectangle(box.x, box.y, box.width, box.height, box.color)
      }
    }

    for (const triangle of this.triangles) {
      if (triangle.fill) {
        this.pixels.fillTriangle(triangle.v1, triangle.v2, triangle.v3, triangle.color)
      } else {
        this.pixels.strokeTriangle(triangle.v1, triangle.v2, triangle.v3, triangle.color)
      }
    }

    for (const line of this.lines) {
      this.pixels.fillLine(line.v1, line.v2, line.color)
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
    this.scene.putFrame()
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
