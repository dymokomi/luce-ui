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
| `Pane` | `Pane(content, minimum=Size(120, 80), header=none)`; shared header/frame color and one-point content inset |
| `PaneHeader` | Title, optional `icon`, `detail`, shared font; `set_text`, `set_detail`, `set_icon` |
| `Panel` | `Panel(text, content, icon=..., minimum=..., closable=true)`; persistent tab content, `set_text`, `set_detail`, `set_icon`, `set_content` |
| `DStack` | Panels and shared font; `add`, `move`, `remove`, `select`, `focus_next`, `set_fraction`, add/select/close callbacks |
| `Icon` | `Icon(kind, font=...)`; vector symbol sized to its font, `set_kind`, `layout` |
| `SplitView` | Two widgets, `axis`, preferred `fraction`, `handle_width`; `fraction`, `set_fraction`, `layout` |
| `Viewport` | Preferred minimum width/height; `on_render`, `layout` |
| `SceneView` | `SceneView(scene, camera, renderer=none, width=320, height=240)`: a Viewport drawing a luce-3d scene; `scene`, `camera`, `renderer`, `layout` |
| `Application` | Content, title, dimensions, optional `game`/`fps`/`fullscreen`; `run`, `stop`, `close`, `on_frame`, `after`/`every`/`post`/`cancel`, `wake_at`/`wake_after`, `watch`/`unwatch`, `title`/`set_title`, `set_game`, `set_fps`, `set_fullscreen`, `set_commands`, `command`, `set_error_handler`, `failure_shown`, `on_crash`, `appearance`/`on_appearance`, `layout`, `dispatch`, `render` |
| `CrashWindow` | `CrashWindow(report, theme=Theme())`: the window a crashed program is started again to show; `run(frame_limit=0)` answers `CrashChoice.quit` or `.reopen`, `application` |
| `TextField` | `TextField(text, placeholder=..., cells=12, secure=false)`; `text`, `set_text`, `on_change` (each edit), `on_commit` (Enter or focus loss, when changed), `on_submit` (every Enter, changed or not), `select_all` |
| `Raster` | Mutable RGBA surface; `set_pixel`, `put`, `fill`, `fill_rect`, `dab`, `draw`, `color_at` |
| `Painter` | Checked GPU target; `rectangle(rect, color, opacity=1.0)`, `triangle(a, b, c, color)`, `line(a, b, width, color)`, `text`, `target` |
| `Font` | Installed monospace family and size; `measure`, `cells`, `advance`, `height`, `line_height` |
| `Command` | Optional registry `id`, label and `Shortcut`; `id`, `on_trigger`, `trigger`, `set_enabled`, `set_text` |
| `Toolbar` | Heterogeneous children and shared font; compact row, `set_children` |
| `Menu` | Label, actions and shared font; `open`, `is_open`, `layout` |
| `ContextMenu` | Decorate a widget with actions; `open_at`, `on_open`, `set_commands`, `is_open`, `layout` |
| `CommandPalette` | Searchable actions; `open`, `query`, `result_count`, `is_open`, `layout` |
| `TextPrompt` | Text entry or confirmation; `open`, `value`, `on_submit`, `is_open`, `layout` |
| `Theme` | Semantic colors, `control_lines`, `inset_cells`, `header_inset_cells`, `row_height`, `inset` |
| `TextEditor` | Unicode text, selection, history, decorations, diagnostics, completion and hover; see [text controls](TEXT-EDITOR.md) |
| `CompletionList` | What a TextEditor's completion provider fills during its call: `caret`, `start`, `set_start`, `trigger`, `text`, `text_range`, `add(label, kind, detail, doc)`, `count`; see [completion](TEXT-EDITOR.md#completion) |
| `ListView` | `ListItem(text, icon=IconKind.blank)` entries and optional row height/font; `select`, `set_items`, `on_activate` |
| `ParameterPanel` | `ParameterPanel(specs, font=..., label_width=0)` from `ParameterSpec`s: one compact row a parameter; values by index (`value`, `component`, `text`, `ramp`, `set_*`), `find(name)`, `on_change`/`on_begin`/`on_commit`/`on_action`; see [parameter panels](#parameter-panels) |

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
extension point `SceneView` uses to host a luce-3d scene. Applications use `run`; the explicit
`layout`, `dispatch` and `render` operations support embedding and deterministic
tests. `on_frame` supplies elapsed seconds for animation. `run(frame_limit=0)`
continues until stop/close or a native close request. `close` requests shutdown
without destroying storage beneath an active callback; subsequent calls fail.
`Application(..., game=true, fps=70.0)` is a run-loop mode for software
renderers and other per-frame work: every serviced turn presents, and the loop
waits out the remaining frame interval instead of blocking until the next input.
`fps=0` is uncapped. `fullscreen=true` covers the main display without chrome
through standard `window`; `set_fullscreen` toggles it while `run` is active.
This is not a game engine — simulation, input and drawing stay in the application.
`set_title` changes the window's title, at once while `run` is active; `title()`
returns it.
`appearance()` returns the system's `Appearance` (`light` or `dark`, luce-window's
`window.appearance`, the setting behind CSS's `prefers-color-scheme`), before or
during `run`. `on_appearance(callback)` connects a callback the loop calls with the
new value when it changes; `dispatch(Event(kind = EventKind.appearance_changed,
appearance = ...))` calls it the same way in tests.

A focused text field takes its editing chords (Cmd on macOS, Ctrl elsewhere: A
select all, C copy, X cut, V paste, Z undo, Shift+Z redo) before the
application's commands, and plain typed keys too; function keys and Alt chords
stay commands. With no text field focused, every chord is the commands'.

A present the GPU skips (Metal has no drawable while the screen is locked or the
display sleeps; Vulkan has no swapchain image, or the window is hidden or
minimized) leaves the frame dirty. It is drawn again after a backoff that doubles
from 16 ms to one second, so a sleeping display costs a few wake-ups a second at
most; input, or the next submitted frame, ends the backoff.

### Sleeping until there is work

An idle `run` blocks in the window's wait and uses no CPU. It runs a turn (frame
callbacks, timers, watches, a frame when something changed) when input arrives,
a timer is due, `window.wake()` is called from another thread, or:

