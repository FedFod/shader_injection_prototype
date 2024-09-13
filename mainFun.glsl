void main() {
    jit_out.jit_Surface_normal = transpose(inverse(mat3x3(modelViewMatrix))) * jit_normal * -1;
    jit_out.jit_Surface_position = modelViewMatrix * vec4(jit_position, 1.);
    vec3 newPos = jit_position;
    newPos.x = sin(newPos.x*10);
    gl_Position = modelViewProjectionMatrix*vec4(newPos, 1.);
}