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

            // Pre-load KaTeX scripts
            await page.goto('about:blank');
            await page.addScriptTag({
                url: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js'
            });
            await page.addScriptTag({
                url: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js'
            });

            // Generate and set HTML content with optimized waiting strategy
            const htmlContent = generateQuizHTML(quiz, questions, showAnswers);
            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // Wait for KaTeX rendering with a more reliable approach
            await page.evaluate(() => {
                return new Promise<void>((resolve) => {
                    if (typeof renderMathInElement === 'undefined') {
                        resolve(); // If KaTeX is not needed, continue
                        return;
                    }

                    const maxAttempts = 10;
                    let attempts = 0;

                    const tryRender = () => {
                        try {
                            renderMathInElement(document.body, {
                                delimiters: [
                                    {left: "$$", right: "$$", display: true},
                                    {left: "$", right: "$", display: false}
                                ],
                                throwOnError: false
                            });
                            resolve();
                        } catch (e) {
                            attempts++;
                            if (attempts < maxAttempts) {
                                setTimeout(tryRender, 500);
                            } else {
                                resolve(); // Continue even if KaTeX fails
                            }
                        }
                    };

                    tryRender();
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
                `attachment; filename="quiz-${quiz._id}${showAnswers ? '-with-answers' : ''}.pdf"`
            );
            resolve(response);
        } catch (error) {
            if (browser) await browser.close();
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
 * Since we're using it in a Puppeteer context, this mock will be overridden by the actual KaTeX implementation
 */
function renderMathInElement(element: HTMLElement, options: { 
    delimiters: { left: string; right: string; display: boolean; }[]; 
    throwOnError: boolean; 
}): void {
    // This is just a stub implementation that will be replaced by KaTeX's actual renderMathInElement
    // In Puppeteer context, the actual KaTeX implementation will be loaded from the CDN
    
    // If we're in a browser-like environment with KaTeX available
    if (typeof window !== 'undefined' && 'katex' in window) {
        // @ts-ignore - KaTeX global object would normally handle this in browser
        const katexRender = window.renderMathInElement || window.katex?.renderMathInElement;
        if (typeof katexRender === 'function') {
            katexRender(element, options);
            return;
        }
    }
    
    // If KaTeX is not available, this function becomes a no-op
    console.warn('KaTeX rendering was attempted but KaTeX is not available');
}

