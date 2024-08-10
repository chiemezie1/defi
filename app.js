import { ethers } from "ethers";
const BigNumber = ethers.BigNumber;
import PoolAddressesProviderABI from "./abis/PoolAddressesProvider.json" assert { type: "json" };
import LINK_TOKEN_ABI from "./abis/link_token.json" assert { type: "json" };
import AAVE_POOL_ABI from "./abis/aave_pool.json" assert { type: "json" };
import dotenv from "dotenv";
dotenv.config();

// Constants
const POOL_ADDRESSES_PROVIDER_ADDRESS = "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A";
const LINK_TOKEN_ADDRESS = "0x779877A7B0D9E8603169DdbD7836e478b4624789";

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Amount to deposit and withdraw
const amount = ethers.parseUnits("0.1", 18);

async function checkLinkBalance() {
    const tokenContract = new ethers.Contract(LINK_TOKEN_ADDRESS, LINK_TOKEN_ABI, wallet);
    const balance = await tokenContract.balanceOf(wallet.address);
    console.log(`LINK Balance: ${ethers.formatUnits(balance, 18)} LINK`);
}

async function checkApproval(poolAddress) {
    const tokenContract = new ethers.Contract(LINK_TOKEN_ADDRESS, LINK_TOKEN_ABI, wallet);
    const allowance = await tokenContract.allowance(wallet.address, poolAddress);
    console.log(`Current Allowance: ${ethers.formatUnits(allowance, 18)} LINK`);
}

// Function to get the Pool contract address
async function getPoolAddress() {
    try {
        const poolAddressesProvider = new ethers.Contract(
            POOL_ADDRESSES_PROVIDER_ADDRESS,
            PoolAddressesProviderABI,
            provider
        );

        // Fetch the Pool contract address
        const poolAddress = await poolAddressesProvider.getPool();
        console.log(`Current Pool Address: ${poolAddress}`);

        return poolAddress;
    } catch (error) {
        console.error("An error occurred while fetching the Pool address:", error);
        throw new Error("Failed to fetch the Pool address");
    }
}

// Function to approve the Pool contract to spend LINK tokens
async function approveLinkToken(tokenAddress, tokenABI, amount, wallet, spenderAddress) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);

        // Directly call the approve method on the contract
        const approveTransaction = await tokenContract.approve(spenderAddress, amount);

        console.log(`Sending Approval Transaction...`);
        const receipt = await approveTransaction.wait();
        console.log(`Approval Transaction Confirmed! https://sepolia.etherscan.io/tx/${receipt.hash}`);
    } catch (error) {
        console.error("An error occurred during token approval:", error);
        throw new Error("Token approval failed");
    }
}

// Function to deposit LINK tokens into Aave
async function depositToAave(poolAddress) {
    const aavePoolContract = new ethers.Contract(poolAddress, AAVE_POOL_ABI, wallet);
    
    console.log(`Depositing ${amount.toString()} LINK into Aave...`);
    try {
        const depositTx = await aavePoolContract.supply(
            LINK_TOKEN_ADDRESS,
            amount,
            wallet.address,
            0, // referral code
            { gasLimit: 300000 }
        );
        const receipt = await depositTx.wait();
        console.log(`Aave Deposit Confirmed: https://sepolia.etherscan.io/tx/${receipt.hash}`);
    } catch (error) {
        console.error("An error occurred during deposit to Aave:", error);
        throw new Error("Aave deposit failed");
    }
}

// Main function
async function main() {
    try {
        // Step 1: Get the Pool contract address from the PoolAddressesProvider
        const poolAddress = await getPoolAddress();

        // Check balance and approval before proceeding
        await checkLinkBalance();
        await checkApproval(poolAddress);

        // Step 2: Approve LINK for the Pool contract
        await approveLinkToken(LINK_TOKEN_ADDRESS, LINK_TOKEN_ABI, amount, wallet, poolAddress);

        // Step 3: Deposit LINK into Aave
        await depositToAave(poolAddress);

        // Step 4: Withdraw LINK from Aave
    } catch (error) {
        console.error("An error occurred:", error.message);
    }
}

// Execute the main function
main();
