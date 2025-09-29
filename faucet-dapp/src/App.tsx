import { useAccount, useConnect } from "wagmi"
import React, { useState, useEffect } from "react";

const BACKEND_URL = "http://localhost:4000"

function App() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const metaMaskConnector = connectors.find((c) => c.id === "injected")

  const [jwt, setJwt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [faucetData, setFaucetData] = useState<any>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)

  const handleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      const resMsg = await fetch(`${BACKEND_URL}/auth/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })

      const data = await resMsg.json()

      const message = data.message
      if (!message) {
        throw new Error("El backend no devolvió un mensaje SIWE válido")
      }

      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      })

      const resSign = await fetch(`${BACKEND_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      })

      const signinData = await resSign.json()

      if (signinData.token) {
        setJwt(signinData.token)
        localStorage.setItem("jwt", signinData.token)
      } else {
        setError(signinData.error || "Error de autenticación")
      }
    } catch (err: any) {
      console.error("Error en el proceso SIWE:", err)
      setError("Error en el proceso de autenticación")
    }
    setLoading(false)
  }

  const fetchFaucetStatus = async () => {
    if (!jwt || !address) return

    try {
      const response = await fetch(`${BACKEND_URL}/faucet/status/${address}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      
      if (response.ok) {
        setFaucetData(data)
      } else {
        if (response.status === 401 && data.error === 'Token inválido') {
          handleLogout()
          setError('Tu sesión ha expirado. Por favor, autentícate de nuevo.')
        } else {
          console.error("Error al consultar estado:", data.error)
          setError(data.error)
        }
      }
    } catch (err) {
      console.error("Error al consultar estado del faucet:", err)
      setError("Error al consultar estado del faucet")
    }
  }

  const handleClaimTokens = async () => {
    if (!jwt || !address) return

    setClaiming(true)
    setError(null)
    setClaimSuccess(null)

    try {
      const response = await fetch(`${BACKEND_URL}/faucet/claim`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setClaimSuccess(`¡Tokens reclamados exitosamente! TX: ${data.txHash}`)
        fetchFaucetStatus()
      } else {
        setError(data.error || "Error al reclamar tokens")
      }
    } catch (err: any) {
      console.error("Error al reclamar tokens:", err)
      setError("Error al reclamar tokens")
    }

    setClaiming(false)
  }

  const handleLogout = () => {
    setJwt(null)
    setFaucetData(null)
    setError(null)
    setClaimSuccess(null)
    localStorage.removeItem("jwt")
  }

  useEffect(() => {
    const storedJwt = localStorage.getItem("jwt")
    if (storedJwt) setJwt(storedJwt)
  }, [])

  useEffect(() => {
    if (jwt && address) {
      fetchFaucetStatus()
    }
  }, [jwt, address])

  return (
    <div className="min-h-screen bg-blue-700 flex flex-col items-center py-8">
      <h1 className="text-4xl font-bold text-black mb-8">Faucet Token DApp</h1>
      <div className="w-full max-w-xl grid grid-cols-1 gap-6">
        
        {/* Conexión de wallet */}
        <div className="bg-yellow-400 rounded-lg shadow p-6 flex flex-col justify-center">
          <p className="text-lg font-semibold text-black">Wallet conectada:</p>
          <code className="block text-black break-all">{address || "No conectada"}</code>
          {!isConnected && (
            <button
              onClick={() =>
                metaMaskConnector && connect({ connector: metaMaskConnector })
              }
              className="bg-blue-700 text-black font-semibold px-6 py-2 rounded hover:bg-blue-800 transition mt-4"
              disabled={!metaMaskConnector}
            >
              Conectar Wallet
            </button>
          )}
        </div>

        {/* Autenticación SIWE */}
        <div className="bg-yellow-400 rounded-lg shadow p-6 flex flex-col justify-center">
          {!jwt ? (
            <button
              onClick={handleSignIn}
              disabled={loading || !isConnected}
              className="bg-blue-700 text-black font-semibold px-6 py-2 rounded hover:bg-blue-800 transition"
            >
              {loading ? "Autenticando..." : "Sign-In with Ethereum"}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-green-700 font-semibold">¡Autenticación exitosa!</p>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white font-semibold px-4 py-2 rounded hover:bg-red-700 transition text-sm"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* Información del Faucet - Solo si está autenticado */}
        {jwt && faucetData && (
          <div className="bg-yellow-400 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-black mb-4">Estado del Faucet</h2>
            <div className="space-y-2 text-black">
              <p><strong>Tu balance:</strong> {faucetData.balance} FTK</p>
              <p><strong>Cantidad por reclamo:</strong> {faucetData.faucetAmount} FTK</p>
              <p><strong>Ya reclamaste:</strong> {faucetData.hasClaimed ? "Sí" : "No"}</p>
              <p><strong>Total de usuarios:</strong> {faucetData.users?.length || 0}</p>
            </div>
          </div>
        )}

        {/* Botón para reclamar tokens */}
        {jwt && faucetData && (
          <div className="bg-yellow-400 rounded-lg shadow p-6 flex flex-col justify-center">
            <button
              onClick={handleClaimTokens}
              disabled={claiming || faucetData.hasClaimed}
              className="bg-blue-700 text-black font-semibold px-6 py-2 rounded hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {claiming 
                ? "Reclamando tokens..." 
                : faucetData.hasClaimed 
                ? "Ya reclamaste tus tokens" 
                : `Reclamar ${faucetData.faucetAmount} FTK`}
            </button>
          </div>
        )}

        {/* Mensajes de éxito y error */}
        {error && (
          <div className="bg-red-200 rounded-lg p-4">
            <p className="text-red-700 font-semibold">Error: {error}</p>
          </div>
        )}

        {claimSuccess && (
          <div className="bg-green-200 rounded-lg p-4">
            <p className="text-green-700 font-semibold">{claimSuccess}</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default App;