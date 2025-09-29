import { Router } from 'express'
import type { Request, Response } from 'express'
import { SiweMessage } from 'siwe'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const { address } = req.body
  if (!address) {
    return res.status(400).json({ error: 'Address requerida' })
  }

  try {
    const nonce = Math.random().toString(36).substring(2, 10)
    const issuedAt = new Date().toISOString()

    const messageString = [
      'localhost wants you to sign in with your Ethereum account:',
      address,
      '',
      'Inicia sesión en el Faucet DApp',
      '',
      'URI: http://localhost:5173',
      'Version: 1',
      'Chain ID: 11155111',
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`
    ].join('\n')

    res.json({ message: messageString })
  } catch (err: any) {
    console.error('❌ Error al crear mensaje SIWE:', err.message)
    res.status(500).json({ error: 'Error al crear el mensaje SIWE' })
  }
})

export default router
