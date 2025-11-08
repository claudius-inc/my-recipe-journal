#!/bin/bash
# Extract file path from JSON input
FILE=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // empty')

[[ -z "$FILE" ]] && exit 0

# Format based on extension
case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx)
    # Try Biome first, fall back to Prettier
    if command -v biome &> /dev/null; then
      biome format --write "$FILE" &> /dev/null || true
    elif command -v prettier &> /dev/null; then
      prettier --write "$FILE" &> /dev/null || true
    fi
    ;;
  *.py)
    # Python: Ruff
    if command -v ruff &> /dev/null; then
      ruff format "$FILE" &> /dev/null || true
    fi
    ;;
  *.go)
    # Go: goimports + gofmt
    if command -v goimports &> /dev/null; then
      goimports -w "$FILE" &> /dev/null || true
    fi
    go fmt "$FILE" &> /dev/null || true
    ;;
  *.md)
    # Markdown: Prettier
    if command -v prettier &> /dev/null; then
      prettier --write "$FILE" &> /dev/null || true
    fi
    ;;
esac