import Navbar from './Components/Navbar'
import Footer from './Components/Footer'
import { Outlet } from 'react-router-dom'

const Root = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}

export default Root
