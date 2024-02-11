import { createPublicClient, http } from 'viem'
import { polygonMumbai } from 'viem/chains'

export const client = createPublicClient({
    chain: polygonMumbai,
    transport: http(),
}) 