const { ethers } = require("ethers");
const fs = require('fs');


function sign(signer, data, signatureData) {
    let signArgs = JSON.parse(JSON.stringify(signatureData));
    signArgs[1] = { KYCVerification: signArgs[1].KYCVerification };
    // Shim for the fact ethers.js will change this functions names in the future
    if (signer.signTypedData) {
        return signer.signTypedData(...signArgs, data);
    } else {
        return signer._signTypedData(...signArgs, data);
    }
}

const ParticipantType = {
    Null: 0,
        Removed: 1,
        Genesis: 2,
        KYC: 3,
        Governor: 4,
        Voucher: 5,
        Individual: 6,
        Corporation: 7
}


if(require.main === module) {
    (async () => {
        let proposalNumber = 44
        let participant = "0xeD0d74D516CfD4d8a4A669C3900bB724b61a5CE2"
        let ptype = ParticipantType.KYC
        let kycHash = ethers.utils.id("DECENTRALAWYER PROFESSIONAL CORPORATION");

        let weavr = process.env.WEAVR_ADDRESS
        let chainid = process.env.CHAIN_ID
        let privatekey = process.env.PRIVATE_KEY
        let providerNetwork = "arbitrum"
        let providerApiKey = process.env.INFURA_API_KEY

        let signatureData = [
            {
                name: "Weavr Protocol",
                version: "1",
                chainId: chainid,
                verifyingContract: weavr
            },
            {
                KYCVerification: [
                    {type: "uint8", name: "participantType"},
                    {type: "address", name: "participant"},
                    {type: "bytes32", name: "kyc"},
                    {type: "uint256", name: "nonce"}
                ]
            }
        ];
        const abi = JSON.parse(fs.readFileSync('weavr.json', 'utf8'));
        const provider = new ethers.providers.InfuraProvider(providerNetwork, providerApiKey);
        const signer = new ethers.Wallet(privatekey, provider);
        const weavr_contract = new ethers.Contract(weavr, abi, signer);

        const signature = await sign(
                signer,
                {
                    participantType: ptype,
                    participant: participant,
                    kyc: kycHash,
                    nonce: 0
                },
            signatureData
        )
        const proposalSuccessAsAddress = "0x" + "0".repeat(38) + proposalNumber.toString(16)
        return await weavr_contract.approve(
            ParticipantType.Null,
            proposalSuccessAsAddress,
            kycHash,
            signature,
            { gasLimit: 5000000}
        )
    })().catch(error => {
        console.log(error);
        process.exit(1);
    });
}