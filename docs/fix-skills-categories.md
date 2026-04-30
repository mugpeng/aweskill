# `aweskill doctor fix-skills` Categories

This document explains every category that `aweskill doctor fix-skills` may report.

- Actionable fixes are reported by default and can be rewritten with `--apply`.
- Informational checks are reported only with `--include-info` and are never rewritten.

## Actionable Fixes

### `missing-closing-delimiter`

Problem:

```md
---
name: my-skill
description: hello
# Body starts here, but the frontmatter never closes
```

Fixed result:

```md
---
name: my-skill
description: hello
---

# Body starts here, but the frontmatter never closes
```

### `invalid-yaml`

Problem:

```md
---
name: my-skill
description:
  - not
  - a string
required_permissions: drive:file:upload
# Quick Start
Use this skill carefully.
---
```

Fixed result:

```md
---
name: my-skill
description: Use this skill carefully.
required_permissions:
  - drive:file:upload
---

```

This class usually means the frontmatter block cannot be parsed as YAML at all.

### `added-frontmatter`

Problem:

```md
# My Skill

Use this skill for ...
```

Fixed result:

```md
---
name: my-skill
description: Use this skill for ...
---

# My Skill

Use this skill for ...
```

### `normalized-name`

Problem:

```md
---
name:
  nested: nope
description: hello
---
```

Fixed result:

```md
---
name: my-skill
description: hello
---
```

This class means `name` exists but is not a usable scalar string.

### `normalized-description`

Problem:

```md
---
name: my-skill
description:
  nested: nope
---

# My Skill

Actual description in the first body sentence.
```

Fixed result:

```md
---
name: my-skill
description: Actual description in the first body sentence.
---

# My Skill

Actual description in the first body sentence.
```

This class means `description` is missing or not a usable scalar string.

## Informational Checks

### `normalized-required-permissions`

Problem:

```md
---
name: my-skill
description: hello
required_permissions: drive:file:upload
---
```

Canonical form:

```md
---
name: my-skill
description: hello
required_permissions:
  - drive:file:upload
---
```

This check means the permissions could be normalized, but `fix-skills --apply` will not rewrite them.

### `preserved-unknown-fields`

Problem:

```md
---
name: my-skill
description: hello
homepage: https://example.com
license: MIT
metadata:
  author: team
---
```

Canonical form under the current fixer:

```md
---
name: my-skill
description: hello
homepage: https://example.com
license: MIT
metadata:
  author: team
---
```

This check does not mean the file is broken. It means the frontmatter contains fields outside the built-in core set: `name`, `description`, and `required_permissions`.

### `removed-empty-fields`

Problem:

```md
---
name: my-skill
description: hello
required_permissions: []
metadata: {}
empty_value: ''
---
```

Canonical form:

```md
---
name: my-skill
description: hello
---
```

This check means the frontmatter contains empty arrays, empty objects, or blank scalar values that could be dropped. It is informational only and is not rewritten automatically.
