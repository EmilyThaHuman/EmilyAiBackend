/**
 * POST /api/generate-component
 *
 * Request Body:
 * {
 *   "containerPath": "AnalyticsDashboard",
 *   "componentName": "Button",
 *   "dependencies": ["Icon"],
 *   "userStory": "As a user, I want a button to submit the form."
 * }
 *
 * Response: { "componentCode": \`\`\`jsx
 * \// Button.jsx
 * import React from 'react';
 * import Icon from './Icon';
 * import styles from './Button.module.css';
 *
 * const Button = ({ label, icon, onClick }) => {
 *   return (
 *     <button className={styles.button} onClick={onClick}>
 *       {icon && <Icon name={icon} />}
 *       {label}
 *     </button>
 *   );
 * };
 *
 * export default Button;
 * \`\`\` }
 **/

router.post("/generate-component", async (req, res) => {
  const { containerPath, componentName, dependencies, userStory } = req.body;

  if (!containerPath || !componentName || !userStory) {
    return res
      .status(400)
      .json({ error: "containerPath, componentName, and userStory are required." });
  }

  try {
    const dirPath = path.join(process.env.LOCAL_COMPONENTS_DIR, containerPath);

    // Read existing configurations and compositions
    const composition = await readComponentsComposition(dirPath);
    const configurations = await readComponentsConfigurations(dirPath);

    // Find the component configuration
    const componentConfig = configurations.find((config) => config.name === componentName);

    if (!componentConfig) {
      return res
        .status(404)
        .json({ error: `Component configuration for ${componentName} not found.` });
    }

    // Generate prompt
    const prompt = generateComponentPrompt({
      description: userStory,
      componentName,
      dependencies: componentConfig.uiComponents,
      implementations: componentConfig.implementations || [],
      componentConfiguration: componentConfig
    });

    // Generate component code using OpenAI
    const [componentCode] = await componentGenerator.generateComponent({ description: prompt });

    if (!componentCode) {
      return res.status(500).json({ error: "Failed to generate component code." });
    }

    // Save the generated component code to index.js (or index.jsx)
    await saveFile(dirPath, "index.js", componentCode);

    res.status(200).json({ componentCode });
  } catch (error) {
    console.error("Error generating component:", error);
    res.status(500).json({ error: "Internal Server Error." });
  }
});
