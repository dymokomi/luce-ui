# Dynamic workspace layout

- [x] Add a reusable custom arrangement contract and deferred subtree focus.
- [x] Implement a tested split/tab model with stable panel identity, minimum
  sizes, empty-branch collapse and atomic topology changes.
- [x] Implement `Panel` and `DStack`: tab strips, selection, overflow, close
  requests, trailing `+` menu and resizable splits.
- [x] Add header dragging with center/tab and four edge drop targets, previews,
  cancellation and same-group tab reordering.
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
selected panel. Dropping on a tab strip stacks/reorders; dropping over the middle
of content stacks; its four outer regions split. Preview and release use the same
hit test. Escape, lost capture and an outside release cancel without changing
topology. A group that loses its final panel is removed and its sibling expands.

The `+` menu requests Add Tab, Split Vertical (side by side) or Split Horizontal
(above and below). Luced supplies an empty editor panel ready for a file. Opening
an already-open file selects its existing panel. Session persistence, floating
OS windows and shared-document views are separate future features.

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
