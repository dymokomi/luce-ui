# UI contracts

`Widget` is an open interface implemented by Base structs or Luce classes. Its
stable `Layout` owns children and sizing policy. Text, button interaction and
render callbacks belong to their concrete components, not a tagged node bag.
A widget has at most one parent and one mounted application. Child and callback
edges participate in the shared cycle collector. Base callers explicitly retain
and release reference/interface carriers; Luce uses ordinary ARC.

The framework measures children before parents, places them in logical points,
and intersects clipping with every ancestor. Stack spacing and padding are fixed;
flex weights share excess space up to maximum dimensions. Under constraint,
independent shrink weights reduce children toward their minimum; smaller parents clip the remaining overflow.
Custom widgets invalidate their Layout after changing measured or visual state.

`Application` acquires its native window/device/surface only in `run`. It owns
input dispatch, focus, pointer capture, layout, recording and presentation. Input
callbacks may change the tree. A retained snapshot protects active calls, and
removed or disabled controls lose capture/focus before further input delivery.
The event loop is bounded per frame so input cannot starve animation.

`Viewport.on_render` receives a standard GPU render target scoped to its widget
and clipped to its ancestors. Retaining it never extends the recording lifetime.
The optional 3D adapter connects this callback; neither application code nor the
UI package acquires a Metal or Vulkan handle.

Standard `fonts` owns native faces; Font owns a bounded coverage cache; standard
`gpu` draws that coverage through Metal or Vulkan. Widget measurement and drawing
use the same scalar advances. Text editing, undo history and generic highlight
ranges are separate modules. Language services remain application dependencies.
All widget and application operations belong to the main thread.

A Theme is a value inherited during traversal. An application owns its root
context; a layout may override it for one subtree. No global mutable theme is
shared between windows. Metrics are measured in font lines and cells while layout
and rendering remain continuous logical coordinates, including images and 3D.

Actions own intent and enabled state; buttons, menus and window shortcuts share
those objects. A Toolbar supplies compact row composition. Menu popup subtrees
are measured normally but excluded from surrounding flow, clipped to the window,
drawn after ordinary content and given modal dispatch. The tree restores focus
when the popup disappears. A menu only manages action selection and presentation.

Applications compose named views from these controls and keep document state,
command implementations and lifecycle wiring in separate components. The
framework does not need to know that a particular view is a code editor.
