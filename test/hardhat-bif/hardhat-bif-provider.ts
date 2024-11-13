import { expect } from 'chai';  
import { HardhatBifProvider } from '../../src/hardhat-bif/internal/hardhat-bif-provider';
import { LocalBifAccountsProvider } from '../../src/hardhat-bif/internal/provider';
import { JsonRpcRequest, JsonRpcResponse } from "hardhat/types";
import { TransactionRequest } from "../../src/hardhat-bif/external/abstract-provider"

class MockEthereumProvider extends LocalBifAccountsProvider {  
    constructor(
        url: string,
        localBifAccountsPrivateKeys: string[]
      ) {
        super(url, localBifAccountsPrivateKeys);
    }

    public send(method: string, params?: any[]): Promise<any> {
        return super.request({ method, params });
    }

    public sendAsync(
        payload: JsonRpcRequest,
        callback: (error: any, response: JsonRpcResponse) => void
    ): void {
        return;
    }
}
  
describe('HardhatBifProvider', () => {  
    let provider: HardhatBifProvider;
    let mockHardhatProvider: MockEthereumProvider;
  
    beforeEach(() => {  
        mockHardhatProvider = new MockEthereumProvider(
            //星火链
            'http://test.bifcore.bitfactory.cn', 
            ['priSPKoJ8vUfXk92axGtokCDiw8cM7KHznL6iugvNxeANctrdL', 'priSPKpHrcXsX7AY3wSSVZXCfMeX8MvrPEBXeV5hUctomrHiWC']
        );  
        provider = new HardhatBifProvider(mockHardhatProvider);  
    });  
  
    it('getBlockNumber should return the correct block number', async () => {  
        const blockNumber = await provider.getBlockNumber();  
        expect(blockNumber).to.be.greaterThan(0);
    });

    it('getChainId should return -1', async () => {  
        const chainId = await provider.getChainId();
        expect(chainId).to.equal(-1);
    });

    it('getBalance should return -1', async () => {  
        const balance = await provider.getBalance("did:bid:ef9jgpHmnF2Qv5miQUwgU9XeUCkYkVrj");
        expect(balance.toNumber()).to.equal(-1);
    });

    it('getBalance should > 0', async () => {  
        const balance = await provider.getBalance("did:bid:efwd3f7hSFk8TBppS2sXwMLdJXCNxRHV");
        expect(balance.toNumber()).to.be.greaterThan(0);
    });

    it('getTransactionCount should > 0', async () => {  
        const count = await provider.getTransactionCount("did:bid:efwd3f7hSFk8TBppS2sXwMLdJXCNxRHV");
        expect(count).to.be.greaterThan(0);
    });

    it('getCode should empty', async () => {  
        const code = await provider.getCode("did:bid:efwd3f7hSFk8TBppS2sXwMLdJXCNxRHV");
        expect(code === '');
    });

    it('getCode should not empty', async () => {  
        const code = await provider.getCode("did:bid:ef2ZdaHDrFqcxJCmwjyD8ygsVttanPED");
        expect(code === 'this is pre-system contract');
    });

    it('getBlock', async () => {  
        const code = await provider.getBlock('4205417');
        console.log('getBlock() : ', JSON.stringify(code));
    });

    it('getBlock', async () => {  
        const code = await provider.getBlock('latest');
        console.log('getBlock() : ', JSON.stringify(code));
    });

    it('getTransaction create contract', async () => {  
        const code = await provider.getTransaction('e0b1f5f969e29343626a3399ad29f5ae32349e9dccb08710f500009565193de4');
        //console.log('getTransaction(hash) : ', JSON.stringify(code));
    });
  
    it('getTransaction pay coin', async () => {  
        const code = await provider.getTransaction('3f320819309dc3afa44bc15373916229d43dae939a1e4e31b2ab5946a1a4fae8');
        //console.log('getTransaction(hash) : ', JSON.stringify(code));
    });

    it('getTransaction log', async () => {  
        const code = await provider.getTransaction('1eb3833080970d57fa8a25935b220ab2ac466c7b974aa59c81f2b207803d5185');
        //console.log('getTransaction(hash) : ', JSON.stringify(code));
    });

    it('getTransactionReceipt create contract', async () => {  
        const code = await provider.getTransactionReceipt('e0b1f5f969e29343626a3399ad29f5ae32349e9dccb08710f500009565193de4');
        //console.log('getTransactionReceipt(hash) : ', JSON.stringify(code));
    });

    it('getTransactionReceipt paycoin', async () => {  
        const code = await provider.getTransactionReceipt('7d150aed022cd8943bff6330523aee7408d8e0df892dc0bf6d739cdebff84279');
        //console.log('getTransactionReceipt(hash) : ', JSON.stringify(code));
    });

    it('getBlockWithTransactions', async () => {  
        const code = await provider.getBlockWithTransactions('4205417');
        //console.log('getBlockWithTransactions() : ', JSON.stringify(code));
    });

    it('sendTransaction create contract', async () => {
        const code = await provider.sendTransaction('{"signature":[{"sign_data":"8d7d1074de6d6b75ffbc6315eb33318be0b0c8104ca0d66765a64600409798fc99c683410ac7bf89acd4be5a49797cfc3870c20823086b2299efa58dba75b106","public_key":"b06566b3ea901cbf048e5dfc38af170171db993d593f4f931b1b2d772c02f7282da47a"}],"blob":"0a286469643a6269643a656635364a71437469464e4255377a3859384e64343751734e50564e62547533100122bd06080122b80612af06080112aa063078363038303630343035323334383031353631303031303537363030303830666435623530363130313734383036313030323036303030333936303030663366653630383036303430353233343830313536313030313035373630303038306664356235303630303433363130363130303336353736303030333536306530316338303633326536346365633131343631303033623537383036333630353733363164313436313030353935373562363030303830666435623631303034333631303037353536356236303430353136313030353039313930363130306131353635623630343035313830393130333930663335623631303037333630303438303336303338313031393036313030366539313930363130306564353635623631303037653536356230303562363030303830353439303530393035363562383036303030383139303535353035303536356236303030383139303530393139303530353635623631303039623831363130303838353635623832353235303530353635623630303036303230383230313930353036313030623636303030383330313834363130303932353635623932393135303530353635623630303038306664356236313030636138313631303038383536356238313134363130306435353736303030383066643562353035363562363030303831333539303530363130306537383136313030633135363562393239313530353035363562363030303630323038323834303331323135363130313033353736313031303236313030626335363562356236303030363130313131383438323835303136313030643835363562393135303530393239313530353035366665613236343639373036363733353832323132323036306632666365363539393963383738666139373737323861656131313137376436623030323238396561386534343337633462613731303835396465303335363437333666366336333738323633303265333832653332333132643633363932653332333033323334326533333265333432623633366636643664363937343265333133333334333436353332333336333265366436663634303035371a041a0208013080ade2043801"}');
        console.log('sendTransaction(create contract) : ', JSON.stringify(code));
    });

    it('sendTransaction paycoin', async () => {
        const code = await provider.sendTransaction('{"signature":[{"sign_data":"bfaedc3b95f5fb82705381430bcf81651d714fef306d8f07a71f175bcbe5716eb616acfff229762e28cf3d73b97776444e577800e60c4618e8c0311e2bbf1401","public_key":"b06566b3ea901cbf048e5dfc38af170171db993d593f4f931b1b2d772c02f7282da47a"}],"blob":"0a286469643a6269643a656635364a71437469464e4255377a3859384e64343751734e50564e625475331003227a080752760a286469643a6269643a6566636e664c4c417436353432643174617665667850666f65477768525447701a4a30783630353733363164303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030323080ade2043801"}');
        //console.log('sendTransaction(paycoin) : ', JSON.stringify(code));
    });

    it('call', async () => {
        let request : TransactionRequest = {};
        request.from = 'did:bid:ef56JqCtiFNBU7z8Y8Nd47QsNPVNbTu3';
        request.to = 'did:bid:efcnfLLAt6542d1tavefxPfoeGwhRTGp';
        request.data = '0x2e64cec1';

        const code = await provider.call(request);
        //console.log('call(transaction) : ', JSON.stringify(code));
    });
});