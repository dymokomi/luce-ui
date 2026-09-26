// The ColorWheel's field: a hue ring around a saturation/brightness triangle
// (turning with the hue, as GIMP's and Krita's) or square, or a hue/saturation
// disc. Colors are HSV of encoded sRGB, as Photoshop's HSB, decoded to linear
// for the target. Every edge is covered by its distance in target pixels, so
// the shapes stay anti-aliased at any size and scale. Output is premultiplied.
#version 450
layout(location = 0) in vec4 vertex_color;
layout(location = 0) out vec4 fragment_color;
layout(push_constant) uniform Params {
    float cx;       // the centre, in frame pixels
    float cy;
    float outer;    // the ring's (or the disc's) outer radius, in pixels
    float inner;    // the ring's inner radius
    float shape;    // the triangle's circumradius, or the square's half side
    float hue;      // in turns, 0..1
    float mode;     // 0 triangle, 1 square, 2 disc
    float value;    // the brightness the disc shows
} params;

const float TAU = 6.28318530718;

vec3 pure_hue(float turns) {
    return clamp(abs(fract(turns + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
}

vec3 hsv(float h, float s, float v) {
    return v * mix(vec3(1.0), pure_hue(h), s);
}

vec3 decode(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

// Screen y runs down; hue runs clockwise from the right, as GIMP's and Krita's.
vec2 toward(float turns) {
    float a = turns * TAU;
    return vec2(cos(a), sin(a));
}

float cross2(vec2 a, vec2 b) {
    return a.x * b.y - a.y * b.x;
}

// How far `p` lies inside the edge a→b of a triangle whose winding is `winding`.
float inside_edge(vec2 p, vec2 a, vec2 b, float winding) {
    return winding * cross2(b - a, p - a) / length(b - a);
}

void main() {
    vec2 p = gl_FragCoord.xy - vec2(params.cx, params.cy);
    float d = length(p);
    float turns = fract(atan(p.y, p.x) / TAU);
    vec3 color = vec3(0.0);
    float cover = 0.0;
    if (params.mode > 1.5) {
        cover = clamp(params.outer - d + 0.5, 0.0, 1.0);
        color = decode(hsv(turns, clamp(d / params.outer, 0.0, 1.0), params.value)) * cover;
    } else {
        float ring = clamp(params.outer - d + 0.5, 0.0, 1.0) * clamp(d - params.inner + 0.5, 0.0, 1.0);
        color = decode(pure_hue(turns)) * ring;
        cover = ring;
        float shaded = 0.0;
        vec3 inner_color = vec3(0.0);
        if (params.mode > 0.5) {
            vec2 q = abs(p);
            shaded = clamp(params.shape - max(q.x, q.y) + 0.5, 0.0, 1.0);
            float s = clamp((p.x + params.shape) / (2.0 * params.shape), 0.0, 1.0);
            float v = clamp((params.shape - p.y) / (2.0 * params.shape), 0.0, 1.0);
            inner_color = hsv(params.hue, s, v);
        } else {
            // The tip is the pure hue, white a third of a turn back (above it when it points right), black a third on.
            vec2 tip = toward(params.hue) * params.shape;
            vec2 white = toward(params.hue - 1.0 / 3.0) * params.shape;
            vec2 black = toward(params.hue + 1.0 / 3.0) * params.shape;
            float area = cross2(white - tip, black - tip);
            float winding = sign(area);
            shaded = clamp(min(min(inside_edge(p, tip, white, winding), inside_edge(p, white, black, winding)),
                               inside_edge(p, black, tip, winding)) + 0.5, 0.0, 1.0);
            float w_white = clamp(cross2(p - tip, black - tip) / area, 0.0, 1.0);
            float w_black = clamp(cross2(white - tip, p - tip) / area, 0.0, 1.0);
            float w_tip = max(0.0, 1.0 - w_white - w_black);
            float total = max(1e-6, w_tip + w_white + w_black);
            inner_color = (w_tip * pure_hue(params.hue) + w_white * vec3(1.0)) / total;
        }
        color += decode(inner_color) * shaded;
        cover = min(1.0, cover + shaded);
    }
    fragment_color = vec4(color, cover);
}
