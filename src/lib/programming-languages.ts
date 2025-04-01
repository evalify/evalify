export type Language = "python" | "octave" | "java";

export interface LanguageConfig {
    name: string;
    types: string[];
    fileExtension: string;
    testFramework: {
        name: string;
        imports: string;
        setup?: string;
    };
}

export const LANGUAGE_CONFIGS: Record<Language, LanguageConfig> = {
    python: {
        name: "Python",
        fileExtension: ".py",
        types: [
            "int", "float", "str", 
            "List[int]", "List[float]", "List[str]",
            "numpy.ndarray"
        ],
        testFramework: {
            name: "pytest",
            imports: "import pytest\nimport numpy as np\nfrom typing import List\n",
            setup: "import numpy.testing as npt"
        }
    },
    octave: {
        name: "Octave",
        fileExtension: ".m",
        types: [
            "double", "matrix", "string",
            "array", "cell"
        ],
        testFramework: {
            name: "MOxUnit",
            imports: ""
        }
    },
    java:{
        name: "Java",
        fileExtension: ".java",
        types: [
            "int", "float", "String", 
            "List<Integer>", "List<Float>", "List<String>"
        ],
        testFramework: {
            name: "JUnit",
            imports: "import org.junit.Test;\nimport static org.junit.Assert.*;\nimport java.util.List;\n",
            setup: ""
        }
    }
};
