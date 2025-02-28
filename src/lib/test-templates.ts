import { Language } from './programming-languages';
import type { TestCase } from '@/types/questions';

const generatePythonTest = (functionName: string, testCase: TestCase): string => `
def test_${functionName}_case_${testCase.id}():
    # Arrange
    inputs = ${JSON.stringify(testCase.inputs)}
    expected = ${JSON.stringify(testCase.output)}
    
    # Act
    result = ${functionName}(*inputs)
    
    # Assert
    if isinstance(result, np.ndarray):
        npt.assert_array_equal(result, expected)
    elif isinstance(result, (list, tuple)):
        assert result == expected
    else:
        assert result == expected
`;

const generateJavaTest = (functionName: string, testCase: TestCase): string => `
@Test
public void test${functionName}Case${testCase.id}() {
    // Arrange
    ${testCase.inputs.map((input, i) =>
    `var input${i + 1} = ${JSON.stringify(input)};`
).join('\n    ')}
    var expected = ${JSON.stringify(testCase.output)};
    
    // Act
    var result = ${functionName}(${testCase.inputs.map((_, i) => `input${i + 1}`).join(', ')});
    
    // Assert
    ${Array.isArray(testCase.output)
        ? 'assertArrayEquals(expected, result);'
        : 'assertEquals(expected, result);'
    }
}
`;

const generateCTest = (functionName: string, testCase: TestCase): string => `
void test_${functionName}_case_${testCase.id}(void) {
    // Arrange
    ${testCase.inputs.map((input, i) =>
    `${typeof input === 'string' ? 'const char*' : typeof input === 'number' ? 'double' : 'int'} input${i + 1} = ${JSON.stringify(input)};`
).join('\n    ')}
    ${typeof testCase.output === 'string' ? 'const char*' : typeof testCase.output === 'number' ? 'double' : 'int'} expected = ${JSON.stringify(testCase.output)};
    
    // Act
    ${typeof testCase.output === 'string' ? 'const char*' : typeof testCase.output === 'number' ? 'double' : 'int'} result = ${functionName}(${testCase.inputs.map((_, i) => `input${i + 1}`).join(', ')});
    
    // Assert
    ${typeof testCase.output === 'string'
        ? 'TEST_ASSERT_EQUAL_STRING(expected, result);'
        : Array.isArray(testCase.output)
            ? 'TEST_ASSERT_EQUAL_ARRAY(expected, result, sizeof(expected)/sizeof(expected[0]));'
            : 'TEST_ASSERT_EQUAL(expected, result);'
    }
}
`;

const generateOctaveTest = (functionName: string, testCase: TestCase): string => `
function test_${functionName}_case_${testCase.id}()
    % Arrange
    inputs = {${testCase.inputs.map(input => JSON.stringify(input)).join(', ')}};
    expected = ${JSON.stringify(testCase.output)};
    
    % Act
    result = ${functionName}(${testCase.inputs.map((_, i) => `inputs{${i + 1}}`).join(', ')});
    
    if (isequal(result, expected))
        disp('Test case successful!');
    else
        error('Test case failed!');
end
`;

export const generateTestCode = (
    language: Language,
    functionName: string,
    testCases: TestCase[]
): string => {
    const testGenerators = {
        python: generatePythonTest,
        octave: generateOctaveTest
    };

    const generator = testGenerators[language];
    if (!generator) {
        throw new Error(`Unsupported language: ${language}`);
    }

    return testCases.map(testCase =>
        generator(functionName, testCase)
    ).join('\n');
};

// Function to format MATLAB matrix
function formatMatlabMatrix(value: any): string {
    if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
        return '[' + value.map(row => row.join(' ')).join('; ') + ']';
    }
    return JSON.stringify(value);
}

// Function to generate driver code for MATLAB
export function generateDriverCode(language: string, functionName: string, testCases: TestCase[]): string {
    if (language === 'matlab') {
        return testCases.map(testCase => {
            const inputs = testCase.inputs.map(input => formatMatlabMatrix(input)).join(', ');
            const output = formatMatlabMatrix(testCase.output);
            return `assert(isequal(${functionName}(${inputs}), ${output}));`;
        }).join('\n');
    }

    if (!testCases || testCases.length === 0 || !functionName) return '';

    if (language === 'python') {
        return testCases.map((testCase, index) => {
            const inputs = testCase.inputs?.map(input => JSON.stringify(input)) || [];
            return `
def test_${functionName}_case_${index + 1}():
    # Arrange
    expected = ${JSON.stringify(testCase.output ?? null)}
    
    # Act
    result = ${functionName}(${inputs.join(', ')})
    
    if result == expected:
        print("Test case successful!")
    else:
        print("Test case failed!")

test_${functionName}_case_${index + 1}()`
        }).join('\n\n');
    }

    if (language === 'octave') {
        return testCases.map((testCase, index) => {
            const inputs = testCase.inputs?.map(input => JSON.stringify(input)) || [];
            return `
function test_${functionName}_case_${index + 1}()
    % Arrange
    expected = ${JSON.stringify(testCase.output ?? null)};
    
    % Act
    result = ${functionName}(${inputs.join(', ')});
    
    if (isequal(result, expected))
        disp('Test case successful!');
    else
        disp('Test case failed!');
    end
end

test_${functionName}_case_${index + 1}()`
        }).join('\n\n');
    }

    return '';
}
