import { expect,assert } from "chai";
import { LocalBifAccountsProvider } from "../../src/hardhat-bif/internal/provider"

beforeEach(() => {  
    const {
        publicToAddress,
        getEncPublicKey,
        isPrivateKey,
      } = require("@caict/bif-encryption");
});  
  
describe('LocalBifAccountsProvider', () => {
  let localBifAccountsProvider : LocalBifAccountsProvider;  
  
  beforeEach(() => {  
    localBifAccountsProvider = new LocalBifAccountsProvider( 
      'http://test.bifcore.bitfactory.cn', 
      ['priSPKoJ8vUfXk92axGtokCDiw8cM7KHznL6iugvNxeANctrdL', 'priSPKpHrcXsX7AY3wSSVZXCfMeX8MvrPEBXeV5hUctomrHiWC']  
    );  
  });

  it('should return http://test.bifcore.bitfactory.cn', async () => {  
    const url = await localBifAccountsProvider.url;  
    expect(url).to.equal('http://test.bifcore.bitfactory.cn');
  });
  
  it('should return private key for valid address', async () => {  
    const privateKey = await localBifAccountsProvider.getPrivateKeyForAddressOrNull('did:bid:ef9jgpHmnF2Qv5miQUwgU9XeUCkYkVrj');  
    expect(privateKey).to.equal('priSPKoJ8vUfXk92axGtokCDiw8cM7KHznL6iugvNxeANctrdL');  
  });  
  
  it('should return null for invalid address', async () => {  
    const privateKey = await localBifAccountsProvider.getPrivateKeyForAddressOrNull('did:bid:ef8iD3Brhda9xaUt921BHfEDdivSd6KT');  
    expect(privateKey).to.be.null;  
  });

  it('should be an array of strings and equal to ["did:bid:ef9jgpHmnF2Qv5miQUwgU9XeUCkYkVrj", "did:bid:efYyP31z8gZvQi8LbXpdcSTppxxTSpGZ"]', async () => {
    const privateKey = await localBifAccountsProvider.request({method: 'bif_accounts'});  
    expect(Array.isArray(privateKey)).to.be.true;
    expect(privateKey).to.satisfy(array => array.every(item => typeof item === 'string'));
    assert.deepEqual(privateKey, ['did:bid:ef9jgpHmnF2Qv5miQUwgU9XeUCkYkVrj', 'did:bid:efYyP31z8gZvQi8LbXpdcSTppxxTSpGZ']);
  });

  it('should be privatekey priSPKoJ8vUfXk92axGtokCDiw8cM7KHznL6iugvNxeANctrdL', async () => {
    const privateKey = await localBifAccountsProvider.request({method: 'bif_account_privatekey', params: ['did:bid:ef9jgpHmnF2Qv5miQUwgU9XeUCkYkVrj']});
    expect(privateKey).to.equal('priSPKoJ8vUfXk92axGtokCDiw8cM7KHznL6iugvNxeANctrdL');
  });
});