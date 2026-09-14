# luce-ui

A UI framework written in Luce Base, consumed through ordinary Base structs or
Luce objects. Controls implement `Widget`; an `Application` owns the native event
loop, layout, input routing and presentation. The package uses standard `gpu` and
`window`: Metal on ARM64 macOS and Vulkan on Windows x64. Linux supports the
portable tests and font backend; native window presentation is still pending.

A Luce application uses public imports and normal construction:

```luce
from ui import Application, Button, Text, VStack

pub func main(arguments: list[str]) -> int!:
    let button = Button("Continue")
    let content = VStack([Text("Hello Luce"), button], padding = 24.0)
    let app = Application(content, title = "Hello")
    app.run()
    return 0
```

Declare `[dependencies] luce_ui = "../luce-ui"` in the consumer's `luce.toml`.
The separate `luce-demos` project connects a button to a counter and runs the UI.
No application loop, generated Base sources or platform framework declarations
are needed in a consumer.

Read [API.md](docs/API.md) for ownership, callbacks, custom widgets and layout;
[DESIGN.md](docs/DESIGN.md) describes the framework contracts.

Build the sibling `luce-base` and `luce` repositories at the revisions recorded in
`bootstrap/BASE` and `bootstrap/LUCE`. Then run:

```sh
./test.sh
python3 tests/gpu.py
```

The portable suite compiles Base and Luce consumers in native optimization levels
0–3 and both C comparison modes. The GPU suite requires an actual macOS desktop
and verifies Metal pixels, clipping, resize and expired viewport references.
Test binaries and compiler scratch files are temporary. A specifically requested
consumer binary can be built with `python3 tools/build.py ENTRY -o OUTPUT`.

This is an early framework with native antialiased fonts, multiline editing, lists,
menus, toolbars, bordered panes, resizable splits, code folding, shared actions and
inherited themes. Paragraph shaping,
accessibility, general scrolling containers and a broad widget catalog remain
future work. MIT or Apache-2.0, at your option.

## Windows x64

Build sibling `luce-base` and `luce` checkouts with `python tools/build_windows.py` in each compiler repository. Run `python tests/run.py` in this repository; the runner selects the sibling Windows executables.
For real windows and rendering, install the Vulkan SDK and start a fresh terminal with `VULKAN_SDK` set. The sibling `luce-demos` UI and sphere applications exercise Win32/Vulkan presentation. CPU tests run in hosted Windows CI; GPU smoke tests require an interactive desktop and Vulkan hardware.

Typography is shared explicitly: `let font = Font(size = 14.0)`, then
`Button("Save", font = font)` and `TextEditor(source, font = font)`. `Font` loads an
installed monospace family (`family = "Menlo"`, for example); omitting the family
selects Menlo on macOS, Consolas on Windows, and the fontconfig monospace family
on Linux. All text controls use the same 14-point default. Font metrics also drive
editor hit testing, caret positions and line spacing.

The UI owns a bounded cache of grayscale text runs. Standard `fonts` owns native
font resources; standard `gpu` uploads coverage and draws it through the selected
Metal or Vulkan backend. Rendering follows the window backing scale instead of
stretching a low-resolution font. Linux font loading needs Cairo/FreeType and an
installed monospace font (`libcairo2-dev fonts-dejavu-core` on Debian/Ubuntu).
Linux window/GPU presentation remains a separate, unimplemented backend.

This first font API loads installed families, not arbitrary font files. Text is
laid out on the editor's scalar grid; paragraph shaping, bidi, grapheme-aware
editing, color emoji, and a font picker remain future work. Windows substitutes
a replacement glyph for supplementary-plane scalars in this initial GDI adapter.

## Compact application composition

`Toolbar([Menu("File", [save]), Spacer(), Button(action = save)])` presents the
same `Action` through two controls. Register it with `Application.set_actions`
for window shortcuts. `Shortcut(Key.s, primary = true)` uses Ctrl or Command;
matching repeated key-down events do not invoke an action repeatedly.

`Application(content, theme = Theme())` supplies inherited semantic colors and
metrics. `Theme(control_lines = 2.0)` gives controls more vertical room. The default
is one font line with one character cell of horizontal inset. A subtree can use
`layout().set_theme(...)`, then `inherit_theme()` to return to its parent's theme.
Typography remains explicit: pass one shared `Font` through your view components.

See [composition contracts](docs/DESIGN.md), [the API](docs/API.md), and
[text change/highlight contracts](docs/TEXT-EDITOR.md). The separate
[luced editor](https://github.com/dymokomi/luced) composes named Luce views from
these Base controls; its entry point contains no geometry or signal wiring.

`SplitView(Pane(sidebar), SplitView(Pane(editor), Pane(output), axis=Axis.vertical))`
builds a bordered workspace with draggable dividers. Children supply minimum and
maximum sizes, and splits can nest. Generic `TextEditor.set_folds` accepts ranges
from a language service; Luce syntax knowledge stays in luced. See the
[pane API](docs/API.md#panes-and-split-views) and
[folding contracts](docs/TEXT-EDITOR.md#folding-and-viewport-bounds).

Context menus decorate any widget: `ContextMenu(content, actions, font=font)`.
`CommandPalette(actions, font=font)` supplies command search, and `TextPrompt`
supplies file-name entry or confirmation. Both mount as popup children and reuse
the framework's focus restoration, text input and window clipping. Panes use
`Theme.active_border` to indicate descendant focus; `Theme.gutter` styles the
folding margin independently. See the [popup API](docs/API.md#context-menus-command-search-and-prompts).

Layout tracks hover independently of focus and capture, exposing `is_hovered`,
`contains_pointer` and local `pointer_position` to every widget. Menus switch
between sibling titles during an open session. Panes, controls, list rows and
editor gutters use inherited hover colors. Popup shadows are sharp translucent
rectangles with configurable offset and opacity. See the
[hover API](docs/API.md#hover-and-menu-sessions).
