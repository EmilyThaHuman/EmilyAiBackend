Absolutely! I'll guide you through updating your application to include a toggleable option for switching between the **Completions** and **Stream Completions** endpoints. We'll enhance the `TestChatUI` component to support both modes, update the `generatePrompt` utility to handle streaming, and adjust the UI to render streaming responses effectively.

## Overview

1. **Update the Utility Function (`generatePrompt.js`)**: Implement separate functions for standard completions and streaming completions.
2. **Enhance the `TestChatUI` Component**:
   - Add a toggle switch to switch between **Completions** and **Stream Completions**.
   - Update response handling to support streaming.
   - Modify the UI to display streaming messages with proper animations.
3. **Ensure Model Configuration**: Set default models suitable for both endpoints or allow dynamic selection if needed.
4. **Update Dependencies**: Ensure necessary packages are installed for handling streams.

## Prerequisites

Ensure you have the following packages installed:

```bash
npm install @mui/material @mui/icons-material framer-motion react-markdown axios
```

For handling streaming responses, we'll use the native **Fetch API**, as Axios doesn't natively support streaming. Therefore, ensure your environment supports Fetch (most modern browsers do).

## 1. Update the Utility Function (`generatePrompt.js`)

We'll implement two separate functions:

- `generatePrompt`: For standard completions.
- `generatePromptStream`: For streaming completions.

### `generatePrompt.js`

```javascript
// src/utils/promptGenerator.js
import axios from 'axios';

/**
 * Generates a prompt using OpenAI's Completions API.
 * @param {string} prompt - The prompt text.
 * @param {string} apiKey - The OpenAI API key.
 * @param {string} model - The model to use.
 * @returns {Promise<string>} - The generated text.
 */
export const generatePrompt = async (prompt, apiKey, model = 'text-davinci-003') => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
        model: model,
        prompt: prompt,
        max_tokens: 1500,
        temperature: 0.7,
        stream: false, // Ensure streaming is disabled
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error generating prompt:', error);
    throw error;
  }
};

/**
 * Generates a prompt using OpenAI's Stream Completions API.
 * @param {string} prompt - The prompt text.
 * @param {string} apiKey - The OpenAI API key.
 * @param {string} model - The model to use.
 * @param {function} onMessage - Callback to handle each streamed message.
 * @param {function} onComplete - Callback when streaming is complete.
 * @param {function} onError - Callback to handle errors.
 */
export const generatePromptStream = async (
  prompt,
  apiKey,
  model = 'text-davinci-003',
  onMessage,
  onComplete,
  onError
) => {
  try {
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        max_tokens: 1500,
        temperature: 0.7,
        stream: true, // Enable streaming
      }),
    });

    if (!response.body) {
      throw new Error('ReadableStream not yet supported in this browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let accumulatedResponse = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              const text = data.choices[0].delta?.content || '';
              accumulatedResponse += text;
              onMessage(text);
            } catch (err) {
              console.error('Error parsing streamed data:', err);
              onError(err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error generating streamed prompt:', error);
    onError(error);
  }
};
```

### Explanation

1. **`generatePrompt`**:
   - Uses Axios to send a POST request to OpenAI's Completions API.
   - Returns the complete generated text once the response is received.

2. **`generatePromptStream`**:
   - Uses the native Fetch API to send a POST request with `stream: true`.
   - Reads the response stream chunk by chunk.
   - Parses each chunk and extracts the generated text.
   - Invokes `onMessage` callback for each piece of text received.
   - Calls `onComplete` when streaming is done.
   - Handles errors via the `onError` callback.

## 2. Enhance the `TestChatUI` Component

We'll update the `TestChatUI` to include a toggle switch for selecting between **Completions** and **Stream Completions**, and handle streaming responses appropriately.

### `TestChatUI.jsx`

