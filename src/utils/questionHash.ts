import crypto from 'crypto';

export const generateQuestionHash = (question: string, type: string) => {
    const normalizedQuestion = question.trim().toLowerCase().replace(/\s+/g, ' ');
    const content = `${normalizedQuestion}::${type.toLowerCase()}`;
    return crypto.createHash('md5').update(content).digest('hex');
};
