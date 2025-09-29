import { Router } from 'express'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { verifyMessage } from '@ethersproject/wallet'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const { message, signature } = req.body
  if (!message || !signature) {
    return res.status(400).json({ error: 'Faltan datos' })
  }

  try {
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/)
    const address = addressMatch ? addressMatch[0] : null
    
    if (!address) {
      return res.status(400).json({ error: 'Dirección no encontrada en el mensaje' })
    }

    const recoveredAddress = verifyMessage(message, signature)

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Firma inválida' })
    }

    const token = jwt.sign(
      { address: address },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    )

    res.json({ token, address })
  } catch (err: any) {
    console.error('❌ Error al verificar SIWE:', err.message)
    res.status(400).json({ error: 'Error al verificar SIWE' })
  }
})

export default router