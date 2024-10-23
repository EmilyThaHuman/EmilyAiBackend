Here's a React client-side implementation that calls the `chat-completion-stream` endpoint, updates the assistant's message state, and renders it using a markdown UI:

### Steps:
1. Set up a `Chat` component to handle user inputs and responses.
2. Use a `useState` hook to manage the assistant's messages.
3. Make an API request to the `/chat-completion-stream` endpoint.
4. Use the stream data to update the assistant's message state progressively.
5. Render the messages using a React markdown library like `react-markdown`.

### `Chat.js`

```javascript
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const Chat = () => 
{
    const [userInput, setUserInput] = useState('');
    const [assistantMessage, setAssistantMessage] = useState('');

    const handleInputChange = (e) => 
    {
        setUserInput(e.target.value);
    };

    const handleSendMessage = async () => 
    {
        if (!userInput) return;

        // Call the API
        const response = await fetch('/chat-completion-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userInput, model: 'gpt-4' }),
        });

        if (response.ok) 
        {
            // Handle the stream data
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let accumulatedMessage = '';

            while (!done) 
            {
                const { value, done: streamDone } = await reader.read();
                done = streamDone;

                // Decode and accumulate the stream chunks
                const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
                accumulatedMessage += chunk;

                // Update the assistant message progressively
                setAssistantMessage((prevMessage) => prevMessage + chunk);
            }
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
                <textarea
                    value={userInput}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    rows="4"
                    style={{ width: '100%', padding: '10px' }}
                />
                <button onClick={handleSendMessage} style={{ marginTop: '10px' }}>
                    Send
                </button>
            </div>

            <div>
                <h3>Assistant Response:</h3>
                <ReactMarkdown>{assistantMessage}</ReactMarkdown>
            </div>
        </div>
    );
};

export default Chat;
```

### Breakdown:
1. **State Management**:
   - `userInput`: Holds the user input text.
   - `assistantMessage`: Holds the accumulated message returned by the assistant from the stream.

2. **Stream Handling**:
   - Fetches data from `/chat-completion-stream` using `fetch`.
   - The response is streamed in chunks using the `ReadableStream` API.
   - The `TextDecoder` is used to handle the stream chunks, which are progressively added to the assistant's message state via `setAssistantMessage`.

3. **ReactMarkdown**:
   - `react-markdown` is used to render the message in markdown format as it updates in real time.

### Installation of ReactMarkdown:
Make sure you install the `react-markdown` package:

```bash
npm install react-markdown
```

This will progressively update the assistant's response in real-time, reflecting each piece of the stream as it is received and rendered in a markdown-friendly format.