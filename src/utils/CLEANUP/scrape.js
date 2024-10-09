// const axios = require('axios');
// const cheerio = require('cheerio');

// // eslint-disable-next-line no-unused-vars
// async function factCheckAgainstDocs(generatedAnswer, library = 'react') {
//   const docsUrl = `https://reactjs.org/docs/getting-started.html`; // Example URL
//   const response = await axios.get(docsUrl);
//   const $ = cheerio.load(response.data);
//   // eslint-disable-next-line no-unused-vars
//   const snippets = [];

//   const docContent = $('main').text();
//   const statements = generatedAnswer.split('.');

//   const checkedStatements = statements.map((statement) => {
//     if (docContent.includes(statement.trim())) {
//       return `${statement} [Verified]`;
//     }
//     return statement;
//   });

//   return checkedStatements.join('. ');
// }

// module.exports = {
//   factCheckAgainstDocs,
// };
