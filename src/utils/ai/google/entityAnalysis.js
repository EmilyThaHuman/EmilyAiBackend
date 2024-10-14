import { logger } from "@config/logging";

// utils/entityAnalysis.js
const client = new language.LanguageServiceClient();

export async function analyzeEntities(text) {
  try {
    const document = {
      content: text,
      type: "PLAIN_TEXT"
    };

    const [result] = await client.analyzeEntities({ document });
    return result.entities.map((entity) => entity.name);
  } catch (error) {
    logger.error("Error analyzing entities:", error);
    return [];
  }
}
