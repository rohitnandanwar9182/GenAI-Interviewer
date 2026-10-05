import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useCallback, useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
            return response.interviewReport
        } finally {
            setLoading(false)
        }
    }





    const getReportById = useCallback(async (interviewId) => {
        setLoading(true)
        let response = null
        try {
            response = await getInterviewReportById(interviewId)
            setReport(response.interviewReport)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }



        //chnages
       return response ? response.interviewReport : null
    }, [ setLoading, setReport ])

    const getReports = useCallback(async () => {
        setLoading(true)
        let response = null
        try {
            response = await getAllInterviewReports()
            setReports(Array.isArray(response?.interviewReports) ? response.interviewReports : [])
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }



        

       return Array.isArray(response?.interviewReports) ? response.interviewReports : []
    }, [ setLoading, setReports ])

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        try {
            const blob = await generateResumePdf({ interviewReportId })
            if (!(blob instanceof Blob) || blob.size === 0) {
                throw new Error("The server returned an empty resume PDF.")
            }

            const signature = await blob.slice(0, 5).text()
            if (signature !== "%PDF-") {
                throw new Error("The server response was not a valid PDF.")
            }

            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `resume_${interviewReportId}.pdf`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
        } catch (error) {
            const responseData = error.response?.data
            if (responseData instanceof Blob) {
                const responseText = await responseData.text()
                let message = responseText
                try {
                    message = JSON.parse(responseText).message || responseText
                } catch {
                    // Keep the raw response text when the server did not return JSON.
                }
                throw new Error(message || "Resume PDF generation failed.")
            }
            throw error
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId, getReportById, getReports ])

    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf }

}