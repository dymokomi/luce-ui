# Text controls

`TextEditor(text)` is an editable monospace widget. It owns Unicode scalar storage,
a selection, bounded undo/redo history, viewport offsets and optional colored
ranges. `read_only = true` provides a selectable output or document viewer.

`Highlight(start, end, color)` uses half-open scalar offsets. Supply ordered,
non-overlapping ranges to `set_highlights`; language analysis belongs to the app.
`on_change` fires after a document edit. Applications register Save, Build and
Run with `Application.set_commands`; the editor never opens files or launches
processes. `version()` changes when its content changes.

Native committed Unicode enters through standard `window`/`input`; keyboard
shortcuts stay physical key events. Editing supports selection, dragging,
clipboard, undo/redo, word and line navigation, indentation, auto-indented newlines
and scrolling. Control-Tab moves focus out; ordinary Tab indents. `line()` and
`column()` are one-based. Selection and highlight offsets are zero-based.

`ListView(items)` supplies scrollable single selection with keyboard navigation,
`select`, `set_items` and an `on_activate(index)` signal. Entries are
`ListItem(text, icon=IconKind.blank)` values; labels are copied when assigned,
and their icons do not alter indices or activation. It paints visible rows.
Applications choose symbols; filesystem and file-type policy stay outside UI.

`Application.focus(layout)` applies focus after the next arrangement, allowing
callbacks to replace a pane then focus its new child. `set_close_handler` installs
a Boolean callback that can keep unsaved work open. `set_error_handler` reports
recoverable input failures inside the app. These retained callbacks participate
in the same cycle collection as other native and Luce objects.

`Font` renders native antialiased text. Columns count monospace cells: a wide
East Asian scalar takes two, a combining mark none, a tab runs to the next stop of
four. `column()` reports cells, clicks land on the nearest scalar boundary, and soft
wrap moves a wide scalar that would cross the edge to the next row. Shaping, bidirectional layout,
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

## Soft wrap

`set_wrap(enabled)` toggles soft wrap; `wrapping()` reports it. `TextEditor(…,
wrap=true)` starts wrapped. When on, each physical line becomes one or more visual
rows split to the viewport width, and horizontal scrolling is disabled. The
projection layers wrap over folding: a wrapped row keeps its physical line's tab
stops and carries the line number and fold marker only on its first segment.
Wrapping breaks at the last space that fits, falling back to a hard break for a
word wider than the pane, so it always advances. `visible_line_count()` counts
visual rows, and vertical navigation, hit testing and the caret follow them.

## Change bars

`set_baseline(text)` records a saved version to diff against; `clear_baseline()`
removes it, and `has_changes()` reports whether the buffer currently differs. A
Myers line diff classifies each current line as unchanged, added or modified and
marks where baseline lines were deleted, drawn as gutter bars in
`EditorTheme.diff_added`, `diff_modified` and `diff_deleted`. The diff recomputes
only when the document revision changes, and its cost scales with the number of
changed lines, so a few edits in a large file stay cheap; a very divergent file
falls back to a coarse whole-region mark. Pass the current text (as after a save)
to clear the bars. luced sets the baseline to the file on disk and re-baselines on
save.

## Diagnostics

`set_diagnostics(diagnostics)` shows compiler or linter results; an empty list,
or `clear_diagnostics()`, removes them. Each is
`Diagnostic(line, column_start, column_end, severity, message)`, with `severity`
one of `Severity.error`, `warning` and `info`. Lines and columns are one-based,
as compilers print them and as `line()` reports the caret's line. Columns count
Unicode scalars, not UTF-8 bytes and not display cells: a tab or a wide scalar is
one column, so they differ from `column()`, which counts cells. On ASCII lines
byte and scalar columns agree; a caller with byte columns on non-ASCII text
converts them first. The range is `column_start..<column_end`. An empty range,
or one past the line's end, underlines one cell, and a line past the last points
at the document's end. A zero line or column is refused and keeps the previous
set.

Errors and warnings get a wavy underline, info a straight one, in
`EditorTheme.diagnostic_error`, `diagnostic_warning` and `diagnostic_info`,
which `Theme` supplies. With line numbers on, a line on which any diagnostic
starts shows a square in the gutter's first cell, in its worst severity. Resting
the pointer on an underline or a gutter mark shows a `Tooltip` under the row with
every message there, one to a line, after `set_tip_delay(seconds)` (half a second
unless set). A press, key, scroll, edit or the pointer leaving hides it;
`shown_tip()` returns its text, or an empty one when hidden.

Diagnostics follow edits as highlights do: positions before an edit stay, those
after shift by its length, and those inside replaced text move to its end. A
range whose text is all deleted, or a point inside deleted text, is dropped and
does not come back on undo. `set_text` clears them, since they belonged to the
old text. `diagnostic_count()` and `diagnostic_range(index)` (zero-based scalar
offsets) report what is left, so a stale set can be republished after the next
build.

## Completion

`set_completion_provider(provider)` installs a callback that offers completions;
`set_completion_provider(none)` or `clear_completion_provider()` removes it. The
editor calls it with its `CompletionList`, synchronously, in three cases: after a
`.` is typed, after the first identifier character of a word is typed (one
character is enough; a word starting with a digit is a number and does not ask),
and on Ctrl+Space on every platform, or `complete()` from code. Cmd+Space stays
the system's (Spotlight on macOS). Ctrl+Space is a chord, so an application
command bound to it is matched first. A read-only editor never asks.

