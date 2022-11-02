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

function getSignature(signer, participant, ptype, kycHash, signatureData) {
    let data = {
        participantType: ptype,
        participant: participant,
        kyc: kycHash,
        nonce: 0
    }
    return sign(signer, data, signatureData);
}

if (require.main === module) {
    (async () => {

        const body = process.env.BODY;
        const PROD_WEAVR_ADDRESS = process.env.PROD_WEAVR_ADDRESS;
        const DEV_WEAVR_ADDRESS = process.env.DEV_WEAVR_ADDRESS;
        const PROD_PROVIDER = process.env.PROD_PROVIDER;
        const DEV_PROVIDER = process.env.DEV_PROVIDER;
        const PROD_PRIVATE_KEY = process.env.PROD_PRIVATE_KEY;
        const DEV_PRIVATE_KEY = process.env.DEV_PRIVATE_KEY;
        const response = JSON.parse(body);
        console.log(response);
        const PARTICIPANT_ID = response['applicantId'];
        const PARTICIPANT = "0x" + response['externalUserId'];
        const status = response['reviewResult']['reviewAnswer'];
        const sandbox = response['sandboxMode'];
        let signer, weavr_address, chain_id;
        // if(sandbox === true) {
        //     const provider = new ethers.providers.getDefaultProvider(DEV_PROVIDER);
        //     signer = new ethers.Wallet(DEV_PRIVATE_KEY, provider);
        //     weavr_address = DEV_WEAVR_ADDRESS;
        //     chain_id= 42161;
        // } else {
            const provider = new ethers.providers.getDefaultProvider(PROD_PROVIDER);
            signer = new ethers.Wallet(PROD_PRIVATE_KEY, provider);
            weavr_address = PROD_WEAVR_ADDRESS;
            chain_id= 42161;
        // }


        const abi = JSON.parse(fs.readFileSync('weavr.json', 'utf8'));
        const weavr = new ethers.Contract(weavr_address, abi, signer);

        if(status === "GREEN"){


            const kycHash = ethers.utils.id(PARTICIPANT_ID);


            let signatureData = [
                {
                    name: "Weavr Protocol",
                    version: "1",
                    chainId: chain_id,
                    verifyingContract: weavr_address
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
            const ptype = 6;
            const signature = getSignature(signer, PARTICIPANT, ptype, kycHash, signatureData);
            const tx = await (await weavr.approve(ptype, PARTICIPANT, kycHash, signature, {gasLimit: 10000000})).wait();
            console.log("Transaction receipt");
            console.log(tx);
        } else {
            throw new Error("Not verified, reverting...");
        }
    })().catch(error => {
        console.log(error);
        process.exit(1);
    });
}