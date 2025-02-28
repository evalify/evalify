export type Language = "python" | "octave";

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
    }
};
