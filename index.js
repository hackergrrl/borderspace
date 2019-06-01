var regl = require('regl')()
var resl = require('resl')
var mat4 = require('gl-mat4')
var quat = require('gl-quat')
var vec3 = require('gl-vec3')
var keydown = require('key-pressed')
var Voxel = require('./voxel')

var atlas = {}

var look = quat.create()
quat.setAxes(
  look,
  vec3.fromValues(0,0,1),
  vec3.fromValues(1,0,0),
  vec3.fromValues(0,1,0))
var campos = vec3.fromValues(0, 0, 0)
var camera = mat4.create()

var positions = [
  // top
  [-0.5, +0.5, +0.5],
  [+0.5, +0.5, +0.5],
  [+0.5, +0.5, -0.5],
  [-0.5, +0.5, -0.5],
  // bottom
  [-0.5, -0.5, +0.5],
  [+0.5, -0.5, +0.5],
  [+0.5, -0.5, -0.5],
  [-0.5, -0.5, -0.5],
  // front
  [-0.5, +0.5, +0.5],
  [+0.5, +0.5, +0.5],
  [+0.5, -0.5, +0.5],
  [-0.5, -0.5, +0.5],
  // back
  [-0.5, +0.5, -0.5],
  [-0.5, -0.5, -0.5],
  [+0.5, -0.5, -0.5],
  [+0.5, +0.5, -0.5],
  // left
  [-0.5, +0.5, -0.5],
  [-0.5, +0.5, +0.5],
  [-0.5, -0.5, +0.5],
  [-0.5, -0.5, -0.5],
  // right
  [+0.5, +0.5, -0.5],
  [+0.5, -0.5, -0.5],
  [+0.5, -0.5, +0.5],
  [+0.5, +0.5, +0.5],
]
var u = 1/4
var v = 1/3
var uv = [
  [1*u, 1*v], [2*u,1*v], [2*u,0*v], [1*u,0*v], // top
  [1*u, 2*v], [2*u,2*v], [2*u,3*v], [1*u,3*v], // bottom
  [1*u, 1*v], [2*u,1*v], [2*u,2*v], [1*u,2*v], // front
  [4*u, 1*v], [4*u,2*v], [3*u,2*v], [3*u,1*v], // back
  [0*u, 1*v], [1*u,1*v], [1*u,2*v], [0*u,2*v], // left
  [3*u, 1*v], [3*u,2*v], [2*u,2*v], [2*u,1*v], // right
]
var elements = [
  // top
  [0,  1,  2], [0,  2,  3],
  // bottom
  [4,  5,  6], [4,  6,  7],
  // front
  [8,  9, 10], [8, 10, 11],
  // back
  [12, 13, 14],[12, 14, 15],
  // left
  [16, 17, 18],[16, 18, 19],
  // right
  [20, 21, 22],[20, 22, 23]
]

var skybox = regl({
  frag: `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D tex;
  void main () {
    gl_FragColor = texture2D(tex, vUv);
  }
  `,

  vert: `
  precision mediump float;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  uniform mat4 projection, view;
  void main () {
    vUv = uv;
    gl_Position = projection * view * vec4(position, 1);
  }
  `,

  elements: elements,

  attributes: {
    position: positions,
    uv: uv
  },

  uniforms: {
    view: function (info) {
      var out = quat.create()
      quat.invert(out, look)
      var res = mat4.create()
      mat4.fromQuat(res, out)
      return res
    },
    projection: function (info) {
      return mat4.perspective([],
                              Math.PI / 4,
                              info.viewportWidth / info.viewportHeight,
                              1,
                              800)
    },
    tex: regl.prop('texture')
  }
})

function rand (min, max) {
  return Math.random() * (max - min) + min
}

function randsphere (size) {
  return [rand(-size,size), rand(-size,size), rand(-size,size)]
}

function distance3 (a, b) {
  var tmp = vec3.create()
  vec3.subtract(tmp, b, a)
  return vec3.length(tmp)
}

