# Dynamic workspace layout

- [x] Add a reusable custom arrangement contract and deferred subtree focus.
- [x] Implement a tested split/tab model with stable panel identity, minimum
  sizes, empty-branch collapse and atomic topology changes.
- [x] Implement `Panel` and `DStack`: tab strips, selection, overflow, close
  requests, trailing `+` menu and resizable splits.
- [x] Add header dragging with tab-strip and four edge drop targets, previews,
  cancellation and same-group tab reordering.
- [x] Float panels in windows inside the stack: undock by dropping anywhere that
  is no target, dock by dragging the title onto one or pressing it twice.
- [x] Replace Luced's fixed workspace with DStack and one tab per open file;
  preserve document state, file operations, commands and configuration reload.
- [x] Test portable input/model contracts and actual GPU output; update examples
  and documentation. Luced records its tested UI revision in `bootstrap/UI`.

DStack owns layout topology; Panel owns its caption and content. Content remains
mounted under the same panel while topology changes. The framework knows no
filenames, language rules or filesystem operations. Application callbacks create
new content and approve closing it; a dirty document is never discarded by a
layout operation.

Dragging a tab moves that panel. Dragging unused header space moves the group's
selected panel. Dropping on a tab strip stacks/reorders; a pane's four outer
regions split it. Preview and release use the same hit test against that
temporary layout. A floating caption follows the pointer while the destination
overlay shows the final panel rectangle; over a pane's middle or outside the
stack, an outline shows the window the panel will float in instead. Escape and
lost capture cancel without changing the committed topology. During the drag a temporary copy omits the dragged panel;
a group that loses its final panel disappears and its sibling expands. Cancellation
restores the original split fractions and tab order.

The `+` menu lists the application's catalog of panels (`set_catalog`), with a
tick beside each one already open, then **Split Right…** and **Split Down…**. A
pick docks the panel as a tab of the group; a split lists the panels again and
docks the next pick beside the group. An open panel moves there and is
selected; one that is not open is asked of the application through `on_add`. Opening
an already-open file selects its existing panel. Session persistence, floating
OS windows and shared-document views are separate future features.

## Floating panels

A floating panel leaves the model and sits in a window inside the stack, drawn
over the panes: a frame child (title bar, border, `×` when closable) just below
the panel's own content, both after every docked panel, so hit testing and
drawing put the front window on top. A press brings a window to the front. The
title moves it, clamped inside the stack; let go over a tab strip or pane edge it
docks there, with the same preview a dragged tab shows, and two clicks on the
title dock it as a tab of the active group. The border and a bottom-right grip
resize it, never below the panel's minimum. `float(panel, window)` floats a
docked panel or adds a new one; `move` docks a floating one; `remove` closes it.

## Validation

Portable Base ownership and Luce consumer suites pass at native optimization
levels 0–3 and in both C comparison modes. Constructor allocation failures and a
cycle with adversarial finalizer order leave no live application allocations.
Six hundred deterministic topology edits check parent links, selected tabs,
contiguous tab ordering and empty-branch collapse; the model runs natively and
through C. Input tests cover dragging, cancellation, add and close callbacks,
focus, undo retention, overflow and divider resizing.

Metal readback tests pass in all six modes with API and shader validation. They
check flat tab/frame colors, overlays drawn above panel content, and a release
whose final position differs from its last drag preview. Luced has separate
document-tab integration tests and captures real docking frames in macOS CI.

## Drag feedback iteration

- [x] Add native per-window cursor selection through the standard input/window boundary.
- [x] Resolve static and custom cursors through UI hit testing and capture.
- [x] Render a floating caption with a sharp shadow while dragging.
- [x] Arrange and hit-test a temporary topology with the dragged panel removed.
- [x] Restore topology on cancellation; commit a drop into the expanded neighbors.
- [x] Keep the destination preview correct when the window resizes mid-drag.
- [x] Exercise native cursor restoration, document state, empty layouts and GPU output.
