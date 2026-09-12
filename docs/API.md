# Public API

Import from `ui` in Base or Luce. Base owns each `interop.Reference` or
`interop.Interface` returned to it and releases it explicitly. Luce owns native
objects and callback captures through ARC. Exported `*_type` declarations let
Base code adopt heap-allocated concrete structs into the same ownership system.
All objects and callbacks belong to the main thread.

| Object | Construction and operations |
| --- | --- |
| `Button` | `Button(text)`, `text`, `set_text`, `on_click`, `click`, `layout` |
| `Text` | `Text(text)`, `text`, `set_text`, `layout` |
| `Spacer` | `Spacer(weight=1)`, `layout` |
| `VStack`, `HStack` | Heterogeneous children, spacing, padding, alignment; `set_children`, `layout` |
| `Viewport` | Preferred minimum width/height; `on_render`, `layout` |
| `Application` | Content, title and dimensions; `run`, `stop`, `close`, `on_frame`, `layout`, `dispatch`, `render` |
| `Painter` | Checked GPU target; `rectangle`, `text`, `target` |
| `BitmapFont` | Bitmap pixel size, `measure`, `glyph` |

Constructors that allocate are fallible. Luce propagates automatically inside a
function declared `-> T!`: `let button = Button("Pause")`. Base uses one explicit
`try` for the expression. A nonfallible Luce callback adapts to the signal's
fallible callback contract; callbacks that can fail declare that result. Keep the
returned `Connection` for the desired subscription lifetime; `disconnect` is
idempotent. Signals invoke a retained snapshot in registration order. Removal
during delivery skips disconnected callbacks, new subscriptions start with the
next emission, and the first failure stops that emission. Both the error code and
dynamic message survive native cleanup. Native and managed cycles use the shared
collector; no pending-event counters or polling are involved.

`Layout` stores constraints and child ownership independently of control state.
Use `set_size`, `set_limits`, `set_flex`, `set_enabled`, `set_focusable`,
`set_interactive` and `invalidate`. `bounds` reports absolute logical points;
`child` returns a retained interface. A layout accepts at most 1024 children;
a mounted tree accepts at most 1024 widgets and 64 levels. Dimensions, spacing,
padding and weights must be finite and within 0–16384. A widget can have one parent
and one mounted application. Replacement validates ownership and cycles before
changing the tree. Widgets return one stable, distinct Layout for their lifetime.

Stacks measure children before their parent. Flex distributes surplus using
weights, stops at maximum dimensions and redistributes the remainder. When space
is short, children shrink toward their minimum; ancestor clipping handles any
remaining overflow. Cross-axis alignment supports start, center, end and stretch.
Disabled ancestors disable descendant input. Pointer capture follows the pressed
control until release; release outside does not activate a button. Tab/Shift-Tab
move focus; Space/Enter activate on the matching release. Focus loss, queue
overflow, removal and disabling cancel a press. Events use widget-local points.

A custom Base struct or Luce class implements `Widget` with `layout`, `measure`,
`draw` and `event`. Native interface methods use owned `Outcome` results; Luce
methods use ordinary fallible returns. `measure` must not mutate the tree. After
changing component state, invalidate its Layout. The framework guards active
calls and retains the traversal while callbacks change the tree. Recursive
application layout, input dispatch or rendering returns `busy`; component state
changes take effect on the next traversal.

`Viewport.on_render` receives a checked standard `gpu.RenderTarget` for that
widget. Its viewport and clipping cannot escape ancestor bounds. Retained targets,
painters and bound target methods expire when their frame ends. This is the
extension point for the separate 3D package. Applications use `run`; the explicit
`layout`, `dispatch` and `render` operations support embedding and deterministic
tests. `on_frame` supplies elapsed seconds for animation. `run(frame_limit=0)`
continues until stop/close or a native close request. `close` requests shutdown
without destroying storage beneath an active callback; subsequent calls fail.

The bitmap font has distinct upper/lowercase ASCII letters, digits and a small
punctuation set. Unsupported scalars, including unsupported punctuation and
control characters, produce one visible replacement glyph. It validates UTF-8;
labels are bounded to 4096 bytes and 1024 scalars. Default glyphs occupy 10×14
points with a 12-point advance. This is single-line bitmap drawing, with no silent
case conversion, font discovery, text shaping or text input composition.
