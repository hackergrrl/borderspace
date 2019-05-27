var regl = require('regl')()

regl.clear({
  color: [0.1, 0, 0.1, 1],
  depth: 1
})

var draw = regl({
  frag: `
  precision mediump float;
  varying vec4 vColor;
  void main () {
    gl_FragColor = vColor;
  }
  `,

  vert: `
  precision mediump float;
  attribute vec2 position;
  attribute vec4 color;
  varying vec4 vColor;
  void main () {
    gl_Position = vec4(position, 0, 1);
    vColor = color;
  }
  `,

  attributes: {
    position: [
      [-1, 0],
      [0, -1],
      [1, 1]
    ],
    color: [
      [0.7, 0.7, 0.7, 1],
      [0.5, 0.5, 0.5, 1],
      [0.3, 0.3, 0.3, 1],
    ]
  },

  count: 3
})

draw()

// attribute: per-vertex feature
// uniform: constants

