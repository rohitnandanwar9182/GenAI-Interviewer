import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect } from "react"
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
        let response = null
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
       } 
       
         //chnages

       catch (error) {
            console.log(error)
            response = null
        } finally {
            setLoading(false)
        }

        return response ? response.interviewReport : null
    }





    const getReportById = async (interviewId) => {
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
    }

   
    const getReports = async () => {
        setLoading(true)
        let response = null
        try {
            response = await getAllInterviewReports()
            setReports(response.interviewReports)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }



        

       return response ? response.interviewReports : []
    }


  const getResumePdf = async (interviewReportId) => {
    setLoading(true)

    // Open the tab immediately, while we still have the original tap's
    // "trusted user gesture" credit — mobile browsers block window.open
    // calls made after an `await`, which silently breaks downloads on phones.
    const newTab = window.open("", "_blank")

    let response = null
    try {
        response = await generateResumePdf({ interviewReportId })
        const blob = new Blob([ response ], { type: "application/pdf" })

        // Convert to a data: URI instead of a blob: object URL — blob URLs
        // are tied to the document that created them and don't reliably
        // transfer to a separate tab on some Android browsers (Samsung
        // Internet included). A data: URI is a plain self-contained string
        // with no such cross-window dependency.
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        })

        if (newTab) {
            newTab.location.href = dataUrl
        } else {
            // Popup was blocked — fall back to the anchor-download trick
            // in the current tab, which still works on desktop browsers.
            const link = document.createElement("a")
            link.href = dataUrl
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }
    catch (error) {
        console.log(error)
        if (newTab) newTab.close()
    } finally {
        setLoading(false)
    }
}


    // const getResumePdf = async (interviewReportId) => {
    //     setLoading(true)
    //     let response = null
    //     try {
    //         response = await generateResumePdf({ interviewReportId })
    //         const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
    //         const link = document.createElement("a")
    //         link.href = url
    //         link.setAttribute("download", `resume_${interviewReportId}.pdf`)
    //         document.body.appendChild(link)
    //         link.click()
    //     }
    //     catch (error) {
    //         console.log(error)
    //     } finally {
    //         setLoading(false)
    //     }
    // }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf }

}