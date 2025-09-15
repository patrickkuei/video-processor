import { Link, Route, Routes } from 'react-router-dom'
import './App.css'
import UploadPage from './pages/UploadPage.jsx'
import JobStatusPage from './pages/JobStatusPage.jsx'

function App() {
  return (
    <div className="container">
      <header className="header">
        <Link to="/" className="brand">Video Processor</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/jobs/:id" element={<JobStatusPage />} />
        </Routes>
      </main>
      <footer className="footer">MVP Demo</footer>
    </div>
  )
}

export default App
