import React from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import './logout-button.scss'

const LogoutButton = () => {
    const { handleLogout } = useAuth()
    const navigate = useNavigate()

    const onClick = async () => {
        await handleLogout()
        navigate('/login')
    }

    return (
        <button className='button logout-button' onClick={onClick}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
        </button>
    )
}

export default LogoutButton