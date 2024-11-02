/* eslint-disable no-undef */
const { logger } = require("@config/logging");
const axios = require("axios");
const cheerio = require("cheerio");

// eslint-disable-next-line no-unused-vars
async function factCheckAgainstDocs(generatedAnswer, library = "react") {
  const docsUrl = "https://reactjs.org/docs/getting-started.html"; // Example URL
  const response = await axios.get(docsUrl);
  const $ = cheerio.load(response.data);
  // eslint-disable-next-line no-unused-vars
  const snippets = [];

  const docContent = $("main").text();
  const statements = generatedAnswer.split(".");

  /**
   * Checks each statement in an array against the content of a document and marks verified statements.
   * @param {string[]} statements - An array of statements to be checked.
   * @param {string} docContent - The content of the document to check statements against.
   * @returns {string[]} An array of statements, with verified ones marked as "[Verified]".
   */
  const checkedStatements = statements.map((statement) => {
    if (docContent.includes(statement.trim())) {
      return `${statement} [Verified]`;
    }
    return statement;
  });

  return checkedStatements.join(". ");
}

/**
 * Clicks all "Expand code" or "Show the full source" buttons on a webpage
 * @param {Page} page - The Puppeteer Page object representing the current web page
 * @returns {Promise<void>} This function doesn't return a value, it performs actions on the page
 * @throws {Error} If there's an error while clicking expand buttons, it's caught and logged
 */
async function clickExpandButtons(page) {
  try {
    let expandButtonsFound = true;
    while (expandButtonsFound) {
      expandButtonsFound = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll(".MuiButton-root.MuiButton-text"));
        logger.info(`[1] Buttons found: ${buttons?.length}`);
        const expandButton = buttons.find(
          (button) =>
            button.textContent.includes("Expand code") ||
            button.textContent.includes("Show the full source")
        );
        logger.info(`[2] Expand button found: ${!!expandButton}`);
        if (expandButton) {
          expandButton.click();
          logger.info("[3] Expand button clicked");
          return true;
        }
        return false;
      });

      if (expandButtonsFound) {
        // Wait for the DOM to update after clicking the expand button
        await page.waitForFunction(
          () => {
            const buttons = Array.from(document.querySelectorAll(".MuiButton-root.MuiButton-text"));
            logger.info(`[4] Buttons found after click: ${buttons.length}`);
            return !buttons.some(
              (button) =>
                button.textContent.includes("Expand code") ||
                button.textContent.includes("Show the full source")
            );
          },
          { timeout: 50000 } // 5 second timeout
        );
      }
    }
  } catch (error) {
    logger.error(`Error clicking expand buttons: ${error}`);
  }
}
/**
 * Filters all visible elements on the page based on specified criteria.
 *
 * @param {Object} filterParams - An object containing filter parameters.
 * @param {string} [filterParams.tag] - Filter elements by HTML tag name (e.g., 'div', 'a', 'button').
 * @param {string} [filterParams.id] - Filter elements by ID attribute.
 * @param {string} [filterParams.class] - Filter elements by class name.
 * @param {string} [filterParams.name] - Filter elements by name attribute.
 * @param {string} [filterParams.type] - Filter elements by type attribute (e.g., 'text', 'checkbox', 'submit').
 * @param {string} [filterParams.value] - Filter elements by value attribute.
 * @param {string} [filterParams.href] - Filter elements by href attribute (for anchor tags).
 * @param {string} [filterParams.src] - Filter elements by src attribute (for images, scripts, etc.).
 * @param {string} [filterParams.alt] - Filter elements by alt attribute (for images).
 * @param {string} [filterParams.title] - Filter elements by title attribute.
 * @param {string} [filterParams.placeholder] - Filter elements by placeholder attribute.
 * @param {string} [filterParams.role] - Filter elements by ARIA role attribute.
 * @param {string} [filterParams.ariaLabel] - Filter elements by aria-label attribute.
 * @param {string} [filterParams.dataAttr] - Filter elements by custom data attribute (e.g., 'data-test-id').
 * @param {string} [filterParams.text] - Filter elements by their text content.
 * @param {number} [filterParams.minWidth] - Filter elements with a minimum width in pixels.
 * @param {number} [filterParams.maxWidth] - Filter elements with a maximum width in pixels.
 * @param {number} [filterParams.minHeight] - Filter elements with a minimum height in pixels.
 * @param {number} [filterParams.maxHeight] - Filter elements with a maximum height in pixels.
 * @param {string} [filterParams.backgroundColor] - Filter elements by background color.
 * @param {string} [filterParams.color] - Filter elements by text color.
 * @param {string} [filterParams.fontFamily] - Filter elements by font family.
 * @param {number} [filterParams.fontSize] - Filter elements by font size in pixels.
 * @param {string} [filterParams.position] - Filter elements by CSS position property.
 * @param {boolean} [filterParams.isClickable] - Filter elements that are clickable (e.g., buttons, links).
 * @param {boolean} [filterParams.isInteractive] - Filter elements that are interactive (e.g., inputs, selects).
 * @param {boolean} [filterParams.isInViewport] - Filter elements that are currently in the viewport.
 * @param {function} [filterParams.customFilter] - A custom filter function that takes an element as an argument and returns a boolean.
 * @param {Page} page - The Puppeteer page object.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of filtered element handles.
 */
