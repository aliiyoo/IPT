import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import "leaflet/dist/leaflet.css"
import "./billing-verifier.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
