import { Router } from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';

const router = Router();

// Middleware para verificar JWT
const verifyToken = (req: any, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

router.get('/:address', verifyToken, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    
    const contractABI = [
      "function balanceOf(address account) view returns (uint256)",
      "function hasAddressClaimed(address user) view returns (bool)",
      "function getFaucetAmount() view returns (uint256)",
      "function getFaucetUsers() view returns (address[])"
    ];
    
    const contractAddress = process.env.CONTRACT_ADDRESS as string;
    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    const balance = await contract.balanceOf(address);
    const hasClaimed = await contract.hasAddressClaimed(address);
    const faucetAmount = await contract.getFaucetAmount();
    const usersList = await contract.getFaucetUsers();

    res.json({
      balance: ethers.formatEther(balance),
      hasClaimed,
      faucetAmount: ethers.formatEther(faucetAmount),
      users: usersList
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Error al consultar estado del faucet' });
  }
});

export default router;