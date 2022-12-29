const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("MKZ Token Drop for investors", function () {
    let Token, token;
    let TokenDrop, tokenDrop;
    let owner, addr1, addr2, addr3;

    before(async function () {
        // Récupère le premier compte de la liste des comptes de test et les autres comptes
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        // Instancie le contrat TokenMKZ en utilisant le proxy
        Token = await ethers.getContractFactory("MKZ");
        token = await upgrades.deployProxy(Token, [owner.address], {kind: 'uups'});
        await token.deployed();

        // Crée un proxy pour le contrat TokenDrop
        TokenDrop = await ethers.getContractFactory("TokenDrop");

        // Définis les bénéficiaires, les montants et les tranches de tokens à distribuer
        beneficiaries = [addr1.address, addr2.address, addr3.address];
        amounts = [ethers.utils.parseEther('1000'), ethers.utils.parseEther('2000'), ethers.utils.parseEther('3000')];
        slices = [3, 3, 1];
        
        tokenDrop = await TokenDrop.deploy(token.address);
        await tokenDrop.deployed();
        await token.connect(owner).transfer(tokenDrop.address, ethers.utils.parseEther('100000'));
        
        await tokenDrop.addInvestors(beneficiaries, amounts, slices);
    });

    it("should have the correct total supply", async function () {
        expect(await token.totalSupply()).to.equal(ethers.utils.parseEther('240000000'));
    });

    it("should have the correct balance for the beneficiaries", async function () {
        expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther('100'));
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.utils.parseEther('200'));
        expect(await token.balanceOf(addr3.address)).to.equal(ethers.utils.parseEther('300'));
    });

    it("shouldn't perform the upkeep because the cliff period is not over", async function () {
        await tokenDrop.performUpkeep(0x0);
        expect((await tokenDrop.checkUpkeep(0x0))[0]).to.be.equal(false);
    });

    it("should perform the upkeep and release the tokens", async function () {
        // Récupère le temps actuel
        const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
        // Définis le temps d'attente pour la prochaine exécution de la fonction performUpkeep
        let waitingTime;
        let amounts_eth = [1000, 2000, 3000]
        // Pour chaque tranche de 3 mois, vérifie que la bonne quantité de tokens a été distribuée
        for (let j = 0; j < 3; j++) {
            // Calcul le temps d'attente jusqu'à la prochaine exécution de la fonction performUpkeep
            if(j === 0)
                waitingTime = 86400 * 30 * 2
            else
                waitingTime = 86400 * 30;
            
            // Attend jusqu'à la prochaine exécution de la fonction performUpkeep
            await ethers.provider.send("evm_increaseTime", [waitingTime]);
            // Exécute la fonction performUpkeep
            await tokenDrop.performUpkeep(0x0);
            // Vérifie que la bonne quantité de tokens a été distribuée
            
            // Pour chaque bénéficiaire, vérifie que les tokens sont bien distribués en fonction des tranches
            for (let i = 0; i < beneficiaries.length; i++){
                if(slices[i] === 1)
                    expect(await token.balanceOf(beneficiaries[i])).to.equal(ethers.utils.parseEther((amounts_eth[i] * 0.1 +  amounts_eth[i] * 0.05 * (j+1)).toString()));
                else if (slices[i] === 3 && j%3 === 0)
                    expect(await token.balanceOf(beneficiaries[i])).to.equal(ethers.utils.parseEther((amounts_eth[i] * 0.1 + amounts_eth[i] * 0.15).toString()));
            }
                
        }
    });
    
    it("Should use all tokenvesting function", async () => {
        await ethers.provider.send("evm_increaseTime", [86400 * 30 * 522]);
        await tokenDrop.performUpkeep(0x0);
        await tokenDrop.withdraw(ethers.utils.parseEther("2"))
        await tokenDrop.getVestingSchedulesTotalAmount()
    });
    
});