const filterAllElements = async function (filterParams, page) {
  try {
    const helperFunctions = `
      const isInViewport = (el) => {
        const rect = el.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
      };

      const isClickable = (el) => {
        const clickableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
        return (
          clickableTags.includes(el.tagName) ||
          el.onclick != null ||
          getComputedStyle(el).cursor === 'pointer'
        );
      };

      const isInteractive = (el) => {
        const interactiveTags = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'];
        return interactiveTags.includes(el.tagName) || el.hasAttribute('contenteditable');
      };
    `;

    const filterElementFunction = `
      const filterElement = (filterParams) => (el) => {
        const computedStyle = window.getComputedStyle(el);

        if (
          computedStyle.visibility === 'hidden' ||
          computedStyle.display === 'none' ||
          computedStyle.opacity === '0'
        ) {
          return false;
        }

        for (const [key, value] of Object.entries(filterParams)) {
          switch (key) {
            case 'tag':
              if (el.tagName.toLowerCase() !== value.toLowerCase()) return false;
              break;
            case 'text':
              if (!el.textContent.toLowerCase().includes(value.toLowerCase())) return false;
              break;
            case 'customFilter':
              if (typeof value === 'function' && !value(el)) return false;
              break;
          }
        }

        return true;
      };
    `;

    return page.evaluate(
      /**
       * Filters and transforms DOM elements based on provided parameters
       * @param {string} filterParamsString - JSON string containing filter parameters
       * @param {string} helperFunctions - String of helper functions to be evaluated
       * @param {string} filterElementFunction - String representation of the filterElement function
       * @returns {Array<Object>} Array of objects representing filtered DOM elements with properties:
       *                          tagName, textContent, isVisible, and boundingBox
       */
      (filterParamsString, helperFunctions, filterElementFunction) => {
        eval(helperFunctions);
        eval(filterElementFunction);

        const filterParams = JSON.parse(filterParamsString);
        const filterFn = filterElement(filterParams);
        const allElements = document.querySelectorAll("*");
        return Array.from(allElements)
          .filter(filterFn)
          .map((el) => ({
            tagName: el.tagName,
            textContent: el.textContent,
            isVisible: el.offsetWidth > 0 && el.offsetHeight > 0,
            boundingBox: el.getBoundingClientRect()
          }));
      },
      JSON.stringify(filterParams),
      helperFunctions,
      filterElementFunction
    );
  } catch (error) {
    logger.error(`Error filtering elements: ${error}`);
    return [];
  }
};

/**
 * Finds all 'expand code' buttons on a given page.
 * @param {Page} page - The page object to search for 'expand code' buttons.
 * @returns {Promise<Array<ElementHandle>>} A promise that resolves to an array of ElementHandle objects representing the 'expand code' buttons found on the page.
 */
async function findExpandCodeButtons(page) {
  return filterAllElements(
    {
      tag: "button",
      text: "expand code",
      customFilter: (el) => el.textContent.trim().toLowerCase() === "expand code"
    },
    page
  );
}

/**
 * Expands all code blocks on a given page by clicking on expand buttons.
 * @param {Object} page - The page object representing the web page.
 * @returns {Promise<void>} A promise that resolves when all code blocks have been expanded or attempted to expand.
 * @throws {Error} If there's an error during the expansion process.
 */
async function expandAllCodeBlocks(page) {
  try {
    const expandButtons = await findExpandCodeButtons(page);
    let expandedCount = 0;

    for (const button of expandButtons) {
      try {
        await page.evaluate((btn) => {
          if (btn.isVisible && btn.textContent.trim().toLowerCase() === "expand code") {
            const element = document.elementFromPoint(
              btn.boundingBox.left + btn.boundingBox.width / 2,
              btn.boundingBox.top + btn.boundingBox.height / 2
            );
            if (element && element.tagName === "BUTTON") {
              element.click();
            }
          }
        }, button);
        await page.waitForTimeout(2000); // Wait for expansion animation
        expandedCount++;
      } catch (error) {
        logger.error(`Error expanding code block: ${error.message}`);
      }
    }

    logger.info(`Expanded ${expandedCount} out of ${expandButtons.length} code blocks.`);
  } catch (error) {
    logger.error(`Error expanding code blocks: ${error.message}`);
  }
}

