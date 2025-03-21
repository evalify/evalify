import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import { generateQuizHTML } from '@/utils/pdf-template';
import { isValidQuizId } from '@/utils/validation';
import clientPromise from '@/lib/db/mongo';
import { prisma } from '@/lib/db/prismadb';
import { auth } from '@/lib/auth/auth';


const QUESTIONS_COLLECTION = "NEW_QUESTIONS";


export async function GET(
    request: NextRequest,
    { params }: { params: { quizid: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.role || (session.user.role !== "STAFF" && session.user.role !== "MANAGER")) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        
        const { quizid } = await params;
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format');

        if (!isValidQuizId(quizid)) {
            return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();

        const quiz = await prisma.quiz.findUnique({
            where: {
                id: quizid
            },
            select: {
                title: true
            }
        })


        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        const questions = await db
            .collection(QUESTIONS_COLLECTION)
            .find({ quizId: quizid })
            .toArray();

        switch (format) {
            case 'pdf-with-answers':
                return generateEnhancedPDF(quiz, questions, true);
            case 'pdf-without-answers':
                return generateEnhancedPDF(quiz, questions, false);
            case 'excel':
                return generateDetailedExcel(quiz, questions);
            default:
                return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
        }
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

async function generateEnhancedPDF(quiz: any, questions: any[], showAnswers: boolean) {
    return new Promise<NextResponse>(async (resolve, reject) => {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // Set longer timeout and enable JavaScript
            await page.setDefaultNavigationTimeout(60000);
            await page.setDefaultTimeout(60000);
            await page.setJavaScriptEnabled(true);

            // Generate HTML content first
            const htmlContent = generateQuizHTML(quiz, questions, showAnswers);
            
            // Load KaTeX CSS and scripts properly with explicit loading checks
            await page.setContent(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
                    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
                    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
                </head>
                <body>${htmlContent}</body>
                </html>
            `, { waitUntil: 'networkidle0', timeout: 60000 });

            // Wait for KaTeX with a more robust approach
            await page.evaluate(() => {
                return new Promise<void>((resolve) => {
                    // Define a safety check function
                    function isKatexLoaded() {
                        return typeof window !== 'undefined' && 
                               typeof (window as any).katex !== 'undefined' && 
                               typeof (window as any).renderMathInElement !== 'undefined';
                    }
                    
                    const checkInterval = setInterval(() => {
                        if (isKatexLoaded()) {
                            clearInterval(checkInterval);
                            try {
                                // Use a try-catch block for the actual rendering
                                (window as any).renderMathInElement(document.body, {
                                    delimiters: [
                                        {left: "$$", right: "$$", display: true},
                                        {left: "$", right: "$", display: false}
                                    ],
                                    throwOnError: false,
                                    strict: false // Ignore errors in the LaTeX
                                });
                            } catch (e) {
                                console.warn('KaTeX rendering encountered an error:', e);
                                // Continue even if there's an error
                            }
                            // Short timeout to ensure rendering completes
                            setTimeout(resolve, 500);
                        }
                    }, 200);
                    
                    // Set a timeout to avoid hanging forever
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve(); // Resolve anyway after timeout
                    }, 5000);
                });
            });

            // Generate PDF with adjusted settings
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
                printBackground: true,
                preferCSSPageSize: true,
                timeout: 60000
            });

            await browser.close();

            const response = new NextResponse(pdfBuffer);
            response.headers.set('Content-Type', 'application/pdf');
            response.headers.set('Content-Disposition',
                `attachment; filename="quiz-${quiz.title || quiz._id}${showAnswers ? '-with-answers' : ''}.pdf"`
            );
            resolve(response);
        } catch (error) {
            if (browser) await browser.close();
            console.error("PDF generation error:", error);
            reject(error);
        }
    });
}

async function generateDetailedExcel(quiz: any, questions: any[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Quiz Questions');

    // Enhanced columns
    worksheet.columns = [
        { header: 'Q.No', key: 'no', width: 8 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Question', key: 'question', width: 50 },
        { header: 'Options', key: 'options', width: 30 },
        { header: 'Correct Answer', key: 'answer', width: 30 },
        { header: 'Explanation', key: 'explanation', width: 40 },
        { header: 'Marks', key: 'marks', width: 10 },
        { header: 'Difficulty', key: 'difficulty', width: 12 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Add questions with enhanced formatting
    questions.forEach((q, index) => {
        const row = worksheet.addRow({
            no: index + 1,
            type: q.type,
            question: q.question,
            options: q.type === 'MCQ' || q.type === 'TRUE_FALSE'?
                q.options.map((opt: any) => `${opt.option}`).join('\n') : '',
            answer: q.type === 'MCQ' || q.type === 'TRUE_FALSE' ?
                q.options.filter((opt: any) => q.answer.includes(opt.optionId))
                    .map((opt: any) => opt.option).join('\n') :
                q.expectedAnswer || '',
            explanation: q.explanation || '',
            marks: q.mark || 1,
            difficulty: q.difficulty || 'MEDIUM'
        });

        // Style alternating rows
        if (index % 2 === 1) {
            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFDFDFD' }
            };
        }
    });

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const response = new NextResponse(buffer);
    response.headers.set('Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    response.headers.set('Content-Disposition',
        `attachment; filename="quiz-${quiz._id}-detailed.xlsx"`
    );
    return response;
}

/**
 * Mock implementation of renderMathInElement for server-side compatibility
 * This function is normally provided by KaTeX's auto-render extension in the browser
 */
function renderMathInElement(element: HTMLElement, options: { 
    delimiters: { left: string; right: string; display: boolean; }[]; 
    throwOnError: boolean; 
    strict?: boolean;
}): void {
    // This is a server-side stub that will be replaced in the browser
    // We include it to satisfy TypeScript, but it won't actually run
    console.warn('Server-side KaTeX rendering was skipped (expected behavior)');
}

