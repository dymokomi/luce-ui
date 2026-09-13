# luce-ui

A UI framework written in Luce Base, consumed through ordinary Base structs or
Luce objects. Controls implement `Widget`; an `Application` owns the native event
loop, layout, input routing and presentation. The package uses standard `gpu` and
`window`, which currently provide Metal on ARM64 macOS. Vulkan remains unimplemented.

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

This is an early framework, with bitmap text and a small control set. It does not
yet provide editable text, shaping, accessibility, scrolling containers or a broad
widget catalog. MIT or Apache-2.0, at your option.

## Windows x64

Build sibling `luce-base` and `luce` checkouts with `python tools/build_windows.py` in each compiler repository. Run `python tests/run.py` in this repository; the runner selects the sibling Windows executables.
For real windows and rendering, install the Vulkan SDK and start a fresh terminal with `VULKAN_SDK` set. The sibling `luce-demos` UI and sphere applications exercise Win32/Vulkan presentation. CPU tests run in hosted Windows CI; GPU smoke tests require an interactive desktop and Vulkan hardware.