var NUM_POINTS = 1000
var stars = new Array(NUM_POINTS).fill(0).map((_, i) => randsphere(2.5))
var starfield = regl({
  vert: `
  precision mediump float;
  attribute vec3 position;
  varying float vAlpha;
  uniform mat4 view, projection;
  void main() {
    gl_PointSize = 3.0;
    gl_Position = projection * view * vec4(position, 1);
    vAlpha = 1.0 - (view * vec4(position, 1)).z * -0.5;
  }`,

  frag: `
  precision lowp float;
  varying float vAlpha;
  void main() {
    if (length(gl_PointCoord.xy - 0.5) > 0.5) {
      discard;
    }
    gl_FragColor = vec4(1, 1, 1, vAlpha);
  }`,

  attributes: {
    position: regl.prop('positions')
  },

  blend: {
    enable: true,
    func: {
      src: 'src alpha',
      dst: 'one minus src alpha'
    }
  },

  uniforms: {
    view: function (info) {
      var out = quat.create()
      quat.invert(out, look)
      var res = mat4.create()
      mat4.fromQuat(res, out)
      mat4.multiply(res, res, camera)
      return res
    },
    projection: function (info) {
      return mat4.perspective([],
                              Math.PI / 4,
                              info.viewportWidth / info.viewportHeight,
                              0.05,
                              30)
    },
  },

  count: NUM_POINTS,

  primitive: 'points'
})

function run (res) {
  var map = new Voxel(regl, 10, 10, 10, atlas, 16, 16)
  map.defineTile('block1', [0, 2], [0, 1], [0, 1])
  for (var i=0; i < map.width; i++) {
    for (var j=0; j < map.depth; j++) {
      for (var k=0; k < map.height; k++) {
        if (Math.random() < 0.5) map.set(i, k, j, 'block1'); else map.set(i, k, j, null)
        // if (i === 0 || i === map.width-1 || j === 0 || j === map.depth-1 || k === 0 || k === map.height-1) {
        //   map.set(i, k, j, 'block1')
        // } else {
        //   map.set(i, k, j, null)
        // }
      }
    }
  }
  map.generateGeometry()
  for (var i=0; i < map.width; i++) {
    for (var j=0; j < map.depth; j++) {
      for (var k=0; k < map.height; k++) {
        map.lightBoxSet(i, k, j, function (pos, normal) {
          return [0.8, 0.8, 0.8]
        })
      }
    }
  }

  regl.frame(function (info) {
    // input
    if (keydown('W')) {
      quat.rotateX(look, look, +0.01)
    }
    if (keydown('S')) {
      quat.rotateX(look, look, -0.01)
    }
    if (keydown('D')) {
      quat.rotateZ(look, look, -0.01)
    }
    if (keydown('A')) {
      quat.rotateZ(look, look, +0.01)
    }

    // move camera forward
    var delta = vec3.create()
    var forward = vec3.fromValues(0, 0, keydown('<space>') ? -0.02 : -0.002)
    // forward[2] = 0
    vec3.transformQuat(delta, forward, look)
    vec3.add(campos, campos, delta)
    mat4.fromTranslation(camera, [-campos[0], -campos[1], -campos[2]])

    // move distant stars back into area around camera
    var pushAhead = vec3.create()
    vec3.scale(pushAhead, delta, 5.0)
    stars = stars.map(function (star) {
      var pos = vec3.fromValues(star[0], star[1], star[2])
      if (distance3(campos, pos) > 2.5) {
        // assign it a new place on the edge of the unit-sized sphere around the camera
        pos = vec3.fromValues(rand(-10,10), rand(-10,10), rand(-10,10))
        vec3.normalize(pos, pos)
        vec3.scale(pos, pos, 2)
        vec3.add(pos, pos, campos)
        vec3.add(pos, pos, pushAhead)
        return pos
      } else {
        return star
      }
    })

    // draw
    regl.clear({
      color: [0.1, 0, 0.1, 1],
      depth: 1
    })
    skybox({texture:res.skybox})
    starfield({positions: stars})

    var out = quat.create()
    quat.invert(out, look)
    var view = mat4.create()
    mat4.fromQuat(view, out)
    mat4.multiply(view, view, camera)

    map.draw({
      projection: mat4.perspective([],
                                Math.PI / 4,
                                info.viewportWidth / info.viewportHeight,
                                0.01,
                                1000),

      view: view
    })
  })
}

resl({
  manifest: {
    skybox: {
      type: 'image',
      src: 'skybox.png',
      parser: function (data) {
        return regl.texture({
          data: data,
          mag: 'linear',
          min: 'linear'
        })
      }
    },
    tileAtlas: {
      type: 'image',
      src: 'atlas.png',
      parser: function (data) {
        var tex = regl.texture({
          data: data,
          min: 'nearest',
          mag: 'nearest'
        })
        atlas = {
          width: data.width,
          height: data.height,
          data: tex
        }
        return tex
      }
    }
  },
  onDone: run
})
