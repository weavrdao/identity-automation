import web3.eth
import sys
import json
import os
from web3 import Web3
from abis.frabric import frabric_abi
from eth_account.messages import encode_structured_data
from web3.middleware import geth_poa_middleware




w3 = Web3(Web3.WebsocketProvider(node_url))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)

VERIFICATION_ACCOUNT = w3.eth.account.from_key("PRIVATE_KEY")
weavr_contract_address = w3.toChecksumAddress("weavr_address")
WEAVR = w3.eth.contract(address=weavr_contract_address, abi=frabric_abi)
WEAVR.handleRevert = True

SIGN_VERIFICATION = {"domain": {
    "name": "Weavr Protocol",
    "version": "1",
    "chainId": 42161,
    "verifyingContract": WEAVR.address
},
    "primaryType": 'KYCVerification',
    "types": {
        'EIP712Domain': [
            {'name': 'name', 'type': 'string'},
            {'name': 'version', 'type': 'string'},
            {'name': 'chainId', 'type': 'uint256'},
            {'name': 'verifyingContract', 'type': 'address'}
        ],
        "KYCVerification": [
            {"type": "uint8", "name": "participantType"},
            {"type": "address", "name": "participant"},
            {"type": "bytes32", "name": "kyc"},
            {"type": "uint256", "name": "nonce"}
        ]
    }
}

def sign_it(signer_account, data):
    payload = SIGN_VERIFICATION.copy()
    payload['message'] = data
    payload = encode_structured_data(primitive=payload)
    return w3.eth.account.sign_message(payload, signer_account.privateKey)

def submit_verification(participant_address, weavr_contract, idenHash, participantType, signature):
    print(f"participantType: {participantType}\naddress: {participant_address}\nidentityHash: {idenHash}\nsignature: {signature}")
    built_tx = weavr_contract.functions.approve(participantType, participant_address, idenHash, signature).call()
    return built_tx


def verify(signer_account, participant_address, weavr_contract, pType, idenId, nonce=0):
    iden = w3.keccak(text=idenId)
    signed_message = sign_it(signer_account, {
        "participant": participant_address,
        "participantType": pType,
        "kyc": iden,
        "nonce": nonce
    })
    idenHash = w3.toHex(iden)
    signed_message_hash = w3.toHex(signed_message.signature)
    reciept = submit_verification(participant_address, weavr_contract, idenHash, pType, signed_message_hash)
    return reciept


def helper(participant, identityID):
    verification_account = VERIFICATION_ACCOUNT
    weavr = WEAVR
    ptype = 7
    nonce = 0
    tx = verify(verification_account, participant, weavr, ptype, identityID, nonce)
    return tx

def extract(data):
    iden_id = data['applicantId']
    eth_address = data['externalUserId']
    reviewAnswer = data['reviewResult']['reviewAnswer']
    return iden_id, eth_address, reviewAnswer


if __name__ == "__main__":
    payload = json.loads(sys.argv[1])
    iden_id, eth_address, review_answer = extract(payload)
    if review_answer == "RED":
        print("task complete, candidate skipped")
    else:
        address = w3.toChecksumAddress(participant_address)
        helper(eth_address, iden_id)