/**
 * Extracts expanded code blocks from a given page.
 * @param {Object} page - The page object representing the web page to extract code from.
 * @returns {Promise<Array>} A promise that resolves to an array of objects, each containing the language and code content of a code block.
*/
async function extractExpandedCode(page) {
  return page.evaluate(() => {
    const codeBlocks = document.querySelectorAll("pre code");
    return Array.from(codeBlocks).map((block) => ({
      language: block.className.replace("language-", ""),
      code: block.textContent
    }));
  });
}

module.exports = {
  clickExpandButtons,
  findExpandCodeButtons,
  expandAllCodeBlocks,
  filterAllElements,
  extractExpandedCode,
  factCheckAgainstDocs
};
// const findAllElements = function () {
  //   const nodes = document.querySelectorAll('*');
//   const allElements = [];

//   for (let i = 0, el; (el = nodes[i]); ++i) {
  //     allElements.push(el);
//     // If the element has a shadow root, dig deeper.
//     if (el.shadowRoot) {
  //       findAllElements(el.shadowRoot.querySelectorAll('*'));
  //     }
  //   }
//   return allElements;
// };
// async function expandCodeBlocksSequentially(page) {
//   const expandButtons = filterAllElements(
  //     {
    //       tag: 'button',
    //       text: 'Expand code',
    //       isInViewport: true,
    //       customFilter: (el) => el.textContent.trim().toLowerCase() === 'expand code',
    //     },
    //     page
    //   );
    //   let expandedCount = 0;
    
    //   for (const button of expandButtons) {
      //     try {
        //       button.click();
//       await new Promise((resolve) => setTimeout(resolve, 200));
//       expandedCount++;
//     } catch (error) {
  //       logger.error(`Error expanding code block: ${error.message}`);
//     }
//   }

//   logger.info(`Successfully expanded ${expandedCount} out of ${expandButtons.length} code blocks.`);
// }
// async function expandVisibleCodeBlocks(page) {
//   const expandButtons = filterAllElements(
  //     {
//       tag: 'button',
//       text: 'Expand code',
//       isInViewport: true,
//       customFilter: (el) => el.textContent.trim().toLowerCase() === 'expand code',
//     },
//     page
//   );

//   for (const button of expandButtons) {
  //     button.click();
  //     await new Promise((resolve) => setTimeout(resolve, 150));
  //   }
  
  //   logger.info(`Expanded ${expandButtons.length} visible code blocks.`);
  // }
  // async function expandCodeBlocksWhileScrolling() {
//   let expandedCount = 0;
//   let lastScrollPosition = 0;

//   async function expandVisibleBlocks() {
  //     const expandButtons = filterAllElements({
//       tag: 'button',
//       text: 'Expand code',
//       isInViewport: true,
//       customFilter: (el) => el.textContent.trim().toLowerCase() === 'expand code',
//     });

//     for (const button of expandButtons) {
//       button.click();
//       await new Promise((resolve) => setTimeout(resolve, 100));
//       expandedCount++;
//     }
//   }

//   while (true) {
  //     await expandVisibleBlocks();
  
//     window.scrollBy(0, 300);
//     await new Promise((resolve) => setTimeout(resolve, 500));

//     if (window.scrollY === lastScrollPosition) {
  //       break; // Stop if we've reached the end of the page
//     }
//     lastScrollPosition = window.scrollY;
//   }

//   logger.info(`Expanded ${expandedCount} code blocks while scrolling.`);
// }
// function expandCodeBlocksWithObserver(maxExpansions = Infinity) {
  //   let expandedCount = 0;
  //   const observer = new MutationObserver((mutations) => {
    //     mutations.forEach((mutation) => {
      //       if (mutation.type === 'childList') {
//         const newButtons = Array.from(mutation.addedNodes)
//           .filter((node) => node.nodeType === Node.ELEMENT_NODE)
//           .flatMap((node) => Array.from(node.querySelectorAll('button')))
//           .filter((button) => button.textContent.trim().toLowerCase() === 'expand code');

//         newButtons.forEach((button) => {
  //           if (expandedCount < maxExpansions) {
//             setTimeout(
  //               () => {
    //                 button.click();
    //                 expandedCount++;
    //                 logger.info(`Expanded code block ${expandedCount}`);
    //               },
    //               Math.random() * 1000 + 500
    //             ); // Random delay between 500ms and 1500ms
    //           }
    //         });
    //       }
    //     });
//   });

//   observer.observe(document.body, { childList: true, subtree: true });

//   // Initial expansion
//   const initialButtons = findExpandCodeButtons();
//   initialButtons.forEach((button, index) => {
//     if (index < maxExpansions) {
//       setTimeout(
  //         () => {
