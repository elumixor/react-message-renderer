# react-message-renderer

Target-agnostic React reconciler that renders JSX into a mutable tree of "messages". Pairs with target packages like `@elumixor/react-telegram`.

## Releasing / publishing

Publishing is **automated by CI** — do not run `npm publish` locally (the local npm token is often unauthenticated; CI uses its own with provenance).

To cut a release:

```bash
npm run release:patch   # or release:minor / release:major
```

This bumps the version, commits `Release vX.Y.Z`, tags `vX.Y.Z`, and pushes the tag. The `publish` job in `.github/workflows/build.yml` triggers on any `v*` tag push and runs `npm publish --access public --provenance` after build/test/lint pass.

Gotchas:
- `release:*` only runs `git push --tags`, not `git push`. Run `git push` too so the version-bump commit lands on the remote branch.
- After pushing, verify the run: `gh run list -R elumixor/react-message-renderer --workflow build.yml`, then `npm view @elumixor/react-message-renderer version`.

## Downstream coupling

`@elumixor/react-telegram` depends on this package. When a release introduces something RT will require (e.g. a new field on `renderMessages`'s `RenderPassOptions`), **publish this package first and wait until the new version is resolvable on npm** before releasing RT — otherwise RT's CI `bun install` fails with `No version matching "^X.Y.Z" found (but package exists)`.