- `wake_at(instant)` comes: an instant in `time.now()`'s monotonic nanoseconds,
  or `wake_after(seconds)`. One request at a time, each call replacing the last
  and 0 dropping it; an earlier timer or event still runs first. For an engine
  that knows when its next work is due (a page's timers and animations), set it
  each turn instead of keeping an `after` timer to cancel and reschedule.
- A descriptor given to `watch(descriptor, callback, readable=true,
  writable=false)` turns ready: a socket, or outside Windows a pipe. The callback
  runs on the main loop; readiness is level-triggered, so read or write until the
  descriptor would block, or the callback runs again on the next turn. `unwatch`
  takes the handle `watch` returned; unwatch before closing the descriptor (one
  closed while watched is dropped on the next turn). Up to 64; on Windows watching
  makes a socket nonblocking. A browser with requests in flight sleeps until a
  socket has something instead of polling every few milliseconds.

While the window is being live-resized the OS runs a modal loop that starves that
frame pump, so `run` registers a redraw the window invokes from inside it: the
content repaints at each intermediate size instead of stretching the last frame.

`Font` uses installed native monospace faces and caches antialiased coverage at
backing scale. The default is 14 points on every control. Share a Font explicitly
for consistent typography; logical metrics drive drawing and hit testing.
Text sits on a grid of `advance`-wide cells, counted as a terminal does: a wide
East Asian scalar takes two cells, a combining mark none (`Font.cells(text)`).
Editor columns, carets, clicks, wrapping and truncation all count cells, so
Japanese, Chinese and Korean text lines up; the caret still steps one scalar.
Single-line labels are limited to 4096 bytes and 1024 Unicode scalars. Font shaping,
bidi, grapheme navigation and arbitrary font-file loading are not yet provided.

## Crash reports and the crash window

A desktop program has no terminal to print a trap to, and one that just disappears is
hard to report. `run` turns on luce-std's crash reports, named after the program's package
and version (see `crash` in luce-std), and, unless it is a test's bounded run
(`frame_limit > 0`), asks for the report to be shown after a crash, the way macOS shows its
"quit unexpectedly" window:

1. The program traps or gets a fatal signal. luce-std writes the report to
   `~/.luce/crashes`, runs the crash hooks (traps only), and starts the program's own
   executable again with no arguments and `LUCE_CRASH_REPORT` naming the report. Nothing is
   drawn from the process that crashed: its heap may be broken.
2. The new process runs `main` as usual until it makes its `Application`. There, instead of
   the program's window, it opens the crash window: the program's name and version, where a
   recovery copy went if a hook saved one, the report as selectable text, and **Copy**,
   **Reopen** (Return) and **Quit** (Cmd/Ctrl+Q). Then the process ends; Reopen first starts
   the program again as an ordinary run.

So code that runs before the `Application` is made also runs in that second process, with no
arguments; keep it to building the window. A crash inside the crash window itself starts
nothing further. Reports stay on the computer; nothing is sent anywhere.

`app.on_crash(callback)` runs `callback` after a trap, before the process ends, on the thread
that trapped: save what can be saved under `crash.recovery_directory()` and call
`crash.note_recovery(path)`, and the window shows the path. The hooks get five seconds in
all, and a fatal signal runs none, so a program that must not lose work also saves as it goes.
It answers the hook's handle (luce-std's `crash.Hook`); the application keeps the hook until
`close`, which removes it, so what the callback captures is not kept alive past the
application. `remove()` on the handle takes it away sooner; dropping the handle does not.