```jsx
// src/components/TestChatUI.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Send, ArrowBack } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { generatePrompt, generatePromptStream } from '../utils/promptGenerator';

const TestChatUI = ({ prompt, apiKey, onBack }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useStream, setUseStream] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to the bottom whenever chatResponse updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatResponse]);

  const handleSend = async () => {
    if (!chatInput.trim()) {
      setError('Please enter a message.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setChatResponse('');
    try {
      if (useStream) {
        await generatePromptStream(
          `${prompt}\nUser: ${chatInput}\nAI:`,
          apiKey,
          'text-davinci-003',
          (text) => {
            setChatResponse((prev) => prev + text);
          },
          () => {
            setIsLoading(false);
          },
          (err) => {
            setError('Error generating streamed response. Please try again.');
            console.error(err);
            setIsLoading(false);
          }
        );
      } else {
        const combinedPrompt = `${prompt}\nUser: ${chatInput}\nAI:`;
        const response = await generatePrompt(combinedPrompt, apiKey, 'text-davinci-003');
        setChatResponse(response);
        setIsLoading(false);
      }
    } catch (err) {
      setError('Error generating response. Please try again.');
      console.error(err);
      setIsLoading(false);
    } finally {
      setChatInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleStream = () => {
    setUseStream((prev) => !prev);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={onBack} aria-label="Back to Generator">
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1 }}>
          Test Chat Interface
        </Typography>
      </Paper>
      <Paper
        elevation={3}
        sx={{
          height: '500px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 2,
          overflowY: 'auto',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Box sx={{ flexGrow: 1, mb: 2 }}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <AnimatePresence>
            {chatResponse && (
              <motion.div
                key="response"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Prompt Request:
                  </Typography>
                  <ReactMarkdown>{prompt}</ReactMarkdown>
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    AI Response:
                  </Typography>
                  <ReactMarkdown>{chatResponse}</ReactMarkdown>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={4}
          />
          <Button
            variant="contained"
            color="primary"
            endIcon={<Send />}
            onClick={handleSend}
            disabled={isLoading}
            sx={{ ml: 2, minWidth: '100px' }}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </Box>
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={<Switch checked={useStream} onChange={handleToggleStream} color="primary" />}
            label="Stream Response"
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default TestChatUI;
```

### Explanation

1. **State Management**:
   - `useStream`: Boolean state to toggle between **Completions** and **Stream Completions**.
   - `chatResponse`: Accumulates the AI's response. For streaming, it updates incrementally.

2. **Toggle Switch**:
   - Added a `Switch` component with a label "Stream Response".
   - Toggling this switch changes the mode between standard and streaming completions.

3. **Handling Responses**:
   - **Standard Completions**: Calls `generatePrompt` and sets `chatResponse` once the response is received.
   - **Stream Completions**: Calls `generatePromptStream` and appends text to `chatResponse` as chunks arrive.

4. **UI Adjustments**:
   - Increased the height of the chat area for better visibility.
   - Implemented `ReactMarkdown` to render the AI's response with proper formatting.
   - Added a scroll-to-bottom feature to keep the latest messages in view.
   - Disabled the input field and send button during loading to prevent multiple submissions.

5. **Animations**:
   - Used `AnimatePresence` and `motion.div` to animate the appearance of the AI response.
   - Smoothly transitions the response into view, whether it's a full response or a streamed one.

6. **User Experience**:
   - Users can toggle between receiving complete responses or watching the AI type out the response in real-time.
   - Enhanced the send button to handle loading states and provide immediate feedback.

## 3. Update the `BasePromptGenerator` Component

Ensure that the `BasePromptGenerator` properly integrates the updated `TestChatUI`. No changes are required in the generator's functionality regarding the toggle; it's handled within `TestChatUI`.

However, ensure that `TestChatUI` is correctly imported and utilized.

### `BasePromptGenerator.jsx`

```jsx
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
```

### Explanation

- **State Management**:
  - `isTestMode`: Determines whether to display the generator or the test chat UI.
  
- **Test Button**:
  - Added a **"Test"** button that appears when `generatedInstructions` are available.
  - Clicking **"Test"** sets `isTestMode` to `true`, triggering the transition to the chat UI.

- **Animations with Framer Motion**:
  - Utilized `AnimatePresence` and `motion.div` to animate the transition between the generator and the test chat UI.
  - Smoothly collapses the generator and expands the chat UI.

- **Conditional Rendering**:
  - Only one of the generator UI or the chat UI is visible at any time, based on `isTestMode`.

## 4. Ensure Model Configuration

For simplicity, we'll use a default model (`text-davinci-003`) that supports both endpoints. However, if you wish to allow users to select different models, you can extend the UI accordingly. For this example, we'll keep it simple.

