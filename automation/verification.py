import web3.eth
from web3 import Web3
from abis.frabric import frabric_abi
from eth_account.messages import encode_structured_data
from web3.middleware import geth_poa_middleware

w3.middleware_onion.inject(geth_poa_middleware, layer=0)

verification_account = w3.eth.account.from_key("PUT_PRIVATE_KEY_HERE")
weavr_contract_address = w3.toChecksumAddress("PUT_WEAVR_CONTRACT_HERE")
participant_address = w3.toChecksumAddress("PUT_VOUCH_RECIPIENT_ADDRESS_HERE")
weavr = w3.eth.contract(address=weavr_contract_address, abi=frabric_abi)
weavr.handleRevert = True

sign_verification = {"domain": {
    "name": "Frabric Protocol",
    "version": "1",
    "chainId": 4,
    "verifyingContract": weavr.address
},
    "primaryType": 'Vouch',
    "types": {
        'EIP712Domain': [
            {'name': 'name', 'type': 'string'},
            {'name': 'version', 'type': 'string'},
            {'name': 'chainId', 'type': 'uint256'},
            {'name': 'verifyingContract', 'type': 'address'}
        ],
        "Vouch": [
            {"type": "address", "name": "participant"},
        ]
    }
}


data = {
    "participant": str(participant_address)
}

def sign(signer_account, data):
    payload = sign_verification.copy()
    payload['message'] = data
    payload = encode_structured_data(primitive=payload)
    return Web3.eth.account.sign_message(payload, signer_account.privateKey)


l = sign(signer_account, data)
print(l)

# def submit_verification(participant_address, weavr_contract, verification_signer_account):
#     verification_hash = Web3.keccak(w3.toBytes(text=participant_address))
#     signed_message = sign(verification_signer_account, {
#         "participantType": 0,
#         "participant": str(participant_address),
#         "kyc": verification_hash,
#         "nonce": 0
#     })
#     signed_message_bytes = Web3.toBytes(hexstr=signed_message.signature)
#     built_tx = weavr_contract.functions.approve(0,
#                                                 participant_address,
#                                                 verification_hash,
#                                                 signed_message_bytes).buildTransaction({
#         "gas": 70000,
#         "nonce": w3.eth.getTransactionCount(verification_signer_account.address)
#     })
#     signed_tx = verification_signer_account.signTransaction(built_tx)
#     tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
#     receipt = w3.eth.waitForTransactionReceipt(tx_hash)
#     return receipt
#
#
# # l = weavr.functions.governor("0x4C3D84E96EB3c7dEB30e136f5150f0D4b58C7bdB").call()
# # print(l)
# reciept = submit_verification(participant_address, weavr, verification_account)
# print(reciept)
