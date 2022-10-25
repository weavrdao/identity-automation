const { ethers } = require("ethers");


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

function getSignature(signer, participant, ptype, kycHash, nonce, signatureData) {
    let data = {
        participant: participant,
        participantType: participantType,
        kyc: kycSignature,
        nonce: nonce
    }
    return sign(signer, data, signatureData);
}

if (require.main === module) {
    (async () => {

        const body = process.argv.slice(2)[0];
        const WEAVR_ADDRESS = process.env.WEAVR_ADDRESS;
        const PROVIDER = process.env.PROVIDER;
        const PRIVATE_KEY = process.env.PRIVATE_KEY;


        const provider = ethers.providers.getDefaultProvider(PROVIDER);
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);

        const response = JSON.parse(body);
        const PARTICIPANT_ID = response['applicantId'];
        const PARTICIPANT = "0x" + response['externalUserId'];
        const status = response['reviewResult']['reviewAnswer'];

        if(status === "RED"){
            console.log("Not verified");
            return;
        }



        const participantId = ethers.identity(PARTICIPANT_ID);

        const WEAVR_CONTRACT = await ethers.getContractFactory("weavr.json");
        const weavr = await Weavr.attach(WEAVR_CONTRACT);
        let signatureData = [
            {
                name: "Weavr Protocol",
                version: "1",
                chainId: 42161,
                verifyingContract: WEAVR_ADDRESS
            },
            {
                Vouch: [
                    { type: "address", name: "participant" }
                ],
                KYCVerification: [
                    { type: "uint8",   name: "participantType" },
                    { type: "address", name: "participant" },
                    { type: "bytes32", name: "kyc" },
                    { type: "uint256", name: "nonce" }
                ]
            }
        ];
        const ptype = 6;
        const signature = await getSignature(signer, PARTICIPANT, ptype, participantId, 0, signatureData);
        const tx = await weavr.approve(ptype, PARTICIPANT, participantId, signature).wait();
        console.log("Transaction receipt");
        console.log(tx);
    })().catch(error => {
        console.error(error);
        process.exit(1);
    });
}