// src/services/promptService.js

/**
 * Creates a formatted prompt for chat completion.
 * @param {object} initializationData
 * @param {object} context
 * @param {object} summary
 * @param {object} searchResults
 * @param {array} keywords
 * @param {array} uiLibraries
 * @param {array} jsLibraries
 * @param {array} componentTypes
 * @param {array} documentationContent
 * @param {string} formattingGuide
 * @returns {string}
 */
const createFormattedPrompt = (
  initializationData,
  context,
  summary,
  searchResults,
  keywords,
  uiLibraries,
  jsLibraries,
  componentTypes
) => `
  # *** REACT COMPONENT PROMPT ***
  ## --- SECTION ONE: MAIN INSTRUCTIONS AND CONTEXT ---

  ### CHAT HISTORY CONTEXT:
    USER PROMPT HISTORY:
      | ________________________________________ 
      | User Prompts: ${context.sessionContext}
    SUMMARY OF CHAT HISTORY:
      | ________________________________________ 
      | Main Summary: ${summary.overallSummary} |
      | Previous 5 User Inquiries Summarized: ${summary.individualSummaries.map((session, index) => `[Summary ${index + 1}][id ${session.id + 1}]: ${session.summary}`).join("\n")} 
      |
  ### CHAT DATA CONTEXT:
    RELEVANT DATA FROM SEARCH DOCS:
      | ________________________________________ 
      | Relevant Perplexity Web Search Results: ${context.searchContext}
      | Raw Perplexity Search Results Data: 
      | -- Results: ${searchResults.pageContent}
      | -- References: ${searchResults.metadata.citations}
    ADDITIONAL DATA:
      | ________________________________________ 
      | Keywords: ${keywords.join(", ")}
      | UI Libraries: ${uiLibraries.join(", ")}
      | JS Libraries: ${jsLibraries.join(", ")}
      | Component Types: ${componentTypes.join(", ")}

##  --- SECTION TWO: USER PROMPT/QUERY AND RESPONSE FORMAT INSTRUCTIONS ---

  ### ***USER PROMPT/QUERY: ${initializationData.prompt}***

  ### RESPONSE FORMAT INSTRUCTIONS:

    Based on the user's query, extracted information, and the provided context, please generate a response following the instructions given in the system and assistant messages.
  
    Ensure that your answer is comprehensive, professional, and tailored to creating high-quality React styled components.

    Please ensure your response includes:

      1. A title summarizing the main purpose of the component
      2. The full React component code (utilize the VAST majority of tokens for the component code)
      3. A detailed description of the component's functionality and purpose
`;

module.exports = {
  createFormattedPrompt
};

// /*
// /**
//  * Creates a formatted prompt for chat completion.
//  * @param {object} initializationData
//  * @param {object} context
//  * @param {object} summary
//  * @param {object} searchResults
//  * @param {array} keywords
//  * @param {array} uiLibraries
//  * @param {array} jsLibraries
//  * @param {array} componentTypes
//  * @param {array} documentationContent
//  * @param {string} formattingGuide
//  * @returns {string}
//  */
// const createFormattedPrompt = (
//   initializationData,
//   context,
//   summary,
//   searchResults,
//   keywords,
//   uiLibraries,
//   jsLibraries,
//   componentTypes,
//   documentationContent,
//   formattingGuide
// ) => `
//   --- SECTION ONE: MAIN INSTRUCTIONS AND CONTEXT ---

//   CHAT HISTORY CONTEXT:
//     USER PROMPT HISTORY:
//       | ________________________________________
//       | User Prompts: ${context.sessionContext}
//     SUMMARY OF CHAT HISTORY:
//       | ________________________________________
//       | Main Summary: ${summary.overallSummary} |
//       | Previous 5 User Inquiries Summarized: ${summary.individualSummaries.map((session, index) => `[Summary ${index + 1}][id ${session.id + 1}]: ${session.summary}`).join("\n")}
//       |
//   CHAT DATA CONTEXT:
//     RELEVANT DATA FROM SEARCH DOCS:
//       | ________________________________________
//       | Relevant Perplexity Web Search Results: ${context.searchContext}
//       | Raw Perplexity Search Results Data:
//       | -- Results: ${searchResults.pageContent}
//       | -- References: ${searchResults.metadata.citations}
//     ADDITIONAL DATA:
//       | ________________________________________
//       | Keywords: ${keywords.join(", ")}
//       | UI Libraries: ${uiLibraries.join(", ")}
//       | JS Libraries: ${jsLibraries.join(", ")}
//       | Component Types: ${componentTypes.join(", ")}
//       | Documentation Content: ${documentationContent?.map((doc) => `${doc.library} - ${doc.componentType}:\n${doc.content}`).join("\n\n")}

//   --- SECTION TWO: USER PROMPT/QUERY ---

//   USER PROMPT/QUERY: ${initializationData.prompt}
//   EXTRACTED KEYWORDS: ${keywords.join(", ")}

//   --- SECTION THREE: FINAL INSTRUCTIONS ---

//   Based on the user's query, extracted information, and the provided context, please generate a response following the instructions given in the system and assistant messages.
//   Ensure that your answer is comprehensive, professional, and tailored to creating high-quality React styled components.
//   Please ensure your response includes:

//   1. A brief explanation of the component's purpose and design rationale
//   2. The full React component code, utilizing the latest React features and best practices
//   3. Examples of how to use and customize the component

//   --- SECTION FOUR: RESPONSE FORMATTING INSTRUCTIONS ---
//   ${formattingGuide}

//   --- END OF SECTIONS ---
//   `;
//     RELEVANT DATA FROM CUSTOM DOCS:
//       | ________________________________________
//       | Custom UI Library DB: ${context.libraryContext}
// */
