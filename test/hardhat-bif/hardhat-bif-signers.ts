import { expect } from 'chai';  
import { HardhatBifProvider } from '../../src/hardhat-bif/internal/hardhat-bif-provider';
import { HardhatBifSigner } from '../../src/hardhat-bif/internal/hardhat-bif-signers'
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

describe('HardhatBifSigner', () => {  
    let provider: HardhatBifProvider;
    let signer : HardhatBifSigner;
    let mockHardhatProvider: MockEthereumProvider;
    
    beforeEach(() => {  
      mockHardhatProvider = new MockEthereumProvider(
          //星火链 体验网地址
          'http://test.bifcore.bitfactory.cn', 
          ['priSPKnVwNrzJ7KiWxddfUtap7f52B8pnLtoCu6wEW3MmpuKQd', 'priSPKoJ8vUfXk92axGtokCDiw8cM7KHznL6iugvNxeANctrdL', 'priSPKpHrcXsX7AY3wSSVZXCfMeX8MvrPEBXeV5hUctomrHiWC']
      );  
      provider = new HardhatBifProvider(mockHardhatProvider);
    });  
    
    it('getaddress equal did:bid:ef9jgpHmnF2Qv5miQUwgU9XeUCkYkVrj', async () => {
        const { HardhatBifSigner: SignerWithAddressImpl } = await import(
            "../../src/hardhat-bif/internal/hardhat-bif-signers"
        );
        
        const signerWithAddress = await SignerWithAddressImpl.create(provider, 'did:bid:ef9jgpHmnF2Qv5miQUwgU9XeUCkYkVrj');
        const address = await signerWithAddress.getAddress();
        expect(address).to.equal('did:bid:ef9jgpHmnF2Qv5miQUwgU9XeUCkYkVrj');
    });

    it('getPrivateKey equal priSPKoJ8vUfXk92axGtokCDiw8cM7KHznL6iugvNxeANctrdL', async () => {
        const { HardhatBifSigner: SignerWithAddressImpl } = await import(
            "../../src/hardhat-bif/internal/hardhat-bif-signers"
        );
        
        const signerWithAddress = await SignerWithAddressImpl.create(provider, 'did:bid:ef9jgpHmnF2Qv5miQUwgU9XeUCkYkVrj');
        const pri = await signerWithAddress.getPrivateKey();
        expect(pri).to.equal('priSPKoJ8vUfXk92axGtokCDiw8cM7KHznL6iugvNxeANctrdL');
    }); 
    
    it('signTransaction createContract equal', async () => {
        const { HardhatBifSigner: SignerWithAddressImpl } = await import(
            "../../src/hardhat-bif/internal/hardhat-bif-signers"
        );
        
        const signerWithAddress = await SignerWithAddressImpl.create(provider, 'did:bid:ef56JqCtiFNBU7z8Y8Nd47QsNPVNbTu3');

        let request : TransactionRequest = {};
        request.from = 'did:bid:ef56JqCtiFNBU7z8Y8Nd47QsNPVNbTu3';
        request.to = '';
        request.gasLimit = 10000000;
        request.gasPrice = 1;
        request.nonce = 1;
        request.data = '0x608060405234801561001057600080fd5b50610174806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b610073600480360381019061006e91906100ed565b61007e565b005b60008054905090565b8060008190555050565b6000819050919050565b61009b81610088565b82525050565b60006020820190506100b66000830184610092565b92915050565b600080fd5b6100ca81610088565b81146100d557600080fd5b50565b6000813590506100e7816100c1565b92915050565b600060208284031215610103576101026100bc565b5b6000610111848285016100d8565b9150509291505056fea264697066735822122060f2fce65999c878fa977728aea11177d6b002289ea8e4437c4ba710859de03564736f6c637826302e382e32312d63692e323032342e332e342b636f6d6d69742e31333434653233632e6d6f640057';
        request.type = 1;
        const str = await signerWithAddress.signTransaction(request);
        expect(str).to.equal('{"signature":[{"sign_data":"8d7d1074de6d6b75ffbc6315eb33318be0b0c8104ca0d66765a64600409798fc99c683410ac7bf89acd4be5a49797cfc3870c20823086b2299efa58dba75b106","public_key":"b06566b3ea901cbf048e5dfc38af170171db993d593f4f931b1b2d772c02f7282da47a"}],"blob":"0a286469643a6269643a656635364a71437469464e4255377a3859384e64343751734e50564e62547533100122bd06080122b80612af06080112aa063078363038303630343035323334383031353631303031303537363030303830666435623530363130313734383036313030323036303030333936303030663366653630383036303430353233343830313536313030313035373630303038306664356235303630303433363130363130303336353736303030333536306530316338303633326536346365633131343631303033623537383036333630353733363164313436313030353935373562363030303830666435623631303034333631303037353536356236303430353136313030353039313930363130306131353635623630343035313830393130333930663335623631303037333630303438303336303338313031393036313030366539313930363130306564353635623631303037653536356230303562363030303830353439303530393035363562383036303030383139303535353035303536356236303030383139303530393139303530353635623631303039623831363130303838353635623832353235303530353635623630303036303230383230313930353036313030623636303030383330313834363130303932353635623932393135303530353635623630303038306664356236313030636138313631303038383536356238313134363130306435353736303030383066643562353035363562363030303831333539303530363130306537383136313030633135363562393239313530353035363562363030303630323038323834303331323135363130313033353736313031303236313030626335363562356236303030363130313131383438323835303136313030643835363562393135303530393239313530353035366665613236343639373036363733353832323132323036306632666365363539393963383738666139373737323861656131313137376436623030323238396561386534343337633462613731303835396465303335363437333666366336333738323633303265333832653332333132643633363932653332333033323334326533333265333432623633366636643664363937343265333133333334333436353332333336333265366436663634303035371a041a0208013080ade2043801"}');
    }); 

    it('signTransaction payCoin equal', async () => {
        const { HardhatBifSigner: SignerWithAddressImpl } = await import(
            "../../src/hardhat-bif/internal/hardhat-bif-signers"
        );
        
        const signerWithAddress = await SignerWithAddressImpl.create(provider, 'did:bid:ef56JqCtiFNBU7z8Y8Nd47QsNPVNbTu3');

        let request : TransactionRequest = {};
        request.from = 'did:bid:ef56JqCtiFNBU7z8Y8Nd47QsNPVNbTu3';
        request.to = 'did:bid:efcnfLLAt6542d1tavefxPfoeGwhRTGp';
        request.gasLimit = 10000000;
        request.gasPrice = 1;
        request.nonce = 2;
        request.data = '0x6057361d0000000000000000000000000000000000000000000000000000000000000001';
        request.type = 7;
        const str = await signerWithAddress.signTransaction(request);
        expect(str).to.equal('{"signature":[{"sign_data":"230f511021d30ca84a156177005fe386726b731b28e9d8f0e4c1287030d4c92ca2408955ea75955c3ecdf74770903f9b1ea7fa8c582ae2eccc9730fc98c5470f","public_key":"b06566b3ea901cbf048e5dfc38af170171db993d593f4f931b1b2d772c02f7282da47a"}],"blob":"0a286469643a6269643a656635364a71437469464e4255377a3859384e64343751734e50564e625475331002227a080752760a286469643a6269643a6566636e664c4c417436353432643174617665667850666f65477768525447701a4a30783630353733363164303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030313080ade2043801"}');
    }); 

  });