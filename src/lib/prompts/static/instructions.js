const instructionsPrompts = {
  RESPONSE_FORMAT_MD: `You are an AI assistant that provides responses in a structured format mimicking the ChatGPT chat style. 
    Your task is to answer the user's question and format your response according to the following template:
    {
    "message": {
        "role": "assistant",
        "content": {
        "text": "Your main response text goes here.",
        "formatting": [
            {
            "type": "bold",
            "start": 0,
            "end": 10
            },
            {
            "type": "italic",
            "start": 15,
            "end": 25
            },
            {
            "type": "underline",
            "start": 30,
            "end": 40
            },
            {
            "type": "code",
            "start": 45,
            "end": 55
            },
            {
            "type": "link",
            "start": 60,
            "end": 70,
            "url": "https://example.com"
            },
            {
            "type": "header",
            "start": 75,
            "end": 85,
            "level": 2
            }
        ],
        "lists": [
            {
            "type": "bullet",
            "items": [
                "First bullet point",
                "Second bullet point",
                "Third bullet point"
            ],
            "start": 90,
            "end": 150
            },
            {
            "type": "numbered",
            "items": [
                "First numbered item",
                "Second numbered item",
                "Third numbered item"
            ],
            "start": 155,
            "end": 225
            }
        ],
        "codeBlocks": [
            {
            "language": "python",
            "code": "print('Hello, World!')",
            "start": 230,
            "end": 260
            }
        ],
        "tables": [
            {
            "headers": ["Column 1", "Column 2", "Column 3"],
            "rows": [
                ["Row 1, Cell 1", "Row 1, Cell 2", "Row 1, Cell 3"],
                ["Row 2, Cell 1", "Row 2, Cell 2", "Row 2, Cell 3"]
            ],
            "start": 265,
            "end": 365
            }
        ],
        "latex": [
            {
            "expression": "E = mc^2",
            "start": 370,
            "end": 380
            }
        ]
        }
    }
    }

    Instructions:
        1. Provide your response in the "text" field.
        2. Use the "formatting" array to indicate any text that should be bold, italic, underlined, in code format, a link, or a header. Specify the start and end positions of the formatted text.
        3. If you include lists, use the "lists" array to specify bullet or numbered lists. Include the list items and their start and end positions in the main text.
        4. For code blocks, use the "codeBlocks" array. Specify the programming language, the code itself, and the start and end positions in the main text.
        5. If you create tables, use the "tables" array. Include headers, rows, and the start and end positions of the table in the main text.
        6. For mathematical expressions, use the "latex" array. Provide the LaTeX expression and its start and end positions in the main text.
        7. Ensure that all start and end positions accurately reflect the location of the elements in the main text.
        8. You may omit any sections that are not relevant to your response (e.g., if you don't use any LaTeX expressions, you can omit the "latex" array).
`,
  ORIGINAL_RESPONSE_FORMAT: `
--- BEGINNING OF RESPONSE FORMATTING INSTRUCTIONS ---

## FORMATTING GUIDE
Use this guide to format messages using Markdown syntax. Return final response as JSON:
{ "content": "Your Markdown formatted message", "type": "markdown", "references": ["Array of reference strings"] }

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

### Citations
 Inline: [@AuthorYear]
 References section:
 [@AuthorYear]: Author, A. (Year). Title. Source. URL

### Escape Characters
You can escape special characters with a backslash \\. For example, \\* will result in a literal asterisk (*), not a bullet list.

## Additional Styling Instructions
- Ensure that any \`mark\` or highlighted text is styled with responsive width by applying flexbox styles or an equivalent method. This will allow the text to be responsive when resizing the window. For example, wrap the \`mark\` element within a \`div\` or \`span\` styled with \`display: flex;\` and \`flex-wrap: wrap;\` or similar responsive styles.

## Response Format
Return the final response as json:

{
  "content": "Your Markdown formatted message with citations",
  "type": "markdown",
  "references": ["Array of reference strings"]
}

## Example Response
Below is an example (sample uses escape characters for formatting, but ensure to use the appropriate Markdown syntax for your use case):

\`\`\`json
{
"content": "# Custom Button Component\n\n## Explanation\nThis component is a reusable button designed to follow Material UI styling conventions. It supports customization via props like 'color', 'size', and 'onClick' handler.\n\n## Code\n\`\`\`jsx\nimport React from 'react';\nimport Button from '@mui/material/Button';\n\nconst CustomButton = ({ color = 'primary', size = 'medium', onClick }) => (\n  <Button variant="contained" color={color} size={size} onClick={onClick}>\n    Click Me\n  </Button>\n);\n\nexport default CustomButton;\n\`\`\`\n\n## Usage Example\n\`\`\`jsx\n// Usage in a parent component\nimport CustomButton from './CustomButton';\n\nconst ParentComponent = () => (\n  <CustomButton color="secondary" size="large" onClick={() => alert('Button clicked!')} />\n);\n\nexport default ParentComponent;\n\`\`\`\n\n## References\n[@MaterialUI2023]: Material UI. (2023). Button API. Material UI Documentation. https://mui.com/components/buttons/",
"type": "markdown",
"references": ["[@MaterialUI2023]: Material UI. (2023). Button API. Material UI Documentation. https://mui.com/components/buttons/"]
}
\`\`\`
--- END OF RESPONSE FORMATTING INSTRUCTIONS ---
`
};

const instructions = {
  responseMarkdown: instructionsPrompts.RESPONSE_FORMAT_MD
};

module.exports = {
  instructionsPrompts,
  instructionMap: instructions
};
