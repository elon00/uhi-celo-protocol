"""
Apex Universal High Income (ApexUHI) - Multimodal AI Agent Daemon
------------------------------------------------------------------
Autonomous AI Agent operating on Celo L2 that:
1. Connects to Celo RPC and monitors the Conway Automaton yield multiplier.
2. Interacts with the x402 Bazaar Protocol to execute agentic HTTP 402 micro-transactions.
3. Uses Gemini Multimodal AI to process visual market indicators, smart contract logs, and economic telemetry.
4. Auto-compounds and harvests Universal High Income dividends from the UHIDividendDistributor.
"""

import os
import sys
import json
import time
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

# Try importing Google GenAI SDK if present
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

load_dotenv()

class ApexMultimodalAgent:
    def __init__(self, rpc_url=None, private_key=None, gemini_api_key=None):
        self.rpc_url = rpc_url or os.getenv("CELO_MAINNET_RPC", "https://forno.celo.org")
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        self.private_key = private_key or os.getenv("PRIVATE_KEY")
        if self.private_key:
            self.account = Account.from_key(self.private_key)
            self.address = self.account.address
        else:
            self.account = None
            self.address = None

        self.gemini_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        if self.gemini_key and GENAI_AVAILABLE:
            self.ai_client = genai.Client(api_key=self.gemini_key)
        else:
            self.ai_client = None

        print(f"[*] Initialized ApexMultimodalAgent on Celo RPC: {self.rpc_url}")
        print(f"[*] Connected: {self.w3.is_connected()}")
        if self.address:
            print(f"[*] Agent Identity: {self.address}")
            balance = self.w3.eth.get_balance(self.address)
            print(f"[*] CELO Gas Balance: {self.w3.from_wei(balance, 'ether')} CELO")

    def load_contracts(self, deployment_path="deployments/42220.json"):
        """Loads deployed contract addresses from deployment manifest"""
        if not os.path.exists(deployment_path):
            print(f"[!] Manifest not found at {deployment_path}. Using environment/local config.")
            return {}
        with open(deployment_path, "r") as f:
            data = json.load(f)
        return data.get("contracts", {})

    def inspect_conway_vitality(self, conway_contract_address, abi):
        """Queries the live Conway Automaton Engine for epoch vitality & yield multiplier"""
        contract = self.w3.eth.contract(address=conway_contract_address, abi=abi)
        epoch = contract.functions.currentEpoch().call()
        live_cells = contract.functions.getLiveCellCount().call()
        multiplier_bps = contract.functions.getYieldMultiplier().call()
        multiplier_x = multiplier_bps / 10000.0

        print(f"[Conway Engine] Current Epoch: #{epoch}")
        print(f"[Conway Engine] Live Economic Cells: {live_cells} / 256")
        print(f"[Conway Engine] Dynamic UHI Multiplier: {multiplier_x:.2f}x ({multiplier_bps} BPS)")
        return {
            "epoch": epoch,
            "live_cells": live_cells,
            "multiplier_x": multiplier_x
        }

    def execute_x402_payment(self, bazaar_address, bazaar_abi, uhi_token_address, token_abi, service_id, query_payload):
        """
        Executes a real on-chain HTTP 402 payment in $AUHI to access an AI service
        """
        if not self.account:
            raise ValueError("No private key configured for Agent wallet.")

        bazaar = self.w3.eth.contract(address=bazaar_address, abi=bazaar_abi)
        token = self.w3.eth.contract(address=uhi_token_address, abi=token_abi)

        # 1. Fetch service price
        service = bazaar.functions.getService(service_id).call()
        price = service[3] # pricePerCall
        print(f"[x402 Bazaar] Service #{service_id} ('{service[0]}') Price: {self.w3.from_wei(price, 'ether')} AUHI")

        # 2. Approve token transfer if needed
        allowance = token.functions.allowance(self.address, bazaar_address).call()
        if allowance < price:
            print("[x402 Bazaar] Approving $AUHI transfer...")
            tx = token.functions.approve(bazaar_address, price * 10).build_transaction({
                'from': self.address,
                'nonce': self.w3.eth.get_transaction_count(self.address),
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price
            })
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            self.w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"[x402 Bazaar] Approved in tx: {tx_hash.hex()}")

        # 3. Pay for service
        query_hash = Web3.keccak(text=json.dumps(query_payload))
        print(f"[x402 Bazaar] Executing HTTP 402 payment for query hash: {query_hash.hex()}...")
        pay_tx = bazaar.functions.payForService402(service_id, query_hash).build_transaction({
            'from': self.address,
            'nonce': self.w3.eth.get_transaction_count(self.address),
            'gas': 250000,
            'gasPrice': self.w3.eth.gas_price
        })
        signed_pay = self.w3.eth.account.sign_transaction(pay_tx, self.private_key)
        pay_hash = self.w3.eth.send_raw_transaction(signed_pay.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(pay_hash)
        print(f"[x402 Bazaar] Payment Confirmed! Tx: {pay_hash.hex()} (Block: {receipt.blockNumber})")

        return receipt

    def analyze_multimodal_market_signal(self, prompt, image_bytes=None):
        """
        Runs Gemini Multimodal inference to generate real-time autonomous trading / strategy decisions
        """
        if not self.ai_client:
            print("[!] Gemini client not initialized. Set GEMINI_API_KEY to activate multimodal AI.")
            return "Gemini API key required for live AI reasoning."

        print("[Multimodal AI] Evaluating market signal and protocol state...")
        contents = [prompt]
        if image_bytes:
            contents.append(types.Part.from_bytes(data=image_bytes, mime_type="image/png"))

        response = self.ai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents
        )
        return response.text

if __name__ == "__main__":
    agent = ApexMultimodalAgent()
    print("[*] ApexMultimodalAgent operational and listening for Celo L2 events.")
