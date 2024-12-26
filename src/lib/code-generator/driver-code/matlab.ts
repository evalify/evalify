
function generateMatlabDriverCode({
    functionName,
    testCases
}: {
    functionName: string,
    testCases: Array<{
        input: string,
        expectedOutput: string
    }>
}) {
    const testCasesCode = testCases.map(({ input, expectedOutput }, index) => {
        return `assert(${functionName}(${input}) == ${expectedOutput}, 'Test case ${index + 1} failed');`;
    }).join('\n');

    return `
function ${functionName}()


end

${testCasesCode}

    `;

}

export default generateMatlabDriverCode