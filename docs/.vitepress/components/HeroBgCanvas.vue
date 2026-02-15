<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useData } from "vitepress";

const canvasRef = ref<HTMLCanvasElement>();
const { isDark } = useData();
let cleanup: (() => void) | null = null;

function initWebGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
  if (!gl) return null;

  const vsSource = `attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0,1);}`;
  const fsSource = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_bg;
uniform float u_intensity;
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  float t=u_time*0.3;
  vec3 c1=vec3(1.0,0.376,0.565);
  vec3 c2=vec3(1.0,0.251,0.506);
  vec3 c3=vec3(0.212,0.773,0.816);
  float m1=sin(uv.x*3.0+t)*0.5+0.5;
  float m2=cos(uv.y*2.5-t*0.7)*0.5+0.5;
  float m3=sin((uv.x+uv.y)*2.0+t*0.5)*0.5+0.5;
  vec3 brand=mix(c1,c2,m1);
  brand=mix(brand,c3,m2*0.6);
  brand=mix(brand,c1,m3*0.3);
  vec3 col=u_bg+brand*u_intensity;
  gl_FragColor=vec4(col,1.0);
}`;

  function compile(type: number, src: string) {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  }

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "u_resolution");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uBg = gl.getUniformLocation(prog, "u_bg");
  const uIntensity = gl.getUniformLocation(prog, "u_intensity");

  // Dark: #16161a → (0.086, 0.086, 0.102), Light: #f6f6f7 → (0.965, 0.965, 0.969)
  const darkBg = [0.086, 0.086, 0.102] as const;
  const lightBg = [0.965, 0.965, 0.969] as const;
  const darkIntensity = 0.08;
  const lightIntensity = 0.18;
  let currentBg = isDark.value ? [...darkBg] : [...lightBg];
  let targetBg = [...currentBg];
  let currentIntensity = isDark.value ? darkIntensity : lightIntensity;
  let targetIntensity = currentIntensity;

  function setTheme(dark: boolean) {
    targetBg = dark ? [...darkBg] : [...lightBg];
    targetIntensity = dark ? darkIntensity : lightIntensity;
  }

  let raf = 0;
  const start = performance.now();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  function render() {
    const t = (performance.now() - start) / 1000;
    // Lerp background and intensity toward target
    for (let i = 0; i < 3; i++) {
      currentBg[i] += (targetBg[i] - currentBg[i]) * 0.12;
    }
    currentIntensity += (targetIntensity - currentIntensity) * 0.12;
    gl!.uniform2f(uRes, canvas.width, canvas.height);
    gl!.uniform1f(uTime, t);
    gl!.uniform3f(uBg, currentBg[0], currentBg[1], currentBg[2]);
    gl!.uniform1f(uIntensity, currentIntensity);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(render);
  }
  render();

  return {
    setTheme,
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}

let instance: ReturnType<typeof initWebGL> = null;

onMounted(() => {
  if (canvasRef.value) {
    instance = initWebGL(canvasRef.value);
  }
});

watch(isDark, (dark) => {
  instance?.setTheme(dark);
});

onUnmounted(() => {
  instance?.destroy();
});
</script>

<template>
  <canvas ref="canvasRef" class="hero-bg-canvas" aria-hidden="true"></canvas>
</template>

<style scoped>
.hero-bg-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  opacity: 1;
  pointer-events: none;
  z-index: 0;
}
</style>