`CrashWindow(report)` is the window itself, for a program that wants to show a report it
found some other way (`crash.take_report`).

An error is not a crash. `set_error_handler(callback)` hears the failures of callbacks (input,
`on_frame`, timers, watches) and of rendering, and the run goes on; one that repeats every
frame, from `on_frame` or a widget's drawing, is reported once until it stops. An error that
still ends `run` once the window is open, because there is no handler or the handler itself
failed, is shown in the same window, headed "stopped on an error", with its message and Copy,
Reopen and Quit; then `run` returns it as before, so `main` still prints it on standard error.
In a test's bounded run the window stays up for `frame_limit` turns. `failure_shown()` says
whether the last `run` showed one.

## Parameter panels

`ParameterPanel` is a parameter editor after Houdini's parameter pane and
Maya's Attribute Editor: one row a parameter, a right-aligned label in a
column (fitted to the labels, or `set_label_width`; the user drags its edge),
then the control, every row one text line high. A `ParameterSpec` describes a
row: `name` (the key conditions and hosts use), `label`, `kind`, the default
(`value`, and `y`, `z`, `w` for vectors and colors), the hard range
(`minimum`, `maximum`), the slider's soft range (`soft_minimum`,
`soft_maximum`), `step`, `decimals`, `suffix`, `units` (see [units](#units)), `slider`, a menu's `items`
(`"Linear|Catmull-Clark"`, or `"Points=0|Faces=2"` for other values), `text`
for texts, `doc` for the tooltip, `hide_when` and `disable_when` conditions
in Houdini's form (`{ shape != Custom }`, clauses in braces all hold, one
braced group suffices), `join` to share a line with the next, `open` for a
folder, `linear` for a linear-light color, `resettable`, and the host's `tag`.

| `ParameterKind` | Row |
| --- | --- |
| `number`, `integer` | a field (a third of the line, so numbers align with vector columns) and an optional slider |
| `vector` | 2–4 fields on one line |
| `toggle` | a checkbox with its label beside it |
| `menu` | the chosen item; a click lists the items |
| `text`, `path` | a line of text; a path has a browse button (`on_action`) |
| `color` | a swatch that opens `ColorEditor`, and R, G, B fields |
| `button` | a button (`on_action`) |
| `separator`, `folder` | a rule; a collapsible heading over the rows after it, remembered by name across `set_specs` |
| `info` | read-only text |
| `ramp`, `color_ramp` | Houdini's ramps: a curve over 0..1 or a gradient, edited by its points, with the selected point's fields under it; see [ramps](#ramps) |

Numbers scrub: drag a field or its label (Shift ten times faster, Alt ten
times finer; the label moves every component of a vector); the middle button
opens Houdini's value ladder, a column of steps chosen by moving up and down,
the value moved by left and right. A click types into the field: arithmetic
(`2*3`, `(1+2)/4`, `2^3`, `pi/2`) and Maya's relative forms (`+=0.5`, `-=1`,
`*=2`, `/=4`) are worked out, a trailing unit is ignored (or converted, in a
row with a length unit; see [units](#units)); Enter commits,
Escape keeps the old value, Tab and Shift-Tab move through the fields, Up and
Down nudge. Cmd/Ctrl-click, or the context menu's Revert to Default, puts the
default back; the context menu also copies and pastes values and reverts
every parameter. A value off its default gets an accent tick and its label in
full ink, where Houdini sets it in bold. A doc shows as a tooltip, with the
name, after the pointer rests on a row.

`on_change` hears every change, live during a drag but at most once a frame;
`on_begin` and `on_commit` bracket each edit (a drag, a typed value, a click),
so a host makes one undo step of it. Values set from code report nothing, and
while the user drags a row a refresh from the host does not pull it back.
Only rows the window shows are drawn, so hundreds of parameters in a
`ScrollView` stay cheap. One spec makes a standalone row; `set_margin(0)`
fits it inside another layout.

### Ramps

A `ramp` row edits a float over 0..1 and a `color_ramp` row a gradient, as
Houdini's ramp parameters do (VEX reads one with `chramp`). The row is the
curve, its area filled, or the gradient strip with a marker under each point,
and under it a line for the selected point: its position, its value (a color
ramp's swatch, which opens `ColorEditor`) and its interpolation menu
(Constant, Linear, Smooth, Monotone, B-Spline).

- A click on the curve away from the points adds one there: on a float ramp at
  the value under the pointer, on a color ramp in the color the gradient has
  there. It takes the interpolation of the segment it splits and is selected.
- A press on a point selects it; dragging moves it across (and, on a float
  ramp, up and down within the values the curve showed when the drag began).
  Points keep their order by position: one dragged past another changes places
  with it, and the selection follows. A click and drag in empty space adds and
  moves the new point.
- Delete or Backspace removes the selected point, a right-click any point;
  a ramp keeps at least two points. A right-click elsewhere opens the usual
  context menu, whose Revert to Default puts the default ramp back.
- The fields type numbers as other fields do (Tab between them); a typed
  position moves the point among the others.

The data is luce-std's `ramp` list, the same numbers `ramp.lookup` evaluates
when the host cooks, so what the panel draws is what the host computes:

```
[1, channels, count, then per point: position, channels..., interpolation]
```

with 1 channel for a `ramp` and 3 (red, green, blue; sRGB-encoded unless the
spec says `linear`) for a `color_ramp`, interpolation codes 0 constant, 1
linear, 2 smooth (Catmull-Rom), 3 monotone cubic, 4 B-spline; the luce-std
README defines each. A new row starts at 0 to 1 (black to white), linear.

```luce
let panel = ParameterPanel([ParameterSpec(name = "falloff", label = "Falloff", kind = ParameterKind.ramp)])
let row = panel.find("falloff")
panel.set_ramp_default(row, [1.0, 1.0, 2.0, 0.0, 1.0, 3.0, 1.0, 0.0, 3.0])
panel.set_ramp(row, node.values["falloff"])        # a list[float], checked, no signal
let data = panel.ramp(row)                         # a copy, list[float] in Luce
let weight = ramp.lookup(data, 0.25)               # from luce_std import ramp
```

`set_ramp` refuses data `ramp.check` refuses or with the other kind's channels,
keeps the selected point where it can, and leaves a ramp the user is dragging
(or coloring) alone. `selected_point`, `select_point` and
`ramp_bounds(index, RampPart.curve | position | value | interpolation)` serve
hosts and tests. Every change reports through `on_change` (live while
dragging, once a frame); `on_begin` and `on_commit` bracket each edit: an
added point with the drag that follows it, a drag, a typed field, an
interpolation chosen, a removal, the color editor's changes until it closes. A plain
click on a point selects it and reports nothing. The spec's soft range, when
set, is the span a float ramp's curve shows (else 0..1), widened to every
point's value; its hard range bounds the values.

### Units

A program keeps a length in one unit and lets the document choose the unit
it is shown in. A `Unit` says how: `suffix` after the number, and `scale`,
how many stored units make one shown unit (shown = stored / scale). Give one
to a spec's `units`, or to `NumberField(..., units=...)`:

```luce
ParameterSpec(name = "width", label = "Width", value = 25.4, minimum = 0.0,
              step = 1.0, decimals = 2, units = ui.millimeters())
```

The value, `minimum`, `maximum`, the soft range, `step` and `decimals` are
always in the stored unit, and `value`, `set_value` and `on_change` report
stored values. Only what the field shows and reads converts, much as a
`datetime` stays UTC while it is displayed in a time zone. In another unit the
step becomes the nearest 1, 2 or 5 times a power of ten (a 1 mm step moves
0.05 in), and the field shows as many more decimals as the unit is larger,
rounded (2 in millimeters, 3 in inches).

`ui.millimeters()`, `centimeters()`, `meters()`, `inches()` and `feet()`
assume values kept in millimeters. For another stored unit, pass how long a
millimeter is in it, and a pixel if pixels mean something: a paint program
that keeps pixels at 300 pixels an inch uses `ui.inches(millimeter = 300 /
25.4, pixel = 1)` and `ui.pixels(millimeter = 300 / 25.4)`.
`ui.unit_named("in")` finds a unit by the name a user types or a document
saves. `Unit()` is no unit; angles keep it with `suffix = "°"`.

Typing reads a length in any unit the stored unit can measure: `25.4 mm`,
`1 in`, `1"`, `2.5cm`, `0.1 m`, `1 ft` (also `'`, `px`, and the words spelled
out), in any case, with or without a space. A bare number is in the shown
unit, and arithmetic mixes them: `10 + 5 mm`, `+=1`. An unknown unit is
unreadable, so the value stays as it was, as for any unreadable entry.
Without a length unit a trailing word is ignored, as before.

`panel.set_units(index, unit)` and `field.set_units(unit)` change the unit of
a live row or field; the stored value stays. `panel.set_length_units(unit)`
switches every row in a length unit at once (a document's Units menu), leaving
angles and plain numbers alone. `Unit` also has `shown(stored)`,
`stored(shown)` and `is_length()`; `field.shown_value()` is the value as the
field shows it.

## Themes, actions and popups

`Application(content, theme=Theme())` establishes the root theme. `set_theme`
changes that application's inherited values. A layout's `set_theme` overrides
its subtree; `inherit_theme` removes the override. Values resolve parent-first
before measurement, including newly inserted children. Colors are semantic:
background, panel, foreground, muted, selection, accent, button, pressed, border,
active_border, gutter, shadow, and `diagnostic_error`, `diagnostic_warning` and
`diagnostic_info` for problem severities. The interaction states `hover()`, `hover_border()`,
`gutter_active()` and `gutter_hover()` are derived from those base colors through
`luce_color` (Oklab), so a palette is always internally consistent.
Text on a selected row follows its fill: `on_menu_selection(ink)` for menus, popups and
completion rows on `menu_selection`, `on_selection(ink)` for list and table rows and
default buttons on `selection`. Each gives `accent_text` when that fill is the accent
color (where the foreground, `muted` and the accent would not read), else `ink`, so a
row's label, muted detail and badge all stay legible.
`control_lines` accepts 1..4 and `inset_cells` accepts 0..4; all values must be finite.
Defaults give controls one text line vertically and one glyph advance of inset.
`TextEditor(theme=EditorTheme(...))` can override editor-specific colors.

`Tooltip(font)` is the shared tooltip: a popup child that shows wrapped text,
with an optional muted note, at a point in its owner's coordinates, and lets the
pointer through. The parameter panel shows a row's doc in one and the text editor
a diagnostic's messages. `show_marked(text, x, y)` shows light markup instead, a
signature line and text with `code spans`, as the editor's hover provider gives it.

`TextEditor.set_completion_provider(provider)` and `set_hover_provider(provider)`
take Luce callbacks, `func(items: CompletionList) -> unit!` and
`func(offset: int) -> str!`; `none` or `clear_completion_provider()` and
`clear_hover_provider()` remove them. Offsets are Unicode scalar offsets, as
everywhere in the editor. `CompletionKind` is `function`, `method`, `field`,
`variable`, `datatype`, `module` or `keyword`; `CompletionTrigger` is `typed`,
`dot` or `invoked`. [Text controls](TEXT-EDITOR.md#completion) has the triggers,
keys, filtering and markup.

```luce
editor.set_completion_provider(func(items: CompletionList) -> unit!:
    items.add("print", CompletionKind.function, "func print(text: str)", "Writes `text`.")
)
editor.set_hover_provider(func(offset: int) -> str!:
    return "func print(text: str)\nWrites `text`."
)
```

A `Command(text, shortcut=Shortcut(), id="")` owns its label, enabled state and
signal, plus an optional registry id. `set_commands` registers the application's
commands, and `Application.command(id)` resolves one by id so a keymap or script
can invoke the same commands the UI does. A button may own its text or reference a
command. `click` and `on_click` on a command button use that command's signal.
A disabled command never invokes its callback, and matching
repeated key-down events are consumed without repeating invocation. Editing
shortcuts stay with TextEditor; application shortcuts run before focused-widget
input. Command collections are bounded to 128 entries.

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

Pass `header=PaneHeader("FILES", icon=IconKind.folder_open, detail="project")`
to reserve a title row above content. Pane paints the header and border together
using `border`, `hover_border`, or `active_border`; focus takes precedence over
hover. The optional icon and title use `foreground`; secondary detail uses `muted`.
Text clips inside the pane; a long detail does not force the pane wider.

`PaneHeader` uses the shared font and `Theme.control_lines` for its row height.
`header_inset_cells` controls horizontal spacing (default 1.5 character cells,
finite 0..4). `set_text`, `set_detail` and `set_icon` update presentation without
replacing the header. Header and content are ordinary children; keep their
order when changing the pane's layout. A custom header Widget may be supplied
instead, with its background left transparent to retain the frame color.

`IconKind` supplies `blank`, `folder`, `folder_open`, `file`, `code`, `terminal`
and `settings`. `Icon(kind, font=font)` is a standalone Widget; ListItem and
PaneHeader use the same symbols. Shapes are drawn through standard GPU triangles
in logical coordinates and scale with the shared font. No icon font is required.
`Painter.triangle` and `Painter.line` accept `Point` values in this same coordinate
space and obey the target's clipping. Lines have a positive finite width and
flat ends; a zero-length line draws nothing.

## Dynamic workspaces

`DStack(panels, font=font)` initially stacks its panels as tabs. A `Panel` owns one
ordinary content widget. Its identity and child ownership stay unchanged when
moved; inactive tabs are hidden from drawing, hit testing and keyboard traversal.

| Operation | Behavior |
| --- | --- |
| `add(panel, relative_to=none, position=DockPosition.tab)` | Add new content beside or inside the relative panel's group; defaults to the active group |
| `move(panel, relative_to, position=DockPosition.tab)` | Move existing content; same-group tab moves reorder tabs |
| `select(panel)` | Reveal its tab and request focus for its first eligible descendant |
| `remove(panel)` | Remove it and collapse an empty branch; notify `on_close` after the change |
| `focus_next(backwards=false)` | Cycle visible groups in reading order |
| `set_fraction(panel, fraction)` | Set the nearest split parent's preferred first-child share in 0..1 |
| `panel_count`, `group_count`, `tab_count(panel)`, `same_group(a, b)` | Inspect membership without exposing mutable topology |
| `panel_bounds(panel)`, `tab_bounds(panel)`, `add_bounds(panel)` | Inspect geometry local to DStack; an overflowed tab has empty bounds |
| `drag_bounds()` | Bounds of the floating drag label; empty outside a drag |
| `active_panel()` | The focused panel, or the most recently selected panel; none when empty |
| `set_catalog(ids, titles)` | The panels every group's `+` menu offers, in order |
| `find(id)` | The open panel made from catalog entry `id`, or none |

`DockPosition` is `tab`, `left`, `right`, `top` or `bottom`.

Every group's `+` menu lists the catalog set by `set_catalog(ids, titles)`, a
tick beside each entry whose panel is open, then **Split Right…** (a group
beside, right) and **Split Down…** (a group below). A pick docks that panel as
a tab of the group; after a split, the menu lists the panels again under
"Dock beside:" and the next pick docks there. Give each panel made for an entry
its id, `Panel(title, content, id = "brushes")`, so the menu knows it is open:
picking an open one moves it there and selects it. For one that is not open the
menu emits `on_add(request)` with a retained `DockRequest`: `id()` is the entry,
`panel` the relative panel (none for an empty stack) and `position` the
placement. The application makes the panel, for example:

```luce
workspace.set_catalog(["brushes", "swatches"], ["Brushes", "Swatches"])
let connection = workspace.on_add(func(request: DockRequest) -> unit!:
    let panel = Panel(title_of(request.id()), content_for(request.id()), id = request.id())
    workspace.add(panel, relative_to = request.panel, position = request.position))
```

Keep signal connections alive. `on_select(panel)` reports a selection, and
`on_close(panel)` reports removal after topology is committed. Header close
buttons first call the optional `set_close_handler(callback)` Boolean callback;
false or a failure preserves the panel. Without a handler they remove it.
`Panel(closable=false)` omits the close button. Programmatic `remove` deliberately
does not ask the handler; the application has already made that decision.

Dragging begins after four logical points of movement. The source panel leaves
a temporary layout: its remaining tabs are revealed, or its empty branch
collapses. Content ownership stays mounted and the original topology is retained
for cancellation. A labeled preview with a sharp shadow follows the pointer.
A tab-strip drop stacks
or reorders tabs. The middle of content stacks; its four outer quarters split.
The overlay marks the actual destination size, including minimum dimensions and
the divider gap. Placement and drop testing use the detached layout; resizing the
window updates the preview even without another pointer move. Pointer capture
keeps a grabbing or forbidden cursor until release.
Escape, focus loss and outside release cancel a drag. A single panel cannot
split itself into two copies. Applications create a second content view explicitly
if they need simultaneous views of one document.

Tabs remain one themed font row tall. Overflow exposes previous/next controls
when space permits; the selected tab stays visible. Wheel input over the header
cycles tabs. A focused header accepts Left/Right; Enter/Down focuses its content.
Dividers support pointer dragging and the same arrow/Home/End keys as SplitView.
Headers use `header_inset_cells`, `border`, `active_border`, `hover_border` and
`panel` for inactive tabs. The trailing `+` remains visible in narrow groups.

The first implementation supports 128 panels and 32 groups. Failed ownership or
topology preparation leaves the prior membership intact. Callback failures occur
after the reported change and do not roll it back. Layout persistence, floating
windows and cross-window docking are outside this initial API.

## Custom arrangement and focus

`Layout.set_arrangement(policy)` accepts an `Arrangement` on an overlay layout.
Its `place(child: int, available: Size)` supplies a local `Rect` for each visible,
ordinary child, identified by `Layout.id()`. The policy must not mutate the tree.
The tree validates the plan, then applies ancestor clipping and ordinary child
layout; popup placement remains separate. DStack uses this contract without
introducing docking-specific rules into the layout tree.

`Layout.request_focus()` requests the first eligible widget in that subtree
after arrangement. Hidden descendants do not participate. An open popup defers
the request until it closes; an explicit Application focus request takes priority.

## Split views

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
At rest, the neighboring pane borders are the two visible edges. The center
grip is drawn only while hovered, dragged or keyboard-focused. The full handle
width remains available for hit testing.

The split's Layout owns three visible ordinary children: first pane, divider,
second pane. Changing this shape or hiding a direct child is rejected. To hide
content while retaining its pane, change the content inside the Pane. This first
splitter provides no docking, collapsible panes, or saved session geometry.

## Context menus, command search and prompts

`ContextMenu(content, actions, font=...)` preserves the content's initial sizing
policy and owns a popup action list. The nearest enabled context provider handles
a right-click or Shift+F10. Right-clicking a ListView selects that row without
activating it; empty list space clears selection. TextEditor preserves a selection
when clicked inside it and otherwise moves the caret to the clicked position.
`on_open(callback)` runs after that selection change and before presentation, so
the application can update action availability or call `set_commands(...)` to swap
the entries for what was clicked. `open_at(x, y)` uses local points.

The window clips and positions popups; they cannot escape its bounds. Menu,
ContextMenu and CommandPalette share action-list selection and invocation. Arrow
keys skip disabled actions, Enter invokes the selected action, and Escape or an
outside click dismisses the popup. Invocation hides the popup before calling the
application. Popup text events preserve Unicode codepoints. Application shortcuts
remain suspended during modal input.

`CommandPalette(actions, font=...)` is a popup Widget. Add it as a child of the
application's content, then call `open()` from an Command. Its input filters caption
words with ASCII case-insensitive matching; Unicode is matched literally.
Up/Down, Tab/Shift+Tab and the wheel navigate results; Enter invokes. No matches
leave the palette open. Input supports Unicode, selection, mouse placement and
dragging, clipboard and undo. Queries are limited to 1024 Unicode scalars.

`TextPrompt(font=...)` mounts the same way. `open(title, text="", accept="OK",
editable=true)` selects its initial text. `on_submit(callback)` supplies the
entered string. Enter or the accept button submits; Escape, Cancel or an outside
click dismisses without submission. `editable=false` provides a confirmation
surface with the same callback contract. Text is bounded to 1024 scalars and
cannot contain control characters.

`Layout.set_popup_point(x, y, above=none)` anchors a popup at a parent-local point;
with `above`, a popup that does not fit below the window's bottom goes above
instead, its bottom at that y (the completion list flips over the caret's row).
`set_keeps_focus(true)` lets a non-modal popup take presses without taking the
keyboard from what has it, as the completion list does for its editor.
`set_popup_placement(PopupPlacement.window_top)` centers it near the window top;
the default `below` placement remains appropriate for menu triggers.
`copy_sizing_from(layout)` copies the current limits, flex and shrink policy for
decorators. `contains_focus()` reports focus anywhere in a subtree after layout,
including the originating pane while a popup temporarily owns focus. Pane uses
the inherited `active_border` color in this state. `Theme.gutter` independently
controls the text editor's line-number and folding area.

`Font.configure(size, family="")` loads a replacement face before releasing the
old one. Widgets sharing that Font update together; invalidate the root Layout
after changing it. An invalid face leaves the previous font usable.

## Hover and menu sessions

`Layout.is_hovered()` identifies the deepest visible, enabled widget under the
pointer. `contains_pointer()` also includes hovered descendants. While it is
true, `pointer_position()` returns a local `Point(x, y)`. Hover follows clipping
and popup occlusion, independently of keyboard focus and drag capture. A
decorative layer over content, such as a drag preview, calls
`set_hover_transparent(true)` so the widgets beneath it keep hovering. Layout
changes recompute it beneath a stationary pointer; pointer leave, focus loss and
input overflow clear it. Passive hover does not invalidate measured geometry.

Buttons and menu titles use the derived `hover()` state; list rows use it without
changing the selected item. Panes use `hover_border()`, with `active_border`
taking precedence for keyboard focus. Editor gutters use `gutter_active()` for the
caret row and `gutter_hover()` for a different hovered row; active/hovered line
numbers brighten.
The number column fits the largest line number in the document, with one font
cell of leading and trailing padding. Edits, undo and replacement grow or shrink
it across digit boundaries. Fold controls have their own space; scrolling and
folding preserve the number width.

Opening a `Menu` starts a session among sibling menu triggers. Moving over another
enabled sibling opens it immediately and closes the previous popup. Left/Right
also switch menus, skipping disabled or hidden peers. Escape, invoking a command,
or clicking outside ends the session. Other popups remain modal: hovering a menu
title while a context menu, prompt or palette is open does not switch to it.
Custom triggers opt in with `Layout.set_menu_trigger(true)` and handle
`Event.menu_requested` by opening their popup.

Popup shadows use `Theme.shadow` with `shadow_opacity` (0..1, default 0.35) and
`shadow_offset` (0..32 points, default 4). Setting either metric to zero hides the
shadow. The renderer draws one translated rectangle with straight alpha blending,
without blur or extra layout/hit-test space. It is clipped to the window rather
than the popup's own bounds. `Painter.rectangle` exposes the same optional opacity
for custom widgets; invalid opacity is an error.

## Pointer cursors

`Layout.set_cursor(Cursor.text)` chooses a static cursor; ordinary controls set
appropriate defaults. Text editors use an I-beam, actionable controls a pointing
hand, and dividers the appropriate horizontal/vertical resize shape. DStack
headers use a grab cursor and a grabbing cursor during valid drags. An invalid
drop uses `not_allowed`. Disabled layouts and disabled action buttons use arrow.

`Layout.set_cursor_source(policy)` installs a retained `CursorSource` for
hit-dependent choices, taking precedence over the static cursor. Its total
`cursor(position: Point, captured: bool) -> Cursor` method receives local
coordinates and capture state. Queries run under an interface guard and must not
mutate layout. Capture takes precedence over widgets underneath the pointer;
popups and ancestor clipping otherwise follow ordinary hit testing.

`Application.cursor()` refreshes layout and returns the resolved shape for
portable tests or embedding. `run()` applies it through `window.Window` after
events and rendering. Native handles and platform cursor names never enter UI
or application code. See [standard window cursors](https://github.com/dymokomi/luce-window/blob/main/docs/CURSORS.md).
