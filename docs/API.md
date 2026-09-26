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
| `Application` | Content, title, dimensions, optional `game`/`fps`/`fullscreen`; `run`, `stop`, `close`, `on_frame`, `set_game`, `set_fps`, `set_fullscreen`, `set_commands`, `command`, `layout`, `dispatch`, `render` |
| `Raster` | Mutable RGBA surface; `set_pixel`, `put`, `fill`, `fill_rect`, `dab`, `draw`, `color_at` |
| `Painter` | Checked GPU target; `rectangle(rect, color, opacity=1.0)`, `triangle(a, b, c, color)`, `line(a, b, width, color)`, `text`, `target` |
| `Font` | Installed monospace family and size; `measure`, `advance`, `height`, `line_height` |
| `Command` | Optional registry `id`, label and `Shortcut`; `id`, `on_trigger`, `trigger`, `set_enabled`, `set_text` |
| `Toolbar` | Heterogeneous children and shared font; compact row, `set_children` |
| `Menu` | Label, actions and shared font; `open`, `is_open`, `layout` |
| `ContextMenu` | Decorate a widget with actions; `open_at`, `on_open`, `set_commands`, `is_open`, `layout` |
| `CommandPalette` | Searchable actions; `open`, `query`, `result_count`, `is_open`, `layout` |
| `TextPrompt` | Text entry or confirmation; `open`, `value`, `on_submit`, `is_open`, `layout` |
| `Theme` | Semantic colors, `control_lines`, `inset_cells`, `header_inset_cells`, `row_height`, `inset` |
| `TextEditor` | Unicode text, selection, history and decorations; see [text controls](TEXT-EDITOR.md) |
| `ListView` | `ListItem(text, icon=IconKind.blank)` entries and optional row height/font; `select`, `set_items`, `on_activate` |

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
`Application(..., game=true, fps=70.0)` is a run-loop mode for software
renderers and other per-frame work: every serviced turn presents, and the loop
waits out the remaining frame interval instead of blocking until the next input.
`fps=0` is uncapped. `fullscreen=true` covers the main display without chrome
through standard `window`; `set_fullscreen` toggles it while `run` is active.
This is not a game engine — simulation, input and drawing stay in the application.
While the window is being live-resized the OS runs a modal loop that starves that
frame pump, so `run` registers a redraw the window invokes from inside it: the
content repaints at each intermediate size instead of stretching the last frame.

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
background, panel, foreground, muted, selection, accent, button, pressed, border,
active_border, gutter, shadow. The interaction states `hover()`, `hover_border()`,
`gutter_active()` and `gutter_hover()` are derived from those base colors through
`luce_color` (Oklab), so a palette is always internally consistent.
`control_lines` accepts 1..4 and `inset_cells` accepts 0..4; all values must be finite.
Defaults give controls one text line vertically and one glyph advance of inset.
`TextEditor(theme=EditorTheme(...))` can override editor-specific colors.

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

`Layout.set_popup_point(x, y)` anchors a popup at a parent-local point.
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
