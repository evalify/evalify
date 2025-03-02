export function generateQuizHTML(quiz: any, questions: any[], showAnswers: boolean) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${quiz.title}</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 40px;
                    color: #333;
                }
                .question {
                    margin-bottom: 30px;
                    page-break-inside: avoid;
                }
                .question-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                }
                .question-content {
                    margin: 15px 0;
                }
                .options {
                    margin-left: 20px;
                }
                .option {
                    padding: 8px 12px;
                    margin: 5px 0;
                    border-radius: 4px;
                }
                .correct-option {
                    background-color: #E5FFE5;
                }
                .answer-section {
                    margin-top: 15px;
                    padding: 10px;
                    border-left: 3px solid #006400;
                    background-color: #fafafa;
                }
                .explanation {
                    margin-top: 10px;
                    color: #666;
                    font-style: italic;
                }
                img {
                    max-width: 100%;
                    height: auto;
                    margin: 10px 0;
                }
                .quiz-header {
                    text-align: center;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #eee;
                }
                .quiz-meta {
                    color: #666;
                    font-size: 0.9em;
                }
                .katex { 
                    font-size: 1.1em; 
                }
                .katex-display { 
                    margin: 1em 0;
                    overflow-x: auto;
                    overflow-y: hidden;
                }
            </style>
        </head>
        <body>
            <div class="quiz-header">
                <h1>${quiz.title}</h1>
                <div class="quiz-meta">
                    <p>Total Questions: ${questions.length}</p>
                    <p>Total Marks: ${questions.reduce((sum: number, q: any) => sum + (q.mark || 1), 0)}</p>
                </div>
            </div>

            ${questions.map((q, index) => `
                <div class="question">
                    <div class="question-header">
                        <h3>Question ${index + 1} (${q.mark || 1} marks)</h3>
                        <span>${q.type}</span>
                    </div>
                    <div class="question-content tex2jax_process">
                        ${q.question}
                    </div>
                    ${q.image ? `<img src="${q.image}" alt="Question Image">` : ''}
                    
                    ${q.type === 'MCQ' || q.type === "TRUE_FALSE" ? `
                        <div class="options">
                            ${q.options.map((opt: any) => `
                                <div class="option ${showAnswers && q.answer.includes(opt.optionId) ? 'correct-option' : ''}">
                                    <div class="tex2jax_process">${opt.option}</div>
                                    ${opt.image ? `<img src="${opt.image}" alt="Option Image">` : ''}
                                    ${showAnswers && q.answer.includes(opt.optionId) ? ' ✓' : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${showAnswers ? `
                        <div class="answer-section">
                            <strong>Answer:</strong> 
                            <div class="tex2jax_process">
                                ${q.type === 'MCQ' || q.type === "TRUE_FALSE" 
                                    ? q.options
                                        .filter((opt: any) => q.answer.includes(opt.optionId))
                                        .map((opt: any) => opt.option)
                                        .join(', ')
                                    : q.expectedAnswer || 'No answer provided'
                                }
                            </div>
                            ${q.explanation ? `
                                <div class="explanation">
                                    <strong>Explanation:</strong>
                                    <div class="tex2jax_process">${q.explanation}</div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('')}

            <script>
                document.addEventListener("DOMContentLoaded", function() {
                    renderMathInElement(document.body, {
                        delimiters: [
                            {left: "$$", right: "$$", display: true},
                            {left: "$", right: "$", display: false}
                        ],
                        throwOnError: false
                    });
                });
            </script>
        </body>
        </html>
    `;
}