//           button.click();
//           expandedCount++;
//           logger.info(`Expanded initial code block ${expandedCount}`);
//         },
//         Math.random() * 1000 + 500
//       );
//     }
//   });

//   // Return a function to stop observing
//   return () => {
  //     observer.disconnect();
  //     logger.info(`Finished expanding. Total expanded: ${expandedCount}`);
  //   };
  // }
  
  // // Usage:
  // const stopObserving = expandCodeBlocksWithObserver(50); // Expand up to 50 code blocks
  // // Later, when you want to stop:
  // // stopObserving();
  
  // const filterAllElements = async function (filterParams, page) {
  //   try {
  //     // Helper function to check if an element is in the viewport
  //     const isInViewport = (el) => {
  //       const rect = el.getBoundingClientRect();
  //       return (
  //         rect.top >= 0 &&
  //         rect.left >= 0 &&
  //         rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
  //         rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  //       );
  //     };
  
  //     // Helper function to check if an element is clickable
  //     const isClickable = (el) => {
  //       const clickableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  //       return (
  //         clickableTags.includes(el.tagName) ||
  //         el.onclick != null ||
  //         getComputedStyle(el).cursor === 'pointer'
  //       );
  //     };
  
  //     // Helper function to check if an element is interactive
  //     const isInteractive = (el) => {
  //       const interactiveTags = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'];
  //       return interactiveTags.includes(el.tagName) || el.hasAttribute('contenteditable');
  //     };
  
  //     // Main filtering function
  //     const filterElement = (filterParams) => (el) => {
  //       const computedStyle = window.getComputedStyle(el);
  
  //       // Check visibility
  //       if (
  //         computedStyle.visibility === 'hidden' ||
  //         computedStyle.display === 'none' ||
  //         computedStyle.opacity === '0'
  //       ) {
  //         return false;
  //       }
  
  //       // Apply filters based on filterParams
  //       for (const [key, value] of Object.entries(filterParams)) {
  //         switch (key) {
  //           case 'tag':
  //             if (el.tagName.toLowerCase() !== value.toLowerCase()) return false;
  //             break;
  //           case 'id':
  //             if (el.id !== value) return false;
  //             break;
  //           case 'class':
  //             if (!el.classList.contains(value)) return false;
  //             break;
  //           case 'name':
  //           case 'type':
  //           case 'value':
  //           case 'href':
  //           case 'src':
  //           case 'alt':
  //           case 'title':
  //           case 'placeholder':
  //           case 'role':
  //             if (el.getAttribute(key) !== value) return false;
  //             break;
  //           case 'ariaLabel':
  //             if (el.getAttribute('aria-label') !== value) return false;
  //             break;
  //           case 'dataAttr':
  //             if (!el.dataset[value]) return false;
  //             break;
  //           case 'text':
  //             if (!el.textContent.toLowerCase().includes(value.toLowerCase())) return false;
  //             break;
  //           case 'minWidth':
  //             if (el.offsetWidth < value) return false;
  //             break;
  //           case 'maxWidth':
  //             if (el.offsetWidth > value) return false;
  //             break;
  //           case 'minHeight':
  //             if (el.offsetHeight < value) return false;
  //             break;
  //           case 'maxHeight':
  //             if (el.offsetHeight > value) return false;
  //             break;
  //           case 'backgroundColor':
  //           case 'color':
  //           case 'fontFamily':
  //           case 'fontSize':
  //           case 'position':
  //             if (computedStyle[key] !== value) return false;
  //             break;
  //           case 'isClickable':
  //             if (value !== isClickable(el)) return false;
  //             break;
  //           case 'isInteractive':
  //             if (value !== isInteractive(el)) return false;
  //             break;
  //           case 'isInViewport':
  //             if (value !== isInViewport(el)) return false;
  //             break;
  //           case 'customFilter':
  //             if (typeof value === 'function' && !value(el)) return false;
  //             break;
  //         }
  //       }
  
  //       return true;
  //     };
  
  //     // Execute the filtering in the browser context
  //     return page.evaluate((filterParamsString) => {
  //       const filterParams = JSON.parse(filterParamsString);
  //       const filterFn = eval(`(${filterElement})`)(filterParams);
  //       const allElements = document.querySelectorAll('*');
  //       return Array.from(allElements)
  //         .filter(filterFn)
  //         .map((el) => ({
  //           tagName: el.tagName,
  //           textContent: el.textContent,
  //           isVisible: el.offsetWidth > 0 && el.offsetHeight > 0,
  //           boundingBox: el.getBoundingClientRect(),
  //         }));
  //     }, JSON.stringify(filterParams));
  //   } catch (error) {
  //     logger.error(`Error filtering elements: ${error}`);
  //     return [];
  //   }
  // };