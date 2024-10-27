const fs = require("node:fs/promises");
const path = require("path");

// Define the directories
const logsDir = "../logs"; // Path to your logs folder
const archiveDir = "../archive"; // Path to your archive folder

// Function to archive logs older than 5 days
async function archiveOldLogs() {
  // Ensure the archive directory exists
  await fs.mkdir(archiveDir, { recursive: true });

  // Read log files from the directory
  fs.readdir(logsDir, (err, files) => {
    if (err) throw err;

    files.forEach((file) => {
      const filePath = path.join(logsDir, file);
      const fileStat = fs.statSync(filePath);
      const modifiedTime = new Date(fileStat.mtime);
      const today = new Date();
      const diffDays = Math.floor((today - modifiedTime) / (1000 * 60 * 60 * 24));

      // Archive logs older than 5 days
      if (diffDays > 5) {
        const newPath = path.join(archiveDir, file);
        fs.rename(filePath, newPath, (err) => {
          if (err) throw err;
          console.log(`Archived: ${file}`);
        });
      }
    });
  });
}

// Run the function
archiveOldLogs();
