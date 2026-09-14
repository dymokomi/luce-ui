# Text controls

`TextEditor(text)` is an editable monospace widget. It owns Unicode scalar storage,
a selection, bounded undo/redo history, viewport offsets and optional colored
ranges. `read_only = true` provides a selectable output or document viewer.

`Highlight(start, end, color)` uses half-open scalar offsets. Supply ordered,
non-overlapping ranges to `set_highlights`; language analysis belongs to the app.
`on_change` fires after a document edit. Applications register Save, Build and
Run with `Application.set_actions`; the editor never opens files or launches
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

`Font` renders native antialiased text. Shaping, bidirectional layout,
grapheme-aware caret movement, accessibility, inline IME preedit and candidate
positioning need separate work. History is limited to 128 edits and 16 MiB of
changed ranges; documents support up to 1,048,576 scalars.

## Incremental decorations

`change()` returns `TextChange(start, old_end, new_end, version)` for the last
committed replacement. All offsets count Unicode scalars. `old_end` belongs to
the preceding version and `new_end` to the new one. Load, insert, undo, redo and
native input follow the same contract. Empty insertions do not advance version
or emit a change. Selection changes do neither.

The widget transforms existing highlights into the new coordinate space before
emitting `on_change`. Unaffected colors remain available even if a language
service delays or fails. `text_range(start, end)` reads only a needed interval;
`line_start(offset)` and `line_end(offset)` find the surrounding line boundaries.
The latter excludes the newline. `highlight_at(offset)` inspects a decoration.

`update_highlights(start, end, spans, version)` replaces one interval atomically,
retaining outside decorations. Spans use absolute scalar offsets and must be
ordered and disjoint inside that interval. An obsolete version returns false
without changing the set. Invalid ranges and allocation failure leave the
previous set intact. `set_highlights` replaces the entire set at the current
version. Both APIs allow at most 131072 spans.

A language service should cache outgoing line state, begin at the changed line,
and continue until its state agrees with an unchanged suffix. luced demonstrates
this for Luce's multiline strings, keeping token categories separate from their
colors. Revision checks make the same publication API usable by a future worker.
The current document and decoration arrays still move suffix storage after edits;
incremental tokenization is not a rope or an asynchronous language server.

## Folding and viewport bounds

`set_folds(ranges, version)` accepts up to 65536 language-neutral
`FoldRange(start, end)` values in zero-based Unicode scalar offsets. The start
names a header line; its following lines are hidden when collapsed. The end is
the start of the first line outside the fold, or the document's length. Headers
must be distinct and increasing; ranges may nest or be disjoint, but cannot
cross or end halfway through a line. Every range must hide at least one line.
Obsolete versions return false before validation. Invalid ranges and allocation
failure preserve the previous range set.

`set_folded(line, collapsed)` and `toggle_fold(line)` use one-based physical line
numbers. They return false when that line has no fold. `is_folded(line)` reports
the state. `fold_all()` and `unfold_all()` operate on the full set, including
nested folds; `visible_line_count()` reports the resulting rows. Click `−` or `+`
in the gutter to toggle a header. A collapsed header also displays an ellipsis.
The application supplies menu actions and shortcuts.

Folding changes neither source text, document revision, nor undo history. Nested
collapse state survives toggling its parent. Edits transform fold coordinates;
editing a header invalidates that fold until analysis publishes another set.
Unrelated edits preserve collapse state. A caret inside newly hidden text moves
to its visible header. Navigation skips hidden rows, while explicitly selecting
a hidden caret offset reveals its enclosing folds. Delete/Backspace at a folded
boundary expands it first. Explicit selections spanning folded text still include
that text for copying and replacement.

Painting, hit testing, navigation and scroll limits use one shared line
projection. Line metadata is updated from the changed text interval; unchanged
suffix entries move with the edit. Folding rebuilds visible row indices without
rereading source. Metadata arrays still take linear time to copy or traverse.

Scroll events describe content displacement, so viewport offsets subtract both
axes. Both offsets clamp to visible content after edits, folding and resizing.
Horizontal extent includes tab expansion, the longest visible line and room for
the caret; vertical extent uses visible rows. `scroll_offset()` returns the
clamped offsets as `Size(width=x, height=y)`. The output viewer uses this same
behavior through `read_only=true`.

## Editing commands and context menus

`copy`, `cut`, `paste`, `select_all`, `undo` and `redo` expose the same operations
used by keyboard editing. `has_selection`, `is_read_only`, `can_undo` and
`can_redo` let menus update availability. Cut and paste leave read-only content
unchanged. The application owns Action instances and may wrap the editor in a
ContextMenu; clipboard and document logic remain inside the text control.

The inherited theme has a separate gutter color, so the folding/line-number
area remains distinct from document content when the application changes theme.