## 5. Final Folder Structure

Ensure your project has the following structure for optimal organization:

```
src/
├── components/
│   ├── BasePromptGenerator.jsx
│   ├── APIAssistantInstructionsGenerator.jsx
│   ├── FunctionsToolsGenerator.jsx
│   ├── EnhancedQueryOptimizerGenerator.jsx
│   ├── SystemInstructions.jsx
│   ├── GenerateButton.jsx
│   ├── ApiKeyInput.jsx
│   └── TestChatUI.jsx
├── utils/
│   ├── promptGenerator.js
│   ├── enhancedQueryPromptTemplate.js
│   ├── apiAssistantPromptTemplate.js
│   └── functionsToolsPromptTemplate.js
├── App.jsx
└── index.js
```

## 6. Complete Code Listings

### `TestChatUI.jsx`

*(As provided above.)*

### `BasePromptGenerator.jsx`

*(As provided above.)*

### `APIAssistantInstructionsGenerator.jsx`

*(As previously provided.)*

### `FunctionsToolsGenerator.jsx`

*(As previously provided.)*

### `EnhancedQueryOptimizerGenerator.jsx`

*(As previously provided.)*

### `SystemInstructions.jsx`

*(As previously provided.)*

### `GenerateButton.jsx`

*(As previously provided.)*

### `ApiKeyInput.jsx`

*(As previously provided.)*

### `promptGenerator.js`

*(As provided above.)*

## 7. Update the `App.jsx` Component

No changes are required in `App.jsx` as the **"Test"** functionality is encapsulated within each generator via the `BasePromptGenerator`. However, ensure that all generators are correctly imported and rendered.

### `App.jsx`

```jsx
// src/App.jsx
import React from 'react';
import { Container, Tabs, Tab, Box } from '@mui/material';
import APIAssistantInstructionsGenerator from './components/APIAssistantInstructionsGenerator';
import FunctionsToolsGenerator from './components/FunctionsToolsGenerator';
import EnhancedQueryOptimizerGenerator from './components/EnhancedQueryOptimizerGenerator';

const App = () => {
  const [currentTab, setCurrentTab] = React.useState(0);

  const handleChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
        <Tabs value={currentTab} onChange={handleChange} aria-label="Generator Tabs">
          <Tab label="API Instructions Generator" />
          <Tab label="Functions/Tools Generator" />
          <Tab label="Enhanced Query Optimizer" />
        </Tabs>
      </Box>
      <Box sx={{ mt: 4 }}>
        {currentTab === 0 && <APIAssistantInstructionsGenerator />}
        {currentTab === 1 && <FunctionsToolsGenerator />}
        {currentTab === 2 && <EnhancedQueryOptimizerGenerator />}
      </Box>
    </Container>
  );
};

export default App;
```

### Explanation

- No changes are needed; the **"Test"** functionality is managed within each generator's `BasePromptGenerator`.

## 8. Additional Enhancements

### a. **Loading Indicators for Streamed Responses**

To enhance user experience during streaming, you can display a typing indicator or a progress bar.

Update `TestChatUI.jsx` to include a typing indicator when streaming.

#### Update `TestChatUI.jsx`

