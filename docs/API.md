# Public API

Import from `ui` in Base or Luce. Base owns each `interop.Reference` or
`interop.Interface` returned to it and releases it explicitly. Luce owns native
objects and callback captures through ARC. Exported `*_type` declarations let
Base code adopt heap-allocated concrete structs into the same ownership system.
All objects and callbacks belong to the main thread.

| Object | Construction and operations |
| --- | --- |
| `Button` | `Button(text)` or `Button(action = action)`, `text`, `set_text`, `on_click`, `click`, `layout` |
| `Text` | `Text(text)`, `text`, `set_text`, `layout` |
| `Spacer` | `Spacer(weight=1)`, `layout` |
| `VStack`, `HStack` | Heterogeneous children, spacing, padding, alignment; `set_children`, `layout` |
| `Pane` | `Pane(content, minimum=Size(120, 80))`; themed border and one-point content inset |
| `SplitView` | Two widgets, `axis`, preferred `fraction`, `handle_width`; `fraction`, `set_fraction`, `layout` |
| `Viewport` | Preferred minimum width/height; `on_render`, `layout` |
| `Application` | Content, title and dimensions; `run`, `stop`, `close`, `on_frame`, `layout`, `dispatch`, `render` |
| `Painter` | Checked GPU target; `rectangle`, `text`, `target` |
| `Font` | Installed monospace family and size; `measure`, `advance`, `height`, `line_height` |
| `Action` | Label and `Shortcut`; `on_trigger`, `trigger`, `set_enabled` |
| `Toolbar` | Heterogeneous children and shared font; compact row, `set_children` |
| `Menu` | Label, actions and shared font; `open`, `is_open`, `layout` |
| `Theme` | Semantic colors, `control_lines`, `inset_cells`, `row_height`, `inset` |
| `TextEditor` | Unicode text, selection, history and decorations; see [text controls](TEXT-EDITOR.md) |
| `ListView` | Items and optional row height/font; `select`, `set_items`, `on_activate` |

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
Use `set_size`, `set_limits`, `set_flex`, `set_shrink`, `set_enabled`, `set_focusable`,
`set_interactive` and `invalidate`. `bounds` reports absolute logical points;
`child` returns a retained interface. A layout accepts at most 1024 children;
a mounted tree accepts at most 1024 widgets and 64 levels. Dimensions, spacing,
padding and weights must be finite and within 0–16384. A widget can have one parent
and one mounted application. Replacement validates ownership and cycles before
changing the tree. Widgets return one stable, distinct Layout for their lifetime.

Stacks measure children before their parent. Flex distributes surplus using
weights, stops at maximum dimensions and redistributes the remainder. When space
is short, shrink weights distribute reduction toward each minimum; ancestor clipping handles any
remaining overflow. Toolbars and text controls preserve vertical line height with
zero vertical shrink weight. Cross-axis alignment supports start, center, end and stretch.
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

`Font` uses installed native monospace faces and caches antialiased coverage at
backing scale. The default is 14 points on every control. Share a Font explicitly
for consistent typography; logical metrics drive drawing and hit testing.
Single-line labels are limited to 4096 bytes and 1024 Unicode scalars. Font shaping,
bidi, grapheme navigation and arbitrary font-file loading are not yet provided.

## Themes, actions and popups

`Application(content, theme=Theme())` establishes the root theme. `set_theme`
changes that application's inherited values. A layout's `set_theme` overrides
its subtree; `inherit_theme` removes the override. Values resolve parent-first
before measurement, including newly inserted children. Colors are semantic:
background, panel, foreground, muted, selection, accent, button, pressed, border.
`control_lines` accepts 1..4 and `inset_cells` accepts 0..4; all values must be finite.
Defaults give controls one text line vertically and one glyph advance of inset.
`TextEditor(theme=EditorTheme(...))` can override editor-specific colors.

An `Action(text, shortcut=Shortcut())` owns its label, enabled state and signal.
A button may own its text or reference an action. `click` and `on_click` on an
action button use that action's signal. `set_actions` copies the application's
shortcut collection. A disabled action never invokes its callback, and matching
repeated key-down events are consumed without repeating invocation. Editing
shortcuts stay with TextEditor; application shortcuts run before focused-widget
input. Action collections are bounded to 128 entries.

`Menu(text, actions, font=...)` needs at least one action. Pointer release opens
it; Enter, Space or Down opens a focused menu. Up/Down and Tab/Shift-Tab move its
selection, skipping disabled actions. Enter/Space activates; Escape, focus loss
or a click outside closes it. Outside clicks are consumed. The menu closes before
invoking callbacks, and the previous focus is restored. A short window clips the
menu to its bounds; keyboard and wheel movement reveal the selected row.

`Layout.set_popup(true)` opts a subtree into window clipping, drawing after normal
content, and modal input. `set_visible(false)` removes it from traversal without
releasing its parent ownership. This is the menu's reusable foundation. An
application root must remain visible. This initial popup API does not provide
nested menus, OS-native menu bars or cross-window presentation.

## Panes and split views

`Pane(content, minimum=Size(...))` draws the inherited border color and reserves
one logical point on each edge. Content may be any Widget, including a composed
toolbar, text control, or GPU viewport. Borders do not imply a particular layout.

`SplitView(first, second, axis=Axis.horizontal, fraction=0.5, handle_width=5.0)`
shares space between two children. Nest vertical and horizontal splits to build
a workspace. Fractions must be finite in 0..1; the handle accepts 3..32 logical
points. The fraction describes the preferred share after subtracting the handle.
Placement enforces both children's minimum and maximum dimensions. A window too
small for the minima clips the remaining overflow. If both maxima leave spare
space, it remains empty after the second pane.

The divider resizes live with normal pointer capture. Focus it with Tab; matching
arrow keys move it eight points, Shift+arrow moves 32, and Home/End move to the
allowed limits. Focus loss cancels dragging. `fraction()` returns the preference,
which survives window resizing; inspect child bounds for the constrained sizes.
`Layout.minimum_size()` and `maximum_size()` expose configured constraints.

The split's Layout owns three visible ordinary children: first pane, divider,
second pane. Changing this shape or hiding a direct child is rejected. To hide
content while retaining its pane, change the content inside the Pane. This first
splitter provides no docking, collapsible panes, or saved session geometry.
