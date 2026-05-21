# Design specs

This folder holds the **behavioral specification** for `exa-cli` — not usage
docs. If you just want to *use* the CLI, read the
[user guide](../USER_GUIDE.md) instead.

The `.dog.md` files are [DOG](https://github.com/AirswitchAsa/dog) specs: a
typed, lintable concept graph of the project's actors, behaviors, components,
and data. They are the source of truth that the implementation is written to
match.

- Start at [`index.dog.md`](index.dog.md) — the project index, with links to
  every primitive.
- Cross-cutting rules that apply across all of them live in
  [`../conventions.md`](../conventions.md).

Browse with the DOG CLI rather than reading files one by one:

```bash
dog list -p docs/design
dog get "!Search" -p docs/design --depth 1
dog lint docs/design
```
