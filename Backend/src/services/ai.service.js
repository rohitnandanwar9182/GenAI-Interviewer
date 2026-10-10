const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer-core")
const chromium = require("@sparticuz/chromium")
const fs = require("fs")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const MODEL_CAPACITY_RETRY_DELAY_MS = 1000

function isModelCapacityError(error) {
    const code = error?.code ?? error?.statusCode ?? error?.status ?? error?.error?.code
    const status = String(error?.status ?? error?.error?.status ?? "").toUpperCase()
    const message = error?.message || ""

    return Number(code) === 503 ||
        status === "UNAVAILABLE" ||
        /currently experiencing high demand|temporarily unavailable/i.test(message)
}

async function generateContentWithFallback({ model, fallbackModel, contents, config }) {
    try {
        return await ai.models.generateContent({ model, contents, config })
    } catch (error) {
        if (!isModelCapacityError(error)) {
            throw error
        }

        console.warn(`Gemini model ${model} is unavailable; retrying once before fallback.`)
        await new Promise(resolve => setTimeout(resolve, MODEL_CAPACITY_RETRY_DELAY_MS))

        try {
            return await ai.models.generateContent({ model, contents, config })
        } catch (retryError) {
            if (!isModelCapacityError(retryError)) {
                throw retryError
            }

            console.warn(`Gemini model ${model} remains unavailable; switching to ${fallbackModel}.`)
            await new Promise(resolve => setTimeout(resolve, MODEL_CAPACITY_RETRY_DELAY_MS))
            return ai.models.generateContent({ model: fallbackModel, contents, config })
        }
    }
}


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("A useful sample answer written in first person as if the candidate is answering the interviewer, with a direct explanation rather than advice about how to answer")
    })).min(5).describe("At least 5 technical interview questions, each with its intention and a suggested answer"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral question that can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("A useful sample answer written in first person as if the candidate is answering the interviewer, using STAR where appropriate and not merely giving advice about how to answer")
    })).min(5).describe("At least 5 behavioral interview questions, each with its intention and a suggested answer"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate an interview report for a candidate using all supplied information.
                        Include at least 5 distinct, role-relevant technical questions and at least 5 distinct behavioral questions.
                        Every question must include its intention and a complete sample answer written in first person as if the candidate is already answering the interviewer. Do not write instructions such as "you should mention" or "explain how"; write the answer itself.
                        Technical questions must assess role-specific knowledge and skills, and their sample answers must directly explain the technical concepts or solve the problem asked.
                        Behavioral questions must assess workplace experience and use the STAR structure where appropriate. Ground behavioral answers in details supplied in the resume or self-description; do not invent specific achievements or experience that were not supplied.
                        Resume: ${resume || "(provided resume contains no extractable text)"}
                        Self Description: ${selfDescription || "(not provided)"}
                        Job Description: ${jobDescription || "(not provided; infer the target role from the resume and self-description)"}
`

    const response = await generateContentWithFallback({
        model: "gemini-3-flash-preview",
        fallbackModel: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    return interviewReportSchema.parse(JSON.parse(response.text))


}


async function generatePdfFromHtml(htmlContent) {
    if (typeof htmlContent !== "string" || !htmlContent.trim()) {
        throw new Error("The AI service returned empty resume HTML.")
    }

    let browser = null

    try {
        if (process.platform === "win32") {
            const configuredExecutable = process.env.CHROME_EXECUTABLE_PATH
            if (configuredExecutable && !fs.existsSync(configuredExecutable)) {
                throw new Error("CHROME_EXECUTABLE_PATH does not point to an existing browser executable.")
            }

            const windowsExecutables = [
                process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
                process.env["PROGRAMFILES(X86)"] && `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
                process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
                process.env["PROGRAMFILES(X86)"] && `${process.env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
                process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
            ].filter(Boolean)
            const executablePath = configuredExecutable || windowsExecutables.find(candidate => fs.existsSync(candidate))

            if (!executablePath) {
                throw new Error("Chrome or Edge was not found. Install a browser or set CHROME_EXECUTABLE_PATH to its executable.")
            }

            browser = await puppeteer.launch({
                executablePath,
                headless: true,
            })
        } else {
            browser = await puppeteer.launch({
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            })
        }

        const page = await browser.newPage()
        await page.setContent(htmlContent, { waitUntil: "domcontentloaded", timeout: 20000 })

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            }
        })

        if (!pdfBuffer.length) {
            throw new Error("PDF generation returned an empty document.")
        }

        return Buffer.from(pdfBuffer)

    } finally {
        if (browser) await browser.close()
    }
}


async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate a tailored resume using the candidate's supplied information:
                        Resume: ${resume || "(not provided)"}
                        Self Description: ${selfDescription || "(not provided)"}
                        Job Description: ${jobDescription || "(not provided; tailor the resume based on the candidate's resume and self-description)"}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await generateContentWithFallback({
        model: "gemini-3.1-flash-lite",
        fallbackModel: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })


    if (!response.text) {
        throw new Error("The AI service returned an empty resume response.")
    }

    let parsedContent
    try {
        parsedContent = JSON.parse(response.text)
    } catch {
        throw new Error("The AI service returned invalid JSON for the resume.")
    }

    const { html } = resumePdfSchema.parse(parsedContent)
    const pdfBuffer = await generatePdfFromHtml(html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }