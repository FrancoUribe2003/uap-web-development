import { Router } from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';

const router = Router();

// Middleware para verificar JWT
const verifyToken = (req: any, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

router.post('/', verifyToken, async (req: any, res: Response) => {
  try {
    const { address } = req.body;
    const userAddress = req.user.address;

    if (address.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Dirección no autorizada' });
    }

    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      return res.status(500).json({ error: 'Configuración del servidor incorrecta' });
    }

    const wallet = new ethers.Wallet(privateKey, provider);

    const contractABI = [
      "function claimTokens() nonpayable",
      "function hasAddressClaimed(address user) view returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
      "function getFaucetAmount() view returns (uint256)",
      "function getFaucetUsers() view returns (address[])"
    ];
    
    const contractAddress = process.env.CONTRACT_ADDRESS as string;
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);


    const hasClaimed = await contract.hasAddressClaimed(address);
    if (hasClaimed) {
      return res.status(400).json({ error: 'Ya reclamaste tus tokens' });
    }


    const tx = await contract.claimTokens();
    
    await tx.wait();

    res.json({ 
      success: true, 
      txHash: tx.hash,
      message: 'Tokens reclamados exitosamente'
    });

  } catch (err: any) {
    console.error('❌ Error al reclamar tokens:', err.message);
    res.status(500).json({ error: 'Error al reclamar tokens' });
  }
});

export default router;