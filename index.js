var regl = require('regl')()
var resl = require('resl')
var mat4 = require('gl-mat4')

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

  // blend: {
  //   enable: true,
  //   func: { src: 'src alpha', dst: 'one minus src alpha' }
  // },

  uniforms: {
    view: function (info) {
      const t = info.tick * 0.01
      // return mat4.lookAt([], [0, 0, 0], [1, -1, 1], [0, 1, 0])
      return mat4.lookAt([], [0, 0, 0], [Math.cos(t), Math.cos(-t), Math.sin(t)], [0, 1, 0])
    },
    projection: function (info) {
      return mat4.perspective([],
                              Math.PI / 4,
                              info.viewportWidth / info.viewportHeight,
                              0.01,
                              1000)
    },
    tex: regl.prop('texture')
  }
})

function run (res) {
  regl.frame(function () {
    regl.clear({
      color: [0.1, 0, 0.1, 1],
      depth: 1
    })
    skybox({texture:res.skybox})
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
    }
  },
  onDone: run
})
