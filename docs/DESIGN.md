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
Custom widgets invalidate their Layout after a change that can alter sizes or placement,
and repaint it after one only drawing shows (a value, a highlight, an inner scroll offset):
a repaint presents a frame on the arrangement already made, so a long drag never regathers the tree.

`Application` acquires its native window/device/surface only in `run`. It owns
input dispatch, focus, pointer capture, layout, recording and presentation. Input
callbacks may change the tree. A retained snapshot protects active calls, and
removed or disabled controls lose capture/focus before further input delivery.
The event loop is bounded per frame so input cannot starve animation.
Game mode keeps presenting at a requested fps so a software renderer can run
without pretending to be a widget animation; it is still the same loop.

`Viewport.on_render` receives a standard GPU render target scoped to its widget
and clipped to its ancestors. Retaining it never extends the recording lifetime.
`SceneView` connects this callback to a luce-3d `Renderer`; neither application code nor the
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

Commands own intent and enabled state; buttons, menus and window shortcuts share
those objects. A Toolbar supplies compact row composition. Menu popup subtrees
are measured normally but excluded from surrounding flow, clipped to the window,
drawn after ordinary content and given modal dispatch. The tree restores focus
when the popup disappears. A menu only manages action selection and presentation.

Applications compose named views from these controls and keep document state,
command implementations and lifecycle wiring in separate components. The
framework does not need to know that a particular view is a code editor.

Pane framing is independent of arrangement. SplitView owns two child interfaces
and a divider, while Layout performs constrained placement using a pure sizing
function. The divider holds a weak reference to its parent layout and uses the
existing focus and pointer-capture machinery. Nested splits build larger layouts
without editor-specific event handling or platform code.

The text document stores source and history; Folding stores versioned whole-line
ranges; Projection maps physical lines to visible rows and caches their widths.
Drawing, hit testing, cursor navigation and scroll extents consume that same map.
Fold publication does not alter the document. Language-specific range discovery
belongs alongside the application's incremental lexer.

Context menus are widget decorators. Tree dispatch selects the clicked content,
then delivers the request to its nearest provider. Command availability can be
updated immediately before presentation. Ordinary menus and command search use
one shared action popup; search and prompts reuse a Unicode single-line input
model. Placement, focus restoration and modal routing stay in the tree.

Focus is propagated through layout ancestors. Pane framing can therefore show
which region owns keyboard input without knowing an application's panel names.
While a popup owns focus, the previous focus path remains highlighted. Actual
parent edges are distinct from retained traversal membership: a widget removed
and reinserted within the same mounted application need not wait for a frame.

Hover is another derived path through the retained tree. It is recalculated from
the last pointer position after geometry changes, and immediately on pointer
movement. The hit path respects occlusion, clipping and enabled ancestors; drag
capture only chooses the recipient of movement events. This keeps hover correct
when a captured pointer crosses into another pane. Native enter/leave events
come from Base's window backends, so the UI layer contains no OS tracking calls.

Sibling menu triggers form a menu group. An open popup supplies the session;
there is no second application-level menu-mode flag to drift out of sync. Only
that group's triggers bypass modal pointer hit testing. The tree closes the old
popup before requesting the next one, and keyboard navigation uses the same path.

Popup shadows are drawn in the overlay pass before each popup, using the window
target and a single translucent rectangle. Layout and input retain the popup's
original bounds. Child clipping includes the parent's padding, so even a child
whose minimum size exceeds available space cannot overwrite a pane border.

The native boundary follows [AppKit tracking areas](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/EventOverview/TrackingAreaObjects/TrackingAreaObjects.html)
and [Windows mouse tracking](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-trackmouseevent).
AppKit owns a tracking area synchronized to the view's visible rectangle;
Windows rearms leave notifications on a new pointer interval. Both emit the same
portable enter/leave values. Leaving a window clears hover without cancelling a
captured drag.

## When frames are drawn, and what draws again

A frame is drawn only when something said what shows changed (docs/API.md lists
the causes; `Application.needs_frame` answers). Input alone draws nothing, so a
pointer moving over a 3D view costs no frame; luce-ui's widgets announce their
own hover, press and selection changes, and light parts under the pointer with
`Layout.hover_part`.

A drawn frame still draws the whole window: luce-gpu presents each frame into a
fresh swapchain image. Neither Metal (`CAMetalLayer` drawables) nor Vulkan
(`VK_PRESENT_MODE_FIFO_KHR` images, `oldSwapchain`) promises an image keeps the
pixels it last showed, so damage regions scissored over the previous contents
would need an offscreen copy of the whole window kept between frames and blitted
in (one full-window copy per frame plus a window-sized texture, and every widget
drawing to that target): it saves fragment work on a large window but not the
draw calls, CPU recording or the copy.

What the frame avoids instead is the costly widget. `Layout.set_retained(true)`
draws a box and its subtree into a layer of their own, an `rgba8` texture at the
box's size and the window's backing scale (`Texture.frame(scale:)`), and later
frames copy it into the window (`gpu.copy_image`, nearest, 1:1) until a digest of
what it shows moves: its boxes' own `repaint`/`reposition`/`invalidate` stamps,
their places and clips, hover and focus in it, the backing scale, and the layer
epoch, which `Application.invalidate`, a command, a theme, a due wake-up and game
mode move. A panel's hover or a value beside a retained 3D view leaves the view's
draw alone. Costs: one texture per retained box (a 2000 by 1400 pixel viewport is
11 MB), one copy draw per frame, and one extra render pass when the layer draws
again. The layer starts as the theme's background, so the retained widget paints
its whole box; popups it opens are drawn as usual. A frame without a device (a
standalone frame in tests) draws the subtree directly. Up to eight layers.
