import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import React from 'react'
import LogoutButton from "./LogoutButton";

const Protected = ({children}) => {
    const { loading,user } = useAuth()


    if(loading){
        return (<main><h1>Loading...</h1></main>)
    }

    if(!user){
        return <Navigate to={'/login'} />
    }
    
    return (
        <>
            <LogoutButton />
            {children}
        </>
    )
}

export default Protected





// import { useAuth } from "../hooks/useAuth";
// import { Navigate } from "react-router";
// import React from 'react'

// const Protected = ({children}) => {
//     const { loading,user } = useAuth()


//     if(loading){
//         return (<main><h1>Loading...</h1></main>)
//     }

//     if(!user){
//         return <Navigate to={'/login'} />
//     }
    
//     return children
// }

// export default Protected