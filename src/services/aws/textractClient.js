/**
 * Amazon Textract Document Parser
 *
 * Processes uploaded PDF/image assignment briefs to extract:
 * - Module names
 * - Due dates
 * - Grade weightages
 * - Task descriptions
 *
 * Production: Uses @aws-sdk/client-textract AnalyzeDocumentCommand
 * Demo: Simulates OCR extraction from common assignment brief patterns
 */

export const TextractClient = {
  /**
   * Process an uploaded file (PDF or image)
   * @param {File} file - The uploaded file object
   * @returns {object} Extracted task information
   */
  async processDocument(file) {
    // In production:
    // 1. Upload file to S3
    // 2. Call Textract AnalyzeDocument
    // 3. Parse blocks for key-value pairs and tables
    //
    // const textractClient = new TextractClient({ region: 'us-east-1' });
    // const command = new AnalyzeDocumentCommand({
    //   Document: { S3Object: { Bucket: 'polytrack-uploads', Name: key } },
    //   FeatureTypes: ['FORMS', 'TABLES']
    // });

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 1500));

    // Mock extraction based on filename patterns
    return _mockExtract(file.name, file.type);
  },

  /**
   * Process a base64-encoded document
   */
  async processBase64(base64Data, filename) {
    await new Promise((r) => setTimeout(r, 1200));
    return _mockExtract(filename, 'application/pdf');
  },
};

function _mockExtract(filename, mimeType) {
  const lower = filename.toLowerCase();

  // Simulate detecting common assignment brief patterns
  let extracted = {
    confidence: 0.78,
    documentType: mimeType.includes('pdf') ? 'PDF' : 'Image',
    fields: [],
  };

  // Try to extract module info from filename
  const moduleMatch = filename.match(/([A-Z]{2,4}\s?\d{3,4})/i);
  if (moduleMatch) {
    extracted.moduleCode = moduleMatch[1].replace(/\s/g, '').toUpperCase();
    extracted.fields.push({ key: 'Module Code', value: extracted.moduleCode, confidence: 0.92 });
  }

  // Simulate extracted text blocks
  if (lower.includes('assignment') || lower.includes('brief')) {
    extracted.taskType = 'Assignment';
    extracted.title = `Assignment from ${extracted.moduleCode || 'uploaded document'}`;
    extracted.fields.push(
      { key: 'Task Type', value: 'Assignment', confidence: 0.88 },
      { key: 'Weightage', value: '25%', confidence: 0.75 },
      { key: 'Estimated Due', value: 'Next week (detected from brief)', confidence: 0.65 },
    );
    extracted.weightage = 25;
  } else if (lower.includes('lab') || lower.includes('practical')) {
    extracted.taskType = 'Practical';
    extracted.title = `Lab Exercise from ${extracted.moduleCode || 'uploaded document'}`;
    extracted.fields.push(
      { key: 'Task Type', value: 'Practical', confidence: 0.85 },
      { key: 'Weightage', value: '15%', confidence: 0.7 },
    );
    extracted.weightage = 15;
  } else {
    extracted.taskType = 'Assignment';
    extracted.title = `Task extracted from ${filename}`;
    extracted.fields.push(
      { key: 'Document', value: filename, confidence: 0.95 },
      { key: 'Note', value: 'Please review extracted details', confidence: 0.6 },
    );
  }

  return extracted;
}

export default TextractClient;
