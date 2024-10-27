// const File = require("../models/File");
// const Workspace = require("../models/Workspace");
// const FileWorkspace = require("../models/FileWorkspace");
// const mammoth = require("mammoth");
// const fs = require("fs");
// const path = require("path");
// const fetch = require("node-fetch"); // Install node-fetch
// const FormData = require("form-data"); // Install form-data
// const { uploadFile } = require("../utils/storage/files");

// const uploadFileController = async (file, payload) => {
//   try {
//     const filePath = await uploadFile(file, payload);
//     return filePath;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// const deleteFileController = async (filePath) => {
//   try {
//     await deleteFileFromStorage(filePath);
//     return true;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// const getFileController = async (filePath) => {
//   try {
//     const signedUrl = await getFileFromStorage(filePath);
//     return signedUrl;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Get a file by its ID
// const getFileById = async (fileId) => {
//   try {
//     const file = await File.findById(fileId).exec();
//     if (!file) {
//       throw new Error("File not found");
//     }
//     return file;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Get files associated with a workspace ID
// const getFileWorkspacesByWorkspaceId = async (workspaceId) => {
//   try {
//     const workspace = await Workspace.findById(workspaceId).exec();
//     if (!workspace) {
//       throw new Error("Workspace not found");
//     }
//     const fileWorkspaces = await FileWorkspace.find({ workspace_id: workspaceId })
//       .populate("file_id")
//       .exec();
//     const files = fileWorkspaces.map((fw) => fw.file_id);

//     return {
//       id: workspace._id,
//       name: workspace.name,
//       files: files
//     };
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Get workspaces associated with a file ID
// const getFileWorkspacesByFileId = async (fileId) => {
//   try {
//     const file = await File.findById(fileId).exec();
//     if (!file) {
//       throw new Error("File not found");
//     }
//     const fileWorkspaces = await FileWorkspace.find({ file_id: fileId })
//       .populate("workspace_id")
//       .exec();
//     const workspaces = fileWorkspaces.map((fw) => fw.workspace_id);

//     return {
//       id: file._id,
//       name: file.name,
//       workspaces: workspaces
//     };
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Create a file based on its extension
// const createFileBasedOnExtension = async (
//   filePath,
//   fileRecord,
//   workspace_id,
//   embeddingsProvider
// ) => {
//   const fileExtension = path.extname(filePath).slice(1);

//   if (fileExtension === "docx") {
//     const result = await mammoth.extractRawText({ path: filePath });
//     return createDocXFile(result.value, filePath, fileRecord, workspace_id, embeddingsProvider);
//   } else {
//     return createFile(filePath, fileRecord, workspace_id, embeddingsProvider);
//   }
// };

// // For non-docx files
// const createFile = async (filePath, fileRecord, workspace_id, embeddingsProvider) => {
//   try {
//     let validFilename = fileRecord.name.replace(/[^a-z0-9.]/gi, "_").toLowerCase();
//     const extension = path.extname(filePath).slice(1);
//     const baseName = path.basename(validFilename, `.${extension}`);
//     const maxBaseNameLength = 100 - (extension.length || 0) - 1;

//     if (baseName.length > maxBaseNameLength) {
//       fileRecord.name = baseName.substring(0, maxBaseNameLength) + "." + extension;
//     } else {
//       fileRecord.name = baseName + "." + extension;
//     }

//     const newFile = new File(fileRecord);
//     const createdFile = await newFile.save();

//     await createFileWorkspace({
//       user_id: createdFile.user_id,
//       file_id: createdFile._id,
//       workspace_id
//     });

//     const uploadedFilePath = await uploadFile(filePath, {
//       name: createdFile.name,
//       user_id: createdFile.user_id,
//       file_id: createdFile._id
//     });

//     createdFile.file_path = uploadedFilePath;
//     await createdFile.save();

//     const formData = new FormData();
//     formData.append("file_id", createdFile._id.toString());
//     formData.append("embeddingsProvider", embeddingsProvider);

