// searchController.js
const { config } = require("@config/index");
const { fetchJson } = require("./apiUtils");
const searchCOnfig = config.ai.configurations.presets.llm;

async function getSearchResults(userMessage) {
  switch (searchCOnfig.searchProvider) {
    case "brave":
      return braveSearch(userMessage);
    case "serper":
      return serperSearch(userMessage);
    case "google":
      return googleSearch(userMessage);
    default:
      throw new Error(`Unsupported search provider: ${searchCOnfig.searchProvider}`);
  }
}

async function braveSearch(message, numberOfPagesToScan = searchCOnfig.numberOfPagesToScan) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(message)}&count=${numberOfPagesToScan}`;
  const options = {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY
    }
  };
  const jsonResponse = await fetchJson(url, options);
  if (!jsonResponse.web || !jsonResponse.web.results) {
    throw new Error("Invalid API response format");
  }
  return jsonResponse.web.results.map((result) => ({
    title: result.title,
    link: result.url,
    favicon: result.profile.img
  }));
}

async function googleSearch(message, numberOfPagesToScan = searchCOnfig.numberOfPagesToScan) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_CX}&q=${encodeURIComponent(message)}&num=${numberOfPagesToScan}`;
  const jsonResponse = await fetchJson(url);
  if (!jsonResponse.items) {
    throw new Error("Invalid API response format");
  }
  return jsonResponse.items.map((result) => ({
    title: result.title,
    link: result.link,
    favicon: result.pagemap?.cse_thumbnail?.[0]?.src || ""
  }));
}

async function serperSearch(message, numberOfPagesToScan = searchCOnfig.numberOfPagesToScan) {
  const url = "https://google.serper.dev/search";
  const data = JSON.stringify({ q: message });
  const options = {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API,
      "Content-Type": "application/json"
    },
    body: data
  };
  const jsonResponse = await fetchJson(url, options);
  if (!jsonResponse.organic) {
    throw new Error("Invalid API response format");
  }
  return jsonResponse.organic.map((result) => ({
    title: result.title,
    link: result.link,
    favicon: result.favicons?.[0] || ""
  }));
}

module.exports = {
  getSearchResults,
  braveSearch,
  googleSearch,
  serperSearch
};