During the call the list answers `caret()` and `start()`, scalar offsets like
every other editor offset, and `trigger()`: `CompletionTrigger.typed`, `dot` or
`invoked`. `start()` is where the word being completed begins: the run of
identifier characters before the caret (ASCII letters and digits, `_` and any
non-ASCII scalar), or the caret itself after a `.`. `set_start(offset)` moves it
back, on the caret's line. `text()` and `text_range(start, end)` read the document,
so the provider needs no other access; `editor.text()` works too. The provider
adds items with `add(label, kind, detail = "", doc = "")`: `label` is what accepting
inserts, one line; `kind` is a `CompletionKind`; `detail` is a signature, shown muted
after the label; `doc` shows under the list in the markup described under
[Hover](#hover). After the call the list refuses `add`, `set_start` and the text
calls, so a provider that keeps it cannot change the shown list. A list holds at
most 16384 items and 16 MiB of text; an error from the provider ends the session
and reaches the application's error handler like any input failure.

A builder rather than a returned list: a Luce callback cannot hand Base a list of
structs across the interop boundary, so the provider adds one item a call.

| `CompletionKind` | Letter | Color |
| --- | --- | --- |
| `function` | f | accent |
| `method` | m | accent |
| `field` | p | `vcs_added` |
| `variable` | v | `vcs_added` |
| `datatype` | T | `vcs_modified` |
| `module` | M | foreground |
| `keyword` | k | muted |

(`type` belongs to the language, hence `datatype`.)

The popup opens under the caret's row, its labels lined up with the word, or
above the row when the window has no room below. It shows up to ten rows, each a
kind letter, the label and the detail, and under them the selected item's detail
as a signature and its doc. With no items, or no item matching, nothing shows.

The provider is asked once per session, not per keystroke. While the caret stays
in the word, typing more identifier characters, Backspace and Delete filter the
same items again by the text from `start()` to the caret: labels that start with
it first, then labels holding its characters in order (a subsequence), both
ignoring ASCII case; within each, labels matching in case come first, then the
provider's order. The provider is asked again only on another `.` or Ctrl+Space,
and is never asked more than once for one key or typed character. It runs after
`on_change` has heard the edit, so an analysis updated there is current. A
session whose provider added nothing stays quiet for the rest of the word.

While the popup shows, Up and Down move the selection (wrapping at the ends),
Page Up and Page Down move it by ten rows, and Enter or Tab accept: the text from
`start()` to the caret becomes the label, as one undoable edit. These keys go to
the popup, not the text; with Shift, Ctrl, Alt or Cmd held they go to the text.
Escape hides the popup for the rest of the word; Ctrl+Space or a `.` brings it back.
A click on a row accepts it (on the next frame, as the editor polls its popup)
and leaves the keyboard with the editor; the wheel scrolls the rows. The session
ends when the caret leaves the word (a move, a non-identifier character, a
Backspace past `start()`, a selection), on a press anywhere in the editor, on
focus loss, and when the provider is removed. `close_completion()` ends it from
code. `completion_shown()`, `completion_count()`, `completion_label(index)` and
`completion_selection()` report the popup's state.

```luce
from luce_ui.ui import TextEditor, CompletionList, CompletionKind, CompletionTrigger

editor.set_completion_provider(func(items: CompletionList) -> unit!:
    if items.trigger() == CompletionTrigger.dot:
        for member in members_before(editor.text(), items.start() - 1):
            items.add(member.name, CompletionKind.method, member.signature, member.doc)
    else:
        items.add("print", CompletionKind.function, "func print(text: str)", "Writes `text` and a newline.")
)
```

## Hover

`set_hover_provider(provider)` installs a callback asked what to show when the
pointer rests on a word; `set_hover_provider(none)` or `clear_hover_provider()`
removes it. After the tooltip delay (`set_tip_delay`, half a second unless set)
over an identifier character, the editor calls it with that scalar's offset. It
returns the text to show, or an empty text for nothing. It is asked once per
word the pointer rests on; moving within the word keeps the tooltip, moving to
another word waits and asks again. A press, key, scroll or edit hides it, and
`shown_tip()` returns the text as given.

The text is light markup. Its first line is a signature, set in the code
(accent) color with a rule under it when more follows. In the rest, text between
backticks is a `code span`, set in the code color, its backticks hidden; a span
ends at the end of its line. Newlines break lines, a blank line leaves an empty
one, and long lines wrap at a space to 72 cells. Nothing else is markup: `*`,
`_` and `#` show as typed. Completion docs use the same rules, with the item's
detail as the signature.

A diagnostic wins: over an underline or a gutter mark the tooltip shows the
diagnostic's messages, and the hover provider is not asked.

```luce
editor.set_hover_provider(func(offset: int) -> str!:
    let symbol = symbol_at(offset) else return ""
    return f"{symbol.signature}\n{symbol.doc}"
)
```

Both providers are retained by the editor and traced, so a closure that captures
the editor is collected with it; `close` releases them.

## Editing commands and context menus

`copy`, `cut`, `paste`, `select_all`, `undo` and `redo` expose the same operations
used by keyboard editing. `has_selection`, `is_read_only`, `can_undo` and
`can_redo` let menus update availability. Cut and paste leave read-only content
unchanged. The application owns Command instances and may wrap the editor in a
ContextMenu; clipboard and document logic remain inside the text control.

The gutter marks the caret's visible row with `EditorTheme.gutter_active` and
`active_line_number`, even while a menu temporarily owns keyboard focus. Hovering
a different gutter row uses `gutter_hover` and brightens its number/fold marker.
Both rows use the same projection and scroll position as text, including folded
content. Passive pointer movement changes no document, decoration or measured
geometry.

The inherited theme has a separate gutter color, so the folding/line-number
area remains distinct from document content when the application changes theme.
