from web3 import Web3
from abis.frabric import frabric_abi
from eth_account.messages import encode_structured_data

w3 = Web3(Web3.WebsocketProvider('wss://tame-thrumming-gadget.rinkeby.discover.quiknode.pro/0b207dfc3ba8294728a6acc68488a6aab6bed5fd/'))

weavr = w3.eth.contract(address=address, abi=frabric_abi)
weavr.handleRevert = True


sign_global = [
  {
    "name": "Frabric Protocol",
    "version": "1",
    "chainId": 31337,
    "verifyingContract": weavr.address
  },
  {
    "Vouch": [
      { "type": "address", "name": "participant" }
    ],
    "KYCVerification": [
      { "type": "uint8",   "name": "participantType" },
      { "type": "address", "name": "participant" },
      { "type": "bytes32", "name": "kyc" },
      { "type": "uint256", "name": "nonce" }
    ]
  }
]

def sign(signer_account, data):
    payload = sign_global.copy().append(data)
    payload = encode_structured_data(primitive=payload)
    return w3.eth.sign(signer_account.address, payload)

def submit_verification(participant_address, weavr_contract, verification_signer_account):
    verification_hash = w3.keccak(w3.toBytes(text=participant_address))
    signature = sign(verification_signer_account, {
        "participantType": 0,
        "participant": participant_address,
        "kyc": verification_hash,
        "nonce": 0
    })
    return weavr_contract.functions.approve(0, participant_address, verification_hash, signature).call()

print(submit_verification("0x49C899a1fA59A7edf23c249d491805c9077bf62B", weavr, verifier_account))