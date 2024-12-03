export const isValidQuizId = (id: string): boolean => {
    return typeof id === 'string' && id.length > 0;
};