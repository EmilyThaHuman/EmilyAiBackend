const REACT_AGENT_BASIC_COMPONENT_EXAMPLE = `
\`\`\`tsx
import React from 'react';
import { ComponentNameOne, ComponentNameTwo } from '@react-agent/shadcn-ui'

export interface ComponentNameProps {
  {/* Your interface implementation */}
}

const ComponentName = (props: ComponentNameProps) => {
  return (
    {/* Your component implementation */}
  );
};

export default ComponentName;
\`\`\`
`;

const GENERAL_OPENAI_RESPONSE_EXAMPLE = `
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

// Define the components response object
const REACT_AGENT_COMPONENTS_RESPONSE_EXAMPLE = {
  type: "page",
  name: "AnalyticsDashboardPage",
  layout: "hidden flex-col md:flex",
  description: "SaaS Subscription Analytics Dashboard",
  components: [
    {
      type: "organism",
      name: "Header",
      layout: "flex h-16 items-center px-4 border-b",
      description: ""
    },
    {
      type: "atom",
      name: "DashboardContent",
      layout: "flex-1 space-y-4 p-8 pt-6",
      description: "",
      components: [
        {
          type: "organism",
          name: "SubHeader",
          layout: "flex items-center justify-between space-y-2",
          description: "",
          components: [
            {
              type: "atom",
              name: "SubHeaderTypography",
              layout: "w-32 h-8",
              description: "",
              components: []
            },
            {
              type: "atom",
              name: "SubHeaderActions",
              layout: "flex items-center space-x-2",
              description: ""
            }
          ]
        },
        {
          type: "atom",
          name: "Tabs",
          layout: "space-y-4",
          description: "",
          components: [
            {
              type: "organism",
              name: "TabNav",
              layout:
                "w-80 inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
              description: "",
              components: []
            },
            {
              type: "atom",
              name: "TabsContent",
              layout:
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 space-y-4",
              description: "",
              components: [
                {
                  type: "organism",
                  name: "SmallCardsContainer",
                  layout: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
                  description: "",
                  components: []
                },
                {
                  type: "organism",
                  name: "BigCardsContainer",
                  layout: "grid gap-4 md:grid-cols-2 lg:grid-cols-7",
                  description: "",
                  components: []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Create a JSON-formatted string of the componentsResponse
const REACT_AGENT_PAGE_COMPONENTS_JSON_EXAMPLE = `
\`\`\`json
${JSON.stringify(REACT_AGENT_COMPONENTS_RESPONSE_EXAMPLE)}
\`\`\`
`;

const EXAMPLE_RESPONSE_TITLE = "Example Response";
const EXAMPLE_RESPONSE_SUBTITLE = "Example Response";
const EXAMPLE_RESPONSE_BODY = ` This is an example response.`;
const EXAMPLE_RESPONSE_CODE = `example-response`;
const EXAMPLE_RESPONSE_TYPE = "text/plain";
const EXAMPLE_RESPONSE_LANGUAGE = "en";

module.exports = {
  REACT_AGENT_BASIC_COMPONENT_EXAMPLE,
  GENERAL_OPENAI_RESPONSE_EXAMPLE,
  REACT_AGENT_COMPONENTS_RESPONSE_EXAMPLE,
  REACT_AGENT_PAGE_COMPONENTS_JSON_EXAMPLE,
  EXAMPLE_RESPONSE_TITLE,
  EXAMPLE_RESPONSE_SUBTITLE,
  EXAMPLE_RESPONSE_BODY,
  EXAMPLE_RESPONSE_CODE,
  EXAMPLE_RESPONSE_TYPE,
  EXAMPLE_RESPONSE_LANGUAGE
};
