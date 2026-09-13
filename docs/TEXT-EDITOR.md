# Text controls

`TextEditor(text)` is an editable monospace widget. It owns Unicode scalar storage,
a selection, bounded undo/redo history, viewport offsets and optional colored
ranges. `read_only = true` provides a selectable output or document viewer.

`Highlight(start, end, color)` uses half-open scalar offsets. Supply ordered,
non-overlapping ranges to `set_highlights`; language analysis belongs to the app.
`on_change` fires after a document edit. `on_command` reports `save`, `build` and
`run`; applications supply those actions. The editor never opens files or launches
processes. `version()` changes when its content changes.

Native committed Unicode enters through standard `window`/`input`; keyboard
shortcuts stay physical key events. Editing supports selection, dragging,
clipboard, undo/redo, word and line navigation, indentation, auto-indented newlines
and scrolling. Control-Tab moves focus out; ordinary Tab indents. `line()` and
`column()` are one-based. Selection and highlight offsets are zero-based.

`ListView(items)` supplies scrollable single selection with keyboard navigation,
`select`, `set_items` and an `on_activate(index)` signal. It paints visible rows.

`Application.focus(layout)` applies focus after the next arrangement, allowing
callbacks to replace a pane then focus its new child. `set_close_handler` installs
a Boolean callback that can keep unsaved work open. `set_error_handler` reports
recoverable input failures inside the app. These retained callbacks participate
in the same cycle collection as other native and Luce objects.

The current original bitmap font covers printable ASCII and preserves case.
Other Unicode is stored and edited correctly but drawn with replacement glyphs.
This is a foundation, not a complete typography engine: font shaping, bidirectional
layout, grapheme-aware caret movement, accessibility, inline IME preedit and
candidate positioning need separate work. History is limited to 128 edits and
16 MiB of changed ranges; documents support up to 1,048,576 scalars.
