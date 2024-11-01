<!-- src\models\README.md -->

# Models

## Directory

This directory contains the models for the application.

```bash
|--src/
│   models/
│   ├── chat/
│   │   chat/
│   │   ├── code/
│   │   │   code/
│   │   │   ├── Component.js
│   │   │   └── index.js
│   │   ├── assistant.js
│   │   ├── chat-message.js
│   │   ├── chat-session.js
│   │   ├── files-metadata.js
│   │   ├── files.js
│   │   ├── index.js
│   │   ├── main.js
│   │   ├── methods.js
│   │   ├── model.js
│   │   ├── preset.js
│   │   ├── prompt.js
│   │   └── tool.js
│   ├── user/
│   │   user/
│   │   ├── index.js
│   │   └── User.js
│   ├── utils/
│   │   utils/
│   │   ├── index.js
│   │   ├── main.js
│   │   ├── populate.js
│   │   └── schema.js
│   ├── workspace/
│   │   workspace/
│   │   ├── index.js
│   │   └── main.js
│   ├── index.js
│   ├── main.js
│   └── README.md
```

# Notes

## Required Model Data

The following data is required for each model:

- Files

  - `name` <!-- required -->
  - `description` <!-- required -->
  - `content` <!-- not required -->
  - `metadata` <!-- required -->
    - `userId`
    - `workspaceId`
    - `folderId` <!-- not required -->
    - `fileId`
    - `type`
    - `size`
    - `mimeType`
    - `filePath`
    - `sharing`
    - `space`
    - `createdAt`
    - `updatedAt`

- Prompts

  - `name` <!-- required -->
  - `description` <!-- required -->
  - `content` <!-- required -->

- Assistants

  - `name` <!-- required -->
  - `systemInstructions` <!-- required -->
  - `model` <!-- required -->
  - `fileSearch` <!-- required -->
  - `codeInterpreter` <!-- required -->
  - `functions` <!-- required -->
  - `responseFormat` <!-- required -->
  - `temperature` <!-- required -->
  - `topP` <!-- required -->
  - `instructions` <!-- required -->
  - `toolResources` <!-- required -->

- Tools
  - `name` <!-- required -->
  - `description` <!-- required -->
  - `url` <!-- required -->
  - `schema` <!-- required -->
  - `type` <!-- required -->
