const fs = require("fs");
const { Worker } = require("worker_threads");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { DocumentModel } = require("../models/documentModel");
const { storageService } = require("../utils/storage/storage");
const { ServerStorage } = require("../utils/storage/serverStorage");
const { SpacesStorage } = require("../utils/storage/spacesStorage");
const { upload } = require("../utils/multer");

class DocumentsController {
  constructor() {
    this.documentModel = new DocumentModel();
    this.addDocuments = this.addDocuments.bind(this);
    this.deleteDocument = this.deleteDocument.bind(this);
    this.serveDocument = this.serveDocument.bind(this);
    this.deleteWorkspace = this.deleteWorkspace.bind(this);
  }

  async safeUpsertDocument(document, namespaceId) {
    let retries = 0;
    const maxRetries = 5;
    while (retries < maxRetries) {
      try {
        await this.documentModel.upsertDocument(document, namespaceId);
        break;
      } catch (error) {
        if (error.message.includes("rate limit exceeded") && retries < maxRetries) {
          const waitTime = Math.pow(2, retries) * 1000;
          console.log(`Waiting ${waitTime / 1000} seconds before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          retries++;
        } else {
          throw error;
        }
      }
    }
  }

  async addDocuments(req, res) {
    upload(req, res, async (err) => {
      let namespaceId = req.body.namespaceId;
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: err.message });
      } else if (err) {
        console.error("Error uploading files:", err);
        return res.status(400).json({ message: "File upload error" });
      }

      const isNewWorkspace = req.body.newWorkspace === "true";
      if (isNewWorkspace) {
        namespaceId = uuidv4();
      } else if (!namespaceId) {
        return res.status(400).json({ message: "Missing required field: namespaceId" });
      }

      const filesObject = req.files;
      if (!filesObject || !filesObject.files) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const files = filesObject.files;
      const documentResponses = [];
      const errors = [];

      const workerPromises = files.map((file) => {
        return new Promise((resolve, reject) => {
          const documentId = uuidv4();
          const fileKey = `${namespaceId}/${documentId}/${file.originalname}`;
          const documentUrl = storageService.constructFileUrl(fileKey);

          const fileData = fs.readFileSync(file.path);

          storageService
            .saveFile(file, fileKey)
            .then(() => {
              const workerPath = path.join(__dirname, "../utils/workers/fileProcessorWorker");
              const worker = new Worker(workerPath, {
                workerData: {
                  fileData,
                  fileType: file.mimetype,
                  fileName: file.originalname,
                  documentId,
                  documentUrl
                }
              });

              worker.on("message", (result) => {
                if (result.error) {
                  reject(new Error(result.error));
                } else {
                  resolve(result.document);
                }
              });

              worker.on("error", (error) => {
                reject(error);
              });
            })
            .catch((error) => {
              reject(error);
            });
        });
      });

      try {
        const documents = await Promise.all(workerPromises);
        await Promise.all(
          documents.map((document) => this.safeUpsertDocument(document, namespaceId))
        );

        documentResponses.push(...documents);
      } catch (error) {
        console.error("Error processing documents:", error);
        errors.push(error.message);
      }

      if (errors.length > 0) {
        return res.status(400).json({
          message: "Some documents failed to process",
          errors,
          documentResponses
        });
      }
      res.status(200).json({
        message: "Documents added successfully",
        namespaceId,
        documentResponses
      });
    });
  }

  async listFilesInNamespace(req, res) {
    const namespaceId = req.params.namespaceId;

    try {
      let files = await storageService.listFilesInNamespace(namespaceId);
      console.log("Files from storage:", files);
      res.json(files);
    } catch (error) {
      console.error("Error listing files in namespace:", error);
      res.status(500).json({ message: "Failed to list files" });
    }
  }

  async deleteDocument(req, res) {
    const documentId = req.params.documentId;
    const namespaceId = req.params.namespaceId;

    try {
      const pageSize = 100;
      let paginationToken;
      let deleteCount = 0;

      do {
        try {
          const listResult = await this.documentModel.listDocumentChunks(
            documentId,
            namespaceId,
            pageSize,
            paginationToken
          );

          if (listResult.chunks.length === 0) break;

          const chunkIds = listResult.chunks.map((chunk) => chunk.id);
          console.log(`Deleting chunks prefixed with ${documentId}`);
          await this.documentModel.deleteDocumentChunks(chunkIds, namespaceId);
          deleteCount += chunkIds.length;

          if (!listResult.paginationToken) break;
          paginationToken = listResult.paginationToken;
        } catch (error) {
          if (error.message.includes("No IDs provided for delete request")) {
            console.warn("Skipping Pinecone deletion due to missing IDs:", error);
            break;
          } else {
            console.error("Error deleting document chunks:", error);
            res.status(400).send({ message: "Error deleting document chunks" });
            throw error;
          }
        }
      } while (paginationToken !== undefined);

      console.log(`Deleted ${deleteCount} chunks for document ${documentId}`);
    } catch (error) {
      console.error("Error deleting document chunks from Pinecone:", error);
    }

    try {
      const result = await storageService.deleteFileFromWorkspace(namespaceId, documentId);
      res.status(200).send({ message: result });
    } catch (error) {
      console.error("Error deleting document file:", error);
      res.status(500).send({ message: "Failed to delete document file" });
    }
  }

  async deleteWorkspace(req, res) {
    const namespaceId = req.params.namespaceId;

    try {
      await this.documentModel.deletePineconeNamespace(namespaceId);

      try {
        await storageService.deleteWorkspaceFiles(namespaceId);
      } catch (error) {
        console.error("Failed to delete namespace from Spaces:", error);
      }

      res.status(200).send({ message: "Workspace deleted successfully" });
    } catch (error) {
      console.error("Error deleting workspace:", error);
      res.status(500).send({ message: "Failed to delete workspace" });
    }
  }

  async serveDocument(req, res) {
    const { namespaceId, documentId } = req.params;
    const fileKey = `${namespaceId}/${documentId}`;
    console.log("Serving file:", fileKey);

    try {
      const fileUrl = storageService.constructFileUrl(fileKey);

      if (storageService instanceof ServerStorage) {
        const filePath = path.join("uploads", fileKey);
        const files = fs.readdirSync(filePath);
        const firstFile = files[0];
        const fileFullPath = path.join(filePath, firstFile);
        res.sendFile(fileFullPath, { root: "." });
      } else if (storageService instanceof SpacesStorage) {
        res.redirect(fileUrl);
      } else {
        throw new Error("Unsupported storage service");
      }
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  }
}

module.exports = new DocumentsController();
