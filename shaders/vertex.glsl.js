var myVertexShader = `
varying vec3 vPosition;
varying float vVertexScale;
varying vec4 vPositionRot;
attribute vec3 aVertexPosition;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform float uVertexScale;
void main(void) {
    vPosition = aVertexPosition;
    vVertexScale = uVertexScale;
    vec3 vPos = aVertexPosition;
    vPos.xy *= uVertexScale; //should I multiply z by this as well?
    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);
    vPositionRot = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
}
`;