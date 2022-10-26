const { ethers } = require("ethers");
const fs = require('fs');

function sign(signer, data, signatureData) {
    let signArgs = JSON.parse(JSON.stringify(signatureData));
    if (Object.keys(data).length === 1) {
        signArgs[1] = { Vouch: signArgs[1].Vouch };
    } else {
        signArgs[1] = { KYCVerification: signArgs[1].KYCVerification };
    }

    // Shim for the fact ethers.js will change this functions names in the future
    if (signer.signTypedData) {
        return signer.signTypedData(...signArgs, data);
    } else {
        return signer._signTypedData(...signArgs, data);
    }
}

function getSignature(signer, participant, ptype, kycHash, signatureData) {
    let data = {
        participant: participant,
        participantType: ptype,
        kyc: kycHash,
        nonce: 0
    }
    return sign(signer, data, signatureData);
}

if (require.main === module) {
    (async () => {

        const body = process.env.BODY;
        const WEAVR_ADDRESS = process.env.WEAVR_ADDRESS;
        const PROVIDER = process.env.PROVIDER;
        const PRIVATE_KEY = process.env.PRIVATE_KEY;

        const provider = ethers.providers.getDefaultProvider(PROVIDER);
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        const response = JSON.parse(body);
        console.log(response);
        const PARTICIPANT_ID = response['applicantId'];
        const PARTICIPANT = "0x" + response['externalUserId'];
        const status = response['reviewResult']['reviewAnswer'];

        const abi = JSON.parse(fs.readFileSync('weavr.json', 'utf8'));
        const weavr = new ethers.Contract(WEAVR_ADDRESS, abi, signer);

        if(status === "GREEN"){


            const participantId = ethers.utils.id(PARTICIPANT_ID);


            let signatureData = [
                {
                    name: "Weavr Protocol",
                    version: "1",
                    chainId: 42161,
                    verifyingContract: WEAVR_ADDRESS
                },
                {
                    Vouch: [
                        {type: "address", name: "participant"}
                    ],
                    KYCVerification: [
                        {type: "uint8", name: "participantType"},
                        {type: "address", name: "participant"},
                        {type: "bytes32", name: "kyc"},
                        {type: "uint256", name: "nonce"}
                    ]
                }
            ];
            const ptype = 6;
            const signature = getSignature(signer, PARTICIPANT, ptype, participantId, signatureData);
            const tx = await (await weavr.approve(ptype, PARTICIPANT, participantId, signature)).wait();
            console.log("Transaction receipt");
            console.log(tx);
        } else {
            console.log("Not verified, reverting...");
        }
    })().catch(error => {
        console.error(error);
        process.exit(1);
    });
}