//     const response = await fetch("http://localhost:5000/api/retrieval/process", {
//       method: "POST",
//       body: formData
//     });

//     if (!response.ok) {
//       const json = await response.json();
//       console.error(
//         `Error processing file:${createdFile._id}, status:${response.status}, response:${json.message}`
//       );
//       await deleteFile(createdFile._id);
//       throw new Error("Failed to process file. Reason: " + json.message);
//     }

//     const fetchedFile = await getFileById(createdFile._id);

//     return fetchedFile;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Handle docx files
// const createDocXFile = async (text, filePath, fileRecord, workspace_id, embeddingsProvider) => {
//   try {
//     const newFile = new File(fileRecord);
//     const createdFile = await newFile.save();

//     await createFileWorkspace({
//       user_id: createdFile.user_id,
//       file_id: createdFile._id,
//       workspace_id
//     });

//     const uploadedFilePath = await uploadFile(filePath, {
//       name: createdFile.name,
//       user_id: createdFile.user_id,
//       file_id: createdFile._id
//     });

//     createdFile.file_path = uploadedFilePath;
//     await createdFile.save();

//     const response = await fetch("http://localhost:5000/api/retrieval/process/docx", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         text: text,
//         fileId: createdFile._id.toString(),
//         embeddingsProvider,
//         fileExtension: "docx"
//       })
//     });

//     if (!response.ok) {
//       const json = await response.json();
//       console.error(
//         `Error processing file:${createdFile._id}, status:${response.status}, response:${json.message}`
//       );
//       await deleteFile(createdFile._id);
//       throw new Error("Failed to process file. Reason: " + json.message);
//     }

//     const fetchedFile = await getFileById(createdFile._id);

//     return fetchedFile;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Create multiple files
// const createFiles = async (files, workspace_id) => {
//   try {
//     const createdFiles = await File.insertMany(files);

//     const fileWorkspaces = createdFiles.map((file) => ({
//       user_id: file.user_id,
//       file_id: file._id,
//       workspace_id
//     }));

//     await createFileWorkspaces(fileWorkspaces);

//     return createdFiles;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Create a FileWorkspace
// const createFileWorkspace = async (item) => {
//   try {
//     const newFileWorkspace = new FileWorkspace(item);
//     const createdFileWorkspace = await newFileWorkspace.save();
//     return createdFileWorkspace;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Create multiple FileWorkspaces
// const createFileWorkspaces = async (items) => {
//   try {
//     const createdFileWorkspaces = await FileWorkspace.insertMany(items);
//     return createdFileWorkspaces;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Update a file
// const updateFile = async (fileId, fileData) => {
//   try {
//     const updatedFile = await File.findByIdAndUpdate(fileId, fileData, {
//       new: true
//     }).exec();
//     if (!updatedFile) {
//       throw new Error("File not found");
//     }
//     return updatedFile;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Delete a file
// const deleteFile = async (fileId) => {
//   try {
//     const deletedFile = await File.findByIdAndDelete(fileId).exec();
//     if (!deletedFile) {
//       throw new Error("File not found");
//     }
//     // Optionally delete associated file from storage
//     return true;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// // Delete a FileWorkspace
// const deleteFileWorkspace = async (fileId, workspaceId) => {
//   try {
//     await FileWorkspace.deleteOne({ file_id: fileId, workspace_id: workspaceId }).exec();
//     return true;
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };

// module.exports = {
//   getFileById,
//   getFileWorkspacesByWorkspaceId,
//   getFileWorkspacesByFileId,
//   createFileBasedOnExtension,
//   createFile,
//   createDocXFile,
//   createFiles,
//   createFileWorkspace,
//   createFileWorkspaces,
//   updateFile,
//   deleteFile,
//   deleteFileWorkspace,
//   // storage
//   uploadFile: uploadFileController,
//   deleteFileFromStorage: deleteFileController,
//   getFileFromStorage: getFileController
// };
