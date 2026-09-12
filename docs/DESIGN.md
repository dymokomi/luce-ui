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
children shrink toward their minimum; smaller parents clip the remaining overflow.
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

The initial text renderer is a replaceable bitmap font, not a text shaping or
editable text system. It preserves case, validates UTF-8 and displays a replacement
glyph for unsupported Unicode scalars. Measurement uses the same scalar advances
as drawing. All widget and application operations belong to the main thread.
