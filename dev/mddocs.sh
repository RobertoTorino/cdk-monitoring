#!/bin/bash

# Define the file path to the Typedoc configuration file
CONFIG_FILE="./typedoc.json"
BACKUP_FILE="./typedoc_backup.json"
# cd .. || exit

# Create a backup of the original configuration file
cp "$CONFIG_FILE" "$BACKUP_FILE"

# Modify the JSON file (using jq)
jq '.out = "./mddocs" | .plugin = ["typedoc-plugin-markdown"]' "$CONFIG_FILE" > temp.json && mv temp.json "$CONFIG_FILE"

# Run Typedoc to generate the documentation
npx typedoc

# Restore the original configuration file
mv "$BACKUP_FILE" "$CONFIG_FILE"