```jsx
// src/components/TestChatUI.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { Send, ArrowBack } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { generatePrompt, generatePromptStream } from '../utils/promptGenerator';

const TestChatUI = ({ prompt, apiKey, onBack }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useStream, setUseStream] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to the bottom whenever chatResponse updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatResponse]);

  const handleSend = async () => {
    if (!chatInput.trim()) {
      setError('Please enter a message.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setChatResponse('');
    setIsTyping(true);
    try {
      if (useStream) {
        await generatePromptStream(
          `${prompt}\nUser: ${chatInput}\nAI:`,
          apiKey,
          'text-davinci-003',
          (text) => {
            setChatResponse((prev) => prev + text);
          },
          () => {
            setIsLoading(false);
            setIsTyping(false);
          },
          (err) => {
            setError('Error generating streamed response. Please try again.');
            console.error(err);
            setIsLoading(false);
            setIsTyping(false);
          }
        );
      } else {
        const combinedPrompt = `${prompt}\nUser: ${chatInput}\nAI:`;
        const response = await generatePrompt(combinedPrompt, apiKey, 'text-davinci-003');
        setChatResponse(response);
        setIsLoading(false);
        setIsTyping(false);
      }
    } catch (err) {
      setError('Error generating response. Please try again.');
      console.error(err);
      setIsLoading(false);
      setIsTyping(false);
    } finally {
      setChatInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleStream = () => {
    setUseStream((prev) => !prev);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={onBack} aria-label="Back to Generator">
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1 }}>
          Test Chat Interface
        </Typography>
      </Paper>
      <Paper
        elevation={3}
        sx={{
          height: '500px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 2,
          overflowY: 'auto',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Box sx={{ flexGrow: 1, mb: 2 }}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <AnimatePresence>
            {chatResponse && (
              <motion.div
                key="response"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Prompt Request:
                  </Typography>
                  <ReactMarkdown>{prompt}</ReactMarkdown>
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    AI Response:
                  </Typography>
                  <ReactMarkdown>{chatResponse}</ReactMarkdown>
                </Box>
              </motion.div>
            )}
            {isTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mr: 1 }}>
                    AI Response:
                  </Typography>
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Typing...
                  </Typography>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={4}
          />
          <Button
            variant="contained"
            color="primary"
            endIcon={<Send />}
            onClick={handleSend}
            disabled={isLoading}
            sx={{ ml: 2, minWidth: '100px' }}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </Box>
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={<Switch checked={useStream} onChange={handleToggleStream} color="primary" />}
            label="Stream Response"
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default TestChatUI;
```

### Explanation

1. **State Management**:
   - `isTyping`: Boolean state to indicate if the AI is typing (used for streaming).
   
2. **Toggle Switch**:
   - The `Switch` labeled "Stream Response" allows users to toggle between **Completions** and **Stream Completions**.

3. **Handling Typing Indicator**:
   - When streaming is enabled (`useStream` is `true`), `isTyping` is set to `true` when the response starts streaming.
   - A typing indicator (`CircularProgress` and "Typing...") is displayed while streaming is ongoing.

4. **Rendering Streaming Responses**:
   - As chunks of the response arrive via `generatePromptStream`, they are appended to `chatResponse`.
   - The AI response is rendered incrementally using `ReactMarkdown`.
   - The typing indicator is hidden once streaming is complete.

5. **UX Enhancements**:
   - Prevent sending multiple messages simultaneously by disabling the input and send button during loading.
   - Allow sending messages by pressing "Enter" (without "Shift" to allow line breaks).

## 9. Testing the Implementation

1. **Start Your Application**:

   ```bash
   npm start
   ```

2. **Navigate Through Generators**:
   - Select any generator from the tabs.
   - Enter prompts and generate instructions.

3. **Test the Chat Interface**:
   - Click the **"Test"** button in any generator.
   - The generator should collapse, and the chat UI should expand with an animation.
   - Toggle the **"Stream Response"** switch to enable or disable streaming.
   - Enter a test message and observe the AI response.
     - **Without Streaming**: The AI response appears once fully generated.
     - **With Streaming**: The AI response types out incrementally with a typing indicator.

4. **Return to Generator**:
   - Click the **Back** button (`<ArrowBack />`) to return to the generator interface.

## 10. Final Thoughts

By following these steps, you've successfully enhanced your application with the ability to switch between standard and streaming completions. This provides users with a more interactive and dynamic experience when testing their generated prompts or instructions.

### Benefits of This Enhancement:

- **Interactivity**: Users can experience AI responses in real-time with streaming.
- **Flexibility**: The toggle allows users to choose their preferred response mode.
- **User Experience**: Loading indicators and typing animations make interactions more engaging and intuitive.
- **Scalability**: The implementation is reusable across all generator types, maintaining consistency and reducing code duplication.

### Further Enhancements:

- **Model Selection**: Allow users to select different models if needed.
- **Customizable Settings**: Provide options to adjust parameters like `temperature`, `max_tokens`, etc.
- **Enhanced Error Handling**: Offer more detailed error messages or retry options.
- **Persisting API Keys**: Securely store API keys, possibly using environment variables or backend services to prevent exposure in the frontend.
- **Styling Improvements**: Further enhance the UI with custom themes or additional styling to match your application's branding.

Feel free to reach out if you need further assistance or have additional requirements!