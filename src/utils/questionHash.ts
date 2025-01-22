import crypto from 'crypto';

export const generateQuestionHash = (question: string, type: string) => {
    // Remove whitespace and convert to lowercase for consistent hashing
    const normalizedQuestion = question.trim().toLowerCase().replace(/\s+/g, ' ');
    const content = `${normalizedQuestion}::${type.toLowerCase()}`;
    return crypto.createHash('md5').update(content).digest('hex');
};
