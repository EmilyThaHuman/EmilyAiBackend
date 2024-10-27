const MARKDOWN_FORMATTING_GUIDE = `
## MARKDOWN ELEMENTS GUIDE: 
Use the following guide to format messages using Markdown syntax. This includes headings, text formatting, lists, links, images, blockquotes, code blocks, and more. Ensure to apply the appropriate syntax for the desired formatting.

### Headings

# H1
## H2
### H3
#### H4
##### H5
###### H6

### Text Formatting

- **Bold**: **bold** or '__bold__'
- *Italic*: *italic* or '_italic_'
- ***Bold and Italic***: '***bold and italic***'
- ~~Strikethrough~~: '~~strikethrough~~'
- Inline Code: 'inline code'
- Blockquote: '> Blockquote'

### Lists

1. Numbered List
   1. Indented Item

- Bullet List
  - Indented Item

- [ ] Unchecked Task
- [x] Checked Task

### Links and Images

- [Hyperlink](https://example.com): '[link text](URL)'
- ![Image](https://via.placeholder.com/150): '![alt text](URL)'

### Blockquotes

> Blockquote
> > Nested Quote

### Code Blocks

\`\`\`language 
const myVariable = 'Hello, World!';
console.log(myVariable);
\`\`\`

### Horizontal Rule
---

### Escape Special Characters
Use a single backslash '\\' before the character to escape it.
- Example (two are used for purposes of escaping it for this template): \\# Not a Heading

### Tables

| Header 1 | Header 2 |
|----------|----------|
| Cell 1 | Cell 2 |

### Special Elements:
- Superscript: E = mc^2
- Subscript: H~2~O
- Table of Contents: [TOC]
- Footnotes: [^1] and [^1]:
- Definition Lists: Term : Definition
- Abbreviations: *[HTML]: Hyper Text Markup Language
- Highlight: ==highlighted text==
- Custom Containers: ::: warning *Here be dragons* :::
- Emoji: :emoji_name:

### HTML Format
All of these markdowns (or at least most) can be converted into the format. For example, if you needed Heading (level 1), you can use the "<h1> </h1>” trick, which would be this: "<h1>Heading level 1</h1>". This works for most Markdown parsers.

### Mermaid Diagram
You can use Mermaid to create diagrams. For example:
\`\`\`mermaid
 diagram_type
 diagram_code
\`\`\`
For instance, this is a Mermaid diagram:
\`\`\`mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
    subgraph "My Subgraph"
        A-->B;
        C-->D;
\`\`\`
`;
const EXAMPLE_RESPONSE_TEXT = `
# Toggleable Option for Completions and Stream Completions

We'll guide you through updating your application to include a toggleable option for switching between the **Completions** and **Stream Completions** endpoints.

## Overview
1. **Update the Utility Function**: Implement separate functions for standard completions and streaming completions.
2. **Enhance the TestChatUI Component**:
   - Add a toggle switch for Completions/Stream Completions
   - Update response handling for streaming
   - Modify UI for streaming animations

## 1. Update the Utility Function

Let's implement two separate functions:
- \`generatePrompt\`: For standard completions
- \`generatePromptStream\`: For streaming completions

### Implementation

\`\`\`javascript
// src/utils/promptGenerator.js
import axios from 'axios';

export const generatePrompt = async (prompt, apiKey, model = 'text-davinci-003') => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
        model: model,
        prompt: prompt,
        max_tokens: 1500,
        temperature: 0.7,
        stream: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${apiKey}\`,
        },
      }
    );
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error generating prompt:', error);
    throw error;
  }
};
\`\`\`

## 2. BasePromptGenerator Component

\`\`\`jsx
// src/components/BasePromptGenerator.jsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  useTheme,
  Grow,
  Collapse,
} from '@mui/material';
import { Refresh, Clear, Chat } from '@mui/icons-material';
import GenerateButton from './GenerateButton';
import SystemInstructions from './SystemInstructions';
import ApiKeyInput from './ApiKeyInput';
import { generatePrompt, generatePromptStream } from '../utils/promptGenerator';
import TestChatUI from './TestChatUI';
import { motion, AnimatePresence } from 'framer-motion';

const BasePromptGenerator = ({ promptTemplate, generatorTitle }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [generatedInstructions, setGeneratedInstructions] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animateComponents, setAnimateComponents] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const theme = useTheme();

  const handleGenerate = async () => {
    if (!apiKey) {
      setError('Please set your OpenAI API key first.');
      return;
    }
    if (!userInput.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setIsExpanded(true);
    setAnimateComponents(true);
    try {
      const prompt = promptTemplate.replace('{userInput}', userInput);
      const instructions = await generatePrompt(prompt, apiKey);
      setGeneratedInstructions(instructions);
    } catch (err) {
      setError('Error generating instructions. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setUserInput('');
    setGeneratedInstructions('');
    setIsExpanded(false);
    setError(null);
    setAnimateComponents(false);
  };

  const handleRegenerate = async () => {
    if (userInput) {
      await handleGenerate();
    }
  };

  const handleSetApiKey = (key) => {
    setApiKey(key);
    setError(null);
  };

  const handleTest = () => {
    if (!generatedInstructions.trim()) {
      setError('Please generate instructions before testing.');
      return;
    }
    setIsTestMode(true);
  };

  const handleBackToGenerator = () => {
    setIsTestMode(false);
  };

  return (
    <Box sx={{ maxWidth: '800px', margin: 'auto', mt: theme.spacing(4), position: 'relative' }}>
      <Typography variant="h5" gutterBottom>
        {generatorTitle}
      </Typography>
      <ApiKeyInput onSubmit={handleSetApiKey} />
      {error && (
        <Typography color="error" sx={{ mb: theme.spacing(2) }}>
          {error}
        </Typography>
      )}
      {generatedInstructions && (
        <Box sx={{ mb: theme.spacing(2), display: 'flex', justifyContent: 'flex-end', gap: theme.spacing(1) }}>
          <Button variant="outlined" size="small" startIcon={<Clear />} onClick={handleClear}>
            Clear
          </Button>
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={handleRegenerate}>
            Regenerate
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Chat />}
            onClick={handleTest}
            color="secondary"
          >
            Test
          </Button>
        </Box>
      )}
      {/* Animated Container */}
      <AnimatePresence>
        {!isTestMode && (
          <motion.div
            key="generator"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <Grow in={animateComponents} timeout={500}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: theme.spacing(2) }}>
                <SystemInstructions instructions={generatedInstructions} />
                <Paper elevation={3} sx={{ p: theme.spacing(2), display: 'flex', alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Enter your prompt..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    sx={{ mr: theme.spacing(2) }}
                  />
                  <GenerateButton
                    onClick={handleGenerate}
                    isLoading={isLoading}
                    text={isLoading ? 'Generating...' : 'Generate'}
                  />
                </Paper>
              </Box>
            </Grow>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Test Chat UI */}
      <AnimatePresence>
        {isTestMode && (
          <motion.div
            key="testChat"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <TestChatUI
              prompt={generatedInstructions}
              apiKey={apiKey}
              onBack={handleBackToGenerator}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default BasePromptGenerator;
\`\`\`

### Key Features
- Toggle between completion modes
- Animated transitions
- Error handling
- API key management
- Real-time streaming updates
`;
module.exports = {
  MARKDOWN_FORMATTING_GUIDE,
  EXAMPLE_RESPONSE_TEXT
};
