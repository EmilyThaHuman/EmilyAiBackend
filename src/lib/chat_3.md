Creating a **Code Snippet Saver** VSCode extension allows you to quickly generate markdown files with code block templates, making it easier to document and organize your code snippets. This guide will walk you through building such an extension that is triggered by a keyboard shortcut. When activated, it opens a new markdown file containing a code block template where you can paste your snippet.

## Overview

- **Trigger:** Keyboard shortcut (e.g., `Ctrl+Shift+S`)
- **Action:** Opens a new markdown (`.md`) file with a pre-filled code block template
- **Purpose:** Allows users to paste and document their code snippets easily

## Prerequisites

Before you begin, ensure you have the following installed:

- **[Node.js](https://nodejs.org/en/download/):** Version 14 or higher
- **[Visual Studio Code](https://code.visualstudio.com/):** The latest version is recommended
- **[Yeoman](https://yeoman.io/) and VSCode Extension Generator:**
  ```bash
  npm install -g yo generator-code
  ```

## Step-by-Step Guide

### 1. Scaffold the Extension

Use Yeoman to generate the basic structure for your extension.

```bash
yo code
```

**During the setup prompts, choose the following:**

- **Type of extension:** New Extension (TypeScript)
- **Extension name:** code-snippet-saver
- **Identifier:** code-snippet-saver
- **Description:** A VSCode extension to save code snippets into markdown files via a keyboard command.
- **Git:** Initialize a git repository? (Your choice)
- **Package manager:** npm

This command will create a new directory named `code-snippet-saver` with the necessary files.

### 2. Modify `package.json`

Navigate to the `code-snippet-saver` directory and open the `package.json` file. Replace its content with the following configuration:

```json
{
  "name": "code-snippet-saver",
  "displayName": "Code Snippet Saver",
  "description": "A VSCode extension to save code snippets into markdown files via a keyboard command.",
  "version": "0.0.1",
  "publisher": "your-publisher-name",
  "engines": {
    "vscode": "^1.70.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onCommand:extension.saveSnippet"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "extension.saveSnippet",
        "title": "Save Code Snippet"
      }
    ],
    "keybindings": [
      {
        "command": "extension.saveSnippet",
        "key": "ctrl+shift+s",
        "mac": "cmd+shift+s",
        "when": "editorTextFocus"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.70.0",
    "@types/glob": "^7.1.3",
    "@types/mocha": "^9.0.0",
    "@types/node": "16.x",
    "typescript": "^4.6.4",
    "vscode-test": "^1.6.0"
  }
}
```

**Key Points:**

- **Commands:** Defines the `extension.saveSnippet` command.
- **Keybindings:** Binds `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac) to the `saveSnippet` command when the editor is focused.
- **Activation Events:** The extension activates when the `saveSnippet` command is invoked.

### 3. Implement the Extension Logic

Open the `src/extension.ts` file and replace its content with the following code:

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register the 'saveSnippet' command
    let disposable = vscode.commands.registerCommand('extension.saveSnippet', async () => {
        try {
            // Prompt the user for the programming language
            const language = await vscode.window.showInputBox({
                prompt: 'Enter the programming language of the snippet (e.g., javascript, python)',
                placeHolder: 'Language'
            });

            if (!language) {
                vscode.window.showErrorMessage('Language is required to create a code block.');
                return;
            }

            // Create the markdown content with a code block template
            const markdownContent = `### Code Snippet\n\`\`\`${language}\n\n\`\`\`\n`;

            // Create a new untitled markdown document with the template
            const newDoc = await vscode.workspace.openTextDocument({ content: markdownContent, language: 'markdown' });
            await vscode.window.showTextDocument(newDoc, { preview: false });

            // Optional: Automatically place the cursor inside the code block for immediate pasting
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const doc = editor.document;
                const position = new vscode.Position(3, 0); // Line 3, character 0 (inside the code block)
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
            }

            vscode.window.showInformationMessage('Markdown file with code block created. Paste your snippet inside the code block.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create snippet: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
```

**Explanation:**

1. **Command Registration:** Registers the `saveSnippet` command that will be triggered by the keyboard shortcut.

2. **User Input:** Prompts the user to enter the programming language for the code block to ensure proper syntax highlighting in Markdown.

3. **Markdown Template:** Creates a markdown string with a heading and a fenced code block for the specified language.

4. **New Document Creation:** Opens a new untitled markdown file populated with the template.

5. **Cursor Placement (Optional):** Moves the cursor inside the code block, allowing the user to paste their snippet immediately.

6. **Feedback:** Displays an information message upon successful creation or an error message if something goes wrong.

### 4. Install Dependencies and Compile

Navigate to your extension directory and install the necessary dependencies:

```bash
npm install
```

Then, compile the TypeScript code:

```bash
npm run compile
```

### 5. Test the Extension

1. **Launch Extension Development Host:**

   Press `F5` in VSCode to open a new Extension Development Host window where you can test your extension.

2. **Use the Keyboard Shortcut:**

   - Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac).
   - Enter the programming language when prompted (e.g., `javascript`).
   - A new markdown file will open with a code block template.
   - The cursor will be inside the code block, ready for you to paste your snippet.

3. **Example Output:**

   ```markdown
   ### Code Snippet
   ```javascript

   ```
   ```

### 6. Optional Enhancements

- **Saving to a Specific Directory or File:**
  
  Modify the extension to save snippets to a predefined markdown file or a specific directory within your workspace.

- **Snippet Metadata:**

  Include additional metadata like snippet title, description, or tags to organize snippets better.

- **Auto-Save Snippets:**

  Automatically append the new snippet to an existing markdown file instead of creating a new one each time.

### 7. Packaging and Publishing (Optional)

If you wish to share your extension with others, you can package and publish it to the VSCode Marketplace.

1. **Install `vsce`:**

   ```bash
   npm install -g vsce
   ```

2. **Package the Extension:**

   ```bash
   vsce package
   ```

   This will generate a `.vsix` file which you can distribute.

3. **Publish:**

   Follow the [official VSCode publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) to publish your extension to the marketplace.

## Complete Code Listing

### `package.json`

```json
{
  "name": "code-snippet-saver",
  "displayName": "Code Snippet Saver",
  "description": "A VSCode extension to save code snippets into markdown files via a keyboard command.",
  "version": "0.0.1",
  "publisher": "your-publisher-name",
  "engines": {
    "vscode": "^1.70.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onCommand:extension.saveSnippet"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "extension.saveSnippet",
        "title": "Save Code Snippet"
      }
    ],
    "keybindings": [
      {
        "command": "extension.saveSnippet",
        "key": "ctrl+shift+s",
        "mac": "cmd+shift+s",
        "when": "editorTextFocus"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.70.0",
    "@types/glob": "^7.1.3",
    "@types/mocha": "^9.0.0",
    "@types/node": "16.x",
    "typescript": "^4.6.4",
    "vscode-test": "^1.6.0"
  }
}
```

### `src/extension.ts`

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register the 'saveSnippet' command
    let disposable = vscode.commands.registerCommand('extension.saveSnippet', async () => {
        try {
            // Prompt the user for the programming language
            const language = await vscode.window.showInputBox({
                prompt: 'Enter the programming language of the snippet (e.g., javascript, python)',
                placeHolder: 'Language'
            });

            if (!language) {
                vscode.window.showErrorMessage('Language is required to create a code block.');
                return;
            }

            // Create the markdown content with a code block template
            const markdownContent = `### Code Snippet\n\`\`\`${language}\n\n\`\`\`\n`;

            // Create a new untitled markdown document with the template
            const newDoc = await vscode.workspace.openTextDocument({ content: markdownContent, language: 'markdown' });
            await vscode.window.showTextDocument(newDoc, { preview: false });

            // Optional: Automatically place the cursor inside the code block for immediate pasting
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const doc = editor.document;
                const position = new vscode.Position(3, 0); // Line 3, character 0 (inside the code block)
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position));
            }

            vscode.window.showInformationMessage('Markdown file with code block created. Paste your snippet inside the code block.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create snippet: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
```

## Conclusion

You have now created a VSCode extension that allows you to quickly generate markdown files with code block templates using a keyboard shortcut. This extension can be further enhanced with additional features such as organizing snippets, adding metadata, or integrating with other tools. Feel free to customize and expand its functionality to better suit your workflow!