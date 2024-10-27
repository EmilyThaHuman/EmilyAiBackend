const initialModels = [
  {
    name: "Basic Language Model",
    description: "A basic language model optimized for general text processing tasks.",
    modelId: "basic-lang-001",
    sharing: "private",
    apiKey: "YOUR_API_KEY_1",
    baseUrl: "https://api.example.com/basic-language-model"
  },
  {
    name: "Advanced NLP Model",
    description: "An advanced natural language processing model with state-of-the-art performance.",
    modelId: "advanced-nlp-002",
    sharing: "shared",
    apiKey: "YOUR_API_KEY_2",
    baseUrl: "https://api.example.com/advanced-nlp-model"
  },
  {
    name: "Custom Machine Learning Model",
    description: "A custom ML model tailored for specific data analysis tasks.",
    modelId: "custom-ml-003",
    sharing: "public",
    apiKey: "YOUR_API_KEY_3",
    baseUrl: "https://api.example.com/custom-ml-model"
  }
];

module.exports = {
  initialModels
};
